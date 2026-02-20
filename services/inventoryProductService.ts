import { getAccessToken } from './authService';
import { getApiBaseUrl } from '../utils/apiConfig';

export type InventoryProduct = {
  id: string;
  branchId: string;
  category: string;
  name: string;
  unit: string;
  type: string;
  status: 'Active' | 'Inactive';
  price: number;
  stock: number;
  sku: string;
  barcode: string;
  description: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type ProductApi = {
  IDNo: number;
  BRANCH_ID: number;
  CATEGORY_NAME?: string | null;
  PRODUCT_NAME: string;
  UNIT?: string | null;
  TYPE?: string | null;
  STATUS?: string;
  PRICE?: number | string;
  STOCK?: number | string;
  SKU?: string | null;
  BARCODE?: string | null;
  DESCRIPTION?: string | null;
};

const buildUrl = (path: string, params?: Record<string, string>) => {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
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
  if (!response.ok || !json.success) throw new Error(json.error || 'Request failed');
  return json.data;
};

const mapRow = (row: ProductApi): InventoryProduct => ({
  id: String(row.IDNo),
  branchId: String(row.BRANCH_ID),
  category: row.CATEGORY_NAME || '',
  name: row.PRODUCT_NAME || '',
  unit: row.UNIT || '',
  type: row.TYPE || '',
  status: row.STATUS === 'Inactive' ? 'Inactive' : 'Active',
  price: Number(row.PRICE || 0),
  stock: Number(row.STOCK || 0),
  sku: row.SKU || '',
  barcode: row.BARCODE || '',
  description: row.DESCRIPTION || '',
});

export async function getInventoryProducts(branchId?: string): Promise<InventoryProduct[]> {
  const params: Record<string, string> = {};
  if (branchId && branchId !== 'all') params.branch_id = branchId;
  const response = await fetch(buildUrl('/inventory/products', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<ProductApi[]>(response);
  return data.map(mapRow);
}

export async function createInventoryProduct(
  payload: Omit<InventoryProduct, 'id'>
): Promise<string> {
  const response = await fetch(buildUrl('/inventory/products'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ id: number }>(response);
  return String(data.id);
}

export async function updateInventoryProduct(
  id: string,
  payload: Omit<InventoryProduct, 'id'>
): Promise<void> {
  const response = await fetch(buildUrl(`/inventory/products/${id}`), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  await handleResponse<null>(response);
}

export async function deleteInventoryProduct(id: string): Promise<void> {
  const response = await fetch(buildUrl(`/inventory/products/${id}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  await handleResponse<null>(response);
}
