import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie 
} from 'recharts';
import { 
  DollarSign, Store, Sparkles, Loader2, 
  TrendingUp, Package, ArrowDownRight, 
  ArrowUpRight, Info, Trophy, MapPin, RefreshCw
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { MOCK_BRANCHES, MOCK_INVENTORY } from '../constants';
import { getAIInsights } from '../services/geminiService';
import {
  getDashboardStats,
  getRevenueReport,
  revenueReportToChartData,
  getPopularMenuItems,
  type DashboardStats,
  type PopularMenuItem,
} from '../services/dashboardService';
import { getBranches } from '../services/branchService';

interface DashboardProps {
  selectedBranchId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedBranchId }) => {
  const [aiReport, setAiReport] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string>('All Branches');
  const [chartData, setChartData] = useState<{ name: string; sales: number; expenses: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [topBranchesData, setTopBranchesData] = useState<{ id: string; name: string; address: string | null; revenue: number }[]>([]);
  const [topBranchesLoading, setTopBranchesLoading] = useState(true);
  const [popularMenuItems, setPopularMenuItems] = useState<PopularMenuItem[]>([]);
  const [popularMenuItemsLoading, setPopularMenuItemsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await getDashboardStats(selectedBranchId);
      setStats(res.stats);
      setBranchName(res.currentBranch?.BRANCH_NAME ?? 'All Branches');
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Failed to load dashboard');
      setStats(null);
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

  // Context name: from API when single branch, else "All Branches"
  const currentContextName = selectedBranchId === 'all' ? 'All Branches' : branchName;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {selectedBranchId === 'all' ? "Network Overview" : `${branchName} Dashboard`}
          </h1>
          <p className="text-sm md:text-base text-slate-500">
            {selectedBranchId === 'all' 
              ? "Chain-wide enterprise insights." 
              : `Management for: ${branchName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadStats(); loadChart(); loadTopBranches(); loadPopularMenuItems(); }}
            disabled={statsLoading || chartLoading}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            title="Refresh stats and chart"
          >
            <RefreshCw className={`w-5 h-5 ${(statsLoading || chartLoading) ? 'animate-spin' : ''}`} />
            <span className="text-sm md:text-base">Refresh</span>
          </button>
          <button 
            onClick={generateAIReport}
            disabled={loadingAI}
            className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 w-full md:w-auto"
          >
            {loadingAI ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span className="text-sm md:text-base">AI Intelligence</span>
          </button>
        </div>
      </div>

      {statsError && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{statsError}</span>
          <button onClick={loadStats} className="text-red-600 font-semibold hover:underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Today's Revenue" 
          value={statsLoading ? '—' : `₱${Number(totalRevenue).toLocaleString()}`} 
          icon={DollarSign} 
          trend={statsLoading ? '' : 'From billing'} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Today's Orders" 
          value={statsLoading ? '—' : String(totalOrders)} 
          icon={TrendingUp} 
          trend={statsLoading ? '' : 'Order items today'} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Active Tables" 
          value={statsLoading ? '—' : String(activeTables)} 
          icon={Store} 
          trend={statsLoading ? '' : 'Occupied'} 
          color="bg-purple-500" 
        />
        <StatCard 
          title="Pending Orders" 
          value={statsLoading ? '—' : String(pendingOrders)} 
          icon={Package} 
          trend={statsLoading ? '' : 'Kitchen queue'} 
          color="bg-red-500" 
        />
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
        {/* Cash Flow: Revenue (last 7 days from API) */}
        <div className="xl:col-span-2 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
            <h2 className="text-lg font-bold text-slate-900">Cash Flow: {currentContextName}</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-orange-500 rounded-full"></div>
                <span className="text-[10px] md:text-xs text-slate-500 font-medium">Revenue</span>
              </div>
              <span className="text-[10px] md:text-xs text-slate-400">Last 7 days</span>
            </div>
          </div>
          <div className="h-64 md:h-80 min-h-[256px]">
            {chartLoading ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : chartError ? (
              <div className="w-full h-full flex items-center justify-center text-red-600 text-sm">
                {chartError}
              </div>
            ) : !chartData.length ? (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                No revenue data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320} minWidth={0}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [`₱${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="sales" name="Revenue" fill="#f97316" radius={[4, 4, 0, 0]} barSize={window.innerWidth < 768 ? 12 : 20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Performing Branches (real data) */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Top Performing</h2>
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          {topBranchesLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : topBranchesData.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No branch data</p>
          ) : (
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
                        {(branch.address || '—').split(',')[0]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-600">₱{Number(branch.revenue).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Today</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Inventory Analytics */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Inventory Health</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{currentContextName}</p>
            </div>
            <Info className="w-4 h-4 text-slate-400 cursor-help" />
          </div>
          
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="h-40 w-40 min-h-[160px] min-w-[160px]">
                <PieChart width={160} height={160}>
                  <Pie
                    data={inventoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {inventoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-900">{inventoryStats.total}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Items</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { label: 'Optimal Stock', val: inventoryStats.inStock, color: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
              { label: 'Low Stock Alert', val: inventoryStats.lowStock, color: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
              { label: 'Out of Stock', val: inventoryStats.outOfStock, color: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
            ].map(row => (
              <div key={row.label} className={`flex items-center justify-between p-2.5 rounded-xl border border-slate-50 ${row.color}`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${row.dot}`}></div>
                  <span className="text-[10px] font-bold uppercase tracking-tight">{row.label}</span>
                </div>
                <span className="font-bold text-sm">{row.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Analysis */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Cost Analysis</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-6">{currentContextName}</p>
          
          <div className="space-y-6">
            {costBreakdownData.map((item, idx) => (
              <div key={item.name}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-600">{item.name}</span>
                  <span className="text-xs font-bold text-slate-900">₱{item.value.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${['bg-orange-500', 'bg-blue-500', 'bg-purple-500'][idx]}`} 
                    style={{ width: `${(item.value / totalExpenses * 100).toFixed(0)}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 font-bold">{(item.value / totalExpenses * 100).toFixed(1)}% of total OpEx</p>
              </div>
            ))}
            
            <div className="pt-4 border-t border-slate-100 mt-auto">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">Total Expenses</span>
                <span className="text-sm font-bold text-slate-900">₱{totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance & Efficiency */}
        <div className="md:col-span-2 xl:col-span-1 bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden flex flex-col justify-between group">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <Store className="w-32 h-32" />
           </div>
           
           <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-6">
                <div className="bg-orange-500 p-2 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base md:text-lg font-bold truncate">Efficiency: {currentContextName}</h3>
              </div>
              
              <div className="space-y-6">
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] text-white/50 font-bold uppercase mb-1">Growth Forecast</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">+18.4%</span>
                      <ArrowUpRight className="w-5 h-5 text-green-400" />
                    </div>
                 </div>
                 
                 <div>
                    <div className="flex justify-between text-[10px] mb-2 uppercase font-bold text-white/50">
                      <span>Network Score</span>
                      <span className="text-orange-400">Optimal</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 h-full w-[88%] rounded-full shadow-[0_0_12px_rgba(249,115,22,0.4)]"></div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="relative z-10 mt-10 pt-6 border-t border-white/10">
              <div className="flex items-center space-x-3">
                 <div className="flex -space-x-2">
                    {[1,2,3].map(i => <img key={i} src={`https://picsum.photos/24/24?random=${i}`} className="w-6 h-6 rounded-full border border-slate-900" />)}
                 </div>
                 <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate">Live Activity Feed</span>
              </div>
           </div>
        </div>

        {/* Bestsellers (last 7 days from API) */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Bestsellers</h2>
            <Package className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-4">{currentContextName} · Last 7 days</p>
          {popularMenuItemsLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : popularMenuItems.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No orders in this period</p>
          ) : (
            <div className="space-y-3">
              {popularMenuItems.map((item, index) => (
                <div key={item.IDNo} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-900 truncate">{item.MENU_NAME}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs font-bold text-slate-700">{item.total_quantity} sold</p>
                    <p className="text-[10px] text-slate-500">₱{Number(item.total_revenue || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
