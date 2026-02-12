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

/** Table status: 1 = Available, 2 = Occupied (matches backend) */
export const TABLE_STATUS = {
  AVAILABLE: 1,
  OCCUPIED: 2,
} as const;

export function getTableStatusLabel(status: number): string {
  switch (status) {
    case TABLE_STATUS.AVAILABLE: return 'Available';
    case TABLE_STATUS.OCCUPIED: return 'Occupied';
    default: return `Status ${status}`;
  }
}

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

export type CreateTablePayload = {
  BRANCH_ID: string;
  TABLE_NUMBER: string;
  CAPACITY?: number;
  STATUS?: number;
};

export type UpdateTablePayload = {
  TABLE_NUMBER: string;
  CAPACITY?: number;
  STATUS?: number;
};

export async function createTable(payload: CreateTablePayload): Promise<number> {
  const response = await fetch(buildUrl('/restaurant_table'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      BRANCH_ID: payload.BRANCH_ID,
      TABLE_NUMBER: payload.TABLE_NUMBER.trim(),
      CAPACITY: payload.CAPACITY ?? 0,
      STATUS: payload.STATUS ?? TABLE_STATUS.AVAILABLE,
    }),
  });
  const data = await handleResponse<{ id: number }>(response);
  return data?.id ?? 0;
}

export async function updateTable(id: string, payload: UpdateTablePayload): Promise<void> {
  const response = await fetch(buildUrl(`/restaurant_table/${id}`), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      TABLE_NUMBER: payload.TABLE_NUMBER.trim(),
      CAPACITY: payload.CAPACITY ?? 0,
      STATUS: payload.STATUS ?? TABLE_STATUS.AVAILABLE,
    }),
  });
  await handleResponse(response);
}

export async function deleteTable(id: string): Promise<void> {
  const response = await fetch(buildUrl(`/restaurant_table/${id}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  await handleResponse(response);
}

export async function updateTableStatus(id: string, status: number): Promise<void> {
  const response = await fetch(buildUrl(`/restaurant_table/${id}/status`), {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ status }),
  });
  await handleResponse(response);
}

export type TableTransactionRecord = {
  orderId?: number;
  orderNo?: string;
  tableId?: number;
  tableNumber?: string;
  amount?: number;
  status?: number;
  encodedDt?: string;
  [key: string]: unknown;
};

export async function getTableTransactionHistory(tableId: string, branchId?: string): Promise<TableTransactionRecord[]> {
  const params: Record<string, string> = {};
  if (branchId && branchId !== 'all') params.branch_id = branchId;
  const response = await fetch(buildUrl(`/restaurant_table/${tableId}/transactions`, params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<TableTransactionRecord[]>(response);
  return Array.isArray(data) ? data : [];
}

