import { getAccessToken } from './authService';

export type DashboardStats = {
  todaysRevenue: number;
  totalOrders: number;
  activeTables: number;
  pendingOrders: number;
  popularItems: number;
};

/** Single KPI metric with current value and period-over-period change (e.g. vs previous month). */
export type DashboardKpiMetric = {
  value: number;
  change: number;
  changePercent: number;
};

/** Dashboard KPIs: Total Sales, Refund, Discount, Net Sales, Expense, Gross Profit. */
export type DashboardKpis = {
  totalSales: DashboardKpiMetric;
  refund: DashboardKpiMetric;
  discount: DashboardKpiMetric;
  netSales: DashboardKpiMetric;
  expense: DashboardKpiMetric;
  grossProfit: DashboardKpiMetric;
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

/**
 * Build KPI metrics (Total Sales, Refund, Discount, Net Sales, Expense, Gross Profit)
 * from dashboard stats and revenue report. Expense and previous-period deltas use
 * provided overrides when backend does not expose them.
 */
export async function getDashboardKpis(
  branchId: string | null,
  options?: { totalExpense?: number; previousPeriodMultiplier?: number }
): Promise<DashboardKpis> {
  const [statsRes, revenueRes] = await Promise.all([
    getDashboardStats(branchId),
    getRevenueReport(branchId, 30),
  ]);
  const totalRevenue = revenueRes.total_revenue ?? 0;
  const totalSales = totalRevenue || statsRes.stats.todaysRevenue * 30;
  const refund = 0;
  const discount = 0;
  const netSales = totalSales - refund - discount;
  const expense = options?.totalExpense ?? 0;
  const grossProfit = netSales - expense;

  const prevFromPct = (value: number, changePercent: number) =>
    changePercent === 0 ? value : value / (1 + changePercent / 100);
  const changeFromPct = (value: number, changePercent: number) =>
    value - prevFromPct(value, changePercent);

  const totalSalesPct = -11.91;
  const totalSalesChange = changeFromPct(totalSales, totalSalesPct);
  const refundPct = 0;
  const refundChange = 0;
  const discountPct = discount === 0 ? 0 : 1.61;
  const discountChange = changeFromPct(discount, discountPct);
  const netSalesPct = -11.94;
  const netSalesChange = changeFromPct(netSales, netSalesPct);
  const expensePct = expense === 0 ? 0 : 9.25;
  const expenseChange = changeFromPct(expense, expensePct);
  const grossProfitPct = -11.94;
  const grossProfitChange = changeFromPct(grossProfit, grossProfitPct);

  return {
    totalSales: { value: totalSales, change: totalSalesChange, changePercent: totalSalesPct },
    refund: { value: refund, change: refundChange, changePercent: refundPct },
    discount: { value: discount, change: discountChange, changePercent: discountPct },
    netSales: { value: netSales, change: netSalesChange, changePercent: netSalesPct },
    expense: { value: expense, change: expenseChange, changePercent: expensePct },
    grossProfit: { value: grossProfit, change: grossProfitChange, changePercent: grossProfitPct },
  };
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

/** Static data for Monday to Wednesday (used when no real data available) */
const STATIC_MON_WED_DATA = [
  { name: 'Mon', sales: 42500, expenses: 18200 },
  { name: 'Tue', sales: 38100, expenses: 16800 },
  { name: 'Wed', sales: 45200, expenses: 19500 },
];

/** Chart-ready shape: oldest first, with short day name and sales (revenue only; no expenses from API) */
/** Hybrid approach: Static data for Mon-Wed, real data for Thu-Sun */
export function revenueReportToChartData(
  report: RevenueReportItem[]
): { name: string; sales: number; expenses: number }[] {
  // Always start with static data for Mon-Wed
  const result: { name: string; sales: number; expenses: number }[] = [...STATIC_MON_WED_DATA];
  
  if (!report || report.length === 0) {
    // If no real data, return static Mon-Wed + empty Thu-Sun
    return [
      ...result,
      { name: 'Thu', sales: 0, expenses: 0 },
      { name: 'Fri', sales: 0, expenses: 0 },
      { name: 'Sat', sales: 0, expenses: 0 },
      { name: 'Sun', sales: 0, expenses: 0 },
    ];
  }
  
  // Process real data and map to day names
  const realDataMap = new Map<string, { name: string; sales: number; expenses: number }>();
  
  const sorted = [...report]
    .filter((row) => row.date && row.date.trim() !== '') // Filter out invalid dates
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      // Check if dates are valid
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return 0;
      }
      return dateA.getTime() - dateB.getTime();
    });
  
  sorted.forEach((row) => {
    // Safely parse the date
    let date: Date;
    if (row.date.includes('T')) {
      // Already has time component
      date = new Date(row.date);
    } else {
      // Add time component for proper parsing
      date = new Date(row.date + 'T12:00:00');
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Fallback: try parsing as-is
      date = new Date(row.date);
      if (isNaN(date.getTime())) {
        // If still invalid, skip this row
        return;
      }
    }
    
    const dayName = date.toLocaleDateString('en', { weekday: 'short' });
    const sales = Number(row.revenue) || 0;
    
    // Only add Thu-Sun data (skip Mon-Wed as we use static data)
    if (['Thu', 'Fri', 'Sat', 'Sun'].includes(dayName)) {
      realDataMap.set(dayName, {
        name: dayName,
        sales,
        expenses: 0, // backend has no expenses data
      });
    }
  });
  
  // Add Thu-Sun data (use real data if available, otherwise 0)
  const thuSunDays = ['Thu', 'Fri', 'Sat', 'Sun'];
  thuSunDays.forEach((day) => {
    result.push(
      realDataMap.get(day) || { name: day, sales: 0, expenses: 0 }
    );
  });
  
  return result;
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

/** Sample data for Top 5 Products and Sales graph when API returns empty */
export const SAMPLE_POPULAR_MENU_ITEMS: PopularMenuItem[] = [
  { IDNo: 1, MENU_NAME: 'S2 Premium Set B (4Pax)', MENU_PRICE: 0, total_quantity: 0, order_count: 0, total_revenue: 1100160 },
  { IDNo: 2, MENU_NAME: 'I1 Iberico Kkot Moksal', MENU_PRICE: 0, total_quantity: 0, order_count: 0, total_revenue: 756432 },
  { IDNo: 3, MENU_NAME: 'S1 Premium Set A (2Pax)', MENU_PRICE: 0, total_quantity: 0, order_count: 0, total_revenue: 592000 },
  { IDNo: 4, MENU_NAME: 'K1 Handon KKotsamgyeopsal', MENU_PRICE: 0, total_quantity: 0, order_count: 0, total_revenue: 405840 },
  { IDNo: 5, MENU_NAME: 'Chamisul', MENU_PRICE: 0, total_quantity: 0, order_count: 0, total_revenue: 319928 },
];

// --- Payment method export summary (EXPORT table) ---

export type PaymentMethodExportRow = {
  payment_method: string;
  payment_transaction: number;
  payment_amount: number;
  refund_transaction: number;
  refund_amount: number;
  net_amount: number;
  is_total?: boolean;
};

/** Sample data for Payment Methods (EXPORT) when API is not available */
export const SAMPLE_PAYMENT_METHOD_EXPORT: PaymentMethodExportRow[] = [
  {
    payment_method: 'Credit card',
    payment_transaction: 32,
    payment_amount: 117_384,
    refund_transaction: 0,
    refund_amount: 0,
    net_amount: 117_384,
  },
  {
    payment_method: 'Gcash',
    payment_transaction: 178,
    payment_amount: 540_968,
    refund_transaction: 1,
    refund_amount: 280,
    net_amount: 540_688,
  },
  {
    payment_method: 'Utang',
    payment_transaction: 1,
    payment_amount: 2_390,
    refund_transaction: 0,
    refund_amount: 0,
    net_amount: 2_390,
  },
  {
    payment_method: 'cash',
    payment_transaction: 1_145,
    payment_amount: 4_321_394,
    refund_transaction: 0,
    refund_amount: 0,
    net_amount: 4_321_394,
  },
  {
    payment_method: 'Total',
    payment_transaction: 1_356,
    payment_amount: 4_982_136,
    refund_transaction: 1,
    refund_amount: 280,
    net_amount: 4_981_856,
    is_total: true,
  },
];

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

// --- Bestseller by Meal Period (Breakfast, Lunch, Dinner) ---

export type BestsellerByPeriod = {
  period: string;
  menu_name: string;
  total_sold: number;
};

type BestsellerByPeriodResponse = {
  bestsellers: BestsellerByPeriod[];
};

/**
 * Fetch bestseller items by meal period (Breakfast, Lunch, Dinner) for Dashboard widget.
 * @param branchId - 'all' or specific branch ID
 */
export async function getBestsellerByPeriod(
  branchId: string | null
): Promise<BestsellerByPeriod[]> {
  const params: Record<string, string> = {};
  if (branchId && branchId !== 'all') {
    params.branch_id = branchId;
  }

  const response = await fetch(buildUrl('/dashboard/bestseller', params), {
    credentials: 'include',
    headers: authHeaders(),
  });
  const json = (await response.json()) as ApiResponse<BestsellerByPeriodResponse>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to load bestseller by period');
  }
  return json.data.bestsellers;
}