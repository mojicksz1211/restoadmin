
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  DollarSign, Store, Sparkles, Loader2, 
  TrendingUp, ArrowDownRight, 
  Info, Trophy, MapPin,
  Tag, Receipt, CircleDollarSign,
  CheckCircle2, AlertCircle, Lightbulb,
  Coffee, UtensilsCrossed, ChefHat,
  ShoppingBag, ExternalLink, X, Download, MoreVertical, User, ChevronDown, Check, Clock, Search, FileText, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import StatCard from '../components/StatCard';
import { 
  StatCardSkeleton, 
  ChartLoadingSkeleton,
  TableSkeleton
} from '../components/LoadingSkeletons';
import { MOCK_BRANCHES, SALES_CHART_DATA } from '../constants';
import { getAIInsights, type AIAnalysisResult } from '../services/geminiService';
import {
  getDashboardStats,
  getRevenueReport,
  revenueReportToChartData,
  getPopularMenuItems,
  getDailySalesByProduct,
  getDashboardKpis,
  getBestsellerByPeriod,
  getPaymentMethodsSummary,
  SAMPLE_POPULAR_MENU_ITEMS,
  SAMPLE_PAYMENT_METHOD_EXPORT,
  type PaymentMethodExportRow,
  type DashboardStats,
  type DashboardKpis,
  type PopularMenuItem,
  type BestsellerByPeriod,
  type DailySalesByProductItem,
} from '../services/dashboardService';
import { getBranches } from '../services/branchService';
import { withMinimumDelay } from '../utils/loadingDelay';

interface DashboardProps {
  selectedBranchId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedBranchId }) => {
  const { t } = useTranslation('common');
  const [aiReport, setAiReport] = useState<AIAnalysisResult | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [branchName, setBranchName] = useState<string>('All Branches');
  const [currentBranch, setCurrentBranch] = useState<{ BRANCH_NAME?: string; ADDRESS?: string | null } | null>(null);
  const [chartData, setChartData] = useState<{ name: string; sales: number; expenses: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [topBranchesData, setTopBranchesData] = useState<{ id: string; name: string; address: string | null; revenue: number }[]>([]);
  const [topBranchesLoading, setTopBranchesLoading] = useState(true);
  const [popularMenuItems, setPopularMenuItems] = useState<PopularMenuItem[]>([]);
  const [popularMenuItemsLoading, setPopularMenuItemsLoading] = useState(true);
  const [dailySalesByProduct, setDailySalesByProduct] = useState<DailySalesByProductItem[]>([]);
  const [dailySalesLoading, setDailySalesLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [bestsellersByPeriod, setBestsellersByPeriod] = useState<BestsellerByPeriod[]>([]);
  const [bestsellersLoading, setBestsellersLoading] = useState(true);
  const [paymentMethodsSummary, setPaymentMethodsSummary] = useState<PaymentMethodExportRow[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [paymentMethodsDate, setPaymentMethodsDate] = useState<string>(() => 
    new Date().toISOString().slice(0, 10)
  );

  const [isKimsBrothersDashboard, setIsKimsBrothersDashboard] = useState<boolean>(false);
  const [isDaraejungBranch, setIsDaraejungBranch] = useState<boolean>(false);
  
  // KimsBrother Total Sales Chart Controls
  const [kimsBrotherChartDateStart, setKimsBrotherChartDateStart] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [kimsBrotherChartDateEnd, setKimsBrotherChartDateEnd] = useState<string>(() => 
    new Date().toISOString().slice(0, 10)
  );
  const [kimsBrotherChartType, setKimsBrotherChartType] = useState<'bar' | 'line'>('line');
  const [kimsBrotherChartPeriod, setKimsBrotherChartPeriod] = useState<'glance' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('glance');
  const [kimsBrotherChartTypeDropdownOpen, setKimsBrotherChartTypeDropdownOpen] = useState<boolean>(false);
  const [kimsBrotherChartPeriodDropdownOpen, setKimsBrotherChartPeriodDropdownOpen] = useState<boolean>(false);
  const kimsBrotherDatePickerRef = useRef<HTMLInputElement>(null);
  const kimsBrotherFlatpickrInstance = useRef<ReturnType<typeof flatpickr> | null>(null);
  
  // Total Sales Detail Modal
  const [totalSalesDetailModalOpen, setTotalSalesDetailModalOpen] = useState<boolean>(false);
  const [totalSalesDetailData, setTotalSalesDetailData] = useState<any[]>([]);
  const [totalSalesDetailLoading, setTotalSalesDetailLoading] = useState<boolean>(false);
  const [totalSalesDetailPage, setTotalSalesDetailPage] = useState<number>(1);
  const [totalSalesDetailPageSize, setTotalSalesDetailPageSize] = useState<number>(10);
  
  // Sales by Category Modal
  const [salesByCategoryModalOpen, setSalesByCategoryModalOpen] = useState<boolean>(false);
  const [salesByCategoryData, setSalesByCategoryData] = useState<any[]>([]);
  const [salesByCategoryLoading, setSalesByCategoryLoading] = useState<boolean>(false);
  const [salesByCategoryDateStart, setSalesByCategoryDateStart] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [salesByCategoryDateEnd, setSalesByCategoryDateEnd] = useState<string>(() => 
    new Date().toISOString().slice(0, 10)
  );
  const [salesByCategoryPage, setSalesByCategoryPage] = useState<number>(1);
  const [salesByCategoryPageSize, setSalesByCategoryPageSize] = useState<number>(10);
  const [salesByCategoryEmployeeFilter, setSalesByCategoryEmployeeFilter] = useState<string>('all');
  const [salesByCategoryEmployeeDropdownOpen, setSalesByCategoryEmployeeDropdownOpen] = useState<boolean>(false);

  // Discount Report Modal
  const [discountModalOpen, setDiscountModalOpen] = useState<boolean>(false);
  const [discountData, setDiscountData] = useState<any[]>([]);
  const [discountLoading, setDiscountLoading] = useState<boolean>(false);
  const [discountDateStart, setDiscountDateStart] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [discountDateEnd, setDiscountDateEnd] = useState<string>(() => 
    new Date().toISOString().slice(0, 10)
  );
  const [discountTimeStart, setDiscountTimeStart] = useState<string>('00:00');
  const [discountTimeEnd, setDiscountTimeEnd] = useState<string>('23:00');
  const [discountPage, setDiscountPage] = useState<number>(1);
  const [discountPageSize, setDiscountPageSize] = useState<number>(10);
  const [discountEmployeeFilter, setDiscountEmployeeFilter] = useState<string>('all');
  const [discountEmployeeDropdownOpen, setDiscountEmployeeDropdownOpen] = useState<boolean>(false);

  // Receipt Storage Box Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<any[]>([]);
  const [receiptLoading, setReceiptLoading] = useState<boolean>(false);
  const [receiptDateStart, setReceiptDateStart] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [receiptDateEnd, setReceiptDateEnd] = useState<string>(() => 
    new Date().toISOString().slice(0, 10)
  );
  const [receiptTimeStart, setReceiptTimeStart] = useState<string>('00:00');
  const [receiptTimeEnd, setReceiptTimeEnd] = useState<string>('23:00');
  const [receiptPage, setReceiptPage] = useState<number>(1);
  const [receiptPageSize, setReceiptPageSize] = useState<number>(10);
  const [receiptEmployeeFilter, setReceiptEmployeeFilter] = useState<string>('all');
  const [receiptEmployeeDropdownOpen, setReceiptEmployeeDropdownOpen] = useState<boolean>(false);
  const [receiptSearch, setReceiptSearch] = useState<string>('');

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await withMinimumDelay(getDashboardStats(selectedBranchId), 1000);
      setStats(res.stats);
      setCurrentBranch(res.currentBranch);
      setBranchName(res.currentBranch?.BRANCH_NAME ?? 'All Branches');
      setIsKimsBrothersDashboard(res.isKimsBrothersDashboard ?? false);
      
      const branchCode = res.currentBranch?.BRANCH_CODE;
      const branchName = res.currentBranch?.BRANCH_NAME;
      const isDaraejung = branchCode === 'BR001' || (branchName || '').toLowerCase().includes('daraejung');
      setIsDaraejungBranch(isDaraejung);
    } catch (err) {
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
    setChartData([]);
    try {
      const res = await withMinimumDelay(getRevenueReport(selectedBranchId, 7), 1000);
      setChartData(revenueReportToChartData(res.data));
    } catch (err) {
      setChartError(err instanceof Error ? err.message : 'Failed to load revenue chart');
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [selectedBranchId]);

  const loadKimsBrotherChart = useCallback(async () => {
    if (!isKimsBrothersDashboard) return;
    
    setChartLoading(true);
    setChartError(null);
    setChartData([]);
    try {
      const startDate = new Date(kimsBrotherChartDateStart);
      const endDate = new Date(kimsBrotherChartDateEnd);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      const res = await withMinimumDelay(getRevenueReport(selectedBranchId, diffDays), 1000);
      setChartData(revenueReportToChartData(res.data));
    } catch (err) {
      setChartError(err instanceof Error ? err.message : 'Failed to load revenue chart');
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [selectedBranchId, isKimsBrothersDashboard, kimsBrotherChartDateStart, kimsBrotherChartDateEnd]);

  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getFormattedDateRange = (): string => {
    const start = formatDateForDisplay(kimsBrotherChartDateStart);
    const end = formatDateForDisplay(kimsBrotherChartDateEnd);
    return `${start} - ${end}`;
  };

  const navigateDateRange = (direction: 'prev' | 'next') => {
    const startDate = new Date(kimsBrotherChartDateStart);
    const endDate = new Date(kimsBrotherChartDateEnd);
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (direction === 'prev') {
      startDate.setDate(startDate.getDate() - diffDays);
      endDate.setDate(endDate.getDate() - diffDays);
    } else {
      startDate.setDate(startDate.getDate() + diffDays);
      endDate.setDate(endDate.getDate() + diffDays);
    }
    
    setKimsBrotherChartDateStart(startDate.toISOString().slice(0, 10));
    setKimsBrotherChartDateEnd(endDate.toISOString().slice(0, 10));
  };

  useEffect(() => {
    if (!isKimsBrothersDashboard || !kimsBrotherDatePickerRef.current) return;

    if (kimsBrotherFlatpickrInstance.current) {
      kimsBrotherFlatpickrInstance.current.destroy();
    }

    kimsBrotherFlatpickrInstance.current = flatpickr(kimsBrotherDatePickerRef.current, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      defaultDate: [kimsBrotherChartDateStart, kimsBrotherChartDateEnd],
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          setKimsBrotherChartDateStart(selectedDates[0].toISOString().slice(0, 10));
          setKimsBrotherChartDateEnd(selectedDates[1].toISOString().slice(0, 10));
        }
      },
    });

    return () => {
      if (kimsBrotherFlatpickrInstance.current) {
        kimsBrotherFlatpickrInstance.current.destroy();
      }
    };
  }, [isKimsBrothersDashboard, kimsBrotherChartDateStart, kimsBrotherChartDateEnd]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.chart-type-dropdown') && !target.closest('.chart-period-dropdown')) {
        setKimsBrotherChartTypeDropdownOpen(false);
        setKimsBrotherChartPeriodDropdownOpen(false);
      }
    };

    if (isKimsBrothersDashboard) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isKimsBrothersDashboard]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (isKimsBrothersDashboard) {
      loadKimsBrotherChart();
    } else {
      loadChart();
    }
  }, [loadChart, loadKimsBrotherChart, isKimsBrothersDashboard]);

  const loadKpis = useCallback(async () => {
    setKpisLoading(true);
    setKpis(null);
    try {
      const branch = selectedBranchId === 'all' ? null : MOCK_BRANCHES.find((x) => x.id === selectedBranchId);
      const totalExpense = branch
        ? branch.expenses.labor + branch.expenses.cogs + branch.expenses.operational
        : MOCK_BRANCHES.reduce((acc, curr) => acc + curr.expenses.labor + curr.expenses.cogs + curr.expenses.operational, 0);
      const data = await withMinimumDelay(getDashboardKpis(selectedBranchId, { totalExpense }), 1000);
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
      const loadData = async () => {
        const branches = await getBranches();
        const withRevenue = await Promise.all(
          branches.map(async (b) => {
            const res = await getDashboardStats(b.id);
            return { id: b.id, name: b.name, address: b.address, revenue: res.stats.todaysRevenue };
          })
        );
        return withRevenue.sort((a, b) => b.revenue - a.revenue).slice(0, 4);
      };
      const sorted = await withMinimumDelay(loadData(), 1000);
      setTopBranchesData(sorted);
    } catch {
      setTopBranchesData([]);
    } finally {
      setTopBranchesLoading(false);
    }
  }, []);

  const STATIC_BRANCH_COMPARISON_DATA = [
    { name: 'Jan', 'BLUEMOON': 85000, 'DARAEJUNG': 65000, "KIMS BROTHER": 45000 },
    { name: 'Feb', 'BLUEMOON': 95000, 'DARAEJUNG': 72000, "KIMS BROTHER": 48000 },
    { name: 'Mar', 'BLUEMOON': 105000, 'DARAEJUNG': 80000, "KIMS BROTHER": 52000 },
    { name: 'Apr', 'BLUEMOON': 98000, 'DARAEJUNG': 75000, "KIMS BROTHER": 50000 },
    { name: 'May', 'BLUEMOON': 110000, 'DARAEJUNG': 90000, "KIMS BROTHER": 58000 },
    { name: 'Jun', 'BLUEMOON': 70000, 'DARAEJUNG': 65000, "KIMS BROTHER": 55000 },
  ];

  const STATIC_BRANCH_NAMES = ['BLUEMOON', 'DARAEJUNG', "KIMS BROTHER"];

  const loadPopularMenuItems = useCallback(async () => {
    setPopularMenuItemsLoading(true);
    setPopularMenuItems([]);
    try {
      const res = await withMinimumDelay(getPopularMenuItems(selectedBranchId, 30, 5), 1000);
      setPopularMenuItems(res.data);
    } catch {
      setPopularMenuItems([]);
    } finally {
      setPopularMenuItemsLoading(false);
    }
  }, [selectedBranchId]);

  const loadDailySalesByProduct = useCallback(async () => {
    setDailySalesLoading(true);
    setDailySalesByProduct([]);
    try {
      const data = await withMinimumDelay(getDailySalesByProduct(selectedBranchId, 30, 5), 1000);
      setDailySalesByProduct(data);
    } catch {
      setDailySalesByProduct([]);
    } finally {
      setDailySalesLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadTopBranches();
  }, [loadTopBranches]);

  useEffect(() => {
    loadPopularMenuItems();
    loadDailySalesByProduct();
  }, [loadPopularMenuItems, loadDailySalesByProduct]);

  const loadBestsellersByPeriod = useCallback(async () => {
    setBestsellersLoading(true);
    const periods = ['Breakfast', 'Lunch', 'Dinner'];
    const defaultPeriods = periods.map(period => ({
      period,
      menu_name: 'No orders yet',
      total_sold: 0
    }));
    
    try {
      const data = await withMinimumDelay(getBestsellerByPeriod(selectedBranchId), 1000);
      const result = periods.map(period => 
        data.find(item => item.period === period) || 
        defaultPeriods.find(p => p.period === period)!
      );
      setBestsellersByPeriod(result);
    } catch {
      setBestsellersByPeriod(defaultPeriods);
    } finally {
      setBestsellersLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    if (isKimsBrothersDashboard) {
      loadBestsellersByPeriod();
    }
  }, [loadBestsellersByPeriod, isKimsBrothersDashboard]);

  const loadPaymentMethodsSummary = useCallback(async () => {
    setPaymentMethodsLoading(true);
    setPaymentMethodsSummary([]);
    try {
      const data = await withMinimumDelay(getPaymentMethodsSummary(selectedBranchId, paymentMethodsDate, paymentMethodsDate), 1000);
      setPaymentMethodsSummary(data);
    } catch {
      setPaymentMethodsSummary(SAMPLE_PAYMENT_METHOD_EXPORT);
    } finally {
      setPaymentMethodsLoading(false);
    }
  }, [selectedBranchId, paymentMethodsDate]);

  useEffect(() => {
    if (isKimsBrothersDashboard) {
      loadPaymentMethodsSummary();
    }
  }, [loadPaymentMethodsSummary, isKimsBrothersDashboard]);

  const loadSalesByCategory = useCallback(async () => {
    setSalesByCategoryLoading(true);
    setSalesByCategoryData([]);
    try {
      // TODO: Create backend API endpoint for sales by category
      const mockData = [
        { category: 'A-ADDITIONAL', quantity: 595, net_sales: 227944, unit_cost: 0, total_revenue: 227944 },
        { category: 'B-BEEF', quantity: 1470, net_sales: 504870, unit_cost: 0, total_revenue: 504870 },
        { category: 'Basic meat set', quantity: 0, net_sales: 0, unit_cost: 0, total_revenue: 0 },
        { category: 'D-BAR SNACKS', quantity: 119, net_sales: 69780, unit_cost: 0, total_revenue: 69780 },
        { category: 'DRINKS', quantity: 4051, net_sales: 727596, unit_cost: 0, total_revenue: 727596 },
        { category: 'H-HOT POT', quantity: 99, net_sales: 98020, unit_cost: 0, total_revenue: 98020 },
        { category: 'I-Iberico PORK', quantity: 1574, net_sales: 1068008, unit_cost: 0, total_revenue: 1068008 },
        { category: 'K-Aged Preium Pork', quantity: 1017, net_sales: 608280, unit_cost: 0, total_revenue: 608280 },
        { category: 'K-KIDS MENU', quantity: 16, net_sales: 4740, unit_cost: 0, total_revenue: 4740 },
        { category: 'M-MEAL', quantity: 575, net_sales: 234407.20, unit_cost: 0, total_revenue: 234407.20 },
        { category: 'N-NOODLE', quantity: 216, net_sales: 64924, unit_cost: 0, total_revenue: 64924 },
        { category: 'Nalchial Jumeokbab Set', quantity: 781, net_sales: 0, unit_cost: 0, total_revenue: 0 },
        { category: 'Service', quantity: 1328, net_sales: 0, unit_cost: 0, total_revenue: 0 },
        { category: 'SET Meat', quantity: 792, net_sales: 1702760, unit_cost: 0, total_revenue: 1702760 },
      ];
      
      const result = await withMinimumDelay(Promise.resolve(mockData), 500);
      setSalesByCategoryData(result);
    } catch (err) {
      setSalesByCategoryData([]);
    } finally {
      setSalesByCategoryLoading(false);
    }
  }, [selectedBranchId, salesByCategoryDateStart, salesByCategoryDateEnd, salesByCategoryEmployeeFilter]);

  // Load data when modal opens or filters change
  useEffect(() => {
    if (salesByCategoryModalOpen) {
      loadSalesByCategory();
      setSalesByCategoryPage(1);
    }
  }, [salesByCategoryModalOpen, salesByCategoryDateStart, salesByCategoryDateEnd, salesByCategoryEmployeeFilter, loadSalesByCategory]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (salesByCategoryEmployeeDropdownOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.employee-filter-dropdown')) {
          setSalesByCategoryEmployeeDropdownOpen(false);
        }
      }
      if (discountEmployeeDropdownOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.discount-employee-filter-dropdown')) {
          setDiscountEmployeeDropdownOpen(false);
        }
      }
      if (receiptEmployeeDropdownOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.receipt-employee-filter-dropdown')) {
          setReceiptEmployeeDropdownOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [salesByCategoryEmployeeDropdownOpen, discountEmployeeDropdownOpen, receiptEmployeeDropdownOpen]);

  const loadDiscountReport = useCallback(async () => {
    setDiscountLoading(true);
    setDiscountData([]);
    try {
      // TODO: Create backend API endpoint for discount report
      const mockData = [
        { name: 'P.W.D 20%', discount_applied: 39, point_discount_amount: 5064.00 },
        { name: 'Senior Discount 20%', discount_applied: 42, point_discount_amount: 7790.80 },
      ];
      
      const result = await withMinimumDelay(Promise.resolve(mockData), 500);
      setDiscountData(result);
    } catch (err) {
      setDiscountData([]);
    } finally {
      setDiscountLoading(false);
    }
  }, [selectedBranchId, discountDateStart, discountDateEnd, discountTimeStart, discountTimeEnd, discountEmployeeFilter]);

  // Load data when modal opens or filters change
  useEffect(() => {
    if (discountModalOpen) {
      loadDiscountReport();
      setDiscountPage(1);
    }
  }, [discountModalOpen, discountDateStart, discountDateEnd, discountTimeStart, discountTimeEnd, discountEmployeeFilter, loadDiscountReport]);

  const loadTotalSalesDetail = useCallback(async () => {
    setTotalSalesDetailLoading(true);
    setTotalSalesDetailData([]);
    try {
      // TODO: Create backend API endpoint for hourly sales detail
      const mockData = [];
      const startDate = new Date(kimsBrotherChartDateStart);
      const endDate = new Date(kimsBrotherChartDateEnd);
      
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        for (let hour = 0; hour < 24; hour++) {
          const dateTime = new Date(currentDate);
          dateTime.setHours(hour, 0, 0, 0);
          
          const totalSales = Math.floor(Math.random() * 50000) + 5000;
          const refund = Math.random() > 0.9 ? Math.floor(Math.random() * 1000) : 0;
          const discount = Math.random() > 0.8 ? Math.floor(Math.random() * 500) : 0;
          const netSales = totalSales - refund - discount;
          
          mockData.push({
            hour: dateTime.toISOString(),
            total_sales: totalSales,
            refund: refund,
            discount: discount,
            net_sales: netSales,
            product_unit_price: 0,
            gross_profit: netSales
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      mockData.sort((a, b) => new Date(b.hour).getTime() - new Date(a.hour).getTime());
      
      const result = await withMinimumDelay(Promise.resolve(mockData), 500);
      setTotalSalesDetailData(result);
    } catch (err) {
      setTotalSalesDetailData([]);
    } finally {
      setTotalSalesDetailLoading(false);
    }
  }, [kimsBrotherChartDateStart, kimsBrotherChartDateEnd]);

  useEffect(() => {
    if (totalSalesDetailModalOpen) {
      loadTotalSalesDetail();
      setTotalSalesDetailPage(1);
    }
  }, [totalSalesDetailModalOpen, kimsBrotherChartDateStart, kimsBrotherChartDateEnd, loadTotalSalesDetail]);

  const loadReceiptStorageBox = useCallback(async () => {
    setReceiptLoading(true);
    setReceiptData([]);
    try {
      // TODO: Create backend API endpoint for receipt storage box
      const mockData = [
        { receipt_number: '1-36838', date: '2026-02-17', time: '15:12', employee: 'Operator', customer: '', type: 'sale', total: 3540.00 },
        { receipt_number: '1-36837', date: '2026-02-17', time: '15:02', employee: 'Operator', customer: '', type: 'sale', total: 1530.00 },
        { receipt_number: '1-36836', date: '2026-02-17', time: '15:01', employee: 'Operator', customer: '', type: 'sale', total: 4060.00 },
        { receipt_number: '1-36835', date: '2026-02-17', time: '14:20', employee: 'Operator', customer: '', type: 'sale', total: 9880.00 },
        { receipt_number: '1-36834', date: '2026-02-17', time: '13:56', employee: 'Operator', customer: '', type: 'sale', total: 8308.00 },
        { receipt_number: '1-36833', date: '2026-02-17', time: '13:38', employee: 'Operator', customer: '', type: 'sale', total: 6580.00 },
        { receipt_number: '1-36832', date: '2026-02-17', time: '12:45', employee: 'Operator', customer: '', type: 'sale', total: 4984.00 },
        { receipt_number: '1-36831', date: '2026-02-17', time: '12:39', employee: 'Operator', customer: '', type: 'sale', total: 500.00 },
        { receipt_number: '1-36830', date: '2026-02-17', time: '11:39', employee: 'Operator', customer: '', type: 'sale', total: 500.00 },
        { receipt_number: '1-36829', date: '2026-02-17', time: '11:20', employee: 'Operator', customer: '', type: 'refund', total: 1500.00 },
        { receipt_number: '1-36828', date: '2026-02-17', time: '10:45', employee: 'Operator', customer: '', type: 'sale', total: 3200.00 },
        { receipt_number: '1-36827', date: '2026-02-17', time: '10:30', employee: 'Operator', customer: '', type: 'refund', total: 800.00 },
      ];
      
      const result = await withMinimumDelay(Promise.resolve(mockData), 500);
      setReceiptData(result);
    } catch (err) {
      setReceiptData([]);
    } finally {
      setReceiptLoading(false);
    }
  }, [selectedBranchId, receiptDateStart, receiptDateEnd, receiptTimeStart, receiptTimeEnd, receiptEmployeeFilter, receiptSearch]);

  // Load data when modal opens or filters change
  useEffect(() => {
    if (receiptModalOpen) {
      loadReceiptStorageBox();
      setReceiptPage(1);
    }
  }, [receiptModalOpen, receiptDateStart, receiptDateEnd, receiptTimeStart, receiptTimeEnd, receiptEmployeeFilter, receiptSearch, loadReceiptStorageBox]);

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

  const currentContextName = branchName !== 'All Branches' ? branchName : (activeBranch ? activeBranch.name : t('all_branches'));

  const totalRevenue = stats?.todaysRevenue ?? 0;
  const totalOrders = stats?.totalOrders ?? 0;
  const activeTables = stats?.activeTables ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;

  const totalExpenses = activeBranch
    ? activeBranch.expenses.labor + activeBranch.expenses.cogs + activeBranch.expenses.operational
    : MOCK_BRANCHES.reduce((acc, curr) => 
        acc + curr.expenses.labor + curr.expenses.cogs + curr.expenses.operational, 0);

  const profit = totalRevenue - totalExpenses;

  const TOP_PRODUCT_COLORS = ['#78909c', '#9ccc65', '#42a5f5', '#ec407a', '#8b5cf6'] as const;
  const popularHasSignal = popularMenuItems.some((x) =>
    Number(x.total_revenue ?? 0) > 0 || Number(x.total_quantity ?? 0) > 0 || Number(x.order_count ?? 0) > 0
  );
  const displayedPopularMenuItems = popularHasSignal ? popularMenuItems : SAMPLE_POPULAR_MENU_ITEMS;
  const top5PopularMenuItems = displayedPopularMenuItems.slice(0, 5);
  const PRODUCT_SERIES_DAYS = 30;

  const productKeyToName = Object.fromEntries(
    top5PopularMenuItems.map((p, idx) => [`p${idx}`, p.MENU_NAME])
  ) as Record<string, string>;

  const productSalesStackedChartData = (() => {
    if (!top5PopularMenuItems || top5PopularMenuItems.length === 0) {
      return [];
    }
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (PRODUCT_SERIES_DAYS - 1));

    const labels: string[] = [];
    const dateMap = new Map<string, string>();
    
    for (let i = 0; i < PRODUCT_SERIES_DAYS; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      labels.push(label);
      dateMap.set(dateStr, label);
    }

    const productIndexMap = new Map<number, number>();
    top5PopularMenuItems.forEach((item, idx) => {
      if (item?.IDNo) {
        productIndexMap.set(item.IDNo, idx);
      }
    });

    const dailyData = new Map<string, Map<number, number>>();
    labels.forEach((label) => {
      dailyData.set(label, new Map());
      top5PopularMenuItems.forEach((_, idx) => {
        dailyData.get(label)!.set(idx, 0);
      });
    });
    if (dailySalesByProduct && Array.isArray(dailySalesByProduct)) {
      dailySalesByProduct.forEach((item) => {
        if (!item || !item.menu_id) return;
        
        const productIdx = productIndexMap.get(item.menu_id);
        if (productIdx === undefined) return;
        
        let dateStr: string;
        if (typeof item.date === 'string') {
          dateStr = item.date.slice(0, 10);
        } else if (item.date instanceof Date) {
          dateStr = item.date.toISOString().slice(0, 10);
        } else {
          try {
            dateStr = new Date(item.date).toISOString().slice(0, 10);
          } catch {
            return;
          }
        }
        
        const label = dateMap.get(dateStr);
        if (label && dailyData.has(label)) {
          const currentValue = dailyData.get(label)!.get(productIdx) || 0;
          const revenue = Number(item.daily_revenue) || 0;
          dailyData.get(label)!.set(productIdx, currentValue + revenue);
        }
      });
    }

    return labels.map((label) => {
      const row: Record<string, string | number> = { name: label };
      const dayData = dailyData.get(label);
      top5PopularMenuItems.forEach((_, pIdx) => {
        row[`p${pIdx}`] = dayData?.get(pIdx) || 0;
      });
      return row as { name: string } & Record<string, number>;
    });
  })();

  const salesChartHasSignal = chartData.some((x) => Number(x.sales ?? 0) > 0);
  const displayedSalesChartData = (!chartData.length || !salesChartHasSignal || !!chartError)
    ? SALES_CHART_DATA
    : chartData;

  const formatPeso = (amount: number) =>
    `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8">
      {/* Luxurious Dashboard Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-10 border border-purple-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-pink-200 tracking-tight">
              {branchName !== 'All Branches' ? `${branchName} ${t('dashboard')}` : t('network_overview')}
            </h1>
            <p className="text-purple-100/80 text-base font-semibold tracking-wide">
              {currentBranch && currentBranch.BRANCH_NAME
                ? `Management for: ${currentBranch.ADDRESS || '—'}`
                : t('chain_wide_insights')}
            </p>
          </div>
          {isKimsBrothersDashboard && (
            <button 
              onClick={generateAIReport}
              disabled={loadingAI}
              className="group relative w-full md:w-auto bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 text-white px-8 py-3.5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-[0_8px_32px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_48px_rgba(251,146,60,0.6)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              {loadingAI ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : <Sparkles className="w-5 h-5 relative z-10" />}
              <span className="text-sm md:text-base relative z-10">{t('ai_intelligence')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Simple 4-card KPI display - Available ONLY for Daraejung branch */}
      {isDaraejungBranch && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statsLoading ? (
          [...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))
        ) : stats ? (
          <>
            <StatCard 
              title={t('todays_revenue')} 
              value={`₱${(stats.todaysRevenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
              icon={DollarSign} 
              color="bg-gradient-to-br from-emerald-500 to-green-600" 
            />
            <StatCard 
              title={t('total_orders')} 
              value={(stats.totalOrders || 0).toLocaleString()} 
              icon={Receipt} 
              color="bg-gradient-to-br from-blue-600 to-indigo-700" 
            />
            <StatCard 
              title={t('active_tables')} 
              value={(stats.activeTables || 0).toLocaleString()} 
              icon={Store} 
              color="bg-gradient-to-br from-purple-600 to-pink-600" 
            />
            <StatCard 
              title={t('pending_orders')} 
              value={(stats.pendingOrders || 0).toLocaleString()} 
              icon={Info} 
              color="bg-gradient-to-br from-amber-500 to-orange-600" 
            />
          </>
        ) : (
          <>
            <StatCard title={t('todays_revenue')} value="₱0.00" icon={DollarSign} color="bg-gradient-to-br from-emerald-500 to-green-600" />
            <StatCard title={t('total_orders')} value="0" icon={Receipt} color="bg-gradient-to-br from-blue-600 to-indigo-700" />
            <StatCard title={t('active_tables')} value="0" icon={Store} color="bg-gradient-to-br from-purple-600 to-pink-600" />
            <StatCard title={t('pending_orders')} value="0" icon={Info} color="bg-gradient-to-br from-amber-500 to-orange-600" />
          </>
        )}
      </div>
      )}

      {/* Show message if not Kim's Brothers - advanced analytics not available */}
      {!statsLoading && selectedBranchId !== 'all' && !isKimsBrothersDashboard && (
        <div className="group relative bg-white rounded-2xl shadow-xl border border-slate-200 p-8 md:p-12 overflow-hidden">
          {/* Premium gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 via-slate-500 to-slate-400" />
          
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.02] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          
          <div className="relative flex flex-col items-center justify-center text-center space-y-5">
            <div className="relative">
              <div className="absolute inset-0 bg-slate-200 rounded-full blur-xl opacity-50" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                <Info className="w-10 h-10 text-slate-500" />
              </div>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">
                {t('advanced_analytics_not_available')}
              </h2>
              <p className="text-sm md:text-base text-slate-600 max-w-md leading-relaxed">
                {t('advanced_analytics_not_available_desc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* All Branches View - Ultra Premium Design */}
      {selectedBranchId === 'all' && (
        <>
          {/* Top Stats Row - 4 Premium Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {statsLoading ? (
              [...Array(4)].map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
            ) : stats ? (
              <>
                <StatCard 
                  title={t('total_revenue')} 
                  value={`₱${(stats.todaysRevenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon={DollarSign} 
                  color="bg-gradient-to-br from-emerald-500 to-green-600" 
                />
                <StatCard 
                  title={t('total_orders')} 
                  value={(stats.totalOrders || 0).toLocaleString()} 
                  icon={Receipt} 
                  color="bg-gradient-to-br from-blue-600 to-indigo-700" 
                />
                <StatCard 
                  title={t('active_tables')} 
                  value={(stats.activeTables || 0).toLocaleString()} 
                  icon={Store} 
                  color="bg-gradient-to-br from-purple-600 to-pink-600" 
                />
                <StatCard 
                  title={t('pending_orders')} 
                  value={(stats.pendingOrders || 0).toLocaleString()} 
                  icon={Info} 
                  color="bg-gradient-to-br from-amber-500 to-orange-600" 
                />
              </>
            ) : (
              <>
                <StatCard title={t('total_revenue')} value="₱0.00" icon={DollarSign} color="bg-gradient-to-br from-emerald-500 to-green-600" />
                <StatCard title={t('total_orders')} value="0" icon={Receipt} color="bg-gradient-to-br from-blue-600 to-indigo-700" />
                <StatCard title={t('active_tables')} value="0" icon={Store} color="bg-gradient-to-br from-purple-600 to-pink-600" />
                <StatCard title={t('pending_orders')} value="0" icon={Info} color="bg-gradient-to-br from-amber-500 to-orange-600" />
              </>
            )}
          </div>

          {/* AI Analysis Section - Ultra Premium Design */}
          {aiReport && (
            <div className="group relative bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/20 border-2 border-indigo-200/50 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
              {/* Premium gradient accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-2xl" />
              
              {/* Decorative background elements */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-indigo-200/40 to-purple-200/40 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-tr from-pink-200/30 to-indigo-200/30 rounded-full blur-3xl pointer-events-none"></div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl blur-md opacity-40 animate-pulse"></div>
                    <div className="relative p-3 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl text-white shadow-2xl shadow-indigo-500/30">
                      <Sparkles size={22} className="drop-shadow-lg" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 bg-clip-text text-transparent">
                      {t('gemini_business_consultant')}
                    </h3>
                    <p className="text-indigo-600 text-sm font-medium mt-1">{t('ai_powered_strategic_insights')}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 md:p-6 rounded-xl border-2 border-indigo-100 shadow-lg backdrop-blur-sm">
                  <h4 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full block"></span>
                    {t('executive_summary')}
                  </h4>
                  <p className="text-slate-700 leading-relaxed text-sm md:text-base font-medium">{aiReport.summary}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-4 group/item">
                    <div className="flex items-center gap-3 text-emerald-600 font-semibold">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                      </div>
                      <h4 className="text-base">{t('strengths')}</h4>
                    </div>
                    <ul className="space-y-3">
                      {aiReport.strengths.map((item, idx) => (
                        <li key={idx} className="group/card relative bg-white/80 backdrop-blur-sm p-4 rounded-xl border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                          <span className="relative text-sm text-slate-700 leading-relaxed font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="space-y-4 group/item">
                    <div className="flex items-center gap-3 text-rose-600 font-semibold">
                      <div className="p-2 bg-rose-100 rounded-lg">
                        <AlertCircle size={20} className="text-rose-600" />
                      </div>
                      <h4 className="text-base">{t('attention_needed')}</h4>
                    </div>
                    <ul className="space-y-3">
                      {aiReport.weaknesses.map((item, idx) => (
                        <li key={idx} className="group/card relative bg-white/80 backdrop-blur-sm p-4 rounded-xl border-2 border-rose-100 hover:border-rose-300 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                          <span className="relative text-sm text-slate-700 leading-relaxed font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="space-y-4 group/item">
                    <div className="flex items-center gap-3 text-amber-600 font-semibold">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Lightbulb size={20} className="text-amber-600" />
                      </div>
                      <h4 className="text-base">{t('recommendations')}</h4>
                    </div>
                    <ul className="space-y-3">
                      {aiReport.recommendations.map((item, idx) => (
                        <li key={idx} className="group/card relative bg-white/80 backdrop-blur-sm p-4 rounded-xl border-2 border-amber-100 hover:border-amber-300 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                          <span className="relative text-sm text-slate-700 leading-relaxed font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts Row - Ultra Premium Design */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart - Premium */}
            <div className="lg:col-span-2 group relative bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 border-2 border-blue-200/50 rounded-2xl p-6 md:p-8 shadow-2xl h-[450px] overflow-hidden backdrop-blur-sm">
              {/* Premium gradient accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-2xl" />
              
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-200/20 to-pink-200/20 rounded-full blur-3xl pointer-events-none"></div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none z-10" />
              
              <div className="relative flex items-center justify-between mb-6 z-10">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                    {t('revenue_comparison')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{t('monthly_revenue_trends')}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {STATIC_BRANCH_NAMES.map((branchName, idx) => {
                    const colors = ['#10b981', '#3b82f6', '#a855f7'];
                    return (
                      <div key={branchName} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx] }}></div>
                        <span className="text-xs font-bold text-slate-700">{branchName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="relative h-80 min-h-[320px] z-10">
                {chartLoading ? (
                  <ChartLoadingSkeleton type="line" />
                ) : (
                  <ResponsiveContainer width="100%" height={320} minWidth={0}>
                    <LineChart data={STATIC_BRANCH_COMPARISON_DATA}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748b" 
                        fontSize={12} 
                        fontWeight={600}
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={12} 
                        fontWeight={600}
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `₱${value / 1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '2px solid #e2e8f0', 
                          borderRadius: '12px',
                          color: '#0f172a', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 10px 10px -5px rgb(0 0 0 / 0.1)',
                          padding: '12px 16px',
                          fontWeight: 600
                        }}
                        formatter={(value: number) => [`₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
                        labelStyle={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                        formatter={(value) => <span style={{ fontWeight: 600, fontSize: '12px' }}>{value}</span>}
                      />
                      {STATIC_BRANCH_NAMES.map((branchName, idx) => {
                        const colors = ['#10b981', '#3b82f6', '#a855f7'];
                        const rgbValues = [
                          { r: 16, g: 185, b: 129 },
                          { r: 59, g: 130, b: 246 },
                          { r: 168, g: 85, b: 247 }
                        ];
                        return (
                          <Line 
                            key={`${branchName}-${idx}`}
                            type="monotone" 
                            dataKey={branchName} 
                            stroke={colors[idx]} 
                            strokeWidth={3}
                            dot={{ r: 5, fill: colors[idx], strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 7, fill: colors[idx] }}
                            style={{filter: `drop-shadow(0 2px 4px rgba(${rgbValues[idx].r}, ${rgbValues[idx].g}, ${rgbValues[idx].b}, 0.3))`}}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Branch Rankings - Premium */}
            <div className="group relative bg-gradient-to-br from-white via-amber-50/30 to-orange-50/20 border-2 border-amber-200/50 rounded-2xl p-6 shadow-2xl flex flex-col overflow-hidden backdrop-blur-sm">
              {/* Premium gradient accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 rounded-t-2xl" />
              
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-3xl pointer-events-none"></div>
              
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg">
                    <Trophy className="w-5 h-5 text-white drop-shadow-sm" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-amber-900 to-orange-900 bg-clip-text text-transparent">
                      {t('branch_rankings')}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{t('by_revenue')}</p>
                  </div>
                </div>
                
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 max-h-[calc(100%-100px)]">
                  {topBranchesLoading ? (
                    <TableSkeleton rows={3} />
                  ) : (
                    topBranchesData.map((branch, idx) => (
                      <div 
                        key={branch.id} 
                        className="group/item relative flex items-center justify-between p-4 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-white border-2 border-slate-100 hover:border-amber-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-orange-50/50 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center gap-3 flex-1 min-w-0">
                          <div className={`relative p-2.5 rounded-xl transition-all duration-300 ${
                            idx === 0 
                              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30' 
                              : 'bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 group-hover/item:from-indigo-200 group-hover/item:to-blue-200'
                          }`}>
                            {idx === 0 ? (
                              <>
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-300 to-orange-400 rounded-xl blur-sm opacity-50 animate-pulse"></div>
                                <Trophy size={18} className="relative z-10 drop-shadow-sm" />
                              </>
                            ) : (
                              <Store size={18} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{branch.name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <MapPin size={10} /> {(branch.address ?? '').split(',')[0] || '—'}
                            </p>
                          </div>
                        </div>
                        <div className="relative text-right ml-3">
                          <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-100 group-hover/item:border-emerald-200 group-hover/item:shadow-md transition-all">
                            <p className="font-bold text-emerald-700 tabular-nums">₱{(branch.revenue / 1000).toFixed(1)}k</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Kim's Brothers View - Advanced Analytics */}
      {isKimsBrothersDashboard && (
        <>
          {/* Top Stats Row - 5 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
        {kpisLoading ? (
          [...Array(5)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))
        ) : kpis ? (
          <>
            <StatCard title={t('total_sales')} value={`₱${kpis.totalSales.value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} changeAmount={kpis.totalSales.change} changePercent={kpis.totalSales.changePercent} color="bg-green-500" />
            <div className="relative">
              <StatCard title={t('discount')} value={`₱${kpis.discount.value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={Tag} changeAmount={kpis.discount.change} changePercent={kpis.discount.changePercent} color="bg-amber-500" />
              <button
                onClick={() => setDiscountModalOpen(true)}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm hover:shadow-md z-10"
              >
                <ExternalLink className="w-3 h-3" />
                <span>View Report</span>
              </button>
            </div>
            <StatCard title={t('net_sales')} value={`₱${kpis.netSales.value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={TrendingUp} changeAmount={kpis.netSales.change} changePercent={kpis.netSales.changePercent} color="bg-blue-600" />
            <StatCard title={t('expenses')} value={`₱${kpis.expense.value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={Receipt} changeAmount={kpis.expense.change} changePercent={kpis.expense.changePercent} color="bg-orange-500" />
            <StatCard title={t('gross_profit')} value={`₱${kpis.grossProfit.value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={CircleDollarSign} changeAmount={kpis.grossProfit.change} changePercent={kpis.grossProfit.changePercent} color="bg-emerald-600" />
          </>
        ) : (
          <>
            <StatCard title={t('total_sales')} value={`₱${totalRevenue.toLocaleString()}`} icon={DollarSign} color="bg-green-500" />
            <div className="relative">
              <StatCard title={t('discount')} value="₱0.00" icon={Tag} color="bg-amber-500" />
              <button
                onClick={() => setDiscountModalOpen(true)}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm hover:shadow-md z-10"
              >
                <ExternalLink className="w-3 h-3" />
                <span>View Report</span>
              </button>
            </div>
            <StatCard title={t('net_sales')} value={`₱${totalRevenue.toLocaleString()}`} icon={TrendingUp} color="bg-blue-600" />
            <StatCard title={t('expenses')} value={`₱${totalExpenses.toLocaleString()}`} icon={Receipt} color="bg-orange-500" />
            <StatCard title={t('gross_profit')} value={`₱${profit.toLocaleString()}`} icon={CircleDollarSign} color="bg-emerald-600" />
          </>
        )}
      </div>

          {/* AI Insights Section - Advanced Design for Kim's Brothers */}
      {aiReport && (
            <div className="group relative bg-gradient-to-br from-indigo-50 via-purple-50/50 to-indigo-50 border-2 border-indigo-200 p-5 md:p-7 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden animate-in zoom-in duration-300">
          {/* Premium gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
          
          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-200/40 to-purple-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center space-x-3 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl blur-sm opacity-40" />
              <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-sm" />
              </div>
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-indigo-900">
                {t('gemini_business_consultant')}
            </h2>
              <p className="text-xs md:text-sm text-indigo-600 font-medium">
                AI-Powered Insights for {currentContextName}
              </p>
          </div>
                      </div>

          {/* Executive Summary */}
          <div className="relative bg-white p-4 md:p-5 rounded-xl border border-indigo-200 mb-6 shadow-sm">
            <h4 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">{t('executive_summary')}</h4>
            <p className="text-sm md:text-base text-slate-700 leading-relaxed">{aiReport.summary}</p>
                    </div>

          {/* Strengths, Weaknesses, Recommendations Grid */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Strengths */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                <CheckCircle2 size={18} />
                <h4 className="text-sm md:text-base">{t('strengths')}</h4>
                  </div>
              <ul className="space-y-2">
                {aiReport.strengths.map((item, idx) => (
                  <li key={idx} className="group/item relative bg-white p-3 md:p-4 rounded-xl border border-emerald-200 hover:border-emerald-300 hover:shadow-md transition-all duration-200">
                    <span className="text-xs md:text-sm text-slate-700 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              </div>

            {/* Weaknesses */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-rose-600 font-semibold">
                <AlertCircle size={18} />
                <h4 className="text-sm md:text-base">{t('attention_needed')}</h4>
            </div>
              <ul className="space-y-2">
                {aiReport.weaknesses.map((item, idx) => (
                  <li key={idx} className="group/item relative bg-white p-3 md:p-4 rounded-xl border border-rose-200 hover:border-rose-300 hover:shadow-md transition-all duration-200">
                    <span className="text-xs md:text-sm text-slate-700 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600 font-semibold">
                <Lightbulb size={18} />
                <h4 className="text-sm md:text-base">{t('recommendations')}</h4>
              </div>
              <ul className="space-y-2">
                {aiReport.recommendations.map((item, idx) => (
                  <li key={idx} className="group/item relative bg-white p-3 md:p-4 rounded-xl border border-amber-200 hover:border-amber-300 hover:shadow-md transition-all duration-200">
                    <span className="text-xs md:text-sm text-slate-700 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Urgent Branch Alert (only for all branches view) */}
          {aiReport.urgentBranch && (
            <div className="relative mt-6 bg-white p-4 md:p-5 rounded-xl border-2 border-red-200 shadow-lg flex items-center justify-center text-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                <div className="absolute inset-0 bg-red-200 rounded-full blur-md opacity-50" />
                  <div className="relative bg-gradient-to-br from-red-100 to-orange-100 p-3 rounded-full">
                    <ArrowDownRight className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                </div>
              </div>
                <div>
                  <h3 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider">Focus Required:</h3>
              <p className="text-sm md:text-base text-red-600 font-bold">{aiReport.urgentBranch}</p>
            </div>
          </div>
            </div>
          )}
        </div>
      )}

          {/* Charts and Advanced Analytics for Kim's Brothers */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Total sales: time-series chart */}
        <div className="xl:col-span-2 group relative bg-white p-4 md:p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
          {/* Premium gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600" />
          
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.02] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          
          <div className="relative flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900">
                  {t('total_sales')} · {currentContextName}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTotalSalesDetailModalOpen(true)}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  View Total Sales
                </button>
              </div>
            </div>
            
            {/* Controls Row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date Range Picker */}
              <div className="relative flex-shrink-0">
                <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden hover:border-slate-400 transition-colors">
                  {/* Left Arrow */}
                  <button
                    onClick={() => navigateDateRange('prev')}
                    className="px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex-shrink-0 border-r border-slate-300"
                    type="button"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {/* Date Display */}
                  <button
                    onClick={() => {
                      if (kimsBrotherFlatpickrInstance.current) {
                        kimsBrotherFlatpickrInstance.current.open();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                    type="button"
                  >
                    <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span>{getFormattedDateRange()}</span>
                  </button>
                  
                  {/* Hidden input for Flatpickr */}
                  <input
                    ref={kimsBrotherDatePickerRef}
                    type="text"
                    className="absolute opacity-0 pointer-events-none"
                    style={{ width: '1px', height: '1px' }}
                    readOnly
                  />
                  
                  {/* Right Arrow */}
                  <button
                    onClick={() => navigateDateRange('next')}
                    className="px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex-shrink-0 border-l border-slate-300"
                    type="button"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Chart Type Selector */}
              <div className="relative chart-type-dropdown flex-shrink-0">
                <button
                  onClick={() => setKimsBrotherChartTypeDropdownOpen(!kimsBrotherChartTypeDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent whitespace-nowrap"
                >
                  <span className="lowercase">{kimsBrotherChartType === 'bar' ? 'bar chart' : 'line graph'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${kimsBrotherChartTypeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {kimsBrotherChartTypeDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => {
                        setKimsBrotherChartType('line');
                        setKimsBrotherChartTypeDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between rounded-t-lg ${
                        kimsBrotherChartType === 'line' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      <span className="lowercase">line graph</span>
                      {kimsBrotherChartType === 'line' && <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setKimsBrotherChartType('bar');
                        setKimsBrotherChartTypeDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between rounded-b-lg ${
                        kimsBrotherChartType === 'bar' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      <span className="lowercase">bar chart</span>
                      {kimsBrotherChartType === 'bar' && <Check className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Period Selector */}
              <div className="relative chart-period-dropdown flex-shrink-0">
                <button
                  onClick={() => setKimsBrotherChartPeriodDropdownOpen(!kimsBrotherChartPeriodDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent whitespace-nowrap"
                >
                  <span className="lowercase">{kimsBrotherChartPeriod === 'glance' ? 'glance' : kimsBrotherChartPeriod === 'quarterly' ? 'Quarterly' : kimsBrotherChartPeriod === 'yearly' ? 'By year' : kimsBrotherChartPeriod === 'monthly' ? 'monthly' : 'Weekly'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${kimsBrotherChartPeriodDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {kimsBrotherChartPeriodDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                    <button
                      disabled
                      className="w-full px-4 py-2 text-left text-sm text-slate-400 cursor-not-allowed"
                    >
                      By time zone
                    </button>
                    <button
                      onClick={() => {
                        setKimsBrotherChartPeriod('glance');
                        setKimsBrotherChartPeriodDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                        kimsBrotherChartPeriod === 'glance' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      <span>glance</span>
                      {kimsBrotherChartPeriod === 'glance' && <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setKimsBrotherChartPeriod('weekly');
                        setKimsBrotherChartPeriodDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                        kimsBrotherChartPeriod === 'weekly' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      <span>Weekly</span>
                      {kimsBrotherChartPeriod === 'weekly' && <Check className="w-4 h-4" />}
                    </button>
                    <button
                      disabled
                      className="w-full px-4 py-2 text-left text-sm text-slate-400 cursor-not-allowed"
                    >
                      monthly
                    </button>
                    <button
                      onClick={() => {
                        setKimsBrotherChartPeriod('quarterly');
                        setKimsBrotherChartPeriodDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between ${
                        kimsBrotherChartPeriod === 'quarterly' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      <span>Quarterly</span>
                      {kimsBrotherChartPeriod === 'quarterly' && <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setKimsBrotherChartPeriod('yearly');
                        setKimsBrotherChartPeriodDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between rounded-b-lg ${
                        kimsBrotherChartPeriod === 'yearly' ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      <span>By year</span>
                      {kimsBrotherChartPeriod === 'yearly' && <Check className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="relative h-64 md:h-80 min-h-[256px]">
            {/* Shine effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent z-10 pointer-events-none" />
            {chartLoading ? (
              <ChartLoadingSkeleton type={kimsBrotherChartType} />
            ) : (
              <ResponsiveContainer width="100%" height={320} minWidth={0}>
                {kimsBrotherChartType === 'bar' ? (
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
                ) : (
                  <LineChart data={displayedSalesChartData}>
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
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
                      cursor={{stroke: '#22c55e', strokeWidth: 1}}
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
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      name={t('total_sales')} 
                      stroke="#22c55e" 
                      strokeWidth={3}
                      dot={{ fill: '#22c55e', r: 4 }}
                      activeDot={{ r: 6 }}
                      style={{filter: 'drop-shadow(0 2px 4px rgba(34, 197, 94, 0.2))'}}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Best Seller by Meal Period (Breakfast, Lunch, Dinner) */}
        <div className="group relative bg-white p-4 md:p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
          {/* Premium gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />
          
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.02] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          
          <div className="relative flex items-center justify-between mb-6">
            <h2 className="text-lg md:text-xl font-bold text-slate-900">{t('best_seller')}</h2>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg blur-sm opacity-30" />
              <div className="relative bg-gradient-to-br from-yellow-400 to-amber-500 p-2 rounded-lg shadow-lg">
                <Trophy className="w-5 h-5 text-white drop-shadow-sm" />
              </div>
            </div>
          </div>
          <div className="relative space-y-3">
            {bestsellersLoading ? (
              <TableSkeleton rows={3} />
            ) : (
              bestsellersByPeriod.map((item, index) => {
                const periodStyles = {
                  Breakfast: {
                    badge: 'bg-gradient-to-br from-blue-400 via-indigo-500 to-blue-600',
                    glow: 'from-blue-300 to-indigo-400',
                    bg: 'bg-blue-50 border-blue-200',
                    text: 'text-blue-700',
                    textLight: 'text-blue-600',
                    border: 'border-blue-300',
                    Icon: Coffee
                  },
                  Lunch: {
                    badge: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600',
                    glow: 'from-emerald-300 to-teal-400',
                    bg: 'bg-emerald-50 border-emerald-200',
                    text: 'text-emerald-700',
                    textLight: 'text-emerald-600',
                    border: 'border-emerald-300',
                    Icon: UtensilsCrossed
                  },
                  Dinner: {
                    badge: 'bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600',
                    glow: 'from-orange-300 to-amber-400',
                    bg: 'bg-orange-50 border-orange-200',
                    text: 'text-orange-700',
                    textLight: 'text-orange-600',
                    border: 'border-orange-300',
                    Icon: ChefHat
                  }
                };
                const styles = periodStyles[item.period as keyof typeof periodStyles] || periodStyles.Breakfast;
                const IconComponent = styles.Icon;
                return (
                  <div key={`${item.period}-${index}`} className="group/item relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-white via-slate-50/30 to-white hover:from-slate-50 hover:via-emerald-50/40 hover:to-slate-50 transition-all duration-300 border-2 border-slate-200 hover:border-emerald-300 hover:shadow-lg">
                    {/* Period Badge - Now more prominent */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`relative flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${styles.badge} shadow-xl border-2 ${styles.border} group-hover/item:scale-105 transition-transform duration-300`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${styles.glow} rounded-xl blur-md opacity-40`} />
                        <IconComponent className="relative z-10 w-6 h-6 text-white drop-shadow-lg" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-black uppercase tracking-wider ${styles.text}`}>
                            {item.period}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate">{item.menu_name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-semibold">{t('total_sold')}: </span>
                          <span className="text-slate-700 font-bold">{item.total_sold}</span>
                        </p>
                      </div>
                    </div>
                    {/* Orders Badge */}
                    <div className="flex-shrink-0 sm:text-right">
                      <div className={`px-3 py-2 rounded-lg border-2 ${styles.bg} ${styles.border} shadow-sm`}>
                        <p className={`text-base font-black tabular-nums ${styles.text}`}>
                          {item.total_sold}
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${styles.textLight}`}>
                          orders
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSalesByCategoryModalOpen(true)}
                className="group/btn relative flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View by Category</span>
              </button>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-rose-500 rounded-xl blur-md opacity-40" />
                <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 p-2.5 rounded-xl shadow-lg">
                  <Trophy className="w-5 h-5 text-white drop-shadow-md" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
              <div className="w-1.5 h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{currentContextName} · Last 30 days</p>
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
        <div className="lg:col-span-2 group relative bg-white p-4 md:p-5 rounded-2xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
          {/* Premium gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900" />
          
          {/* Decorative corner accents */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-tr from-pink-100/30 to-purple-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          {/* Premium Header */}
          <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 rounded-xl blur-md opacity-40" />
                <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-2 rounded-lg shadow-lg">
                  <TrendingUp className="w-4 h-4 text-white drop-shadow-md" />
                </div>
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-900">{t('sales_graph_by_product')}</h2>
                <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">Product Performance</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {top5PopularMenuItems.slice(0, 5).map((item, idx) => {
                const color = TOP_PRODUCT_COLORS[idx] ?? '#94a3b8';
                const rgb = color.startsWith('#') 
                  ? {
                      r: parseInt(color.slice(1, 3), 16),
                      g: parseInt(color.slice(3, 5), 16),
                      b: parseInt(color.slice(5, 7), 16)
                    }
                  : { r: 148, g: 163, b: 184 };
                return (
                  <div 
                    key={item.IDNo} 
                    className="group/legend relative flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200"
                    style={{ 
                      background: `linear-gradient(to right, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.02))`
                    }}
                  >
                    <div className="relative flex-shrink-0">
                      <div 
                        className="absolute inset-0 rounded-full blur-sm opacity-60"
                        style={{ backgroundColor: color }}
                      />
                      <div 
                        className="relative w-2 h-2 rounded-full shadow-sm ring-1 ring-white"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <span 
                      className="text-[8px] font-bold truncate max-w-[55px] group-hover/legend:scale-105 transition-transform"
                      style={{ color: color }}
                    >
                      {item.MENU_NAME}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="relative mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-md border border-indigo-100 shadow-sm">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-sm opacity-50" />
                <div className="relative w-1.5 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" />
              </div>
              <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider">{currentContextName} · Last 30 days</p>
            </div>
          </div>
          
          <div className="relative h-72 md:h-96 min-h-[280px]">
            {/* Shine effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10 pointer-events-none" />
            
            {popularMenuItemsLoading || dailySalesLoading ? (
              <ChartLoadingSkeleton type="stacked" />
            ) : productSalesStackedChartData.length === 0 || !top5PopularMenuItems || top5PopularMenuItems.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-semibold text-slate-500">No sales data available</p>
                <p className="text-xs text-slate-400 mt-1">Sales data will appear here once orders are placed</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={288} minWidth={0} minHeight={280}>
                <BarChart data={productSalesStackedChartData} margin={{ left: 8, right: 16, bottom: 32, top: 8 }}>
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={55}
                    tick={{ fill: '#64748b', fontSize: 8, fontWeight: 600 }}
                    tickCount={30}
                    dy={4}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
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
                    labelStyle={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}
                    labelFormatter={(label) => String(label)}
                    formatter={(value: number, name: string) => {
                      const productIdx = parseInt(name.replace('p', ''), 10);
                      const color = TOP_PRODUCT_COLORS[productIdx] ?? '#94a3b8';
                      const productName = productKeyToName[name] ?? name;
                      return [
                        <span key={name} style={{ color: color, fontWeight: 600 }}>
                          {productName}: ₱{Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>,
                        ''
                      ];
                    }}
                    itemStyle={{ padding: '2px 0' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const totalValue = payload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);
                      return (
                        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-2xl p-4 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                            <p className="font-bold text-slate-900 text-sm">{label}</p>
                            <div className="px-2 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-md border border-indigo-100">
                              <span className="text-xs font-bold text-indigo-700">
                                Total: ₱{totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {payload
                              .filter((entry: any) => (Number(entry.value) || 0) > 0)
                              .map((entry: any, idx: number) => {
                                const productIdx = parseInt(entry.dataKey?.replace('p', '') || '0', 10);
                                const color = TOP_PRODUCT_COLORS[productIdx] ?? '#94a3b8';
                                const productName = productKeyToName[entry.dataKey] ?? entry.dataKey;
                                const value = Number(entry.value) || 0;
                                const rgb = color.startsWith('#') 
                                  ? {
                                      r: parseInt(color.slice(1, 3), 16),
                                      g: parseInt(color.slice(3, 5), 16),
                                      b: parseInt(color.slice(5, 7), 16)
                                    }
                                  : { r: 148, g: 163, b: 184 };
                                return (
                                  <div key={idx} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                      <div className="relative flex-shrink-0">
                                        <div 
                                          className="absolute inset-0 rounded-full blur-sm opacity-50"
                                          style={{ backgroundColor: color }}
                                        />
                                        <div 
                                          className="relative w-3 h-3 rounded-full shadow-md ring-2 ring-white"
                                          style={{ backgroundColor: color }}
                                        />
                                      </div>
                                      <span className="text-xs font-bold truncate" style={{ color: color }}>
                                        {productName}
                                      </span>
                                    </div>
                                    <div 
                                      className="px-2.5 py-1 rounded-md font-bold text-xs shadow-sm"
                                      style={{ 
                                        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
                                        color: color,
                                        border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
                                      }}
                                    >
                                      ₱{value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    }}
                  />
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
                      <Bar
                        key={item.IDNo}
                        dataKey={`p${idx}`}
                        stackId="products"
                        fill={`url(#productGradient${idx})`}
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={800}
                        style={{
                          filter: `drop-shadow(0 4px 8px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25))`,
                          transition: 'all 0.3s ease'
                        }}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods Summary */}
      <div className="group relative bg-white pl-3 pr-5 pt-4 pb-5 md:pl-4 md:pr-6 md:pt-5 md:pb-6 rounded-2xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-100/40 to-teal-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-tr from-cyan-100/30 to-teal-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-4">
            <h2 className="text-lg md:text-xl font-bold text-slate-900">{t('payment_methods_summary')}</h2>
            <button
              onClick={() => setReceiptModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
            >
              <FileText className="w-4 h-4" />
              <span>View Receipts</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="payment-methods-date" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Date:
              </label>
              <input
                id="payment-methods-date"
                type="date"
                value={paymentMethodsDate}
                onChange={(e) => {
                  setPaymentMethodsDate(e.target.value);
                }}
                max={new Date().toISOString().slice(0, 10)}
                className="px-3 py-1.5 text-sm border-2 border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-900 font-medium transition-all"
              />
              {paymentMethodsDate !== new Date().toISOString().slice(0, 10) && (
                <button
                  onClick={() => {
                    setPaymentMethodsDate(new Date().toISOString().slice(0, 10));
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm hover:shadow-md"
                >
                  Today
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 rounded-xl blur-md opacity-40" />
              <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-2.5 rounded-xl shadow-lg">
                <ShoppingBag className="w-5 h-5 text-white drop-shadow-md" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-x-auto -mx-1">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 via-emerald-50/40 to-slate-50 border-b-2 border-emerald-200/60">
                <th className="text-left pl-2 pr-4 py-2 text-[10px] md:text-xs text-slate-700 font-black uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full shadow-sm" />
                    <span>{t('payment_method')}</span>
                  </div>
                </th>
                <th className="text-left px-3 py-2 text-[10px] md:text-xs text-slate-700 font-black uppercase tracking-wider">{t('payment_transaction')}</th>
                <th className="text-left px-3 py-2 text-[10px] md:text-xs text-slate-700 font-black uppercase tracking-wider">{t('payment_amount')}</th>
                <th className="text-right pr-2 pl-4 py-2 text-[10px] md:text-xs text-slate-700 font-black uppercase tracking-wider">
                  <div className="flex items-center justify-end gap-2">
                    <span>{t('net_amount')}</span>
                    <div className="w-1 h-3 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full shadow-sm" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/40">
              {paymentMethodsLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td className="pl-2 pr-4 py-3">
                      <div className="h-4 w-24 rounded bg-slate-200/60 animate-pulse" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-4 w-16 rounded bg-slate-200/60 animate-pulse mx-auto" style={{ animationDelay: '0.1s' }} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="h-4 w-20 rounded bg-slate-200/60 animate-pulse mx-auto" style={{ animationDelay: '0.2s' }} />
                    </td>
                    <td className="pr-2 pl-4 py-3 text-right">
                      <div className="h-4 w-20 rounded bg-slate-200/60 animate-pulse ml-auto" style={{ animationDelay: '0.3s' }} />
                    </td>
                  </tr>
                ))
              ) : (
                paymentMethodsSummary.map((row) => (
                <tr
                  key={row.payment_method}
                  className={`group/row transition-all duration-300 ${
                    row.is_total 
                      ? 'bg-gradient-to-r from-slate-50 via-emerald-50/50 to-slate-50 font-black text-slate-900 border-t-2 border-emerald-300' 
                      : 'hover:bg-gradient-to-r hover:from-slate-50 hover:via-emerald-50/30 hover:to-slate-50 text-slate-700'
                  }`}
                >
                  <td className={`pl-2 pr-4 py-2 ${row.is_total ? 'text-sm' : 'text-sm font-semibold'}`}>
                    <div className="flex items-center gap-2">
                      {!row.is_total && (
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-sm opacity-50" />
                          <div className="relative w-1.5 h-1.5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm" />
                        </div>
                      )}
                      <span className={`${row.is_total ? 'uppercase tracking-wider' : 'capitalize'} font-bold`}>{row.payment_method}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm tabular-nums">
                    <span className={`inline-block px-1.5 py-0.5 rounded-md font-bold transition-all duration-200 ${
                      row.is_total
                        ? 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800 shadow-sm'
                        : 'bg-slate-100 text-slate-700 group-hover/row:bg-blue-100 group-hover/row:text-blue-800 group-hover/row:shadow-sm'
                    }`}>
                      {row.payment_transaction.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm tabular-nums">
                    <span className={`inline-block px-2 py-0.5 rounded-md font-bold transition-all duration-200 ${
                      row.is_total 
                        ? 'bg-gradient-to-r from-emerald-200 to-teal-200 text-emerald-900 shadow-md' 
                        : 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200/50 group-hover/row:from-emerald-100 group-hover/row:to-teal-100 group-hover/row:border-emerald-300 group-hover/row:shadow-sm'
                    }`}>
                      {formatPeso(row.payment_amount)}
                    </span>
                  </td>
                  <td className={`pr-2 pl-4 py-2 text-right tabular-nums ${row.is_total ? 'text-base' : 'text-sm font-semibold'}`}>
                    <span className={`inline-block px-2.5 py-1 rounded-lg font-black transition-all duration-200 ${
                      row.is_total 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30' 
                        : 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border-2 border-emerald-200 group-hover/row:from-emerald-100 group-hover/row:to-teal-100 group-hover/row:border-emerald-300 group-hover/row:shadow-md group-hover/row:scale-[1.02]'
                    }`}>
                      {formatPeso(row.net_amount)}
                    </span>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      </div>

      {/* (Temporarily removed) Inventory Health, Cost Analysis, Efficiency */}
        </>
      )}

      {/* Sales by Category Modal */}
      {salesByCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header - Simple Design matching dashboard cards */}
            <div className="p-4 md:p-6 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4 flex-1">
                {/* EXPORT Button */}
                <button
                  onClick={() => {
                    const csvContent = [
                      ['Category', 'Sales quantity', 'Net sales', 'Unit cost', 'Total Revenue'],
                      ...salesByCategoryData.map(row => [
                        row.category || '',
                        row.quantity || 0,
                        row.net_sales || 0,
                        row.unit_cost || 0,
                        row.total_revenue || 0
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `sales-by-category-${salesByCategoryDateStart}-${salesByCategoryDateEnd}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORT</span>
                </button>
                
                {/* Title Section */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-rose-500 rounded-xl blur-md opacity-40" />
                    <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 p-2.5 rounded-xl shadow-lg">
                      <Trophy className="w-5 h-5 text-white drop-shadow-md" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Sales by Category</h2>
                    <p className="text-sm text-slate-600">{currentContextName}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="More options"
                >
                  <MoreVertical className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={() => setSalesByCategoryModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
              {/* Filters Section - Simple Design */}
              <div className="p-4 md:p-6 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Start Date */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Start Date:</label>
                    <input
                      type="date"
                      value={salesByCategoryDateStart}
                      onChange={(e) => setSalesByCategoryDateStart(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-slate-900 font-medium"
                    />
                  </div>
                  
                  {/* End Date */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">End Date:</label>
                    <input
                      type="date"
                      value={salesByCategoryDateEnd}
                      onChange={(e) => setSalesByCategoryDateEnd(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      min={salesByCategoryDateStart}
                      className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-slate-900 font-medium"
                    />
                  </div>
                  
                  {/* Last 30 Days Button */}
                  <button
                    onClick={() => {
                      const today = new Date();
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(today.getDate() - 30);
                      setSalesByCategoryDateStart(thirtyDaysAgo.toISOString().slice(0, 10));
                      setSalesByCategoryDateEnd(today.toISOString().slice(0, 10));
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm hover:shadow-md"
                  >
                    Last 30 Days
                  </button>
                  
                  {/* Employee Filter Dropdown */}
                  <div className="relative employee-filter-dropdown ml-auto">
                    <button
                      type="button"
                      onClick={() => setSalesByCategoryEmployeeDropdownOpen(!salesByCategoryEmployeeDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-all text-sm font-medium text-slate-700"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <span>
                        {salesByCategoryEmployeeFilter === 'all' ? 'All employees' : 'Operator'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${salesByCategoryEmployeeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {salesByCategoryEmployeeDropdownOpen && (
                      <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-50 min-w-[200px]">
                        <div className="p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSalesByCategoryEmployeeFilter('all');
                              setSalesByCategoryEmployeeDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              salesByCategoryEmployeeFilter === 'all' 
                                ? 'bg-emerald-500 border-emerald-500' 
                                : 'border-slate-300'
                            }`}>
                              {salesByCategoryEmployeeFilter === 'all' && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-slate-700">All employees</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setSalesByCategoryEmployeeFilter('operator');
                              setSalesByCategoryEmployeeDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              salesByCategoryEmployeeFilter === 'operator' 
                                ? 'bg-emerald-500 border-emerald-500' 
                                : 'border-slate-300'
                            }`}>
                              {salesByCategoryEmployeeFilter === 'operator' && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-slate-700">Operator</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Table */}
              {salesByCategoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : salesByCategoryData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Trophy className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm font-semibold text-slate-500">No sales data available</p>
                  <p className="text-xs text-slate-400 mt-1">Sales data will appear here once orders are placed</p>
                </div>
              ) : (() => {
                // Pagination calculation
                const totalPages = Math.ceil(salesByCategoryData.length / salesByCategoryPageSize);
                const startIndex = (salesByCategoryPage - 1) * salesByCategoryPageSize;
                const endIndex = startIndex + salesByCategoryPageSize;
                const paginatedData = salesByCategoryData.slice(startIndex, endIndex);
                
                return (
                  <>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border-b-2 border-purple-200 shadow-sm">
                            <th className="text-left pl-4 pr-6 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full shadow-sm" />
                                <span className="text-slate-800">Category</span>
                              </div>
                            </th>
                            <th className="text-center px-4 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">Sales quantity</th>
                            <th className="text-center px-4 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">Net Sales</th>
                            <th className="text-center px-4 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">Unit Cost</th>
                            <th className="text-right pr-4 pl-6 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-slate-800">Total Revenue</span>
                                <div className="w-1.5 h-4 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full shadow-sm" />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {paginatedData.map((row, idx) => (
                            <tr
                              key={idx}
                              className="group/row transition-all duration-200 hover:bg-slate-50 text-slate-700"
                            >
                              <td className="pl-4 pr-6 py-3 text-sm font-semibold">
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-600" />
                                  </div>
                                  <span className="font-bold text-slate-900">{row.category || row.CATEGORY || '—'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm tabular-nums">
                                <span className="inline-block px-2 py-1 rounded-md font-bold bg-slate-100 text-slate-700 group-hover/row:bg-blue-100 group-hover/row:text-blue-800 transition-all">
                                  {Number(row.quantity || row.QUANTITY || 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm tabular-nums">
                                <span className="inline-block px-2 py-1 rounded-md font-bold bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200/50 group-hover/row:from-purple-100 group-hover/row:to-pink-100 group-hover/row:border-purple-300 transition-all">
                                  {formatPeso(row.net_sales || row.NET_SALES || 0)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm tabular-nums">
                                <span className="inline-block px-2 py-1 rounded-md font-bold bg-slate-50 text-slate-600 border border-slate-200">
                                  {formatPeso(row.unit_cost || row.UNIT_COST || 0)}
                                </span>
                              </td>
                              <td className="pr-4 pl-6 py-3 text-right tabular-nums text-sm font-semibold">
                                <span className="inline-block px-2.5 py-1 rounded-lg font-black bg-gradient-to-r from-purple-50 to-pink-50 text-purple-800 border-2 border-purple-200 group-hover/row:from-purple-100 group-hover/row:to-pink-100 group-hover/row:border-purple-300 group-hover/row:shadow-md transition-all">
                                  {formatPeso(row.total_revenue || row.TOTAL_REVENUE || 0)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 bg-white sticky bottom-0 z-10">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSalesByCategoryPage(prev => Math.max(1, prev - 1))}
                          disabled={salesByCategoryPage === 1}
                          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <span className="text-slate-700 font-bold">&lt;</span>
                        </button>
                        <span className="text-sm font-semibold text-slate-700 px-3">
                          Page: {salesByCategoryPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setSalesByCategoryPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={salesByCategoryPage === totalPages}
                          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <span className="text-slate-700 font-bold">&gt;</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">Page Line Count:</span>
                        <select
                          value={salesByCategoryPageSize}
                          onChange={(e) => {
                            setSalesByCategoryPageSize(Number(e.target.value));
                            setSalesByCategoryPage(1);
                          }}
                          className="px-3 py-1.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-slate-900 font-medium"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* Discount Report Modal */}
      {discountModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-4 flex-1">
                {/* EXPORT Button */}
                <button
                  onClick={() => {
                    const csvContent = [
                      ['Name', 'Discount applied', 'Point discount amount'],
                      ...discountData.map(row => [
                        row.name || '',
                        row.discount_applied || 0,
                        row.point_discount_amount || 0
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `discount-report-${discountDateStart}-${discountDateEnd}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORT</span>
                </button>

                {/* Title */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Discount</h2>
                    <p className="text-xs text-slate-600 font-semibold">Kim's Brothers</p>
                  </div>
                </div>
              </div>

              {/* More Options and Close */}
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={() => setDiscountModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Filters */}
              <div className="flex items-center gap-4 mb-6 flex-wrap">
                {/* Date Range */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Start Date:</label>
                  <input
                    type="date"
                    value={discountDateStart}
                    onChange={(e) => setDiscountDateStart(e.target.value)}
                    max={discountDateEnd}
                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-slate-900 font-medium"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">End Date:</label>
                  <input
                    type="date"
                    value={discountDateEnd}
                    onChange={(e) => setDiscountDateEnd(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    min={discountDateStart}
                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-slate-900 font-medium"
                  />
                </div>

                {/* Time Range */}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <input
                    type="time"
                    value={discountTimeStart}
                    onChange={(e) => setDiscountTimeStart(e.target.value)}
                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-slate-900 font-medium"
                  />
                  <span className="text-sm font-semibold text-slate-600">-</span>
                  <input
                    type="time"
                    value={discountTimeEnd}
                    onChange={(e) => setDiscountTimeEnd(e.target.value)}
                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-slate-900 font-medium"
                  />
                </div>

                {/* Employee Filter */}
                <div className="relative discount-employee-filter-dropdown ml-auto">
                  <button
                    type="button"
                    onClick={() => setDiscountEmployeeDropdownOpen(!discountEmployeeDropdownOpen)}
                    className="flex items-center gap-2.5 px-4 py-2.5 bg-white border-2 border-amber-200 rounded-xl hover:border-amber-400 transition-all text-sm font-semibold text-slate-700 shadow-sm hover:shadow-md"
                  >
                    <User className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                    <span className="font-semibold">
                      {discountEmployeeFilter === 'all' ? 'All employees' : 'Operator'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${discountEmployeeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {discountEmployeeDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-amber-100 z-50 min-w-[220px] overflow-hidden">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setDiscountEmployeeFilter('all');
                            setDiscountEmployeeDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            discountEmployeeFilter === 'all' 
                              ? 'bg-emerald-500 border-emerald-500' 
                              : 'border-slate-300'
                          }`}>
                            {discountEmployeeFilter === 'all' && (
                              <Check className="w-3.5 h-3.5 text-white font-bold" />
                            )}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">All employees</span>
                        </button>
                        <button
                          onClick={() => {
                            setDiscountEmployeeFilter('operator');
                            setDiscountEmployeeDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            discountEmployeeFilter === 'operator' 
                              ? 'bg-emerald-500 border-emerald-500' 
                              : 'border-slate-300'
                          }`}>
                            {discountEmployeeFilter === 'operator' && (
                              <Check className="w-3.5 h-3.5 text-white font-bold" />
                            )}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">Operator</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Table */}
              {discountLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
              ) : discountData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Tag className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm font-semibold text-slate-500">No discount data available</p>
                  <p className="text-xs text-slate-400 mt-1">Discount data will appear here once discounts are applied</p>
                </div>
              ) : (() => {
                const totalPages = Math.ceil(discountData.length / discountPageSize);
                const startIndex = (discountPage - 1) * discountPageSize;
                const endIndex = startIndex + discountPageSize;
                const paginatedData = discountData.slice(startIndex, endIndex);
                
                return (
                  <>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b-2 border-amber-200 shadow-sm">
                            <th className="text-left pl-4 pr-6 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full shadow-sm" />
                                <span className="text-slate-800">Name</span>
                              </div>
                            </th>
                            <th className="text-right px-4 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">Discount applied</th>
                            <th className="text-right pr-4 pl-6 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-slate-800">Point discount amount</span>
                                <div className="w-1.5 h-4 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full shadow-sm" />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {paginatedData.map((row, idx) => (
                            <tr
                              key={idx}
                              className="group/row transition-all duration-200 hover:bg-slate-50 text-slate-700"
                            >
                              <td className="pl-4 pr-6 py-3 text-sm font-semibold">
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600" />
                                  </div>
                                  <span className="font-bold text-slate-900">{row.name || '—'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm tabular-nums text-right">
                                <span className="inline-block px-2 py-1 rounded-md font-bold bg-slate-100 text-slate-700 group-hover/row:bg-blue-100 group-hover/row:text-blue-800 transition-all">
                                  {Number(row.discount_applied || 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="pr-4 pl-6 py-3 text-sm tabular-nums text-right">
                                <span className="inline-block px-2 py-1 rounded-md font-bold bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200/50 group-hover/row:from-amber-100 group-hover/row:to-orange-100 group-hover/row:border-amber-300 transition-all">
                                  {formatPeso(row.point_discount_amount || 0)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDiscountPage(prev => Math.max(1, prev - 1))}
                          disabled={discountPage === 1}
                          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <span className="text-slate-700 font-bold">&lt;</span>
                        </button>
                        <span className="text-sm font-semibold text-slate-700 px-3">
                          Page: {discountPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setDiscountPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={discountPage === totalPages}
                          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <span className="text-slate-700 font-bold">&gt;</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">Page Line Count:</span>
                        <select
                          value={discountPageSize}
                          onChange={(e) => {
                            setDiscountPageSize(Number(e.target.value));
                            setDiscountPage(1);
                          }}
                          className="px-3 py-1.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-slate-900 font-medium"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Storage Box Modal */}
      {receiptModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-4 flex-1">
                {/* EXPORT Button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      const csvContent = [
                        ['Receipt number', 'Date', 'Employee', 'Customer', 'Type', 'Total'],
                        ...receiptData.map(row => [
                          row.receipt_number || '',
                          `${row.date} ${row.time}`,
                          row.employee || '',
                          row.customer || '',
                          row.type || '',
                          row.total || 0
                        ])
                      ].map(row => row.join(',')).join('\n');
                      
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      link.setAttribute('href', url);
                      link.setAttribute('download', `receipt-storage-${receiptDateStart}-${receiptDateEnd}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>EXPORT</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Title */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl shadow-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Receipt storage box</h2>
                    <p className="text-xs text-slate-600 font-semibold">Kim's Brothers</p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Filters */}
              <div className="flex items-center gap-4 mb-6 flex-wrap">
                {/* Date Range */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={receiptDateStart}
                    onChange={(e) => setReceiptDateStart(e.target.value)}
                    max={receiptDateEnd}
                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-900 font-medium"
                  />
                  <span className="text-sm font-semibold text-slate-600">-</span>
                  <input
                    type="date"
                    value={receiptDateEnd}
                    onChange={(e) => setReceiptDateEnd(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    min={receiptDateStart}
                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-900 font-medium"
                  />
                </div>

                {/* Time Range */}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <input
                    type="time"
                    value={receiptTimeStart}
                    onChange={(e) => setReceiptTimeStart(e.target.value)}
                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-900 font-medium"
                  />
                  <span className="text-sm font-semibold text-slate-600">-</span>
                  <input
                    type="time"
                    value={receiptTimeEnd}
                    onChange={(e) => setReceiptTimeEnd(e.target.value)}
                    className="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-900 font-medium"
                  />
                </div>

                {/* Employee Filter */}
                <div className="relative receipt-employee-filter-dropdown">
                  <button
                    type="button"
                    onClick={() => setReceiptEmployeeDropdownOpen(!receiptEmployeeDropdownOpen)}
                    className="flex items-center gap-2.5 px-4 py-2.5 bg-white border-2 border-emerald-200 rounded-xl hover:border-emerald-400 transition-all text-sm font-semibold text-slate-700 shadow-sm hover:shadow-md"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold">
                      {receiptEmployeeFilter === 'all' ? 'All employees' : 'Operator'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${receiptEmployeeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {receiptEmployeeDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-emerald-100 z-50 min-w-[220px] overflow-hidden">
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setReceiptEmployeeFilter('all');
                            setReceiptEmployeeDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            receiptEmployeeFilter === 'all' 
                              ? 'bg-emerald-500 border-emerald-500' 
                              : 'border-slate-300'
                          }`}>
                            {receiptEmployeeFilter === 'all' && (
                              <Check className="w-3.5 h-3.5 text-white font-bold" />
                            )}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">All employees</span>
                        </button>
                        <button
                          onClick={() => {
                            setReceiptEmployeeFilter('operator');
                            setReceiptEmployeeDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            receiptEmployeeFilter === 'operator' 
                              ? 'bg-emerald-500 border-emerald-500' 
                              : 'border-slate-300'
                          }`}>
                            {receiptEmployeeFilter === 'operator' && (
                              <Check className="w-3.5 h-3.5 text-white font-bold" />
                            )}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">Operator</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className="relative ml-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search receipts..."
                    value={receiptSearch}
                    onChange={(e) => setReceiptSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-900 font-medium w-64"
                  />
                </div>
              </div>

              {/* Summary Cards */}
              {(() => {
                const allReceipts = receiptData.length;
                const sales = receiptData.filter(r => r.type === 'sale').length;
                const refunds = receiptData.filter(r => r.type === 'refund').length;
                const refundAmount = receiptData.filter(r => r.type === 'refund').reduce((sum, r) => sum + (r.total || 0), 0);

                return (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border-2 border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">All receipts</p>
                          <p className="text-2xl font-black text-slate-900">{allReceipts}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-xl border-2 border-emerald-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">sale</p>
                          <p className="text-2xl font-black text-slate-900">{sales}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-white p-4 rounded-xl border-2 border-red-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-red-400 to-red-500 rounded-lg">
                          <ArrowDownRight className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Refund amount</p>
                          <p className="text-2xl font-black text-slate-900">{refunds}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Table */}
              {receiptLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : receiptData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <FileText className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm font-semibold text-slate-500">No receipts available</p>
                  <p className="text-xs text-slate-400 mt-1">Receipts will appear here once transactions are made</p>
                </div>
              ) : (() => {
                // Filter data based on search
                const filteredData = receiptData.filter(row => {
                  if (!receiptSearch) return true;
                  const searchLower = receiptSearch.toLowerCase();
                  return (
                    (row.receipt_number || '').toLowerCase().includes(searchLower) ||
                    (row.employee || '').toLowerCase().includes(searchLower) ||
                    (row.customer || '').toLowerCase().includes(searchLower) ||
                    (row.type || '').toLowerCase().includes(searchLower)
                  );
                });

                const totalPages = Math.ceil(filteredData.length / receiptPageSize);
                const startIndex = (receiptPage - 1) * receiptPageSize;
                const endIndex = startIndex + receiptPageSize;
                const paginatedData = filteredData.slice(startIndex, endIndex);
                
                return (
                  <>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full">
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b-2 border-emerald-200 shadow-sm">
                            <th className="text-left pl-4 pr-6 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full shadow-sm" />
                                <span className="text-slate-800">Receipt number</span>
                              </div>
                            </th>
                            <th className="text-left px-4 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">Date</th>
                            <th className="text-left px-4 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">Employee</th>
                            <th className="text-left px-4 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">Customer</th>
                            <th className="text-left px-4 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">Type</th>
                            <th className="text-right pr-4 pl-6 py-4 text-xs text-slate-800 font-black uppercase tracking-wider">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-slate-800">Total</span>
                                <div className="w-1.5 h-4 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full shadow-sm" />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {paginatedData.map((row, idx) => (
                            <tr
                              key={idx}
                              className="group/row transition-all duration-200 hover:bg-slate-50 text-slate-700"
                            >
                              <td className="pl-4 pr-6 py-3 text-sm font-semibold">
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600" />
                                  </div>
                                  <span className="font-bold text-slate-900">{row.receipt_number || '—'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </div>
                                  <div className="text-xs text-slate-500">{row.time}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-700">{row.employee || '—'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{row.customer || '—'}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-block px-2 py-1 rounded-md font-bold ${
                                  row.type === 'sale' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {row.type || '—'}
                                </span>
                              </td>
                              <td className="pr-4 pl-6 py-3 text-sm tabular-nums text-right">
                                <span className="inline-block px-2 py-1 rounded-md font-bold bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200/50 group-hover/row:from-emerald-100 group-hover/row:to-teal-100 group-hover/row:border-emerald-300 transition-all">
                                  {formatPeso(row.total || 0)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setReceiptPage(prev => Math.max(1, prev - 1))}
                          disabled={receiptPage === 1}
                          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <span className="text-slate-700 font-bold">&lt;</span>
                        </button>
                        <span className="text-sm font-semibold text-slate-700 px-3">
                          Page: {receiptPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setReceiptPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={receiptPage === totalPages}
                          className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <span className="text-slate-700 font-bold">&gt;</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">Page Line Count:</span>
                        <select
                          value={receiptPageSize}
                          onChange={(e) => {
                            setReceiptPageSize(Number(e.target.value));
                            setReceiptPage(1);
                          }}
                          className="px-3 py-1.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-900 font-medium"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Total Sales Detail Modal */}
      {totalSalesDetailModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => {
                    const csvContent = [
                      ['hour', 'Total sales', 'refund', 'discount', 'Net sales', 'Product unit price', 'Gross profit'],
                      ...totalSalesDetailData.map(row => [
                        new Date(row.hour).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                        `P${row.total_sales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        `P${row.refund.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        `P${row.discount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        `P${row.net_sales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        `P${row.product_unit_price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        `P${row.gross_profit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `total-sales-detail-${kimsBrotherChartDateStart}-${kimsBrotherChartDateEnd}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORT</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl shadow-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Total Sales Detail</h2>
                    <p className="text-xs text-slate-600 font-semibold">{currentContextName}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTotalSalesDetailModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Date Range Display */}
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    Date Range: {formatDateForDisplay(kimsBrotherChartDateStart)} - {formatDateForDisplay(kimsBrotherChartDateEnd)}
                  </span>
                </div>
              </div>

              {totalSalesDetailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : (
                <>
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">hour</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Total sales</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">refund</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">discount</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Net sales</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Product unit price</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Gross profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {totalSalesDetailData
                          .slice((totalSalesDetailPage - 1) * totalSalesDetailPageSize, totalSalesDetailPage * totalSalesDetailPageSize)
                          .map((row, idx) => (
                            <tr key={idx} className="group/row transition-all duration-200 hover:bg-slate-50 text-slate-700">
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                {new Date(row.hour).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(row.hour).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                P{row.total_sales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                P{row.refund.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                P{row.discount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                P{row.net_sales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                P{row.product_unit_price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                P{row.gross_profit.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Page Line Count:</span>
                      <select
                        value={totalSalesDetailPageSize}
                        onChange={(e) => {
                          setTotalSalesDetailPageSize(Number(e.target.value));
                          setTotalSalesDetailPage(1);
                        }}
                        className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setTotalSalesDetailPage(p => Math.max(1, p - 1))}
                        disabled={totalSalesDetailPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-semibold text-slate-700">
                        Page: {totalSalesDetailPage} / {Math.ceil(totalSalesDetailData.length / totalSalesDetailPageSize)}
                      </span>
                      <button
                        onClick={() => setTotalSalesDetailPage(p => Math.min(Math.ceil(totalSalesDetailData.length / totalSalesDetailPageSize), p + 1))}
                        disabled={totalSalesDetailPage >= Math.ceil(totalSalesDetailData.length / totalSalesDetailPageSize)}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
