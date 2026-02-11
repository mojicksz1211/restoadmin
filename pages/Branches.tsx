import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, MapPin, Store, ExternalLink, Phone, X, Edit3, Trash2 } from 'lucide-react';
import { BranchRecord } from '../types';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../services/branchService';

interface BranchesProps {
  onSelectBranch: (id: string) => void;
  onBranchesChange?: () => void;
}

const Branches: React.FC<BranchesProps> = ({ onSelectBranch, onBranchesChange }) => {
  const { t } = useTranslation('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);
  const [formState, setFormState] = useState({ code: '', name: '', address: '', phone: '' });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBranches();
      setBranches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredBranches = branches.filter(branch => 
    !normalizedSearch
    || branch.name.toLowerCase().includes(normalizedSearch)
    || (branch.address || '').toLowerCase().includes(normalizedSearch)
    || branch.code.toLowerCase().includes(normalizedSearch)
  );

  const resetForm = () => {
    setFormState({ code: '', name: '', address: '', phone: '' });
    setEditingBranch(null);
    setSubmitError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (branch: BranchRecord) => {
    setEditingBranch(branch);
    setFormState({
      code: branch.code,
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
    });
    setSubmitError(null);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (branch: BranchRecord) => {
    if (!window.confirm(`Delete branch "${branch.name}"? This will soft-deactivate the branch.`)) return;
    setSubmitError(null);
    try {
      await deleteBranch(branch.id);
      await loadBranches();
      onBranchesChange?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload = {
        BRANCH_CODE: formState.code.trim(),
        BRANCH_NAME: formState.name.trim(),
        ADDRESS: formState.address.trim() || null,
        PHONE: formState.phone.trim() || null,
      };
      if (isEditModalOpen && editingBranch) {
        await updateBranch(editingBranch.id, payload);
        await loadBranches();
        onBranchesChange?.();
        setIsEditModalOpen(false);
        resetForm();
      } else {
        await createBranch(payload);
        await loadBranches();
        onBranchesChange?.();
        setIsAddModalOpen(false);
        resetForm();
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const open = isAddModalOpen || isEditModalOpen;
    if (open) {
      document.body.classList.add('overflow-hidden');
      document.documentElement.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
      document.documentElement.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
      document.documentElement.classList.remove('overflow-hidden');
    };
  }, [isAddModalOpen, isEditModalOpen]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('branches')}</h1>
          <p className="text-slate-500">{t('branches_subtitle')}</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-md hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>{t('add_new_branch')}</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text"
          placeholder={t('search_branch_placeholder')}
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-slate-400 text-sm">
            {t('loading_branches')}
          </div>
        ) : filteredBranches.length > 0 ? (
          filteredBranches.map((branch) => (
            <div
              key={branch.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-orange-500/20"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 ${branch.active ? 'bg-green-500' : 'bg-red-500'}`}
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-orange-500/10 blur-2xl opacity-70 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />

              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                          branch.active ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      >
                        <Store className="h-5 w-5 text-white" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-slate-900 transition-colors group-hover:text-orange-600">
                          {branch.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            {t('branch_code')}: {branch.code || '—'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              branch.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                branch.active ? 'bg-green-600' : 'bg-red-600'
                              }`}
                              aria-hidden="true"
                            />
                            {branch.active ? t('active') : t('inactive')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <p className="max-h-10 overflow-hidden leading-5 text-slate-600">
                          {branch.address || t('no_address')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="font-semibold text-slate-800">{branch.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(branch)}
                        className="rounded-xl p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                        title={t('edit_branch')}
                        aria-label={t('edit_branch')}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(branch)}
                        className="rounded-xl p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                        title={t('delete_branch')}
                        aria-label={t('delete_branch')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => onSelectBranch(branch.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                      aria-label={t('switch_to')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>{t('switch_to')}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-4">
                  <button
                    onClick={() => onSelectBranch(branch.id)}
                    className="text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 rounded-lg px-2 py-1"
                  >
                    {t('manage_branch_context')} <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-slate-400 text-sm">
            {t('no_branches_found')}
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
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {isEditModalOpen ? t('edit_branch') : t('add_new_branch')}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {isEditModalOpen ? t('update_branch_details') : t('create_new_location')}
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
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Branch Code</label>
                  <input
                    required
                    type="text"
                    value={formState.code}
                    onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g. MKT"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Branch Name</label>
                  <input
                    required
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Makati Central"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Address</label>
                  <input
                    type="text"
                    value={formState.address}
                    onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Full address"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone</label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Contact number"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all"
                  />
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] px-4 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-70"
                  >
                    {submitting ? 'Saving...' : isEditModalOpen ? 'Update Branch' : 'Save Branch'}
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

export default Branches;
