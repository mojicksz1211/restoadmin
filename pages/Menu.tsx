import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, RefreshCw, Search, Utensils, AlertTriangle, CheckCircle2, X, ChevronDown, Plus, Edit3, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { MOCK_BRANCHES } from '../constants';
import { MenuCategory, MenuRecord, BranchRecord } from '../types';
import { getMenuCategories, getMenus, createMenu, updateMenu, deleteMenu } from '../services/menuService';
import { getInventoryProducts, type InventoryProduct } from '../services/inventoryProductService';
import { getInventoryMaterials, type InventoryMaterial } from '../services/inventoryMaterialService';
import { getMenuInventoryMappings } from '../services/inventoryMappingService';
import { translateText, i18nToTranslateTarget } from '../services/translateService';
import { getApiBaseUrl } from '../utils/apiConfig';

interface MenuProps {
  selectedBranchId: string;
}

type DropdownOption = { value: string; label: string; disabled?: boolean };
type RecipeRow = {
  id: string;
  resourceType: '' | 'product' | 'material';
  resourceId: string;
  quantity: string;
};

const Dropdown: React.FC<{
  value: string;
  options: DropdownOption[];
  onChange: (next: string) => void;
  onOpen?: () => void;
  placeholder?: string;
  buttonClassName?: string;
  menuClassName?: string;
  itemClassName?: string;
  openUpward?: boolean;
}> = ({ value, options, onChange, onOpen, placeholder = 'Select...', buttonClassName = '', menuClassName = '', itemClassName = '', openUpward = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() =>
          setOpen((o) => {
            const nextOpen = !o;
            if (nextOpen) onOpen?.();
            return nextOpen;
          })
        }
        className={[
          'w-full flex items-center justify-between pl-4 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium hover:bg-slate-100 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white focus:outline-none transition-colors',
          buttonClassName,
        ].join(' ')}
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={[
            'absolute left-0 right-0 py-1.5 rounded-xl border border-slate-200 bg-white shadow-lg z-50 max-h-60 overflow-auto',
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1',
            menuClassName,
          ].join(' ')}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={[
                  'w-full text-left px-4 py-2.5 text-sm font-medium transition-colors',
                  opt.disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : isSelected
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-slate-700 hover:bg-slate-50',
                  itemClassName,
                ].join(' ')}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Menu: React.FC<MenuProps> = ({ selectedBranchId }) => {
  const { t, i18n } = useTranslation('common');
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availability, setAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [inventoryMaterials, setInventoryMaterials] = useState<InventoryMaterial[]>([]);
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([]);
  const [loadingRecipeRefs, setLoadingRecipeRefs] = useState(false);
  const modalContentScrollRef = useRef<HTMLDivElement>(null);
  const nudgeModalScrollForRecipeDropdown = () => {
    const el = modalContentScrollRef.current;
    if (!el) return;
    el.scrollBy({ top: 140, behavior: 'smooth' });
  };


  const createRecipeRow = (partial?: Partial<RecipeRow>): RecipeRow => ({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `recipe-${Date.now()}-${Math.random()}`,
    resourceType: partial?.resourceType ?? '',
    resourceId: partial?.resourceId ?? '',
    quantity: partial?.quantity ?? '1',
  });

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
      const menuAvailable = menu.effectiveAvailable ?? menu.isAvailable;
      const matchesAvailability = availability === 'all'
        || (availability === 'available' && menuAvailable)
        || (availability === 'unavailable' && !menuAvailable);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [menus, searchTerm, selectedCategory, availability]);

  useEffect(() => {
    // Reset scroll position when filters change
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [searchTerm, selectedCategory, availability, menus]);

  // Show items up to displayLimit
  const displayedMenus = filteredMenus.slice(0, displayLimit);

  const BATCH_SIZE = 50; // Google Translate API allows up to 128 per request; 50 keeps URL safe

  const handleTranslateTable = useCallback(async () => {
    if (filteredMenus.length === 0) return;
    setTranslateLoading(true);
    setTranslateError(null);
    const target = i18nToTranslateTarget(i18n.language || 'en');
    try {
      const names = filteredMenus.map((m) => m.name);
      const descriptions = filteredMenus.map((m) => m.description || '');
      const uniqueCategories = Array.from(
        new Set(
          filteredMenus
            .map((m) => m.categoryName)
            .filter((c): c is string => typeof c === 'string' && c.length > 0)
        )
      );

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
        uniqueCategories.length > 0 ? translateText(uniqueCategories as string[], target) : Promise.resolve([]),
      ]);

      const categoryMap: Record<string, string> = {};
      (uniqueCategories as string[]).forEach((cat, i) => {
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
    const base = getApiBaseUrl().replace(/\/$/, '');
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
    setRecipeRows([]);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = async (menu: MenuRecord) => {
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
    setRecipeRows([]);
    setIsEditModalOpen(true);
    try {
      const mappings = await getMenuInventoryMappings(menu.id);
      const rows = mappings.map((mapping) =>
        createRecipeRow({
          resourceType: mapping.product_id ? 'product' : mapping.material_id ? 'material' : '',
          resourceId: String(mapping.product_id || mapping.material_id || ''),
          quantity: String(mapping.quantity || 1),
        })
      );
      setRecipeRows(rows);
    } catch {
      setRecipeRows([]);
    }
  };

  const activeRecipeBranchId = formState.branchId || (selectedBranchId === 'all' ? '' : selectedBranchId);
  const canLoadRecipeRefs = Boolean(activeRecipeBranchId && activeRecipeBranchId !== 'all');

  useEffect(() => {
    if (!(isAddModalOpen || isEditModalOpen)) return;
    if (!canLoadRecipeRefs) {
      setInventoryProducts([]);
      setInventoryMaterials([]);
      return;
    }

    let cancelled = false;
    setLoadingRecipeRefs(true);
    Promise.all([
      getInventoryProducts(activeRecipeBranchId),
      getInventoryMaterials(activeRecipeBranchId),
    ])
      .then(([products, materials]) => {
        if (cancelled) return;
        setInventoryProducts(products.filter((p) => p.status === 'Active'));
        setInventoryMaterials(materials.filter((m) => m.status === 'Active'));
      })
      .catch(() => {
        if (cancelled) return;
        setInventoryProducts([]);
        setInventoryMaterials([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingRecipeRefs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAddModalOpen, isEditModalOpen, canLoadRecipeRefs, activeRecipeBranchId]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await deleteMenu(deleteTarget.id);
      await refreshData();
      setDeleteTarget(null);
      setSwal({
        type: 'success',
        title: t('deleted'),
        text: t('menu_deleted', { name: deleteTarget.name }),
        onConfirm: () => setSwal(null),
      });
    } catch (err) {
      setSwal({
        type: 'error',
        title: t('error'),
        text: err instanceof Error ? err.message : t('delete_failed'),
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
      title: t('delete_menu_item'),
      text: t('delete_menu_confirm', { name: menu.name }),
      showCancel: true,
      confirmText: t('yes_delete'),
      cancelText: t('cancel'),
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
      setSubmitError(t('please_select_branch'));
      return;
    }
    const hasInvalidRecipeRow = recipeRows.some((row) => {
      const touched = row.resourceType || row.resourceId || row.quantity;
      if (!touched) return false;
      const qty = Number(row.quantity);
      return !row.resourceType || !row.resourceId || !Number.isFinite(qty) || qty <= 0;
    });
    if (hasInvalidRecipeRow) {
      setSubmitError('Complete recipe rows correctly (type, item, and qty > 0), or remove incomplete rows.');
      return;
    }
    const inventoryMappings = recipeRows
      .map((row) => ({
        product_id: row.resourceType === 'product' ? Number(row.resourceId) : null,
        material_id: row.resourceType === 'material' ? Number(row.resourceId) : null,
        quantity: Number(row.quantity),
      }))
      .filter((row) => (row.product_id || row.material_id) && Number.isFinite(row.quantity) && row.quantity > 0);

    const menuName = formState.name.trim() || t('untitled');
    const actionTitle = mode === 'add' ? t('create_menu_item') : t('update_menu_item');
    const actionText = mode === 'add'
      ? t('create_menu_confirm', { name: menuName })
      : t('update_menu_confirm', { name: menuName });

    setSwal({
      type: 'question',
      title: actionTitle,
      text: actionText,
      showCancel: true,
      confirmText: t('yes_continue'),
      cancelText: t('cancel'),
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
              inventoryMappings,
              imageFile: imageFile ?? undefined,
            });
            await refreshData();
            setIsAddModalOpen(false);
            resetForm();
            setSwal({
              type: 'success',
              title: t('success'),
              text: t('menu_created', { name: menuName }),
              onConfirm: () => setSwal(null),
            });
          } else if (editingMenu) {
            await updateMenu(editingMenu.id, {
              categoryId: formState.categoryId || null,
              name: formState.name.trim(),
              description: formState.description.trim() || null,
              price: Number(formState.price || 0),
              isAvailable: formState.isAvailable,
              inventoryMappings,
              existingImagePath: formState.imageUrl || undefined,
              imageFile: imageFile ?? undefined,
            });
            await refreshData();
            setIsEditModalOpen(false);
            setEditingMenu(null);
            resetForm();
            setSwal({
              type: 'success',
              title: t('success'),
              text: t('menu_updated', { name: menuName }),
              onConfirm: () => setSwal(null),
            });
          }
        } catch (err) {
          setSwal({
            type: 'error',
            title: t('error'),
            text: err instanceof Error ? err.message : t('request_failed'),
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

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
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
          <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <div className="min-w-[220px]">
                <Dropdown
                  value={selectedCategory}
                  onChange={(v) => setSelectedCategory(v)}
                  options={[
                    { value: 'all', label: t('all_categories') },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>
            </div>
          <div className="min-w-[200px]">
            <Dropdown
              value={availability}
              onChange={(v) => setAvailability(v as 'all' | 'available' | 'unavailable')}
              options={[
                { value: 'all', label: t('all_availability') },
                { value: 'available', label: t('available') },
                { value: 'unavailable', label: t('unavailable') },
              ]}
            />
          </div>
        </div>
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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <div className="overflow-x-auto overflow-y-auto flex-1" ref={scrollContainerRef}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('menu_item')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('category')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('price')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stocks</th>
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
                  <td colSpan={selectedBranchId === 'all' ? 7 : 6} className="px-6 py-16 text-center text-slate-400 text-sm">
                    {t('loading_menu_data')}
                  </td>
                </tr>
              ) : filteredMenus.length > 0 ? (
                displayedMenus.map((menu) => {
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
                        {menu.inventoryTracked ? (
                          Number(menu.inventoryStock || 0) <= 0 ? (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-tight bg-red-100 text-red-700">
                              Out: {Number(menu.inventoryStock || 0).toLocaleString()}
                            </span>
                          ) : Number(menu.inventoryStock || 0) < 20 ? (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-tight bg-orange-100 text-orange-700">
                              Low: {Number(menu.inventoryStock || 0).toLocaleString()}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-tight bg-green-100 text-green-700">
                              Stock: {Number(menu.inventoryStock || 0).toLocaleString()}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-tight bg-slate-100 text-slate-500">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                          (menu.effectiveAvailable ?? menu.isAvailable) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {(menu.effectiveAvailable ?? menu.isAvailable) ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                          {(menu.effectiveAvailable ?? menu.isAvailable) ? t('available') : t('unavailable')}
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
                            title={t('edit_menu')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(menu)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title={t('delete_menu')}
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
                  <td colSpan={selectedBranchId === 'all' ? 7 : 6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Utensils className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium">{t('no_menu_items_found')}</p>
                      <p className="text-sm">{t('try_adjusting_filters')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <p className="text-xs font-medium text-slate-500">
              {t('showing')}{' '}
              <span className="text-slate-900 font-bold">
                {displayedMenus.length}
              </span>
          </p>
          <div className="h-4 w-px bg-slate-200"></div>
          <p className="text-xs text-slate-500 font-medium">
            <span className="text-green-600 font-bold">{filteredMenus.filter(m => m.isAvailable).length}</span> {t('available')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Page Line Count:
          </label>
          <Dropdown
            value={String(displayLimit)}
            onChange={(v) => {
              const limit = parseInt(v, 10);
              // Immediately show the selected number of items
              setDisplayLimit(Math.min(limit, filteredMenus.length));
              // Scroll to top when limit changes
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
              }
            }}
            options={[
              { value: '10', label: '10' },
              { value: '20', label: '20' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
            buttonClassName="w-20"
            openUpward={true}
          />
        </div>
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
            <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500 rounded-xl text-white">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isEditModalOpen ? t('edit_menu_item') : t('add_new_menu')}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {isEditModalOpen ? t('update_menu_details') : t('add_to_branch', { branch: currentBranchName })}
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
              className="flex flex-col flex-1 min-h-0"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(isEditModalOpen ? 'edit' : 'add');
              }}
            >
              <div ref={modalContentScrollRef} className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('menu_name')}</label>
                  <input
                    required
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t('menu_name_placeholder')}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('description')}</label>
                  <textarea
                    value={formState.description}
                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder={t('description_placeholder')}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all min-h-[90px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('category')}</label>
                  <Dropdown
                    value={formState.categoryId}
                    onChange={(v) => setFormState((prev) => ({ ...prev, categoryId: v }))}
                    placeholder={t('uncategorized')}
                    options={[
                      { value: '', label: t('uncategorized') },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    buttonClassName="p-3 py-3 pl-3 pr-3"
                    itemClassName="px-3"
                    openUpward={true}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('price_label')}</label>
                  <input
                    required
                    type="number"
                    value={formState.price}
                    onChange={(e) => setFormState((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder={t('price_placeholder')}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all"
                  />
                </div>
                {selectedBranchId === 'all' && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('target_branch')}</label>
                    <Dropdown
                      value={formState.branchId}
                      onChange={(v) => setFormState((prev) => ({ ...prev, branchId: v }))}
                      placeholder={t('select_branch')}
                      options={[
                        { value: '', label: t('select_branch') },
                        ...branches.map((b) => ({ value: b.id, label: b.name })),
                      ]}
                      buttonClassName="p-3 py-3 pl-3 pr-3"
                      itemClassName="px-3"
                      openUpward={true}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('availability')}</label>
                  <Dropdown
                    value={formState.isAvailable ? 'yes' : 'no'}
                    onChange={(v) => setFormState((prev) => ({ ...prev, isAvailable: v === 'yes' }))}
                    options={[
                      { value: 'yes', label: t('available') },
                      { value: 'no', label: t('unavailable') },
                    ]}
                    buttonClassName="p-3 py-3 pl-3 pr-3"
                    itemClassName="px-3"
                    openUpward={true}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('image')}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-orange-100 file:text-orange-700 file:text-sm file:font-medium"
                  />
                  {isEditModalOpen && formState.imageUrl && !imageFile && (
                    <p className="text-[10px] text-slate-500 mt-1">{t('current_image_kept')}</p>
                  )}
                </div>

                <div className="space-y-2 sm:col-span-2 border border-slate-200 bg-slate-50 rounded-xl p-3">
                  <div className="sticky top-0 z-10 -mx-3 px-3 py-1 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Inventory Recipe Mapping
                    </label>
                    <button
                      type="button"
                      onClick={() => setRecipeRows((prev) => [...prev, createRecipeRow()])}
                      className="px-2.5 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 disabled:opacity-50"
                      disabled={!canLoadRecipeRefs || loadingRecipeRefs}
                    >
                      Add Row
                    </button>
                  </div>
                  {!canLoadRecipeRefs ? (
                    <p className="text-xs text-slate-500">Select a specific branch first to configure recipe mappings.</p>
                  ) : loadingRecipeRefs ? (
                    <p className="text-xs text-slate-500">Loading products and materials...</p>
                  ) : recipeRows.length === 0 ? (
                    <p className="text-xs text-slate-500">No mappings yet. Add rows to deduct inventory when this menu is settled.</p>
                  ) : (
                    <div className="space-y-2">
                      {recipeRows.map((row) => {
                        const itemOptions: DropdownOption[] =
                          row.resourceType === 'product'
                            ? inventoryProducts.map((item) => ({ value: item.id, label: `${item.name} (Stock: ${item.stock})` }))
                            : row.resourceType === 'material'
                            ? inventoryMaterials.map((item) => ({ value: item.id, label: `${item.name} (Stock: ${item.stock})` }))
                            : [];

                        return (
                          <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[140px_1fr_110px_44px] gap-2">
                            <Dropdown
                              value={row.resourceType}
                              onChange={(v) =>
                                setRecipeRows((prev) =>
                                  prev.map((x) =>
                                    x.id === row.id
                                      ? { ...x, resourceType: v as RecipeRow['resourceType'], resourceId: '' }
                                      : x
                                  )
                                )
                              }
                              options={[
                                { value: '', label: 'Select Type' },
                                { value: 'product', label: 'Product' },
                                { value: 'material', label: 'Material' },
                              ]}
                              onOpen={nudgeModalScrollForRecipeDropdown}
                              buttonClassName="py-2.5 px-3 text-sm"
                            />
                            <Dropdown
                              value={row.resourceId}
                              onChange={(v) =>
                                setRecipeRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, resourceId: v } : x)))
                              }
                              options={[{ value: '', label: 'Select Item' }, ...itemOptions]}
                              onOpen={nudgeModalScrollForRecipeDropdown}
                              buttonClassName="py-2.5 px-3 text-sm"
                            />
                            <input
                              type="number"
                              min={0.001}
                              step="0.001"
                              value={row.quantity}
                              onChange={(e) =>
                                setRecipeRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, quantity: e.target.value } : x)))
                              }
                              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500"
                              placeholder="Qty"
                            />
                            <button
                              type="button"
                              onClick={() => setRecipeRows((prev) => prev.filter((x) => x.id !== row.id))}
                              className="h-[42px] rounded-xl bg-white border border-red-200 text-red-500 hover:bg-red-50 text-sm font-bold"
                              title="Remove row"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{submitError}</div>
              )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center space-x-3">
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
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] px-4 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    isEditModalOpen ? t('update_menu') : t('save_menu')
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
