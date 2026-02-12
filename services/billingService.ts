import { getAccessToken } from './authService';

export type BillingRecord = {
  id: number;
  branchId: number;
  branchName?: string;
  branchCode?: string;
  orderId: number;
  orderNo: string;
  paymentMethod: string;
  amountDue: number;
  amountPaid: number;
  paymentRef: string | null;
  status: number;
  encodedByName?: string | null;
  encodedDt: string;
};

export type BillingDetail = {
  id: number;
  orderId: number;
  orderNo: string;
  paymentMethod: string;
  amountDue: number;
  amountPaid: number;
  paymentRef: string | null;
  status: number;
  encodedByName?: string | null;
  encodedDt: string;
};

export type PaymentTransaction = {
  IDNo?: number;
  ORDER_ID?: number;
  PAYMENT_METHOD?: string;
  AMOUNT_PAID?: number;
  PAYMENT_REF?: string | null;
  ENCODED_BY?: number;
  ENCODED_DT?: string;
  [key: string]: unknown;
};

export type UpdateBillingPayload = {
  payment_method?: string;
  amount_paid: number;
  payment_ref?: string | null;
};

export const BILLING_STATUS = {
  PAID: 1,
  PARTIAL: 2,
  UNPAID: 3,
} as const;

export function getBillingStatusLabel(status: number): string {
  switch (status) {
    case BILLING_STATUS.PAID: return 'Paid';
    case BILLING_STATUS.PARTIAL: return 'Partial';
    case BILLING_STATUS.UNPAID: return 'Unpaid';
    default: return 'Unknown';
  }
}

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type BillingApiRow = {
  IDNo: number;
  BRANCH_ID: number;
  BRANCH_NAME?: string;
  BRANCH_CODE?: string;
  BRANCH_LABEL?: string;
  ORDER_ID: number;
  ORDER_NO?: string;
  PAYMENT_METHOD?: string;
  AMOUNT_DUE?: number;
  AMOUNT_PAID?: number;
  PAYMENT_REF?: string | null;
  STATUS?: number;
  ENCODED_BY?: number;
  ENCODED_BY_NAME?: string | null;
  ENCODED_DT?: string;
};

const API_BASE_URL =
  (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
  || 'http://localhost:2000';

const buildUrl = (path: string, params?: Record<string, string>) => {
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
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
    throw new Error(json.error || json.message || 'Request failed');
  }
  return json.data;
};

function mapBillingRow(row: BillingApiRow): BillingRecord {
  return {
    id: row.IDNo,
    branchId: row.BRANCH_ID,
    branchName: row.BRANCH_NAME || row.BRANCH_LABEL,
    branchCode: row.BRANCH_CODE,
    orderId: row.ORDER_ID,
    orderNo: row.ORDER_NO ?? '',
    paymentMethod: row.PAYMENT_METHOD ?? 'CASH',
    amountDue: Number(row.AMOUNT_DUE ?? 0),
    amountPaid: Number(row.AMOUNT_PAID ?? 0),
    paymentRef: row.PAYMENT_REF ?? null,
    status: Number(row.STATUS ?? 3),
    encodedByName: row.ENCODED_BY_NAME ?? null,
    encodedDt: row.ENCODED_DT ?? '',
  };
}

/** Get all billing records (optional branch filter) */
export async function getBillings(branchId?: string): Promise<BillingRecord[]> {
  const params: Record<string, string> = {};
  if (branchId && branchId !== 'all') params.branch_id = branchId;
  const response = await fetch(buildUrl('/billing/data', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<BillingApiRow[]>(response);
  const rows = Array.isArray(data) ? data : [];
  return rows.map(mapBillingRow);
}

/** Get billing by order ID */
export async function getBillingByOrderId(orderId: string): Promise<BillingDetail | null> {
  const response = await fetch(buildUrl(`/billing/${orderId}`), {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (response.status === 404) return null;
  const row = await handleResponse<BillingApiRow>(response);
  return {
    id: row.IDNo,
    orderId: row.ORDER_ID,
    orderNo: row.ORDER_NO ?? '',
    paymentMethod: row.PAYMENT_METHOD ?? 'CASH',
    amountDue: Number(row.AMOUNT_DUE ?? 0),
    amountPaid: Number(row.AMOUNT_PAID ?? 0),
    paymentRef: row.PAYMENT_REF ?? null,
    status: Number(row.STATUS ?? 3),
    encodedByName: row.ENCODED_BY_NAME ?? null,
    encodedDt: row.ENCODED_DT ?? '',
  };
}

/** Get payment history for an order */
export async function getPaymentHistory(orderId: string): Promise<PaymentTransaction[]> {
  const response = await fetch(buildUrl(`/billing/${orderId}/payments`), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<PaymentTransaction[]>(response);
  return Array.isArray(data) ? data : [];
}

/** Record payment (PUT /billing/:id — id is ORDER_ID). amount_paid is the incremental amount. */
export async function updateBilling(orderId: string, payload: UpdateBillingPayload): Promise<{ status: number }> {
  const response = await fetch(buildUrl(`/billing/${orderId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ status: number }>(response);
}
