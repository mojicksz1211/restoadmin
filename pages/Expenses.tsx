import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Select, { type SingleValue, type StylesConfig } from 'react-select';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import flatpickr from 'flatpickr';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  Package,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  ExpenseCategoryBreakdownItem,
  ExpenseRecord,
  ExpenseSummary,
  ExpenseTrendPoint,
} from '../types';
import {
  createExpense,
  deleteExpense,
  exportExpenseCsv,
  getExpenseCategoryBreakdown,
  getExpenses,
  getExpenseSummary,
  getExpenseTrend,
  updateExpense,
} from '../services/expenseService';
import DatePickerInput from '../components/DatePickerInput';

interface ExpensesProps {
  selectedBranchId: string;
}

type FeedbackMessage = {
  type: 'success' | 'error';
  text: string;
};

type ExpenseFormState = {
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
};

type SelectOption = {
  value: string;
  label: string;
};

const CATEGORY_OPTIONS = ['Materials', 'Products', 'Salary', 'Gas', 'Utilities', 'Rent', 'Other'];

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  material_stock_in: 'Material Stock',
  product_stock_in: 'Product Stock',
  material_stock_in_txn: 'Material Stock In',
  product_stock_in_txn: 'Product Stock In',
};

const defaultFormState = (): ExpenseFormState => ({
  expenseDate: new Date().toISOString().slice(0, 10),
  category: 'Other',
  description: '',
  amount: '',
});

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderRadius: 12,
    borderColor: state.isFocused ? '#f97316' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(249, 115, 22, 0.2)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#f97316' : '#94a3b8',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94a3b8',
    fontSize: '0.875rem',
  }),
  menu: (base) => ({
    ...base,
    zIndex: 130,
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.875rem',
    backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#fff7ed' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#0f172a',
  }),
};

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Expenses: React.FC<ExpensesProps> = ({ selectedBranchId }) => {
  const EXPENSES_PAGE_SIZE = 15;
  const { t } = useTranslation('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalExpense: 0,
    autoExpense: 0,
    manualExpense: 0,
    currentMonthExpense: 0,
  });
  const [categoryBreakdown, setCategoryBreakdown] = useState<ExpenseCategoryBreakdownItem[]>([]);
  const [trend, setTrend] = useState<ExpenseTrendPoint[]>([]);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [addForm, setAddForm] = useState<ExpenseFormState>(defaultFormState);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [editForm, setEditForm] = useState<ExpenseFormState>(defaultFormState);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseRecord | null>(null);
  const expenseDateRangeRef = useRef<HTMLInputElement>(null);
  const expenseDateRangePicker = useRef<ReturnType<typeof flatpickr> | null>(null);
  const trendChartWrapRef = useRef<HTMLDivElement>(null);
  const categoryChartWrapRef = useRef<HTMLDivElement>(null);
  const [trendChartWidth, setTrendChartWidth] = useState(0);
  const [categoryChartWidth, setCategoryChartWidth] = useState(0);
  const [expensesPage, setExpensesPage] = useState(1);
  const [expensesShowAll, setExpensesShowAll] = useState(false);
  const getDateRangePicker = () =>
    expenseDateRangePicker.current && !Array.isArray(expenseDateRangePicker.current)
      ? expenseDateRangePicker.current
      : null;

  const filters = useMemo(
    () => ({
      branchId: selectedBranchId,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      sourceType: sourceFilter === 'all' ? undefined : sourceFilter,
      search: searchTerm || undefined,
    }),
    [selectedBranchId, dateFrom, dateTo, categoryFilter, sourceFilter, searchTerm]
  );

  const showFeedback = (type: FeedbackMessage['type'], text: string) => {
    setFeedback({ type, text });
  };

  const loadData = async () => {
    try {
      const [rows, summaryData, categoryData, trendData] = await Promise.all([
        getExpenses(filters),
        getExpenseSummary(filters),
        getExpenseCategoryBreakdown(filters),
        getExpenseTrend({ ...filters, period: 'monthly' }),
      ]);
      setExpenses(rows);
      setSummary(summaryData);
      setCategoryBreakdown(categoryData);
      setTrend(trendData);
    } catch (error) {
      setExpenses([]);
      setCategoryBreakdown([]);
      setTrend([]);
      showFeedback('error', error instanceof Error ? error.message : 'Failed to load expenses.');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId, dateFrom, dateTo, categoryFilter, sourceFilter]);

  useEffect(() => {
    const el = expenseDateRangeRef.current;
    if (!el) return;
    if (expenseDateRangePicker.current) return;

    expenseDateRangePicker.current = flatpickr(el, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      maxDate: 'today',
      disableMobile: true,
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          const [d1, d2] = selectedDates;
          const start = d1 < d2 ? d1 : d2;
          const end = d1 < d2 ? d2 : d1;
          setDateFrom(formatDateLocal(start));
          setDateTo(formatDateLocal(end));
          return;
        }
        if (selectedDates.length === 0) {
          setDateFrom('');
          setDateTo('');
        }
      },
    });

    return () => {
      const picker = getDateRangePicker();
      if (picker) {
        picker.destroy();
        expenseDateRangePicker.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const picker = getDateRangePicker();
    if (!picker) return;
    if (!dateFrom || !dateTo) {
      if (picker.selectedDates.length > 0) {
        picker.clear(false);
      }
      return;
    }

    const currentDates = picker.selectedDates;
    const currentStart = currentDates.length > 0 ? formatDateLocal(currentDates[0]) : '';
    const currentEnd = currentDates.length > 1 ? formatDateLocal(currentDates[1]) : '';
    if (currentStart !== dateFrom || currentEnd !== dateTo) {
      picker.setDate([dateFrom, dateTo], false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const trendEl = trendChartWrapRef.current;
    const categoryEl = categoryChartWrapRef.current;
    if (!trendEl || !categoryEl) return;

    const updateSizes = () => {
      setTrendChartWidth(Math.max(0, Math.floor(trendEl.getBoundingClientRect().width)));
      setCategoryChartWidth(Math.max(0, Math.floor(categoryEl.getBoundingClientRect().width)));
    };

    updateSizes();
    const observer = new ResizeObserver(() => updateSizes());
    observer.observe(trendEl);
    observer.observe(categoryEl);
    window.addEventListener('resize', updateSizes);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSizes);
    };
  }, []);

  const filteredBySearch = useMemo(() => {
    const lowered = searchTerm.trim().toLowerCase();
    if (!lowered) return expenses;
    return expenses.filter((item) => {
      const sourceText = SOURCE_LABELS[item.sourceType] || item.sourceType;
      return (
        item.category.toLowerCase().includes(lowered) ||
        item.description.toLowerCase().includes(lowered) ||
        sourceText.toLowerCase().includes(lowered)
      );
    });
  }, [expenses, searchTerm]);

  const trendChartData = useMemo(
    () =>
      trend.map((row) => ({
        period: row.period,
        amount: row.totalAmount,
      })),
    [trend]
  );

  const categoryChartData = useMemo(
    () =>
      categoryBreakdown.map((row) => ({
        category: row.category,
        amount: row.totalAmount,
      })),
    [categoryBreakdown]
  );

  const categoryFilterOptions: SelectOption[] = useMemo(
    () => [
      { value: 'all', label: 'All Categories' },
      ...CATEGORY_OPTIONS.map((option) => ({ value: option, label: option })),
    ],
    []
  );

  const sourceFilterOptions: SelectOption[] = useMemo(
    () => [
      { value: 'all', label: 'All Sources' },
      { value: 'manual', label: 'Manual' },
      { value: 'material_stock_in', label: 'Material Stock' },
      { value: 'product_stock_in', label: 'Product Stock' },
      { value: 'material_stock_in_txn', label: 'Material Stock In' },
      { value: 'product_stock_in_txn', label: 'Product Stock In' },
    ],
    []
  );

  const expenseCategoryOptions: SelectOption[] = useMemo(
    () => CATEGORY_OPTIONS.map((option) => ({ value: option, label: option })),
    []
  );

  const totalExpensePages = useMemo(
    () => (expensesShowAll ? 1 : Math.max(1, Math.ceil(filteredBySearch.length / EXPENSES_PAGE_SIZE))),
    [filteredBySearch.length, expensesShowAll]
  );

  const paginatedExpenses = useMemo(() => {
    if (expensesShowAll) return filteredBySearch;
    const start = (expensesPage - 1) * EXPENSES_PAGE_SIZE;
    return filteredBySearch.slice(start, start + EXPENSES_PAGE_SIZE);
  }, [filteredBySearch, expensesPage, expensesShowAll]);

  useEffect(() => {
    setExpensesPage(1);
  }, [searchTerm, selectedBranchId, categoryFilter, sourceFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (expensesPage > totalExpensePages) setExpensesPage(totalExpensePages);
  }, [expensesPage, totalExpensePages]);

  const resetAddModal = () => {
    setAddForm(defaultFormState());
    setIsAddModalOpen(false);
  };

  const openEditModal = (item: ExpenseRecord) => {
    setEditingExpense(item);
    setEditForm({
      expenseDate: item.expenseDate || new Date().toISOString().slice(0, 10),
      category: item.category || 'Other',
      description: item.description || '',
      amount: String(item.amount || ''),
    });
  };

  const handleCreateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedBranchId === 'all') {
      showFeedback('error', 'Select a specific branch before adding manual expenses.');
      return;
    }
    const amount = Number(addForm.amount);
    if (!addForm.expenseDate || !addForm.category || !Number.isFinite(amount) || amount < 0) {
      showFeedback('error', 'Date, category, and non-negative amount are required.');
      return;
    }
    try {
      await createExpense({
        branchId: selectedBranchId,
        expenseDate: addForm.expenseDate,
        category: addForm.category,
        description: addForm.description,
        amount,
      });
      await loadData();
      resetAddModal();
      showFeedback('success', 'Expense added successfully.');
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Failed to create expense.');
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;
    const amount = Number(editForm.amount);
    if (!editForm.expenseDate || !editForm.category || !Number.isFinite(amount) || amount < 0) {
      showFeedback('error', 'Date, category, and non-negative amount are required.');
      return;
    }
    try {
      await updateExpense(editingExpense.id, {
        expenseDate: editForm.expenseDate,
        category: editForm.category,
        description: editForm.description,
        amount,
      });
      await loadData();
      setEditingExpense(null);
      showFeedback('success', 'Expense updated successfully.');
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Failed to update expense.');
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    try {
      await deleteExpense(deletingExpense.id);
      await loadData();
      setDeletingExpense(null);
      showFeedback('success', 'Expense deleted successfully.');
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Failed to delete expense.');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvBlob = await exportExpenseCsv(filters);
      const url = URL.createObjectURL(csvBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Failed to export CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500">Track all branch expenses including inventory, salary, gas, and other costs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-orange-600"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Expense</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₱{summary.totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Manual Expense</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">₱{summary.manualExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Auto Expense</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">₱{summary.autoExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">This Month</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">₱{summary.currentMonthExpense.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search category/description/source..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <div className="relative w-full">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              ref={expenseDateRangeRef}
              type="text"
              readOnly
              value={dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : ''}
              placeholder="Select date range"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              setDateFrom(formatDateLocal(startOfMonth));
              setDateTo(formatDateLocal(today));
            }}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            This Month
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={categoryFilterOptions.find((option) => option.value === categoryFilter) || null}
            onChange={(option: SingleValue<SelectOption>) => setCategoryFilter(option?.value || 'all')}
            options={categoryFilterOptions}
            styles={selectStyles}
            classNamePrefix="react-select"
          />
          <Select
            value={sourceFilterOptions.find((option) => option.value === sourceFilter) || null}
            onChange={(option: SingleValue<SelectOption>) => setSourceFilter(option?.value || 'all')}
            options={sourceFilterOptions}
            styles={selectStyles}
            classNamePrefix="react-select"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-slate-700">Monthly Expense Trend</h3>
          </div>
          <div ref={trendChartWrapRef} className="h-64 min-w-0 min-h-[256px]">
            {trendChartWidth > 0 && (
              <BarChart width={trendChartWidth} height={256} data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(value: number) => `₱${Number(value).toLocaleString()}`} />
                <Bar dataKey="amount" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-700">Category Breakdown</h3>
          </div>
          <div ref={categoryChartWrapRef} className="h-64 min-w-0 min-h-[256px]">
            {categoryChartWidth > 0 && (
              <BarChart width={categoryChartWidth} height={256} data={categoryChartData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(value: number) => `₱${Number(value).toLocaleString()}`} />
                <Bar dataKey="amount" fill="#2563eb" radius={[0, 8, 8, 0]} />
              </BarChart>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                {selectedBranchId === 'all' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Branch</th>}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Source</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Description</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={selectedBranchId === 'all' ? 8 : 7} className="px-6 py-16 text-center text-slate-500">
                    No expenses found.
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-sm text-slate-700">{item.expenseDate}</td>
                    {selectedBranchId === 'all' && <td className="px-6 py-4 text-sm text-slate-700">{item.branchName || '-'}</td>}
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{SOURCE_LABELS[item.sourceType] || item.sourceType}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.description || '-'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">₱{item.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                          item.isAuto ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {item.isAuto ? 'Auto' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          disabled={item.isAuto}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          title={item.isAuto ? 'Auto expense is read-only' : 'Edit expense'}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingExpense(item)}
                          disabled={item.isAuto}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          title={item.isAuto ? 'Auto expense is read-only' : 'Delete expense'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            Showing {paginatedExpenses.length === 0 ? 0 : expensesShowAll ? 1 : (expensesPage - 1) * EXPENSES_PAGE_SIZE + 1}
            {' '}to {expensesShowAll ? filteredBySearch.length : Math.min(expensesPage * EXPENSES_PAGE_SIZE, filteredBySearch.length)} of {filteredBySearch.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setExpensesShowAll((prev) => !prev);
                setExpensesPage(1);
              }}
              className="h-[34px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
            >
              {expensesShowAll ? 'Show 15 / page' : 'Show All'}
            </button>
            <button
              type="button"
              onClick={() => setExpensesPage((prev) => Math.max(1, prev - 1))}
              disabled={expensesShowAll || expensesPage <= 1}
              className="h-[34px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-xs font-semibold text-slate-700">
              Page {expensesPage} / {totalExpensePages}
            </span>
            <button
              type="button"
              onClick={() => setExpensesPage((prev) => Math.min(totalExpensePages, prev + 1))}
              disabled={expensesShowAll || expensesPage >= totalExpensePages}
              className="h-[34px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isAddModalOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm" onClick={resetAddModal} />
            <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <form onSubmit={handleCreateExpense}>
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Add Expense</h3>
                    <p className="text-xs text-slate-500 mt-1">Create a manual expense record.</p>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Expense Date</label>
                      <DatePickerInput
                        value={addForm.expenseDate}
                        onChange={(value) => setAddForm((prev) => ({ ...prev, expenseDate: value }))}
                        maxDate={new Date().toISOString().slice(0, 10)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Category</label>
                      <Select
                        value={expenseCategoryOptions.find((option) => option.value === addForm.category) || null}
                        onChange={(option: SingleValue<SelectOption>) =>
                          setAddForm((prev) => ({ ...prev, category: option?.value || 'Other' }))
                        }
                        options={expenseCategoryOptions}
                        styles={selectStyles}
                        classNamePrefix="react-select"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Description</label>
                      <textarea
                        rows={3}
                        value={addForm.description}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Amount</label>
                      <div className="flex rounded-xl border border-slate-300 overflow-hidden">
                        <span className="px-3 py-2.5 bg-slate-50 text-slate-500 text-sm">₱</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={addForm.amount}
                          onChange={(e) => setAddForm((prev) => ({ ...prev, amount: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetAddModal}
                      className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold">
                      Save Expense
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>,
          document.body
        )}

      {editingExpense &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingExpense(null)} />
            <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Edit Expense</h3>
                  <p className="text-xs text-slate-500 mt-1">Update manual expense record.</p>
                </div>
                <div className="p-5 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Expense Date</label>
                    <DatePickerInput
                      value={editForm.expenseDate}
                      onChange={(value) => setEditForm((prev) => ({ ...prev, expenseDate: value }))}
                      maxDate={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Category</label>
                    <Select
                      value={expenseCategoryOptions.find((option) => option.value === editForm.category) || null}
                      onChange={(option: SingleValue<SelectOption>) =>
                        setEditForm((prev) => ({ ...prev, category: option?.value || 'Other' }))
                      }
                      options={expenseCategoryOptions}
                      styles={selectStyles}
                      classNamePrefix="react-select"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Description</label>
                    <textarea
                      rows={3}
                      value={editForm.description}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Amount</label>
                    <div className="flex rounded-xl border border-slate-300 overflow-hidden">
                      <span className="px-3 py-2.5 bg-slate-50 text-slate-500 text-sm">₱</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editForm.amount}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingExpense(null)}
                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateExpense}
                    className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {deletingExpense &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeletingExpense(null)} />
            <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Delete Expense</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Delete this expense record from category &quot;{deletingExpense.category}&quot;?
                  </p>
                </div>
                <div className="p-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingExpense(null)}
                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteExpense}
                    className="px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {feedback &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm" />
            <div className="fixed inset-0 z-[121] flex items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-center">
                <div className="flex justify-center mb-3">
                  {feedback.type === 'success' ? (
                    <span className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </span>
                  ) : (
                    <span className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-bold text-slate-900">{feedback.type === 'success' ? 'Success' : 'Error'}</h4>
                <p className="text-sm text-slate-600 mt-2">{feedback.text}</p>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className={`mt-5 px-6 py-2.5 rounded-xl font-semibold text-sm text-white ${
                    feedback.type === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

export default Expenses;
