
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie 
} from 'recharts';
import { 
  DollarSign, Store, Sparkles, Loader2, 
  TrendingUp, ArrowDownRight, 
  ArrowUpRight, Info, Trophy, MapPin, RefreshCw, Users,
  Tag, Receipt, CircleDollarSign
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { MOCK_BRANCHES, MOCK_INVENTORY, SALES_CHART_DATA } from '../constants';
import { getAIInsights } from '../services/geminiService';
import {
  getDashboardStats,
  getRevenueReport,
  revenueReportToChartData,
  getPopularMenuItems,
  getDashboardKpis,
  SAMPLE_POPULAR_MENU_ITEMS,
  SAMPLE_PAYMENT_METHOD_EXPORT,
  type PaymentMethodExportRow,
  type DashboardStats,
  type DashboardKpis,
  type PopularMenuItem,
} from '../services/dashboardService';
import { getBranches } from '../services/branchService';

interface DashboardProps {
  selectedBranchId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedBranchId }) => {
  const { t } = useTranslation('common');
  const [aiReport, setAiReport] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string>('All Branches');
  const [currentBranch, setCurrentBranch] = useState<{ BRANCH_NAME?: string; ADDRESS?: string | null } | null>(null);
  const [chartData, setChartData] = useState<{ name: string; sales: number; expenses: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [topBranchesData, setTopBranchesData] = useState<{ id: string; name: string; address: string | null; revenue: number }[]>([]);
  const [topBranchesLoading, setTopBranchesLoading] = useState(true);
  const [popularMenuItems, setPopularMenuItems] = useState<PopularMenuItem[]>([]);
  const [popularMenuItemsLoading, setPopularMenuItemsLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  const [isKimsBrothersDashboard, setIsKimsBrothersDashboard] = useState<boolean>(false);
  const [isDaraejungBranch, setIsDaraejungBranch] = useState<boolean>(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await getDashboardStats(selectedBranchId);
      setStats(res.stats);
      setCurrentBranch(res.currentBranch);
      setBranchName(res.currentBranch?.BRANCH_NAME ?? 'All Branches');
      setIsKimsBrothersDashboard(res.isKimsBrothersDashboard ?? false);
      
      // Check if current branch is Daraejung
      const branchCode = res.currentBranch?.BRANCH_CODE;
      const branchName = res.currentBranch?.BRANCH_NAME;
      const isDaraejung = branchCode === 'BR001' || (branchName || '').toLowerCase().includes('daraejung');
      setIsDaraejungBranch(isDaraejung);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Failed to load dashboard');
      setStats(null);
      setCurrentBranch(null);
      setBranchName('All Branches');
      setIsKimsBrothersDashboard(false);
      setIsDaraejungBranch(false);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedBranchId]);

  const loadChart = useCallback(async () => {
    setChartLoading(true);
    setChartError(null);
    try {
      const res = await getRevenueReport(selectedBranchId, 7);
      setChartData(revenueReportToChartData(res.data));
    } catch (err) {
      setChartError(err instanceof Error ? err.message : 'Failed to load revenue chart');
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  const loadKpis = useCallback(async () => {
    setKpisLoading(true);
    try {
      const totalExpense = selectedBranchId === 'all'
        ? MOCK_BRANCHES.reduce((acc, curr) => acc + curr.expenses.labor + curr.expenses.cogs + curr.expenses.operational, 0)
        : (() => {
            const b = MOCK_BRANCHES.find((x) => x.id === selectedBranchId);
            return b ? b.expenses.labor + b.expenses.cogs + b.expenses.operational : 0;
          })();
      const data = await getDashboardKpis(selectedBranchId, { totalExpense });
      setKpis(data);
    } catch {
      setKpis(null);
    } finally {
      setKpisLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  const loadTopBranches = useCallback(async () => {
    setTopBranchesLoading(true);
    try {
      const branches = await getBranches();
      const withRevenue = await Promise.all(
        branches.map(async (b) => {
          const res = await getDashboardStats(b.id);
          return { id: b.id, name: b.name, address: b.address, revenue: res.stats.todaysRevenue };
        })
      );
      const sorted = withRevenue.sort((a, b) => b.revenue - a.revenue).slice(0, 4);
      setTopBranchesData(sorted);
    } catch {
      setTopBranchesData([]);
    } finally {
      setTopBranchesLoading(false);
    }
  }, []);

  const loadPopularMenuItems = useCallback(async () => {
    setPopularMenuItemsLoading(true);
    try {
      const res = await getPopularMenuItems(selectedBranchId, 7, 5);
      setPopularMenuItems(res.data);
    } catch {
      setPopularMenuItems([]);
    } finally {
      setPopularMenuItemsLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadTopBranches();
  }, [loadTopBranches]);

  useEffect(() => {
    loadPopularMenuItems();
  }, [loadPopularMenuItems]);

  useEffect(() => {
    setAiReport(null);
  }, [selectedBranchId]);

  const generateAIReport = async () => {
    setLoadingAI(true);
    const branchesToAnalyze = selectedBranchId === 'all' 
      ? MOCK_BRANCHES 
      : MOCK_BRANCHES.filter(b => b.id === selectedBranchId);
      
    const insights = await getAIInsights(branchesToAnalyze);
    setAiReport(insights);
    setLoadingAI(false);
  };

  const activeBranch = selectedBranchId === 'all' 
    ? null 
    : MOCK_BRANCHES.find(b => b.id === selectedBranchId);

  // Context name for titles - use API branch name if available, otherwise fallback to mock
  const currentContextName = branchName !== 'All Branches' ? branchName : (activeBranch ? activeBranch.name : t('all_branches'));

  // Real stats from API (with fallbacks while loading)
  const totalRevenue = stats?.todaysRevenue ?? 0;
  const totalOrders = stats?.totalOrders ?? 0;
  const activeTables = stats?.activeTables ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;
  const popularItems = stats?.popularItems ?? 0;

  // Cost breakdown (mock - backend dashboard has no expenses API)
  const totalExpenses = activeBranch
    ? activeBranch.expenses.labor + activeBranch.expenses.cogs + activeBranch.expenses.operational
    : MOCK_BRANCHES.reduce((acc, curr) => 
        acc + curr.expenses.labor + curr.expenses.cogs + curr.expenses.operational, 0);

  const profit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;

  const costBreakdownData = activeBranch ? [
    { name: 'COGS', value: activeBranch.expenses.cogs },
    { name: 'Labor', value: activeBranch.expenses.labor },
    { name: 'Operational', value: activeBranch.expenses.operational },
  ] : [
    { name: 'COGS', value: MOCK_BRANCHES.reduce((a, b) => a + b.expenses.cogs, 0) },
    { name: 'Labor', value: MOCK_BRANCHES.reduce((a, b) => a + b.expenses.labor, 0) },
    { name: 'Operational', value: MOCK_BRANCHES.reduce((a, b) => a + b.expenses.operational, 0) },
  ];

  // Inventory Aggregates (mock - no inventory API on dashboard)
  const branchInventory = MOCK_INVENTORY.filter(item => 
    selectedBranchId === 'all' || item.branchId === selectedBranchId
  );
  const inventoryStats = {
    total: branchInventory.length,
    lowStock: branchInventory.filter(i => i.stock > 0 && i.stock < 20).length,
    outOfStock: branchInventory.filter(i => i.stock === 0).length,
    inStock: branchInventory.filter(i => i.stock >= 20).length,
  };

  const inventoryPieData = [
    { name: 'In Stock', value: inventoryStats.inStock, color: '#22c55e' },
    { name: 'Low Stock', value: inventoryStats.lowStock, color: '#f97316' },
    { name: 'Out of Stock', value: inventoryStats.outOfStock, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Colors for Top 5 products list + product sales graph (keep consistent)
  const TOP_PRODUCT_COLORS = ['#78909c', '#9ccc65', '#42a5f5', '#ec407a', '#8b5cf6'] as const;
  const popularHasSignal = popularMenuItems.some((x) =>
    Number(x.total_revenue ?? 0) > 0 || Number(x.total_quantity ?? 0) > 0 || Number(x.order_count ?? 0) > 0
  );
  const displayedPopularMenuItems = popularHasSignal ? popularMenuItems : SAMPLE_POPULAR_MENU_ITEMS;
  const top5PopularMenuItems = displayedPopularMenuItems.slice(0, 5);
  const PRODUCT_SERIES_DAYS = 30;
  const mulberry32 = (seed: number) => {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const productKeyToName = Object.fromEntries(
    top5PopularMenuItems.map((p, idx) => [`p${idx}`, p.MENU_NAME])
  ) as Record<string, string>;

  const productSalesStackedChartData = (() => {
    // Build last N day labels (like restaurantAdmin glance view)
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (PRODUCT_SERIES_DAYS - 1));

    const labels: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      labels.push(
        d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
      );
    }

    // Deterministic per-branch seed so it doesn't "shuffle" on re-render
    const seedBase = (selectedBranchId ?? 'all')
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    // Distribute each product's total revenue across days using random weights
    const seriesByProduct = top5PopularMenuItems.map((item, pIdx) => {
      const rnd = mulberry32(seedBase * 100 + (pIdx + 1) * 999);
      const weights = Array.from({ length: labels.length }, (_, dayIdx) => {
        // Add a subtle weekly pattern (weekends a bit higher)
        const date = new Date(start);
        date.setDate(start.getDate() + dayIdx);
        const dow = date.getDay(); // 0=Sun ... 6=Sat
        const weekendBoost = dow === 0 || dow === 6 ? 1.25 : 1.0;
        return (0.65 + rnd() * 0.9) * weekendBoost;
      });
      const sumW = weights.reduce((a, b) => a + b, 0) || 1;
      const total = Math.max(0, Number(item.total_revenue ?? 0));
      return weights.map((w) => Math.round((w / sumW) * total));
    });

    return labels.map((label, dayIdx) => {
      const row: Record<string, string | number> = { name: label };
      seriesByProduct.forEach((series, pIdx) => {
        row[`p${pIdx}`] = series[dayIdx] ?? 0;
      });
      return row as { name: string } & Record<string, number>;
    });
  })();

  const salesChartHasSignal = chartData.some((x) => Number(x.sales ?? 0) > 0);
  const displayedSalesChartData = (!chartData.length || !salesChartHasSignal || !!chartError)
    ? SALES_CHART_DATA
    : chartData;

  const paymentMethodExportRows: PaymentMethodExportRow[] = SAMPLE_PAYMENT_METHOD_EXPORT;
  const formatPeso = (amount: number) =>
    `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {branchName !== 'All Branches' ? `${branchName} ${t('dashboard')}` : t('network_overview')}
          </h1>
          <p className="text-sm md:text-base text-slate-500">
            {currentBranch && currentBranch.BRANCH_NAME
              ? `Management for: ${currentBranch.ADDRESS || '—'}`
              : t('chain_wide_insights')}
          </p>
        </div>
        {isKimsBrothersDashboard && (
          <button 
            onClick={generateAIReport}
            disabled={loadingAI}
            className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 w-full md:w-auto"
          >
            {loadingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span className="text-sm md:text-base">{t('ai_intelligence')}</span>
          </button>
        )}
      </div>

      {/* Simple 4-card KPI display - Available ONLY for Daraejung branch */}
      {isDaraejungBranch && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statsLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between animate-pulse">
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
                <div className="h-8 bg-slate-200 rounded w-28" />
              </div>
              <div className="w-14 h-14 bg-slate-100 rounded-xl" />
            </div>
          ))
        ) : stats ? (
          <>
            <StatCard 
              title="Today's Revenue" 
              value={`₱${(stats.todaysRevenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
              icon={DollarSign} 
              color="bg-blue-500" 
            />
            <StatCard 
              title="Total Orders" 
              value={(stats.totalOrders || 0).toLocaleString()} 
              icon={Receipt} 
              color="bg-blue-500" 
            />
            <StatCard 
              title="Active Tables" 
              value={(stats.activeTables || 0).toLocaleString()} 
              icon={Store} 
              color="bg-blue-500" 
            />
            <StatCard 
              title="Pending Orders" 
              value={(stats.pendingOrders || 0).toLocaleString()} 
              icon={Info} 
              color="bg-blue-500" 
            />
          </>
        ) : (
          <>
            <StatCard title="Today's Revenue" value="₱0.00" icon={DollarSign} color="bg-blue-500" />
            <StatCard title="Total Orders" value="0" icon={Receipt} color="bg-blue-500" />
            <StatCard title="Active Tables" value="0" icon={Store} color="bg-blue-500" />
            <StatCard title="Pending Orders" value="0" icon={Info} color="bg-blue-500" />
          </>
        )}
      </div>
      )}

      {/* Show message if not Kim's Brothers - advanced analytics not available */}
      {!statsLoading && selectedBranchId !== 'all' && !isKimsBrothersDashboard && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <Info className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                Advanced Analytics Not Available
              </h2>
              <p className="text-sm md:text-base text-slate-600 max-w-md">
                Advanced analytics, charts, and detailed reports are currently only available for Kim's Brothers branch. 
                This branch does not have advanced analytics data at this time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Show advanced analytics content only for Kim's Brothers or "all" branches */}
      {(isKimsBrothersDashboard || selectedBranchId === 'all') && (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
        {kpisLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between animate-pulse">
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
                <div className="h-8 bg-slate-200 rounded w-28" />
              </div>
              <div className="w-14 h-14 bg-slate-100 rounded-xl" />
            </div>
          ))
        ) : kpis ? (
          <>
            <StatCard title={t('total_sales')} value={`₱${kpis.totalSales.value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} changeAmount={kpis.totalSales.change} changePercent={kpis.totalSales.changePercent} color="bg-green-500" />
            <StatCard title={t('refund')} value={`₱${kpis.refund.value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={RefreshCw} changeAmount={kpis.refund.change} changePercent={kpis.refund.changePercent} color="bg-slate-500" />
            <StatCard title={t('discount')} value={`₱${kpis.discount.value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={Tag} changeAmount={kpis.discount.change} changePercent={kpis.discount.changePercent} color="bg-amber-500" />
            <StatCard title={t('net_sales')} value={`₱${kpis.netSales.value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={TrendingUp} changeAmount={kpis.netSales.change} changePercent={kpis.netSales.changePercent} color="bg-blue-600" />
            <StatCard title={t('expenses')} value={`₱${kpis.expense.value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={Receipt} changeAmount={kpis.expense.change} changePercent={kpis.expense.changePercent} color="bg-orange-500" />
            <StatCard title={t('gross_profit')} value={`₱${kpis.grossProfit.value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={CircleDollarSign} changeAmount={kpis.grossProfit.change} changePercent={kpis.grossProfit.changePercent} color="bg-emerald-600" />
          </>
        ) : (
          <>
            <StatCard title={t('total_sales')} value={`₱${totalRevenue.toLocaleString()}`} icon={DollarSign} color="bg-green-500" />
            <StatCard title={t('refund')} value="₱0.00" icon={RefreshCw} color="bg-slate-500" />
            <StatCard title={t('discount')} value="₱0.00" icon={Tag} color="bg-amber-500" />
            <StatCard title={t('net_sales')} value={`₱${totalRevenue.toLocaleString()}`} icon={TrendingUp} color="bg-blue-600" />
            <StatCard title={t('expenses')} value={`₱${totalExpenses.toLocaleString()}`} icon={Receipt} color="bg-orange-500" />
            <StatCard title={t('gross_profit')} value={`₱${profit.toLocaleString()}`} icon={CircleDollarSign} color="bg-emerald-600" />
          </>
        )}
      </div>

      {aiReport && (
        <div className="bg-orange-50 border border-orange-100 p-4 md:p-6 rounded-2xl animate-in zoom-in duration-300">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
            <h2 className="text-base md:text-lg font-bold text-orange-900">
              AI Strategic Insights
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <p className="text-sm md:text-base text-orange-800 leading-relaxed mb-4">{aiReport.summary}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiReport.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-orange-200 text-xs md:text-sm text-orange-700 flex items-start space-x-2">
                    <span className="bg-orange-600 text-white w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">{idx + 1}</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-orange-200 flex flex-col justify-center items-center text-center">
              <div className="bg-red-100 p-3 rounded-full mb-2">
                <ArrowDownRight className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
              </div>
              <h3 className="text-xs md:text-sm font-bold text-slate-800 mb-0.5">Focus Required:</h3>
              <p className="text-sm md:text-base text-red-600 font-bold">{aiReport.urgentBranch}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Total sales: time-series chart (same as restaurantAdmin Total sales chart) */}
        <div className="xl:col-span-2 group relative bg-white p-4 md:p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
          {/* Premium gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600" />
          
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.02] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          
          <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
            <h2 className="text-lg md:text-xl font-bold text-slate-900">{t('total_sales')} · {currentContextName}</h2>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="w-2.5 h-2.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full shadow-sm"></div>
              <span className="text-[10px] md:text-xs text-emerald-700 font-semibold">{t('total_sales')}</span>
            </div>
          </div>
          <div className="relative h-64 md:h-80 min-h-[256px]">
            {/* Shine effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent z-10 pointer-events-none" />
            {chartLoading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320} minWidth={0}>
                <BarChart data={displayedSalesChartData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 11, fontWeight: 500}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 11, fontWeight: 500}}
                    tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(34, 197, 94, 0.1)', stroke: '#22c55e', strokeWidth: 1}}
                    contentStyle={{
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)',
                      backgroundColor: 'white',
                      padding: '12px 16px'
                    }}
                    formatter={(value: number) => [`₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, t('total_sales')]}
                    labelStyle={{fontWeight: 600, color: '#1e293b', marginBottom: '4px'}}
                  />
                  <Bar 
                    dataKey="sales" 
                    name={t('total_sales')} 
                    fill="url(#salesGradient)" 
                    radius={[6, 6, 0, 0]} 
                    barSize={window.innerWidth < 768 ? 14 : 24}
                    style={{filter: 'drop-shadow(0 2px 4px rgba(34, 197, 94, 0.2))'}}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Performing Branches (real data) */}
        <div className="group relative bg-white p-4 md:p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
          {/* Premium gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />
          
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.02] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          
          <div className="relative flex items-center justify-between mb-6">
            <h2 className="text-lg md:text-xl font-bold text-slate-900">{t('top_performing')}</h2>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg blur-sm opacity-30" />
              <div className="relative bg-gradient-to-br from-yellow-400 to-amber-500 p-2 rounded-lg shadow-lg">
                <Trophy className="w-5 h-5 text-white drop-shadow-sm" />
              </div>
            </div>
          </div>
          <div className="relative space-y-3">
            {topBranchesData.map((branch, index) => (
              <div key={branch.id} className="group/item relative flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-white to-slate-50/50 hover:from-slate-50 hover:to-emerald-50/30 transition-all duration-300 border border-slate-100 hover:border-emerald-200 hover:shadow-md">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className={`relative flex-shrink-0 ${
                    index === 0 ? 'w-9 h-9 bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg' : 
                    index === 1 ? 'w-9 h-9 bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md' :
                    index === 2 ? 'w-9 h-9 bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md' : 
                    'w-9 h-9 bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600'
                  } rounded-full flex items-center justify-center font-bold text-xs`}>
                    {index === 0 && (
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 to-amber-400 rounded-full blur-sm opacity-50" />
                    )}
                    <span className="relative z-10">{index + 1}</span>
                  </div>
                  <div className="truncate flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate mb-0.5">{branch.name}</p>
                    <p className="text-[10px] text-slate-500 flex items-center">
                      <MapPin className="w-2.5 h-2.5 mr-1 text-slate-400" />
                      <span className="truncate">{(branch.address ?? '').split(',')[0] || '—'}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-sm font-bold text-emerald-700 tabular-nums">₱{(branch.revenue / 1000).toFixed(1)}k</p>
                    <p className="text-[9px] text-emerald-600 font-medium">{t('revenue')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="relative w-full mt-5 py-3 text-[10px] font-bold text-slate-600 hover:text-orange-600 transition-colors border-t border-slate-100 hover:border-orange-200 uppercase tracking-wider group/btn">
            <span className="relative z-10">{t('view_all_rank')}</span>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          </button>
          
          {/* Shine effect on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Top 5 Products + Sales graph by product (restaurantAdmin-style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="group relative bg-white p-5 md:p-6 rounded-2xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
          {/* Premium gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />
          
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900" />
          
          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/30 to-pink-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative flex items-center justify-between mb-5">
            <h2 className="text-lg md:text-xl font-bold text-slate-900">{t('top_5_products')}</h2>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-rose-500 rounded-xl blur-md opacity-40" />
              <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 p-2.5 rounded-xl shadow-lg">
                <Trophy className="w-5 h-5 text-white drop-shadow-md" />
              </div>
            </div>
          </div>
          
          <div className="relative mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
              <div className="w-1.5 h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{currentContextName} · Last 7 days</p>
            </div>
          </div>
          
          {popularMenuItemsLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="relative space-y-0">
              <div className="flex justify-between items-center mb-3 px-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{t('net_sales')}</span>
              </div>
              {top5PopularMenuItems.map((item, index) => (
                <div
                  key={item.IDNo}
                  className={`group/item relative flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 ${
                    index < 4 ? 'border-b border-slate-100' : ''
                  } hover:bg-gradient-to-r hover:from-slate-50 hover:to-purple-50/30 hover:shadow-sm hover:border-purple-100`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative flex-shrink-0">
                      <div 
                        className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white"
                        style={{ backgroundColor: TOP_PRODUCT_COLORS[index] ?? '#94a3b8' }}
                      />
                      {index === 0 && (
                        <div 
                          className="absolute inset-0 rounded-full blur-sm opacity-50 animate-pulse"
                          style={{ backgroundColor: TOP_PRODUCT_COLORS[index] ?? '#94a3b8' }}
                        />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-slate-900 truncate">{item.MENU_NAME}</span>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    <div className="px-3 py-1.5 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200 group-hover/item:from-purple-50 group-hover/item:to-pink-50 group-hover/item:border-purple-200 transition-all">
                      <span className="text-sm font-bold text-slate-900 tabular-nums">
                        ₱{Number(item.total_revenue ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Shine effect on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        </div>
        <div className="lg:col-span-2 group relative bg-white p-5 md:p-6 rounded-2xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
          {/* Premium gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900" />
          
          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-3">
            <h2 className="text-lg md:text-xl font-bold text-slate-900">{t('sales_graph_by_product')}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {top5PopularMenuItems.slice(0, 5).map((item, idx) => (
                <div key={item.IDNo} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200">
                  <div 
                    className="w-2 h-2 rounded-full shadow-sm ring-1 ring-white"
                    style={{ backgroundColor: TOP_PRODUCT_COLORS[idx] ?? '#94a3b8' }}
                  />
                  <span className="text-[9px] font-semibold text-slate-700 truncate max-w-[60px]">{item.MENU_NAME}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
              <div className="w-1.5 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{currentContextName} · Last 7 days</p>
            </div>
          </div>
          
          <div className="relative h-64 md:h-80 min-h-[240px]">
            {/* Shine effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/15 to-transparent z-10 pointer-events-none" />
            
            {popularMenuItemsLoading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <BarChart data={productSalesStackedChartData} margin={{ left: 8, right: 16, bottom: 24 }}>
                  <defs>
                    {top5PopularMenuItems.map((item, idx) => {
                      const color = TOP_PRODUCT_COLORS[idx] ?? '#94a3b8';
                      const rgb = color.startsWith('#') 
                        ? {
                            r: parseInt(color.slice(1, 3), 16),
                            g: parseInt(color.slice(3, 5), 16),
                            b: parseInt(color.slice(5, 7), 16)
                          }
                        : { r: 148, g: 163, b: 184 };
                      return (
                        <linearGradient key={item.IDNo} id={`productGradient${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} stopOpacity={1} />
                          <stop offset="100%" stopColor={`rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`} stopOpacity={0.85} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                    angle={-45}
                    textAnchor="end"
                    height={52}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(v) => `₱${(Number(v) / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)', stroke: '#94a3b8', strokeWidth: 1 }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)',
                      backgroundColor: 'white',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}
                    labelFormatter={(label) => String(label)}
                    formatter={(value: number, name: string) => [
                      `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      productKeyToName[name] ?? name,
                    ]}
                  />
                  {top5PopularMenuItems.map((item, idx) => (
                    <Bar
                      key={item.IDNo}
                      dataKey={`p${idx}`}
                      stackId="products"
                      fill={`url(#productGradient${idx})`}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                      style={{filter: `drop-shadow(0 2px 4px rgba(${TOP_PRODUCT_COLORS[idx] ? 
                        (() => {
                          const c = TOP_PRODUCT_COLORS[idx];
                          if (c.startsWith('#')) {
                            return `${parseInt(c.slice(1, 3), 16)}, ${parseInt(c.slice(3, 5), 16)}, ${parseInt(c.slice(5, 7), 16)}`;
                          }
                          return '148, 163, 184';
                        })() : '148, 163, 184'}, 0.2))`}}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods (EXPORT) - Ultra Premium Design */}
      <div className="group relative bg-white rounded-2xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
        {/* Premium gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02] bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900" />
        
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-100/40 to-teal-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        {/* Premium Header */}
        <div className="relative flex items-center gap-3 px-5 md:px-7 py-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-transparent">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl blur-sm opacity-40" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-lg">
              EX
            </div>
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900">EXPORT</h2>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Payment Methods Summary</p>
          </div>
        </div>

        {/* Premium Table */}
        <div className="relative overflow-x-auto">
          <table className="min-w-[760px] w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 via-slate-100/50 to-slate-50 border-b-2 border-slate-200">
                <th className="text-left px-5 md:px-7 py-4 text-[10px] md:text-xs text-slate-700 font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                    <span>Payment Method</span>
                  </div>
                </th>
                <th className="text-right px-4 py-4 text-[10px] md:text-xs text-slate-700 font-bold uppercase tracking-wider">Payment Transaction</th>
                <th className="text-right px-4 py-4 text-[10px] md:text-xs text-slate-700 font-bold uppercase tracking-wider">Payment Amount</th>
                <th className="text-right px-4 py-4 text-[10px] md:text-xs text-slate-700 font-bold uppercase tracking-wider">Refund Transaction</th>
                <th className="text-right px-4 py-4 text-[10px] md:text-xs text-slate-700 font-bold uppercase tracking-wider">Refund Amount</th>
                <th className="text-right px-5 md:px-7 py-4 text-[10px] md:text-xs text-slate-700 font-bold uppercase tracking-wider">
                  <div className="flex items-center justify-end gap-2">
                    <span>Net Amount</span>
                    <div className="w-1 h-4 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentMethodExportRows.map((row, index) => (
                <tr
                  key={row.payment_method}
                  className={`group/row transition-all duration-200 ${
                    row.is_total 
                      ? 'bg-gradient-to-r from-slate-100 via-emerald-50/30 to-slate-100 font-bold text-slate-900 border-t-2 border-emerald-200' 
                      : 'hover:bg-gradient-to-r hover:from-slate-50 hover:via-emerald-50/20 hover:to-slate-50 text-slate-700'
                  }`}
                >
                  <td className={`px-5 md:px-7 py-4 ${row.is_total ? 'text-base' : 'text-sm font-medium'}`}>
                    <div className="flex items-center gap-2">
                      {!row.is_total && (
                        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 opacity-60" />
                      )}
                      <span className={row.is_total ? 'uppercase tracking-wide' : ''}>{row.payment_method}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-4 text-right tabular-nums ${row.is_total ? 'text-base' : 'text-sm'}`}>
                    <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 group-hover/row:bg-blue-50 transition-colors">
                      {row.payment_transaction.toLocaleString()}
                    </span>
                  </td>
                  <td className={`px-4 py-4 text-right tabular-nums ${row.is_total ? 'text-base' : 'text-sm'}`}>
                    <span className={`inline-block px-2.5 py-1 rounded-md font-semibold ${
                      row.is_total 
                        ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800' 
                        : 'bg-emerald-50 text-emerald-700 group-hover/row:bg-emerald-100 transition-colors'
                    }`}>
                      {formatPeso(row.payment_amount)}
                    </span>
                  </td>
                  <td className={`px-4 py-4 text-right tabular-nums ${row.is_total ? 'text-base' : 'text-sm'}`}>
                    <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 group-hover/row:bg-orange-50 transition-colors">
                      {row.refund_transaction.toLocaleString()}
                    </span>
                  </td>
                  <td className={`px-4 py-4 text-right tabular-nums ${row.is_total ? 'text-base' : 'text-sm'}`}>
                    <span className={`inline-block px-2.5 py-1 rounded-md font-semibold ${
                      row.is_total 
                        ? 'bg-gradient-to-r from-red-100 to-orange-100 text-red-800' 
                        : row.refund_amount > 0
                        ? 'bg-red-50 text-red-700 group-hover/row:bg-red-100 transition-colors'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {formatPeso(row.refund_amount)}
                    </span>
                  </td>
                  <td className={`px-5 md:px-7 py-4 text-right tabular-nums ${row.is_total ? 'text-base md:text-lg' : 'text-sm font-semibold'}`}>
                    <span className={`inline-block px-3 py-1.5 rounded-lg font-bold ${
                      row.is_total 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg' 
                        : 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-200 group-hover/row:from-emerald-100 group-hover/row:to-teal-100 transition-all'
                    }`}>
                      {formatPeso(row.net_amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      </div>

      {/* (Temporarily removed) Inventory Health, Cost Analysis, Efficiency */}
        </>
      )}
    </div>
  );
};

export default Dashboard;
