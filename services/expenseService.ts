import { getAccessToken } from './authService';
import { getApiBaseUrl } from '../utils/apiConfig';
import type {
  ExpenseCategoryBreakdownItem,
  ExpenseRecord,
  ExpenseSummary,
  ExpenseTrendPoint,
} from '../types';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

type ExpenseApiRow = {
  IDNo: number;
  BRANCH_ID: number;
  BRANCH_NAME?: string | null;
  EXPENSE_DATE: string;
  CATEGORY: string;
  SOURCE_TYPE: string;
  SOURCE_REF_ID?: string | null;
  DESCRIPTION?: string | null;
  AMOUNT: number | string;
  IS_AUTO: number | boolean;
  ENCODED_BY?: number | null;
  ENCODED_BY_NAME?: string | null;
  ENCODED_DT?: string | null;
  EDITED_BY?: number | null;
  EDITED_DT?: string | null;
};

type ExpenseSummaryApi = {
  total_expense: number | string;
  auto_expense: number | string;
  manual_expense: number | string;
  current_month_expense: number | string;
};

type ExpenseCategoryApi = {
  CATEGORY: string;
  entry_count: number | string;
  total_amount: number | string;
};

type ExpenseTrendApi = {
  period: string;
  total_amount: number | string;
};

export type ExpenseFilters = {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  sourceType?: string;
  isAuto?: boolean | null;
  search?: string;
  period?: 'daily' | 'monthly';
};

export type CreateExpensePayload = {
  branchId: string;
  expenseDate: string;
  category: string;
  description?: string;
  amount: number;
};

export type UpdateExpensePayload = {
  expenseDate: string;
  category: string;
  description?: string;
  amount: number;
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

const normalizeFilters = (filters?: ExpenseFilters): Record<string, string> => {
  if (!filters) return {};
  const params: Record<string, string> = {};
  if (filters.branchId && filters.branchId !== 'all') params.branch_id = filters.branchId;
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  if (filters.category) params.category = filters.category;
  if (filters.sourceType) params.source_type = filters.sourceType;
  if (filters.isAuto !== null && filters.isAuto !== undefined) params.is_auto = filters.isAuto ? '1' : '0';
  if (filters.search) params.search = filters.search;
  if (filters.period) params.period = filters.period;
  return params;
};

const mapExpenseRow = (row: ExpenseApiRow): ExpenseRecord => ({
  id: String(row.IDNo),
  branchId: String(row.BRANCH_ID),
  branchName: row.BRANCH_NAME || '',
  expenseDate: row.EXPENSE_DATE ? String(row.EXPENSE_DATE).slice(0, 10) : '',
  category: row.CATEGORY || 'Other',
  sourceType: row.SOURCE_TYPE || 'manual',
  sourceRefId: row.SOURCE_REF_ID || null,
  description: row.DESCRIPTION || '',
  amount: toNumber(row.AMOUNT),
  isAuto: Boolean(row.IS_AUTO),
  encodedBy: row.ENCODED_BY !== undefined && row.ENCODED_BY !== null ? String(row.ENCODED_BY) : null,
  encodedByName: row.ENCODED_BY_NAME || null,
  encodedAt: row.ENCODED_DT || null,
  editedBy: row.EDITED_BY !== undefined && row.EDITED_BY !== null ? String(row.EDITED_BY) : null,
  editedAt: row.EDITED_DT || null,
});

export async function getExpenses(filters?: ExpenseFilters): Promise<ExpenseRecord[]> {
  const response = await fetch(buildUrl('/expenses', normalizeFilters(filters)), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<ExpenseApiRow[]>(response);
  return data.map(mapExpenseRow);
}

export async function createExpense(payload: CreateExpensePayload): Promise<string> {
  const response = await fetch(buildUrl('/expenses'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      branch_id: payload.branchId,
      expense_date: payload.expenseDate,
      category: payload.category,
      description: payload.description || '',
      amount: payload.amount,
    }),
  });
  const data = await handleResponse<{ id: number }>(response);
  return String(data.id);
}

export async function updateExpense(id: string, payload: UpdateExpensePayload): Promise<void> {
  const response = await fetch(buildUrl(`/expenses/${id}`), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      expense_date: payload.expenseDate,
      category: payload.category,
      description: payload.description || '',
      amount: payload.amount,
    }),
  });
  await handleResponse<null>(response);
}

export async function deleteExpense(id: string): Promise<void> {
  const response = await fetch(buildUrl(`/expenses/${id}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  await handleResponse<null>(response);
}

export async function getExpenseSummary(filters?: ExpenseFilters): Promise<ExpenseSummary> {
  const response = await fetch(buildUrl('/expenses/reports/summary', normalizeFilters(filters)), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<ExpenseSummaryApi>(response);
  return {
    totalExpense: toNumber(data.total_expense),
    autoExpense: toNumber(data.auto_expense),
    manualExpense: toNumber(data.manual_expense),
    currentMonthExpense: toNumber(data.current_month_expense),
  };
}

export async function getExpenseCategoryBreakdown(filters?: ExpenseFilters): Promise<ExpenseCategoryBreakdownItem[]> {
  const response = await fetch(buildUrl('/expenses/reports/by-category', normalizeFilters(filters)), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<ExpenseCategoryApi[]>(response);
  return data.map((row) => ({
    category: row.CATEGORY || 'Other',
    entryCount: toNumber(row.entry_count),
    totalAmount: toNumber(row.total_amount),
  }));
}

export async function getExpenseTrend(filters?: ExpenseFilters): Promise<ExpenseTrendPoint[]> {
  const response = await fetch(buildUrl('/expenses/reports/trend', normalizeFilters(filters)), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await handleResponse<ExpenseTrendApi[]>(response);
  return data.map((row) => ({
    period: row.period,
    totalAmount: toNumber(row.total_amount),
  }));
}

export async function exportExpenseCsv(filters?: ExpenseFilters): Promise<Blob> {
  const response = await fetch(buildUrl('/expenses/reports/export.csv', normalizeFilters(filters)), {
    credentials: 'include',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to export expense CSV');
  }
  return response.blob();
}
