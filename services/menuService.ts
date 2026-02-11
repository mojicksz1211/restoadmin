import { MenuCategory, MenuRecord } from '../types';
import { getAccessToken } from './authService';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type MenuApiRecord = {
  IDNo: number;
  BRANCH_ID: number;
  BRANCH_NAME?: string;
  BRANCH_CODE?: string;
  BRANCH_LABEL?: string;
  CATEGORY_ID?: number | null;
  CATEGORY_NAME?: string;
  MENU_NAME?: string;
  MENU_DESCRIPTION?: string | null;
  MENU_IMG?: string | null;
  MENU_PRICE?: number | string;
  IS_AVAILABLE?: number | boolean;
  ACTIVE?: number | boolean;
  ENCODED_BY?: string;
  ENCODED_DT?: string;
  EDITED_BY?: string | null;
  EDITED_DT?: string | null;
};

type CategoryApiRecord = {
  IDNo: number;
  CATEGORY_NAME?: string;
  BRANCH_ID?: number | null;
};

const API_BASE_URL =
  (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
  || 'http://localhost:2000';

const buildUrl = (path: string, params?: Record<string, string>) => {
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
};

const mapMenuRecord = (row: MenuApiRecord): MenuRecord => ({
  id: String(row.IDNo),
  branchId: String(row.BRANCH_ID ?? ''),
  branchName: row.BRANCH_NAME || '',
  branchCode: row.BRANCH_CODE || '',
  branchLabel: row.BRANCH_LABEL,
  categoryId: row.CATEGORY_ID !== null && row.CATEGORY_ID !== undefined ? String(row.CATEGORY_ID) : null,
  categoryName: row.CATEGORY_NAME || 'Uncategorized',
  name: row.MENU_NAME || '',
  description: row.MENU_DESCRIPTION ?? null,
  imageUrl: row.MENU_IMG ?? null,
  price: Number(row.MENU_PRICE ?? 0),
  isAvailable: Boolean(row.IS_AVAILABLE),
  active: Boolean(row.ACTIVE),
  encodedBy: row.ENCODED_BY || '',
  encodedAt: row.ENCODED_DT || '',
  editedBy: row.EDITED_BY ?? null,
  editedAt: row.EDITED_DT ?? null,
});

const mapCategoryRecord = (row: CategoryApiRecord): MenuCategory => ({
  id: String(row.IDNo),
  name: row.CATEGORY_NAME || 'Uncategorized',
  branchId: row.BRANCH_ID !== undefined && row.BRANCH_ID !== null ? String(row.BRANCH_ID) : null,
});

const handleResponse = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Request failed');
  }
  return json.data;
};

const authHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const getMenus = async (branchId?: string): Promise<MenuRecord[]> => {
  const params: Record<string, string> = {};
  if (branchId && branchId !== 'all') {
    params.branch_id = branchId;
  }
  const response = await fetch(buildUrl('/menus', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<MenuApiRecord[]>(response);
  return data.map(mapMenuRecord);
};

export const getMenuCategories = async (branchId?: string): Promise<MenuCategory[]> => {
  const params: Record<string, string> = {};
  if (branchId && branchId !== 'all') {
    params.branch_id = branchId;
  }
  const response = await fetch(buildUrl('/categories', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<CategoryApiRecord[]>(response);
  return data.map(mapCategoryRecord);
};
