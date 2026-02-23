import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Select, { type SingleValue, type StylesConfig } from 'react-select';
import { PackagePlus, Plus, Search, CheckCircle2, AlertCircle, Edit3, Trash2 } from 'lucide-react';
import DatePickerInput from '../components/DatePickerInput';
import type { InventoryMaterial } from '../services/inventoryMaterialService';
import { getInventoryMaterials } from '../services/inventoryMaterialService';
import type { InventoryProduct } from '../services/inventoryProductService';
import { getInventoryProducts } from '../services/inventoryProductService';
import {
  createInventoryStockIn,
  deleteInventoryStockIn,
  getInventoryAuditTrail,
  getInventoryStockIns,
  updateInventoryStockIn,
} from '../services/inventoryStockInService';
import type { InventoryAuditTrailRecord, StockInRecord } from '../types';

interface StockInProps {
  selectedBranchId: string;
}

type SelectOption = {
  value: string;
  label: string;
};

type StockInFormState = {
  resourceType: 'product' | 'material';
  resourceId: string;
  qtyAdded: string;
  unitCost: string;
  supplierName: string;
  referenceNo: string;
  note: string;
  stockInDate: string;
};

const todayInPht = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

const defaultFormState = (): StockInFormState => ({
  resourceType: 'material',
  resourceId: '',
  qtyAdded: '',
  unitCost: '',
  supplierName: '',
  referenceNo: '',
  note: '',
  stockInDate: todayInPht(),
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
    zIndex: 140,
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.875rem',
    backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#fff7ed' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#0f172a',
    ':active': {
      backgroundColor: '#fb923c',
    },
  }),
};

const compactUnitLabel = (unit: string | null | undefined): string => {
  const value = (unit || '').trim().toLowerCase();
  if (!value) return '';
  if (value.includes('(kg)') || value === 'kilograms' || value === 'kilogram' || value === 'kg') return 'kg';
  if (value.includes('(g)') || value === 'grams' || value === 'gram' || value === 'g') return 'g';
  if (value.includes('(ml)') || value === 'milliliters' || value === 'milliliter' || value === 'ml') return 'ml';
  if (value.includes('(l)') || value === 'liters' || value === 'liter' || value === 'l') return 'L';
  if (value.includes('(pcs)') || value === 'pieces' || value === 'piece' || value === 'pcs') return 'piece';
  if (value === 'units' || value === 'unit') return 'unit';
  if (value === 'number-of-pieces' || value === 'nos' || value === 'no.') return 'piece';
  return unit || '';
};

const formatMoneyWithUnit = (amount: number | null | undefined, unit: string | null | undefined): string => {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return '-';
  const compact = compactUnitLabel(unit);
  return compact ? `₱${Number(amount).toLocaleString()} / ${compact}` : `₱${Number(amount).toLocaleString()}`;
};

const StockIn: React.FC<StockInProps> = ({ selectedBranchId }) => {
  const AUDIT_PAGE_SIZE = 15;
  const [rows, setRows] = useState<StockInRecord[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<StockInFormState>(defaultFormState);
  const [editingRecord, setEditingRecord] = useState<StockInRecord | null>(null);
  const [editForm, setEditForm] = useState<StockInFormState>(defaultFormState);
  const [deletingRecord, setDeletingRecord] = useState<StockInRecord | null>(null);
  const [auditTrail, setAuditTrail] = useState<InventoryAuditTrailRecord[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditType, setAuditType] = useState<'all' | 'product' | 'material'>('all');
  const [auditPage, setAuditPage] = useState(1);
  const [auditShowAll, setAuditShowAll] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      const [stockIns, productRows, materialRows] = await Promise.all([
        getInventoryStockIns(selectedBranchId),
        getInventoryProducts(selectedBranchId),
        getInventoryMaterials(selectedBranchId),
      ]);
      setRows(stockIns);
      setProducts(productRows);
      setMaterials(materialRows);
      const auditRows = await getInventoryAuditTrail({
        branchId: selectedBranchId,
        resourceType: auditType,
        search: auditSearch || undefined,
      });
      setAuditTrail(auditRows);
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load stock-in data.' });
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId, auditType]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const rows = await getInventoryAuditTrail({
          branchId: selectedBranchId,
          resourceType: auditType,
          search: auditSearch || undefined,
        });
        setAuditTrail(rows);
      } catch {
        // Keep current rows; top-level feedback is enough.
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [auditSearch, auditType, selectedBranchId]);

  const resourceTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: 'material', label: 'Material' },
      { value: 'product', label: 'Product' },
    ],
    []
  );

  const resourceOptions = useMemo(
    () =>
      (form.resourceType === 'product' ? products : materials).map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [form.resourceType, products, materials]
  );

  const editResourceOptions = useMemo(
    () =>
      (editForm.resourceType === 'product' ? products : materials).map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [editForm.resourceType, products, materials]
  );

  const auditTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: 'all', label: 'All Types' },
      { value: 'product', label: 'Product' },
      { value: 'material', label: 'Material' },
    ],
    []
  );

  const filteredRows = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    if (!lowered) return rows;
    return rows.filter((item) => {
      return (
        item.resourceName.toLowerCase().includes(lowered) ||
        item.resourceType.toLowerCase().includes(lowered) ||
        item.supplierName.toLowerCase().includes(lowered) ||
        item.referenceNo.toLowerCase().includes(lowered)
      );
    });
  }, [rows, search]);

  const filteredAuditTrail = useMemo(() => {
    const lowered = auditSearch.trim().toLowerCase();
    return auditTrail.filter((row) => {
      const matchesType = auditType === 'all' || row.resourceType === auditType;
      if (!matchesType) return false;
      if (!lowered) return true;
      return (
        row.resourceName.toLowerCase().includes(lowered) ||
        (row.referenceNo || '').toLowerCase().includes(lowered) ||
        (row.note || '').toLowerCase().includes(lowered) ||
        row.resourceType.toLowerCase().includes(lowered)
      );
    });
  }, [auditTrail, auditType, auditSearch]);

  const totalAuditPages = useMemo(
    () => (auditShowAll ? 1 : Math.max(1, Math.ceil(filteredAuditTrail.length / AUDIT_PAGE_SIZE))),
    [filteredAuditTrail.length, auditShowAll]
  );

  const paginatedAuditTrail = useMemo(() => {
    if (auditShowAll) return filteredAuditTrail;
    const start = (auditPage - 1) * AUDIT_PAGE_SIZE;
    return filteredAuditTrail.slice(start, start + AUDIT_PAGE_SIZE);
  }, [filteredAuditTrail, auditPage, auditShowAll]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditSearch, auditType, selectedBranchId]);

  useEffect(() => {
    if (auditPage > totalAuditPages) {
      setAuditPage(totalAuditPages);
    }
  }, [auditPage, totalAuditPages]);

  const resetForm = () => {
    setForm(defaultFormState());
    setIsAddOpen(false);
  };

  const resetEditForm = () => {
    setEditForm(defaultFormState());
    setEditingRecord(null);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedBranchId === 'all') {
      setFeedback({ type: 'error', text: 'Select a specific branch before recording stock-in.' });
      return;
    }
    const qtyAdded = Number(form.qtyAdded);
    const unitCost = Number(form.unitCost);
    if (!form.resourceId) {
      setFeedback({ type: 'error', text: 'Please select an item.' });
      return;
    }
    if (!Number.isFinite(qtyAdded) || qtyAdded <= 0) {
      setFeedback({ type: 'error', text: 'Quantity must be greater than 0.' });
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setFeedback({ type: 'error', text: 'Unit cost cannot be negative.' });
      return;
    }
    try {
      await createInventoryStockIn({
        branchId: selectedBranchId,
        resourceType: form.resourceType,
        resourceId: form.resourceId,
        qtyAdded,
        unitCost,
        supplierName: form.supplierName,
        referenceNo: form.referenceNo,
        note: form.note,
        stockInDate: form.stockInDate,
      });
      await loadData();
      resetForm();
      setFeedback({ type: 'success', text: 'Stock-in recorded successfully.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Failed to record stock-in.' });
    }
  };

  const openEdit = (row: StockInRecord) => {
    setEditingRecord(row);
    setEditForm({
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      qtyAdded: String(row.qtyAdded),
      unitCost: String(row.unitCost),
      supplierName: row.supplierName || '',
      referenceNo: row.referenceNo || '',
      note: row.note || '',
      stockInDate: row.stockInDate || todayInPht(),
    });
  };

  const handleUpdate = async () => {
    if (!editingRecord) return;
    if (selectedBranchId === 'all') {
      setFeedback({ type: 'error', text: 'Select a specific branch before editing stock-in.' });
      return;
    }
    const qtyAdded = Number(editForm.qtyAdded);
    const unitCost = Number(editForm.unitCost);
    if (!editForm.resourceId) {
      setFeedback({ type: 'error', text: 'Please select an item.' });
      return;
    }
    if (!Number.isFinite(qtyAdded) || qtyAdded <= 0) {
      setFeedback({ type: 'error', text: 'Quantity must be greater than 0.' });
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setFeedback({ type: 'error', text: 'Unit cost cannot be negative.' });
      return;
    }
    try {
      await updateInventoryStockIn(editingRecord.id, {
        branchId: selectedBranchId,
        resourceType: editForm.resourceType,
        resourceId: editForm.resourceId,
        qtyAdded,
        unitCost,
        supplierName: editForm.supplierName,
        referenceNo: editForm.referenceNo,
        note: editForm.note,
        stockInDate: editForm.stockInDate,
      });
      await loadData();
      resetEditForm();
      setFeedback({ type: 'success', text: 'Stock-in updated successfully.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update stock-in.' });
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    try {
      await deleteInventoryStockIn(deletingRecord.id);
      await loadData();
      setDeletingRecord(null);
      setFeedback({ type: 'success', text: 'Stock-in deleted successfully.' });
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Failed to delete stock-in.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stock In</h1>
          <p className="text-slate-500">Record inventory purchases and auto-sync expense entries.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-orange-600"
        >
          <Plus className="w-4 h-4" />
          <span>Add Stock In</span>
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item/supplier/reference..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Item</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Qty Added</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Unit Cost</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Prev Avg Cost</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">New Avg Cost</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Total Cost</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Supplier</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Reference</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-slate-500">
                    No stock-in records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-sm text-slate-700">{item.stockInDate}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 capitalize">{item.resourceType}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.resourceName}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{item.qtyAdded.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{formatMoneyWithUnit(item.unitCost, item.resourceUnit)}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {item.prevUnitCost === null || item.prevUnitCost === undefined ? '-' : formatMoneyWithUnit(item.prevUnitCost, item.resourceUnit)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {item.newUnitCost === null || item.newUnitCost === undefined ? '-' : formatMoneyWithUnit(item.newUnitCost, item.resourceUnit)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">₱{item.totalCost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{item.supplierName || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{item.referenceNo || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit stock-in"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRecord(item)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete stock-in"
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
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Inventory Audit Trail</h3>
            <p className="text-xs text-slate-500">Before/after stock and cost history (stock-in + stock-out)</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search item/reference..."
                className="w-56 pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setAuditShowAll((prev) => !prev);
                setAuditPage(1);
              }}
              className="h-[42px] px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-50 transition-colors"
            >
              {auditShowAll ? 'Show 15 / page' : 'Show All'}
            </button>
            <Select
              value={auditTypeOptions.find((option) => option.value === auditType) || null}
              onChange={(option: SingleValue<SelectOption>) =>
                setAuditType((option?.value || 'all') as 'all' | 'product' | 'material')
              }
              options={auditTypeOptions}
              styles={selectStyles}
              className="w-44"
              classNamePrefix="react-select"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Date</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Event</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Type</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Item</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Qty Δ</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Stock Before</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Stock After</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Cost Before</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Cost After</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedAuditTrail.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-500">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                paginatedAuditTrail.map((row) => (
                  <tr key={`${row.eventType}-${row.eventId}`} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm text-slate-700">{row.eventDate}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold ${
                          row.eventType === 'stock_in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {row.eventType === 'stock_in' ? 'Stock In' : 'Stock Out'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 capitalize">{row.resourceType}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.resourceName}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${row.qtyChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {row.qtyChange >= 0 ? '+' : ''}
                      {row.qtyChange.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.stockBefore ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.stockAfter ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {row.costBefore === null || row.costBefore === undefined ? '-' : formatMoneyWithUnit(row.costBefore, row.resourceUnit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {row.eventType === 'stock_in'
                        ? formatMoneyWithUnit(row.txnUnitCost, row.resourceUnit)
                        : row.costAfter === null || row.costAfter === undefined
                        ? '-'
                        : formatMoneyWithUnit(row.costAfter, row.resourceUnit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.referenceNo || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            Showing {paginatedAuditTrail.length === 0 ? 0 : auditShowAll ? 1 : (auditPage - 1) * AUDIT_PAGE_SIZE + 1}
            {' '}to {auditShowAll ? filteredAuditTrail.length : Math.min(auditPage * AUDIT_PAGE_SIZE, filteredAuditTrail.length)} of {filteredAuditTrail.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
              disabled={auditShowAll || auditPage <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-xs font-semibold text-slate-700">
              Page {auditPage} / {totalAuditPages}
            </span>
            <button
              type="button"
              onClick={() => setAuditPage((prev) => Math.min(totalAuditPages, prev + 1))}
              disabled={auditShowAll || auditPage >= totalAuditPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isAddOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm" onClick={resetForm} />
            <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
              <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <form onSubmit={handleCreate}>
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <PackagePlus className="w-5 h-5 text-orange-500" />
                      Record Stock In
                    </h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Type</label>
                      <Select
                        value={resourceTypeOptions.find((option) => option.value === form.resourceType) || null}
                        onChange={(option: SingleValue<SelectOption>) =>
                          setForm((prev) => ({
                            ...prev,
                            resourceType: (option?.value || 'material') as 'product' | 'material',
                            resourceId: '',
                          }))
                        }
                        options={resourceTypeOptions}
                        styles={selectStyles}
                        classNamePrefix="react-select"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Date</label>
                      <DatePickerInput
                        value={form.stockInDate}
                        onChange={(value) => setForm((prev) => ({ ...prev, stockInDate: value }))}
                        maxDate={new Date().toISOString().slice(0, 10)}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-slate-600">Item</label>
                      <Select
                        value={resourceOptions.find((option) => option.value === form.resourceId) || null}
                        onChange={(option: SingleValue<SelectOption>) =>
                          setForm((prev) => ({ ...prev, resourceId: option?.value || '' }))
                        }
                        options={resourceOptions}
                        placeholder="Select item..."
                        styles={selectStyles}
                        classNamePrefix="react-select"
                        isSearchable
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Quantity Added</label>
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={form.qtyAdded}
                        onChange={(e) => setForm((prev) => ({ ...prev, qtyAdded: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Unit Cost</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.unitCost}
                        onChange={(e) => setForm((prev) => ({ ...prev, unitCost: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Supplier</label>
                      <input
                        type="text"
                        value={form.supplierName}
                        onChange={(e) => setForm((prev) => ({ ...prev, supplierName: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Reference No</label>
                      <input
                        type="text"
                        value={form.referenceNo}
                        onChange={(e) => setForm((prev) => ({ ...prev, referenceNo: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-slate-600">Note</label>
                      <textarea
                        rows={3}
                        value={form.note}
                        onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm resize-none"
                      />
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold">
                      Save Stock In
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>,
          document.body
        )}

      {editingRecord &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm" onClick={resetEditForm} />
            <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
              <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-500" />
                    Edit Stock In
                  </h3>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Type</label>
                    <Select
                      value={resourceTypeOptions.find((option) => option.value === editForm.resourceType) || null}
                      onChange={(option: SingleValue<SelectOption>) =>
                        setEditForm((prev) => ({
                          ...prev,
                          resourceType: (option?.value || 'material') as 'product' | 'material',
                          resourceId: '',
                        }))
                      }
                      options={resourceTypeOptions}
                      styles={selectStyles}
                      classNamePrefix="react-select"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Date</label>
                    <DatePickerInput
                      value={editForm.stockInDate}
                      onChange={(value) => setEditForm((prev) => ({ ...prev, stockInDate: value }))}
                      maxDate={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-slate-600">Item</label>
                    <Select
                      value={editResourceOptions.find((option) => option.value === editForm.resourceId) || null}
                      onChange={(option: SingleValue<SelectOption>) =>
                        setEditForm((prev) => ({ ...prev, resourceId: option?.value || '' }))
                      }
                      options={editResourceOptions}
                      placeholder="Select item..."
                      styles={selectStyles}
                      classNamePrefix="react-select"
                      isSearchable
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Quantity Added</label>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={editForm.qtyAdded}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, qtyAdded: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Unit Cost</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={editForm.unitCost}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, unitCost: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Supplier</label>
                    <input
                      type="text"
                      value={editForm.supplierName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, supplierName: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Reference No</label>
                    <input
                      type="text"
                      value={editForm.referenceNo}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, referenceNo: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-slate-600">Note</label>
                    <textarea
                      rows={3}
                      value={editForm.note}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm resize-none"
                    />
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetEditForm}
                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button type="button" onClick={handleUpdate} className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {deletingRecord &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeletingRecord(null)} />
            <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Delete Stock In</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Delete stock-in record for &quot;{deletingRecord.resourceName}&quot;?
                  </p>
                </div>
                <div className="p-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingRecord(null)}
                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
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

export default StockIn;
