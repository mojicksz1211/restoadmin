import { BranchOption, BranchRecord } from '../types';
import { getAccessToken } from './authService';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type BranchApiRecord = {
  IDNo: number;
  BRANCH_CODE?: string;
  BRANCH_NAME?: string;
  ADDRESS?: string | null;
  PHONE?: string | null;
  ACTIVE?: number | boolean;
  CREATED_DT?: string | null;
};

type BranchOptionsResponse = {
  permissions: number;
  current: string;
  options: { value: string; label: string }[];
};

const API_BASE_URL =
  (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
  || 'http://localhost:2000';

const buildUrl = (path: string) => {
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Request failed');
  }
  return json.data;
};

const mapBranchRecord = (row: BranchApiRecord): BranchRecord => ({
  id: String(row.IDNo),
  code: row.BRANCH_CODE || '',
  name: row.BRANCH_NAME || '',
  address: row.ADDRESS ?? null,
  phone: row.PHONE ?? null,
  active: Boolean(row.ACTIVE),
  createdAt: row.CREATED_DT ?? null,
});

const authHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const getBranches = async (): Promise<BranchRecord[]> => {
  const response = await fetch(buildUrl('/branch'), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<BranchApiRecord[]>(response);
  return data.map(mapBranchRecord);
};

export const getBranchOptions = async (): Promise<{ current: string; options: BranchOption[]; permissions: number }> => {
  const response = await fetch(buildUrl('/branch/options'), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<BranchOptionsResponse>(response);
  const options = data.options.map((option) => ({
    value: option.value.toUpperCase() === 'ALL' ? 'all' : option.value,
    label: option.value.toUpperCase() === 'ALL' ? 'All Locations' : option.label,
  }));
  const current = data.current?.toUpperCase() === 'ALL' ? 'all' : data.current;
  return { current, options, permissions: data.permissions };
};

export const setCurrentBranch = async (branchId: string): Promise<void> => {
  const payload = {
    branch_id: branchId === 'all' ? 'ALL' : branchId,
  };
  const response = await fetch(buildUrl('/branch/set-current'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  await handleResponse(response);
};

export type BranchCreatePayload = {
  BRANCH_CODE: string;
  BRANCH_NAME: string;
  ADDRESS?: string | null;
  PHONE?: string | null;
};

export const createBranch = async (payload: BranchCreatePayload): Promise<number> => {
  const response = await fetch(buildUrl('/branch'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ id: number }>(response);
  return data?.id ?? 0;
};

export type BranchUpdatePayload = BranchCreatePayload;

export const updateBranch = async (id: string, payload: BranchUpdatePayload): Promise<void> => {
  const response = await fetch(buildUrl(`/branch/${id}`), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const json = (await response.json()) as ApiResponse<unknown>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Request failed');
  }
};

export const deleteBranch = async (id: string): Promise<void> => {
  const response = await fetch(buildUrl(`/branch/${id}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  const json = (await response.json()) as ApiResponse<unknown>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Request failed');
  }
};
