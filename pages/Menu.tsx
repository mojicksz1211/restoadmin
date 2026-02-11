import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, RefreshCw, Search, Utensils, AlertTriangle, CheckCircle2, X, ChevronRight, Plus, Edit3, Trash2, Languages } from 'lucide-react';
import { MOCK_BRANCHES } from '../constants';
import { MenuCategory, MenuRecord } from '../types';
import { getMenuCategories, getMenus } from '../services/menuService';
import { translateText, i18nToTranslateTarget } from '../services/translateService';

interface MenuProps {
  selectedBranchId: string;
}

const Menu: React.FC<MenuProps> = ({ selectedBranchId }) => {
  const { t, i18n } = useTranslation('common');
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availability, setAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [error, setError] = useState<string | null>(null);
  const [menuTranslations, setMenuTranslations] = useState<Record<string, { name?: string; description?: string; categoryName?: string }>>({});
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuRecord | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: '',
    isAvailable: true,
    imageUrl: '',
    branchId: selectedBranchId === 'all' ? '' : selectedBranchId,
  });
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuRecord | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // SweetAlert-style dialogs (success / error / confirmation)
  const [swal, setSwal] = useState<{
    type: 'question' | 'success' | 'error' | 'warning';
    title: string;
    text: string;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  } | null>(null);

  const currentBranchName = selectedBranchId === 'all' 
    ? t('all_branches') 
    : MOCK_BRANCHES.find(b => b.id === selectedBranchId)?.name ?? '';

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [menuData, categoryData] = await Promise.all([
        getMenus(selectedBranchId),
        getMenuCategories(selectedBranchId),
      ]);
      setMenus(menuData);
      setCategories(categoryData);
      setMenuTranslations({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu data');
      setMenus([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedBranchId]);

  // Clear translations when language changes so we re-translate to new language
  useEffect(() => {
    setMenuTranslations({});
  }, [i18n.language]);

  useEffect(() => {
    if (selectedBranchId !== 'all') {
      setFormState((prev) => ({ ...prev, branchId: selectedBranchId }));
    }
  }, [selectedBranchId]);

  useEffect(() => {
    const shouldLockScroll = isAddModalOpen || isEditModalOpen;
    if (shouldLockScroll) {
      document.documentElement.classList.add('overflow-hidden');
      document.body.classList.add('overflow-hidden');
    } else {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    };
  }, [isAddModalOpen, isEditModalOpen]);

  const filteredMenus = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return menus.filter(menu => {
      const matchesSearch = !normalizedSearch || [
        menu.name,
        menu.description || '',
        menu.categoryName,
        menu.branchName,
        menu.branchCode,
      ].join(' ').toLowerCase().includes(normalizedSearch);

      const matchesCategory = selectedCategory === 'all' || menu.categoryId === selectedCategory;
      const matchesAvailability = availability === 'all'
        || (availability === 'available' && menu.isAvailable)
        || (availability === 'unavailable' && !menu.isAvailable);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [menus, searchTerm, selectedCategory, availability]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, availability, menus]);

  const totalPages = Math.max(1, Math.ceil(filteredMenus.length / itemsPerPage));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginatedMenus = filteredMenus.slice(
    (currentPageSafe - 1) * itemsPerPage,
    currentPageSafe * itemsPerPage
  );

  const BATCH_SIZE = 50; // Google Translate API allows up to 128 per request; 50 keeps URL safe

  const handleTranslateTable = useCallback(async () => {
    if (filteredMenus.length === 0) return;
    setTranslateLoading(true);
    setTranslateError(null);
    const target = i18nToTranslateTarget(i18n.language || 'en');
    try {
      const names = filteredMenus.map((m) => m.name);
      const descriptions = filteredMenus.map((m) => m.description || '');
      const uniqueCategories = [...new Set(filteredMenus.map((m) => m.categoryName).filter(Boolean))];

      const translateBatch = async (texts: string[]) => {
        const results: Awaited<ReturnType<typeof translateText>> = [];
        for (let i = 0; i < texts.length; i += BATCH_SIZE) {
          const chunk = texts.slice(i, i + BATCH_SIZE);
          const chunkResults = await translateText(chunk, target);
          results.push(...chunkResults);
        }
        return results;
      };

      const [nameResults, descResults, categoryResults] = await Promise.all([
        translateBatch(names),
        translateBatch(descriptions),
        uniqueCategories.length > 0 ? translateText(uniqueCategories, target) : Promise.resolve([]),
      ]);

      const categoryMap: Record<string, string> = {};
      uniqueCategories.forEach((cat, i) => {
        categoryMap[cat] = categoryResults[i]?.translatedText ?? cat;
      });

      setMenuTranslations((prev) => {
        const next = { ...prev };
        filteredMenus.forEach((menu, i) => {
          next[menu.id] = {
            name: nameResults[i]?.translatedText || menu.name,
            description: menu.description ? (descResults[i]?.translatedText ?? menu.description) : undefined,
            categoryName: menu.categoryName ? (categoryMap[menu.categoryName] ?? menu.categoryName) : undefined,
          };
        });
        return next;
      });
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setTranslateLoading(false);
    }
  }, [filteredMenus, i18n.language]);

  // Auto-translate table when menu data is loaded and we're on a translated language (en/ko)
  useEffect(() => {
    if (menus.length === 0 || !i18n.language) return;
    if (Object.keys(menuTranslations).length > 0) return;
    const lang = i18n.language;
    if (lang !== 'en' && lang !== 'ko') return;
    handleTranslateTable();
  }, [menus, i18n.language, menuTranslations, handleTranslateTable]);

  const resolveImageUrl = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    const base = (
      (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
      || 'http://localhost:2000'
    ).replace(/\/$/, '');
    return `${base}${imageUrl}`;
  };

  const resetForm = () => {
    setFormState({
      name: '',
      description: '',
      categoryId: '',
      price: '',
      isAvailable: true,
      imageUrl: '',
      branchId: selectedBranchId === 'all' ? '' : selectedBranchId,
    });
    setImageFile(null);
    setSubmitError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (menu: MenuRecord) => {
    setEditingMenu(menu);
    setFormState({
      name: menu.name,
      description: menu.description || '',
      categoryId: menu.categoryId || '',
      price: menu.price ? String(menu.price) : '',
      isAvailable: menu.isAvailable,
      imageUrl: menu.imageUrl || '',
      branchId: menu.branchId,
    });
    setImageFile(null);
    setSubmitError(null);
    setIsEditModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await deleteMenu(deleteTarget.id);
      await refreshData();
      setDeleteTarget(null);
      setSwal({
        type: 'success',
        title: 'Deleted!',
        text: `Menu item "${deleteTarget.name}" deleted successfully!`,
        onConfirm: () => setSwal(null),
      });
    } catch (err) {
      setSwal({
        type: 'error',
        title: 'Error!',
        text: err instanceof Error ? err.message : 'Delete failed',
        onConfirm: () => {
          setSwal(null);
          setDeleteTarget(null);
        },
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleDelete = (menu: MenuRecord) => {
    setDeleteTarget(menu);
    setSwal({
      type: 'question',
      title: 'Delete Menu Item?',
      text: `Are you sure you want to delete "${menu.name}"? This action cannot be undone.`,
      showCancel: true,
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      onConfirm: confirmDelete,
      onCancel: () => {
        setSwal(null);
        setDeleteTarget(null);
      },
    });
  };

  const handleSubmit = (mode: 'add' | 'edit') => {
    const branchId = formState.branchId || (selectedBranchId === 'all' ? '' : selectedBranchId);
    if (mode === 'add' && !branchId) {
      setSubmitError('Please select a branch.');
      return;
    }

    const menuName = formState.name.trim() || 'Untitled';
    const actionTitle = mode === 'add' ? 'Create Menu Item?' : 'Update Menu Item?';
    const actionText = mode === 'add'
      ? `Are you sure you want to add "${menuName}"?`
      : `Are you sure you want to update "${menuName}"?`;

    setSwal({
      type: 'question',
      title: actionTitle,
      text: actionText,
      showCancel: true,
      confirmText: 'Yes, Continue',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setSwal(null);
        setSubmitting(true);
        setSubmitError(null);
        setError(null);
        try {
          if (mode === 'add') {
            await createMenu({
              branchId: branchId!,
              categoryId: formState.categoryId || null,
              name: formState.name.trim(),
              description: formState.description.trim() || null,
              price: Number(formState.price || 0),
              isAvailable: formState.isAvailable,
              imageFile: imageFile ?? undefined,
            });
            await refreshData();
            setIsAddModalOpen(false);
            resetForm();
            setSwal({
              type: 'success',
              title: 'Success!',
              text: `Menu item "${menuName}" created successfully!`,
              onConfirm: () => setSwal(null),
            });
          } else if (editingMenu) {
            await updateMenu(editingMenu.id, {
              categoryId: formState.categoryId || null,
              name: formState.name.trim(),
              description: formState.description.trim() || null,
              price: Number(formState.price || 0),
              isAvailable: formState.isAvailable,
              existingImagePath: formState.imageUrl || undefined,
              imageFile: imageFile ?? undefined,
            });
            await refreshData();
            setIsEditModalOpen(false);
            setEditingMenu(null);
            resetForm();
            setSwal({
              type: 'success',
              title: 'Success!',
              text: `Menu item "${menuName}" updated successfully!`,
              onConfirm: () => setSwal(null),
            });
          }
        } catch (err) {
          setSwal({
            type: 'error',
            title: 'Error!',
            text: err instanceof Error ? err.message : 'Request failed',
            onConfirm: () => setSwal(null),
          });
        } finally {
          setSubmitting(false);
        }
      },
      onCancel: () => setSwal(null),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('menu_management')}</h1>
          <p className="text-slate-500">
            {t('menu_list_subtitle', { branch: currentBranchName })}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={refreshData}
            className="w-full md:w-auto bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="w-full md:w-auto bg-orange-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-md hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('add_menu')}</span>
          </button>
          <button
            type="button"
            onClick={handleTranslateTable}
            disabled={translateLoading || filteredMenus.length === 0}
            className="w-full md:w-auto bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title={t('translate_table')}
          >
            <Languages className={`w-4 h-4 ${translateLoading ? 'animate-pulse' : ''}`} />
            <span>{translateLoading ? t('loading') : t('translate_to', { lang: i18n.language === 'ko' ? t('korean') : t('english') })}</span>
          </button>
        </div>
      </div>

      {translateError && (
        <div className="flex items-start space-x-3 bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-2xl">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold">{translateError}</p>
            <p className="text-xs text-amber-600">Check VITE_GOOGLE_TRANSLATE_API_KEY in .env.local and that Cloud Translation API is enabled.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full xl:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            placeholder={t('search_menu_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
            >
              <option value="all">{t('all_categories')}</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value as 'all' | 'available' | 'unavailable')}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
          >
            <option value="all">{t('all_availability')}</option>
            <option value="available">{t('available')}</option>
            <option value="unavailable">{t('unavailable')}</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-start space-x-3 bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">{t('unable_to_load_menu_data')}</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('menu_item')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('category')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('price')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('availability')}</th>
                {selectedBranchId === 'all' && (
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('branch')}</th>
                )}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={selectedBranchId === 'all' ? 6 : 5} className="px-6 py-16 text-center text-slate-400 text-sm">
                    {t('loading_menu_data')}
                  </td>
                </tr>
              ) : filteredMenus.length > 0 ? (
                paginatedMenus.map((menu) => {
                  const imageUrl = resolveImageUrl(menu.imageUrl);
                  return (
                    <tr key={menu.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                            {imageUrl ? (
                              <img src={imageUrl} alt={menu.name} className="w-full h-full object-cover" />
                            ) : (
                              <Utensils className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{menuTranslations[menu.id]?.name ?? menu.name}</p>
                            <p className="text-xs text-slate-400 truncate max-w-xs">{menuTranslations[menu.id]?.description ?? menu.description ?? t('no_description')}</p>

                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {menuTranslations[menu.id]?.categoryName ?? menu.categoryName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-900">₱{menu.price.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                          menu.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {menu.isAvailable ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                          {menu.isAvailable ? t('available') : t('unavailable')}
                        </span>
                      </td>
                      {selectedBranchId === 'all' && (
                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold text-slate-600">
                            <p className="font-bold text-slate-800">{menu.branchName || menu.branchLabel || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-400 uppercase">{menu.branchCode || 'N/A'}</p>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(menu)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit Menu"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(menu)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Menu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={selectedBranchId === 'all' ? 6 : 5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Utensils className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium">No menu items found</p>
                      <p className="text-sm">Try adjusting your filters or check the backend connection.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <p className="text-xs font-medium text-slate-500">
            Showing <span className="text-slate-900 font-bold">{paginatedMenus.length}</span> of{' '}
            <span className="text-slate-900 font-bold">{filteredMenus.length}</span> menu items
          </p>
          <div className="h-4 w-px bg-slate-200"></div>
          <p className="text-xs text-slate-500 font-medium">
            <span className="text-green-600 font-bold">{filteredMenus.filter(m => m.isAvailable).length}</span> {t('available')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPageSafe === 1}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const page = idx + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold shadow-sm ${
                    page === currentPageSafe
                      ? 'bg-orange-500 text-white shadow-orange-500/20'
                      : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPageSafe === totalPages}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[100]">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              setEditingMenu(null);
              resetForm();
            }}
          ></div>
          <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500 rounded-xl text-white">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isEditModalOpen ? 'Edit Menu Item' : 'Add New Menu'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {isEditModalOpen ? 'Update menu details' : `Add to ${currentBranchName}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  setEditingMenu(null);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(isEditModalOpen ? 'edit' : 'add');
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Menu Name</label>
                  <input
                    required
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Beef Kare-Kare"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</label>
                  <textarea
                    value={formState.description}
                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Short description"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all min-h-[90px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
                  <select
                    value={formState.categoryId}
                    onChange={(e) => setFormState((prev) => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all appearance-none"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price (₱)</label>
                  <input
                    required
                    type="number"
                    value={formState.price}
                    onChange={(e) => setFormState((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all"
                  />
                </div>
                {selectedBranchId === 'all' && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Branch</label>
                    <select
                      required
                      value={formState.branchId}
                      onChange={(e) => setFormState((prev) => ({ ...prev, branchId: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all appearance-none"
                    >
                      <option value="">Select branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Availability</label>
                  <select
                    value={formState.isAvailable ? 'yes' : 'no'}
                    onChange={(e) => setFormState((prev) => ({ ...prev, isAvailable: e.target.value === 'yes' }))}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all appearance-none"
                  >
                    <option value="yes">{t('available')}</option>
                    <option value="no">{t('unavailable')}</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-orange-100 file:text-orange-700 file:text-sm file:font-medium"
                  />
                  {isEditModalOpen && formState.imageUrl && !imageFile && (
                    <p className="text-[10px] text-slate-500 mt-1">Current image kept. Choose a new file to replace.</p>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{submitError}</div>
              )}

              <div className="pt-4 flex items-center space-x-3">
                <button 
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingMenu(null);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] px-4 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    isEditModalOpen ? 'Update Menu' : 'Save Menu'
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* SweetAlert-style popup (success / error / confirmation) */}
      {swal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-center mb-4">
                {swal.type === 'question' && (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-blue-500" />
                  </div>
                )}
                {swal.type === 'success' && (
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                )}
                {swal.type === 'error' && (
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="w-10 h-10 text-red-500" />
                  </div>
                )}
                {swal.type === 'warning' && (
                  <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-yellow-500" />
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">{swal.title}</h3>
              <p className="text-slate-600 text-center mb-6">{swal.text}</p>
              <div className="flex justify-center gap-3">
                {swal.showCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      swal.onCancel?.();
                      setSwal(null);
                    }}
                    className="px-6 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                  >
                    {swal.cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (swal.onConfirm) await swal.onConfirm();
                  }}
                  disabled={submitting || deleteSubmitting}
                  className={`px-6 py-2.5 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                    swal.type === 'error'
                      ? 'bg-red-500 hover:bg-red-600'
                      : swal.type === 'warning'
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : swal.type === 'success'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-orange-500 hover:bg-orange-600'
                  } disabled:opacity-50`}
                >
                  {(submitting || deleteSubmitting) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {swal.confirmText || 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
