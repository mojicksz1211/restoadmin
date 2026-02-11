
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
        <div className="xl:col-span-2 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
            <h2 className="text-lg font-bold text-slate-900">{t('total_sales')} · {currentContextName}</h2>
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full"></div>
              <span className="text-[10px] md:text-xs text-slate-500 font-medium">{t('total_sales')}</span>
            </div>
          </div>
          <div className="h-64 md:h-80 min-h-[256px]">
            {chartLoading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320} minWidth={0}>
                <BarChart data={displayedSalesChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [`₱${Number(value).toLocaleString()}`, t('total_sales')]}
                  />
                  <Bar dataKey="sales" name={t('total_sales')} fill="#22c55e" radius={[4, 4, 0, 0]} barSize={window.innerWidth < 768 ? 12 : 20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Performing Branches (real data) */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">{t('top_performing')}</h2>
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="space-y-4">
            {topBranchesData.map((branch, index) => (
              <div key={branch.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    index === 1 ? 'bg-slate-200 text-slate-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-900 truncate">{branch.name}</p>
                    <p className="text-[10px] text-slate-400 flex items-center">
                      <MapPin className="w-2.5 h-2.5 mr-0.5" />
                      {(branch.address ?? '').split(',')[0] || '—'}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-green-600">₱{(branch.revenue / 1000).toFixed(1)}k</p>
                  <p className="text-[10px] text-slate-400 font-medium">{t('revenue')}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-3 text-[10px] font-bold text-slate-500 hover:text-orange-500 transition-colors border-t border-slate-50 uppercase tracking-wider">
            {t('view_all_rank')}
          </button>
        </div>
      </div>

      {/* Top 5 Products + Sales graph by product (restaurantAdmin-style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">{t('top_5_products')}</h2>
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-4">{currentContextName} · Last 7 days</p>
          {popularMenuItemsLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-0">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] text-slate-400 font-medium">{t('net_sales')}</span>
              </div>
              {top5PopularMenuItems.map((item, index) => (
                <div
                  key={item.IDNo}
                  className={`flex items-center justify-between py-3 ${index < 4 ? 'border-b border-slate-100' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: TOP_PRODUCT_COLORS[index] ?? '#94a3b8' }}
                    />
                    <span className="text-sm font-medium text-slate-900 truncate">{item.MENU_NAME}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800 flex-shrink-0 ml-2">
                    ₱{Number(item.total_revenue ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
            <h2 className="text-lg font-bold text-slate-900">{t('sales_graph_by_product')}</h2>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-4">{currentContextName} · Last 7 days</p>
          <div className="h-64 md:h-80 min-h-[240px]">
            {popularMenuItemsLoading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
                <BarChart data={productSalesStackedChartData} margin={{ left: 8, right: 16, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                    angle={-45}
                    textAnchor="end"
                    height={52}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(v) => `₱${Number(v).toLocaleString()}`}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(label) => String(label)}
                    formatter={(value: number, name: string) => [
                      `₱${Number(value).toLocaleString()}`,
                      productKeyToName[name] ?? name,
                    ]}
                  />
                  {top5PopularMenuItems.map((item, idx) => (
                    <Bar
                      key={item.IDNo}
                      dataKey={`p${idx}`}
                      stackId="products"
                      fill={TOP_PRODUCT_COLORS[idx] ?? '#94a3b8'}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods (EXPORT) - restaurantAdmin-style */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 md:px-6 py-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
            EX
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-900">EXPORT</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full">
            <thead className="bg-slate-50">
              <tr className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wide">
                <th className="text-left px-4 md:px-6 py-3">payment method</th>
                <th className="text-right px-4 py-3">Payment Transaction</th>
                <th className="text-right px-4 py-3">Payment amount</th>
                <th className="text-right px-4 py-3">refund transaction</th>
                <th className="text-right px-4 py-3">Refund amount</th>
                <th className="text-right px-4 md:px-6 py-3">net amount</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paymentMethodExportRows.map((row) => (
                <tr
                  key={row.payment_method}
                  className={`border-t border-slate-100 ${
                    row.is_total ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-700'
                  }`}
                >
                  <td className="px-4 md:px-6 py-3">{row.payment_method}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.payment_transaction.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPeso(row.payment_amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.refund_transaction.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPeso(row.refund_amount)}</td>
                  <td className="px-4 md:px-6 py-3 text-right tabular-nums">{formatPeso(row.net_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* (Temporarily removed) Inventory Health, Cost Analysis, Efficiency */}
        </>
      )}
    </div>
  );
};

export default Dashboard;
