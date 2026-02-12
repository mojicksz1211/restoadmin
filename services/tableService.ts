import { getAccessToken } from './authService';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type TableApiRecord = {
  IDNo: number;
  BRANCH_ID: number;
  BRANCH_NAME?: string;
  BRANCH_CODE?: string;
  BRANCH_LABEL?: string;
  TABLE_NUMBER: string;
  CAPACITY: number;
  STATUS: number;
  ENCODED_BY?: number | string | null;
  ENCODED_DT?: string | null;
};

export type RestaurantTableRecord = {
  id: string;
  branchId: string;
  branchName?: string;
  branchCode?: string;
  tableNumber: string;
  capacity: number;
  status: number;
};

import { getApiBaseUrl } from '../utils/apiConfig';

const buildUrl = (path: string, params?: Record<string, string>) => {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
};

const authHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Request failed');
  }
  return json.data;
};

const mapTableRecord = (row: TableApiRecord): RestaurantTableRecord => ({
  id: String(row.IDNo),
  branchId: String(row.BRANCH_ID ?? ''),
  branchName: row.BRANCH_NAME,
  branchCode: row.BRANCH_CODE,
  tableNumber: row.TABLE_NUMBER ?? '',
  capacity: Number(row.CAPACITY ?? 0),
  status: Number(row.STATUS ?? 0),
});

export async function getRestaurantTables(branchId?: string): Promise<RestaurantTableRecord[]> {
  const params: Record<string, string> = {};
  if (branchId && branchId !== 'all') {
    params.branch_id = branchId;
  }
  const response = await fetch(buildUrl('/restaurant_tables', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<TableApiRecord[]>(response);
  return Array.isArray(data) ? data.map(mapTableRecord) : [];
}

