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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-slate-400 text-sm">
            {t('loading_branches')}
          </div>
        ) : filteredBranches.length > 0 ? (
          filteredBranches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg transition-all transform hover:-translate-y-1 group">
            <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-200 relative overflow-hidden">
               <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <div className="absolute top-4 right-4 flex items-center space-x-2">
                <button 
                  onClick={() => onSelectBranch(branch.id)}
                  className="bg-white/90 p-1.5 rounded-lg hover:bg-orange-500 hover:text-white transition-all shadow-sm flex items-center space-x-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">{t('switch_to')}</span>
                </button>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenEdit(branch)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title={t('edit_branch')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(branch)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title={t('delete_branch')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="absolute -bottom-6 left-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform ${
                  branch.active ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <Store className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="p-6 pt-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{branch.name}</h3>
                  <div className="flex items-center text-slate-500 text-sm mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {branch.address || t('no_address')}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  branch.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {branch.active ? t('active') : t('inactive')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{t('branch_code')}</p>
                  <div className="flex items-center text-slate-800">
                    <Store className="w-4 h-4 mr-2 text-slate-400" />
                    <span className="font-medium text-sm">{branch.code || '—'}</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{t('contact')}</p>
                  <div className="flex items-center text-slate-800">
                    <Phone className="w-4 h-4 mr-2 text-orange-500" />
                    <span className="font-bold text-sm">{branch.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <img key={i} src={`https://picsum.photos/32/32?random=${branch.id}${i}`} className="w-8 h-8 rounded-full border-2 border-white" alt="Staff" />
                  ))}
                  <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">
                    +12
                  </div>
                </div>
                <button 
                  onClick={() => onSelectBranch(branch.id)}
                  className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center"
                >
                  {t('manage_branch_context')} →
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
