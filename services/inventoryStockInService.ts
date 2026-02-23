import { getAccessToken } from './authService';
import { getApiBaseUrl } from '../utils/apiConfig';
import type { InventoryAuditTrailRecord, StockInRecord } from '../types';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type StockInApiRow = {
  id: number | string;
  branch_id: number | string;
  resource_type: 'product' | 'material';
  resource_id: number | string;
  resource_name?: string;
  resource_unit?: string;
  qty_added: number | string;
  unit_cost: number | string;
  prev_unit_cost?: number | string | null;
  new_unit_cost?: number | string | null;
  total_cost: number | string;
  supplier_name?: string;
  reference_no?: string;
  note?: string;
  stock_in_date: string;
  encoded_dt?: string;
};

type AuditTrailApiRow = {
  event_id: number | string;
  event_type: 'stock_in' | 'stock_out';
  branch_id: number | string;
  resource_type: 'product' | 'material';
  resource_id: number | string;
  resource_name?: string;
  resource_unit?: string;
  event_date: string;
  event_dt?: string | null;
  qty_change: number | string;
  stock_before?: number | string | null;
  stock_after?: number | string | null;
  cost_before?: number | string | null;
  cost_after?: number | string | null;
  txn_unit_cost?: number | string | null;
  txn_total_cost?: number | string | null;
  supplier_name?: string;
  reference_no?: string;
  note?: string;
  active?: boolean;
};

export type CreateStockInPayload = {
  branchId: string;
  resourceType: 'product' | 'material';
  resourceId: string;
  qtyAdded: number;
  unitCost: number;
  supplierName?: string;
  referenceNo?: string;
  note?: string;
  stockInDate: string;
};

export type AuditTrailFilters = {
  branchId?: string;
  resourceType?: 'product' | 'material' | 'all';
  resourceId?: string;
  search?: string;
};

const buildUrl = (path: string, params?: Record<string, string>) => {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
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

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapRow = (row: StockInApiRow): StockInRecord => ({
  id: String(row.id),
  branchId: String(row.branch_id),
  resourceType: row.resource_type === 'material' ? 'material' : 'product',
  resourceId: String(row.resource_id),
  resourceName: row.resource_name || '',
  resourceUnit: row.resource_unit || '',
  qtyAdded: toNumber(row.qty_added),
  unitCost: toNumber(row.unit_cost),
  prevUnitCost:
    row.prev_unit_cost === null || row.prev_unit_cost === undefined ? null : toNumber(row.prev_unit_cost),
  newUnitCost:
    row.new_unit_cost === null || row.new_unit_cost === undefined ? null : toNumber(row.new_unit_cost),
  totalCost: toNumber(row.total_cost),
  supplierName: row.supplier_name || '',
  referenceNo: row.reference_no || '',
  note: row.note || '',
  stockInDate: row.stock_in_date ? String(row.stock_in_date).slice(0, 10) : '',
  encodedAt: row.encoded_dt || null,
});

const mapAuditRow = (row: AuditTrailApiRow): InventoryAuditTrailRecord => ({
  eventId: String(row.event_id),
  eventType: row.event_type === 'stock_out' ? 'stock_out' : 'stock_in',
  branchId: String(row.branch_id),
  resourceType: row.resource_type === 'material' ? 'material' : 'product',
  resourceId: String(row.resource_id),
  resourceName: row.resource_name || '',
  resourceUnit: row.resource_unit || '',
  eventDate: row.event_date ? String(row.event_date).slice(0, 10) : '',
  eventDt: row.event_dt || null,
  qtyChange: toNumber(row.qty_change),
  stockBefore: row.stock_before === null || row.stock_before === undefined ? null : toNumber(row.stock_before),
  stockAfter: row.stock_after === null || row.stock_after === undefined ? null : toNumber(row.stock_after),
  costBefore: row.cost_before === null || row.cost_before === undefined ? null : toNumber(row.cost_before),
  costAfter: row.cost_after === null || row.cost_after === undefined ? null : toNumber(row.cost_after),
  txnUnitCost: row.txn_unit_cost === null || row.txn_unit_cost === undefined ? null : toNumber(row.txn_unit_cost),
  txnTotalCost: row.txn_total_cost === null || row.txn_total_cost === undefined ? null : toNumber(row.txn_total_cost),
  supplierName: row.supplier_name || '',
  referenceNo: row.reference_no || '',
  note: row.note || '',
  active: Boolean(row.active),
});

export async function getInventoryStockIns(branchId?: string): Promise<StockInRecord[]> {
  const params: Record<string, string> = {};
  if (branchId && branchId !== 'all') params.branch_id = branchId;
  const response = await fetch(buildUrl('/inventory/stock-ins', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<StockInApiRow[]>(response);
  return data.map(mapRow);
}

export async function createInventoryStockIn(payload: CreateStockInPayload): Promise<string> {
  const response = await fetch(buildUrl('/inventory/stock-ins'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      branch_id: payload.branchId,
      resource_type: payload.resourceType,
      resource_id: payload.resourceId,
      qty_added: payload.qtyAdded,
      unit_cost: payload.unitCost,
      supplier_name: payload.supplierName || '',
      reference_no: payload.referenceNo || '',
      note: payload.note || '',
      stock_in_date: payload.stockInDate,
    }),
  });
  const data = await handleResponse<{ id: number }>(response);
  return String(data.id);
}

export async function getInventoryAuditTrail(filters?: AuditTrailFilters): Promise<InventoryAuditTrailRecord[]> {
  const params: Record<string, string> = {};
  if (filters?.branchId && filters.branchId !== 'all') params.branch_id = filters.branchId;
  if (filters?.resourceType && filters.resourceType !== 'all') params.resource_type = filters.resourceType;
  if (filters?.resourceId) params.resource_id = filters.resourceId;
  if (filters?.search) params.search = filters.search;
  const response = await fetch(buildUrl('/inventory/audit-trail', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<AuditTrailApiRow[]>(response);
  return data.map(mapAuditRow);
}

export async function updateInventoryStockIn(id: string, payload: CreateStockInPayload): Promise<void> {
  const response = await fetch(buildUrl(`/inventory/stock-ins/${id}`), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      branch_id: payload.branchId,
      resource_type: payload.resourceType,
      resource_id: payload.resourceId,
      qty_added: payload.qtyAdded,
      unit_cost: payload.unitCost,
      supplier_name: payload.supplierName || '',
      reference_no: payload.referenceNo || '',
      note: payload.note || '',
      stock_in_date: payload.stockInDate,
    }),
  });
  await handleResponse<null>(response);
}

export async function deleteInventoryStockIn(id: string): Promise<void> {
  const response = await fetch(buildUrl(`/inventory/stock-ins/${id}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  await handleResponse<null>(response);
}
