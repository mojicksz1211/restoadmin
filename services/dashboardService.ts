import { getAccessToken } from './authService';

export type DashboardStats = {
  todaysRevenue: number;
  totalOrders: number;
  activeTables: number;
  pendingOrders: number;
  popularItems: number;
};

type DashboardStatsResponse = {
  stats: DashboardStats;
  currentBranch: {
    IDNo: number;
    BRANCH_CODE?: string;
    BRANCH_NAME?: string;
    ADDRESS?: string | null;
  } | null;
  isKimsBrothersDashboard?: boolean;
  permissions?: number;
  user?: {
    username?: string;
    firstname?: string;
    lastname?: string;
    user_id?: number;
  };
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
};

const API_BASE_URL =
  (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
  || 'http://localhost:2000';

const buildUrl = (path: string, params?: Record<string, string>) => {
  const base = API_BASE_URL.replace(/\/$/, '');
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

/**
 * Fetch dashboard statistics from backend.
 * @param branchId - 'all' for all branches, or specific branch ID to filter
 */
export async function getDashboardStats(branchId: string | null): Promise<DashboardStatsResponse> {
  const params: Record<string, string> = {};
  if (branchId && branchId !== 'all') {
    params.branch_id = branchId;
  }
  const response = await fetch(buildUrl('/dashboard/stats', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const json = (await response.json()) as ApiResponse<DashboardStatsResponse>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to load dashboard stats');
  }
  return json.data;
}

// --- Revenue report (for Cash Flow chart) ---

export type RevenueReportItem = {
  date: string;
  revenue: number;
  order_count: number;
  average_order_value?: number;
};

type RevenueReportResponse = {
  period: string;
  start_date: string | null;
  end_date: string | null;
  branch_id: string | null;
  data: RevenueReportItem[];
  total_revenue: number;
  total_orders: number;
};

/**
 * Fetch revenue report for Cash Flow chart.
 * @param branchId - 'all' or specific branch ID
 * @param days - number of days to fetch (default 7)
 */
export async function getRevenueReport(
  branchId: string | null,
  days: number = 7
): Promise<RevenueReportResponse> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const start_date = start.toISOString().slice(0, 10);
  const end_date = end.toISOString().slice(0, 10);

  const params: Record<string, string> = {
    period: 'daily',
    start_date,
    end_date,
  };
  if (branchId && branchId !== 'all') {
    params.branch_id = branchId;
  }

  const response = await fetch(buildUrl('/reports/revenue', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const json = (await response.json()) as ApiResponse<RevenueReportResponse>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to load revenue report');
  }
  return json.data;
}

/** Chart-ready shape: oldest first, with short day name and sales (revenue only; no expenses from API) */
export function revenueReportToChartData(
  report: RevenueReportItem[]
): { name: string; sales: number; expenses: number }[] {
  const sorted = [...report].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  return sorted.map((row) => ({
    name: new Date(row.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }),
    sales: Number(row.revenue) || 0,
    expenses: 0, // backend has no expenses data
  }));
}

// --- Popular menu items (Bestsellers) ---

export type PopularMenuItem = {
  IDNo: number;
  MENU_NAME: string;
  MENU_PRICE: number;
  total_quantity: number;
  order_count: number;
  total_revenue: number;
};

type PopularMenuResponse = {
  start_date: string | null;
  end_date: string | null;
  branch_id: string | null;
  limit: number;
  data: PopularMenuItem[];
};

/**
 * Fetch popular menu items (bestsellers) for Dashboard widget.
 * @param branchId - 'all' or specific branch ID
 * @param days - last N days (default 7); use 0 for today only
 * @param limit - max items (default 5)
 */
export async function getPopularMenuItems(
  branchId: string | null,
  days: number = 7,
  limit: number = 5
): Promise<PopularMenuResponse> {
  const end = new Date();
  const start = new Date();
  if (days > 0) {
    start.setDate(start.getDate() - (days - 1));
  } else {
    start.setTime(end.getTime());
  }
  const start_date = start.toISOString().slice(0, 10);
  const end_date = end.toISOString().slice(0, 10);

  const params: Record<string, string> = {
    start_date,
    end_date,
    limit: String(limit),
  };
  if (branchId && branchId !== 'all') {
    params.branch_id = branchId;
  }

  const response = await fetch(buildUrl('/reports/menu-items', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const json = (await response.json()) as ApiResponse<PopularMenuResponse>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to load popular items');
  }
  return json.data;
}
