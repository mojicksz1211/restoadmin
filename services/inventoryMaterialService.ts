import { getAccessToken } from './authService';
import { getApiBaseUrl } from '../utils/apiConfig';

export type InventoryMaterial = {
  id: string;
  branchId: string;
  category: string;
  name: string;
  unit: string;
  status: 'Active' | 'Inactive';
  stock: number;
  unitCost: number;
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

type MaterialApi = {
  IDNo: number;
  BRANCH_ID: number;
  CATEGORY_NAME?: string | null;
  MATERIAL_NAME: string;
  UNIT?: string | null;
  STATUS?: string;
  STOCK?: number | string;
  UNIT_COST?: number | string;
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

const mapRow = (row: MaterialApi): InventoryMaterial => ({
  id: String(row.IDNo),
  branchId: String(row.BRANCH_ID),
  category: row.CATEGORY_NAME || '',
  name: row.MATERIAL_NAME || '',
  unit: row.UNIT || '',
  status: row.STATUS === 'Inactive' ? 'Inactive' : 'Active',
  stock: Number(row.STOCK || 0),
  unitCost: Number(row.UNIT_COST || 0),
  sku: row.SKU || '',
  barcode: row.BARCODE || '',
  description: row.DESCRIPTION || '',
});

export async function getInventoryMaterials(branchId?: string): Promise<InventoryMaterial[]> {
  const params: Record<string, string> = {};
  if (branchId && branchId !== 'all') params.branch_id = branchId;
  const response = await fetch(buildUrl('/inventory/materials', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<MaterialApi[]>(response);
  return data.map(mapRow);
}

export async function createInventoryMaterial(
  payload: Omit<InventoryMaterial, 'id'>
): Promise<string> {
  const response = await fetch(buildUrl('/inventory/materials'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ id: number }>(response);
  return String(data.id);
}

export async function updateInventoryMaterial(
  id: string,
  payload: Omit<InventoryMaterial, 'id'>
): Promise<void> {
  const response = await fetch(buildUrl(`/inventory/materials/${id}`), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  await handleResponse<null>(response);
}

export async function deleteInventoryMaterial(id: string): Promise<void> {
  const response = await fetch(buildUrl(`/inventory/materials/${id}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  await handleResponse<null>(response);
}
