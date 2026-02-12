import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, X, Edit3, Trash2, Users, LayoutGrid, ChevronDown } from 'lucide-react';
import {
  getRestaurantTables,
  createTable,
  updateTable,
  deleteTable,
  getTableStatusLabel,
  TABLE_STATUS,
  type RestaurantTableRecord,
  type CreateTablePayload,
  type UpdateTablePayload,
} from '../services/tableService';
import { getBranches } from '../services/branchService';
import { BranchRecord } from '../types';

interface TablesProps {
  selectedBranchId: string;
}

const Tables: React.FC<TablesProps> = ({ selectedBranchId }) => {
  const { t } = useTranslation('common');
  const [tables, setTables] = useState<RestaurantTableRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTableRecord | null>(null);
  const [formState, setFormState] = useState({
    branchId: '',
    tableNumber: '',
    capacity: 2,
    status: TABLE_STATUS.AVAILABLE,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const loadTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRestaurantTables(selectedBranchId === 'all' ? undefined : selectedBranchId);
      setTables(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables');
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  const loadBranches = useCallback(async () => {
    try {
      const data = await getBranches();
      setBranches(data);
    } catch {
      setBranches([]);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (isAddModalOpen) loadBranches();
  }, [isAddModalOpen, loadBranches]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) setBranchDropdownOpen(false);
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setStatusDropdownOpen(false);
    };
    if (branchDropdownOpen || statusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [branchDropdownOpen, statusDropdownOpen]);

  const filteredTables = tables.filter(
    (tbl) =>
      !searchTerm.trim() ||
      tbl.tableNumber.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      (tbl.branchName || '').toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const resetForm = () => {
    setFormState({
      branchId: selectedBranchId !== 'all' ? selectedBranchId : '',
      tableNumber: '',
      capacity: 2,
      status: TABLE_STATUS.AVAILABLE,
    });
    setEditingTable(null);
    setSubmitError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setFormState((prev) => ({
      ...prev,
      branchId: selectedBranchId !== 'all' ? selectedBranchId : '',
    }));
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (table: RestaurantTableRecord) => {
    setEditingTable(table);
    setFormState({
      branchId: table.branchId,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: table.status,
    });
    setSubmitError(null);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (table: RestaurantTableRecord) => {
    if (!window.confirm(`Delete table "${table.tableNumber}" (${table.branchName || table.branchId})?`)) return;
    setSubmitError(null);
    try {
      await deleteTable(table.id);
      await loadTables();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (isEditModalOpen && editingTable) {
        const payload: UpdateTablePayload = {
          TABLE_NUMBER: formState.tableNumber.trim(),
          CAPACITY: formState.capacity,
          STATUS: formState.status,
        };
        await updateTable(editingTable.id, payload);
        await loadTables();
        setIsEditModalOpen(false);
        resetForm();
      } else {
        if (!formState.branchId) {
          setSubmitError('Please select a branch.');
          setSubmitting(false);
          return;
        }
        const payload: CreateTablePayload = {
          BRANCH_ID: formState.branchId,
          TABLE_NUMBER: formState.tableNumber.trim(),
          CAPACITY: formState.capacity,
          STATUS: formState.status,
        };
        await createTable(payload);
        await loadTables();
        setIsAddModalOpen(false);
        resetForm();
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadgeClass = (status: number) =>
    status === TABLE_STATUS.AVAILABLE
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-amber-100 text-amber-700';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('tables')}</h1>
          <p className="text-slate-500">{t('tables_subtitle')}</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-md hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{t('add_table')}</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder={t('search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm transition-all"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-2xl p-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">{t('loading')}</div>
        ) : filteredTables.length === 0 ? (
          <div className="p-12 text-center text-slate-500">{t('no_tables_found')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('branch')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('table_number')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('capacity')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTables.map((table) => (
                  <tr key={table.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{table.branchName || table.branchCode || table.branchId}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{table.tableNumber}</td>
                    <td className="px-4 py-3 text-slate-600 flex items-center gap-1">
                      <Users className="w-4 h-4 text-slate-400" />
                      {table.capacity}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(table.status)}`}>
                        {getTableStatusLabel(table.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(table)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                          title={t('edit')}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(table)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              resetForm();
            }}
          />
          <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6">
            <div
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500 rounded-xl text-white">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {isEditModalOpen ? t('edit_table') : t('add_table')}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {isEditModalOpen ? t('update_table_details') : t('create_new_table')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form className="p-6 space-y-4" onSubmit={handleSubmit}>
                {submitError && (
                  <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3">
                    {submitError}
                  </div>
                )}

                {!isEditModalOpen && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('branch')}</label>
                    <div className="relative" ref={branchDropdownRef}>
                      <button
                        type="button"
                        onClick={() => { setBranchDropdownOpen((o) => !o); setStatusDropdownOpen(false); }}
                        className="w-full flex items-center justify-between pl-4 pr-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium hover:bg-slate-100 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white focus:outline-none transition-colors"
                      >
                        <span>
                          {formState.branchId
                            ? branches.find((b) => b.id === formState.branchId)
                              ? `${branches.find((b) => b.id === formState.branchId)!.name} (${branches.find((b) => b.id === formState.branchId)!.code})`
                              : formState.branchId
                            : '— Select branch —'}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-slate-400 flex-shrink-0 ml-2 transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {branchDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 py-1.5 rounded-xl border border-slate-200 bg-white shadow-lg z-50 max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setFormState((prev) => ({ ...prev, branchId: '' }));
                              setBranchDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${!formState.branchId ? 'bg-orange-100 text-orange-700' : 'text-slate-700 hover:bg-slate-50'}`}
                          >
                            — Select branch —
                          </button>
                          {branches.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setFormState((prev) => ({ ...prev, branchId: b.id }));
                                setBranchDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                                formState.branchId === b.id ? 'bg-orange-100 text-orange-700' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {b.name} ({b.code})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('table_number')}</label>
                  <input
                    required
                    type="text"
                    value={formState.tableNumber}
                    onChange={(e) => setFormState((prev) => ({ ...prev, tableNumber: e.target.value }))}
                    placeholder="e.g. T-01"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('capacity')}</label>
                  <input
                    type="number"
                    min={1}
                    value={formState.capacity}
                    onChange={(e) => setFormState((prev) => ({ ...prev, capacity: parseInt(e.target.value, 10) || 1 }))}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('status')}</label>
                  <div className="relative" ref={statusDropdownRef}>
                    <button
                      type="button"
                      onClick={() => { setStatusDropdownOpen((o) => !o); setBranchDropdownOpen(false); }}
                      className="w-full flex items-center justify-between pl-4 pr-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium hover:bg-slate-100 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white focus:outline-none transition-colors"
                    >
                      <span>{getTableStatusLabel(formState.status)}</span>
                      <ChevronDown className={`w-5 h-5 text-slate-400 flex-shrink-0 ml-2 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {statusDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 py-1.5 rounded-xl border border-slate-200 bg-white shadow-lg z-50">
                        <button
                          type="button"
                          onClick={() => {
                            setFormState((prev) => ({ ...prev, status: TABLE_STATUS.AVAILABLE }));
                            setStatusDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                            formState.status === TABLE_STATUS.AVAILABLE ? 'bg-orange-100 text-orange-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {getTableStatusLabel(TABLE_STATUS.AVAILABLE)}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormState((prev) => ({ ...prev, status: TABLE_STATUS.OCCUPIED }));
                            setStatusDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                            formState.status === TABLE_STATUS.OCCUPIED ? 'bg-orange-100 text-orange-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {getTableStatusLabel(TABLE_STATUS.OCCUPIED)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsEditModalOpen(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] px-4 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-70"
                  >
                    {submitting ? t('saving') : isEditModalOpen ? t('update') : t('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tables;
