import { getAccessToken } from './authService';
import { getApiBaseUrl } from '../utils/apiConfig';

export interface ProductCategoryItem {
  id: string;
  name: string;
  productsCount: number;
  status: 'Active' | 'Inactive';
}

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type ProductCategoryApiRecord = {
  IDNo: number;
  BRANCH_ID?: number | null;
  CATEGORY_NAME?: string | null;
  STATUS?: string | null;
  PRODUCTS_COUNT?: number | string | null;
};

const buildUrl = (path: string, params?: Record<string, string>) => {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }
  return url.toString();
};

const authHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Request failed');
  }
  return json.data;
};

const mapRow = (row: ProductCategoryApiRecord): ProductCategoryItem => ({
  id: String(row.IDNo),
  name: row.CATEGORY_NAME || '',
  productsCount: Number(row.PRODUCTS_COUNT ?? 0),
  status: row.STATUS === 'Inactive' ? 'Inactive' : 'Active',
});

// --- LocalStorage fallback for when backend route is not yet available ---

const STORAGE_KEY = 'restoadmin_product_categories';

const canUseStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const loadFromStorage = (): ProductCategoryItem[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProductCategoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      id: String(item.id),
      name: item.name ?? '',
      productsCount: Number.isFinite(item.productsCount) ? item.productsCount : 0,
      status: item.status === 'Inactive' ? 'Inactive' : 'Active',
    }));
  } catch {
    return [];
  }
};

const saveToStorage = (categories: ProductCategoryItem[]): void => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // ignore
  }
};

export async function getProductCategories(branchId?: string): Promise<ProductCategoryItem[]> {
  const params: Record<string, string> = {};
  if (branchId && branchId !== 'all') params.branch_id = branchId;

  try {
    const response = await fetch(buildUrl('/inventory/product-categories', params), {
      credentials: 'include',
      headers: authHeaders(),
    });

    // If backend route does not exist yet, fall back to localStorage
    if (response.status === 404) {
      return loadFromStorage();
    }

    const data = await handleResponse<ProductCategoryApiRecord[]>(response);
    const mapped = data.map(mapRow);
    saveToStorage(mapped);
    return mapped;
  } catch {
    // Network / server error – use whatever we have locally
    return loadFromStorage();
  }
}

export async function addProductCategory(
  name: string,
  status: ProductCategoryItem['status'] = 'Active',
  branchId?: string
): Promise<ProductCategoryItem[]> {
  const trimmed = name.trim();
  if (!trimmed) return getProductCategories(branchId);

  try {
    const payload: Record<string, unknown> = {
      CATEGORY_NAME: trimmed,
      STATUS: status,
    };
    if (branchId && branchId !== 'all') {
      payload.BRANCH_ID = Number(branchId);
    }

    const response = await fetch(buildUrl('/inventory/product-categories'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 404) {
      // Backend not ready – fall back to localStorage
      const current = loadFromStorage();
      const exists = current.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) return current;
      const next: ProductCategoryItem[] = [
        ...current,
        {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`,
          name: trimmed,
          productsCount: 0,
          status,
        },
      ];
      saveToStorage(next);
      return next;
    }

    await handleResponse<unknown>(response);
    return getProductCategories(branchId);
  } catch {
    const current = loadFromStorage();
    const exists = current.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return current;
    const next: ProductCategoryItem[] = [
      ...current,
      {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`,
        name: trimmed,
        productsCount: 0,
        status,
      },
    ];
    saveToStorage(next);
    return next;
  }
}

export async function updateProductCategory(
  id: string,
  name: string,
  status?: ProductCategoryItem['status'],
  branchId?: string
): Promise<ProductCategoryItem[]> {
  const trimmed = name.trim();
  if (!trimmed) return getProductCategories(branchId);

  try {
    const payload: Record<string, unknown> = {
      CATEGORY_NAME: trimmed,
      STATUS: status,
    };

    const response = await fetch(buildUrl(`/inventory/product-categories/${id}`), {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 404) {
      const current = loadFromStorage();
      const next = current.map((item) =>
        item.id === id
          ? {
              ...item,
              name: trimmed,
              status: status ?? item.status,
            }
          : item
      );
      saveToStorage(next);
      return next;
    }

    await handleResponse<unknown>(response);
    return getProductCategories(branchId);
  } catch {
    const current = loadFromStorage();
    const next = current.map((item) =>
      item.id === id
        ? {
            ...item,
            name: trimmed,
            status: status ?? item.status,
          }
        : item
    );
    saveToStorage(next);
    return next;
  }
}

export async function deleteProductCategory(id: string, branchId?: string): Promise<ProductCategoryItem[]> {
  try {
    const response = await fetch(buildUrl(`/inventory/product-categories/${id}`), {
      method: 'DELETE',
      credentials: 'include',
      headers: authHeaders(),
    });

    if (response.status === 404) {
      const current = loadFromStorage();
      const next = current.filter((item) => item.id !== id);
      saveToStorage(next);
      return next;
    }

    await handleResponse<unknown>(response);
    return getProductCategories(branchId);
  } catch {
    const current = loadFromStorage();
    const next = current.filter((item) => item.id !== id);
    saveToStorage(next);
    return next;
  }
}

