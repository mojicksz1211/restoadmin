import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Select, { type SingleValue, type StylesConfig } from 'react-select';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Search,
  Plus,
  Filter,
  MoreVertical,
  ArrowUpDown,
  AlertTriangle,
  Package,
  RefreshCw,
  Edit3,
  Trash2,
  Store as StoreIcon
} from 'lucide-react';
import { MenuItem } from '../types';
import { getProductCategories } from '../services/productCategoryStore';
import {
  createInventoryProduct,
  deleteInventoryProduct,
  getInventoryProducts,
  updateInventoryProduct,
  type InventoryProduct,
} from '../services/inventoryProductService';

interface ProductsProps {
  selectedBranchId: string;
}

type SelectOption = {
  value: string;
  label: string;
};

type FeedbackMessage = {
  type: 'success' | 'error';
  text: string;
};

const Products: React.FC<ProductsProps> = ({ selectedBranchId }) => {
  const { t } = useTranslation('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<SelectOption | null>(null);
  const [selectedType, setSelectedType] = useState<SelectOption | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<SelectOption>({ value: 'Active', label: 'Active' });
  const [isCafeItem, setIsCafeItem] = useState(false);
  const [hasMultipleVariants, setHasMultipleVariants] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPrice, setEditingPrice] = useState('0');
  const [editingStock, setEditingStock] = useState('0');
  const [editingStatus, setEditingStatus] = useState<SelectOption>({ value: 'Active', label: 'Active' });
  const [deletingProduct, setDeletingProduct] = useState<InventoryProduct | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const branches: Array<{ id: string; name: string }> = [];

  const categoryOptions: SelectOption[] = useMemo(
    () =>
      getProductCategories()
        .filter((category) => category.status === 'Active')
        .map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [isAddModalOpen]
  );

  const unitOptions: SelectOption[] = [
    { value: 'grams', label: 'Grams (g)' },
    { value: 'kilograms', label: 'Kilograms (kg)' },
    { value: 'milliliters', label: 'Milliliters (ml)' },
    { value: 'liters', label: 'Liters (L)' },
    { value: 'pieces', label: 'Pieces (pcs)' },
    { value: 'units', label: 'Units' },
    { value: 'tablespoons', label: 'Tablespoons (tbsp)' },
    { value: 'teaspoons', label: 'Teaspoons (tsp)' },
    { value: 'cups', label: 'Cups' },
    { value: 'ounces', label: 'Ounces (oz)' },
    { value: 'pounds', label: 'Pounds (lb)' },
    { value: 'dozen', label: 'Dozen' },
    { value: 'box', label: 'Box' },
    { value: 'bottle', label: 'Bottle' },
    { value: 'can', label: 'Can' },
    { value: 'pack', label: 'Pack' },
    { value: 'bag', label: 'Bag' },
    { value: 'number-of-pieces', label: 'Number of pieces (nos)' },
    { value: 'slice', label: 'Slice' },
  ];

  const typeOptions: SelectOption[] = [
    { value: 'retail', label: 'Retail' },
    { value: 'food', label: 'Food' },
    { value: 'by-weight', label: 'By Weight' },
  ];
  const statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const selectStyles: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
      ...base,
      minHeight: 42,
      borderRadius: 6,
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
      zIndex: 120,
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

  const filteredItems = products.filter(item => {
    const matchesBranch = selectedBranchId === 'all' || item.branchId === selectedBranchId;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const loadProducts = async () => {
    try {
      const rows = await getInventoryProducts(selectedBranchId);
      setProducts(rows);
    } catch {
      setProducts([]);
      showFeedback('error', 'Failed to load products.');
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedBranchId]);

  const getStockStatus = (stock: number, productStatus?: 'Active' | 'Inactive') => {
    if (productStatus === 'Inactive') return { label: 'inactive', color: 'bg-slate-200 text-slate-600', icon: null };
    if (stock === 0) return { labelKey: 'out_of_stock' as const, color: 'bg-red-100 text-red-700', icon: <AlertTriangle className="w-3 h-3 mr-1" /> };
    if (stock < 20) return { labelKey: 'low_stock' as const, color: 'bg-orange-100 text-orange-700', icon: <AlertTriangle className="w-3 h-3 mr-1" /> };
    return { labelKey: 'in_stock' as const, color: 'bg-green-100 text-green-700', icon: null };
  };

  const showFeedback = (type: FeedbackMessage['type'], text: string) => {
    setFeedback({ type, text });
  };

  const resetAddFormState = () => {
    setSelectedCategory(null);
    setSelectedUnit(null);
    setSelectedType(null);
    setSelectedStatus({ value: 'Active', label: 'Active' });
    setIsCafeItem(false);
    setHasMultipleVariants(false);
  };

  const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const name = String(formData.get('product_name') ?? '').trim();
    if (!name) {
      showFeedback('error', 'Product name is required.');
      return;
    }
    if (!selectedCategory || !selectedUnit || !selectedType) {
      showFeedback('error', 'Category, Unit, and Type are required.');
      return;
    }
    const price = Number(formData.get('selling_price') ?? 0);
    const stock = Number(formData.get('initial_stock') ?? 0);
    if (selectedBranchId === 'all') {
      showFeedback('error', 'Select a specific branch before adding a product.');
      return;
    }
    try {
      await createInventoryProduct({
        name,
        category: selectedCategory.label as MenuItem['category'],
        price: Number.isFinite(price) ? price : 0,
        stock: Number.isFinite(stock) ? stock : 0,
        branchId: selectedBranchId,
        unit: selectedUnit.label,
        type: selectedType.label,
        status: selectedStatus.value === 'Inactive' ? 'Inactive' : 'Active',
        sku: String(formData.get('sku') ?? ''),
        barcode: String(formData.get('barcode') ?? ''),
        description: String(formData.get('description') ?? ''),
      });
      await loadProducts();
      setIsAddModalOpen(false);
      resetAddFormState();
      formElement.reset();
      showFeedback('success', 'Product added successfully.');
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Failed to add product.');
    }
  };

  const openEditProductModal = (product: InventoryProduct) => {
    setEditingProduct(product);
    setEditingName(product.name);
    setEditingPrice(String(product.price));
    setEditingStock(String(product.stock));
    setEditingStatus({ value: product.status, label: product.status });
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    const name = editingName.trim();
    if (!name) {
      showFeedback('error', 'Product name is required.');
      return;
    }
    try {
      await updateInventoryProduct(editingProduct.id, {
        ...editingProduct,
        name,
        price: Number(editingPrice) || 0,
        stock: Number(editingStock) || 0,
        status: editingStatus.value === 'Inactive' ? 'Inactive' : 'Active',
      });
      await loadProducts();
      setEditingProduct(null);
      showFeedback('success', 'Product updated successfully.');
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Failed to update product.');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      await deleteInventoryProduct(deletingProduct.id);
      await loadProducts();
      setDeletingProduct(null);
      showFeedback('success', 'Product deleted successfully.');
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Failed to delete product.');
    }
  };

  const currentBranchName = selectedBranchId === 'all'
    ? t('all_branches')
    : branches.find(b => b.id === selectedBranchId)?.name ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Product Management</h1>
          <p className="text-slate-500">{t('inventory_subtitle', { branch: currentBranchName })}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="hidden sm:flex bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold items-center space-x-2 hover:bg-slate-50 transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" />
            <span>{t('sync_stock')}</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-md hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t('search_inventory_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm"
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all">
            <Filter className="w-4 h-4" />
            <span>{t('filter')}</span>
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all">
            <ArrowUpDown className="w-4 h-4" />
            <span>{t('sort')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('category')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('price')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('stock_level')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</th>
                {selectedBranchId === 'all' && (
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('branch')}</th>
                )}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const status = getStockStatus(item.stock, item.status);
                  const branch = branches.find(b => b.id === item.branchId);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-orange-100 p-2 rounded-lg group-hover:bg-orange-200 transition-colors">
                            <Package className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-400">ID: {item.id.toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{item.unit || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{item.type || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-900">₱{item.price.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1.5 w-32">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className={item.stock < 20 ? 'text-orange-600' : 'text-slate-500'}>{item.stock} {t('units')}</span>
                            <span className="text-slate-400">100 {t('max')}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                item.stock === 0 ? 'bg-red-500' :
                                item.stock < 20 ? 'bg-orange-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(item.stock, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${status.color}`}>
                          {status.icon}
                          {'labelKey' in status ? t(status.labelKey) : status.label}
                        </span>
                      </td>
                      {selectedBranchId === 'all' && (
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-slate-500 flex items-center">
                            <StoreIcon className="w-3 h-3 mr-1" />
                            {branch?.name}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title={t('edit_item')}
                            onClick={() => openEditProductModal(item)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title={t('delete_item')}
                            onClick={() => setDeletingProduct(item)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={selectedBranchId === 'all' ? 9 : 8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Package className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium">{t('no_inventory_found')}</p>
                      <p className="text-sm">{t('try_adjust_search')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => {
                setIsAddModalOpen(false);
                resetAddFormState();
              }}
            ></div>
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-3 md:p-6">
              <div className="relative bg-slate-100 w-full max-w-6xl max-h-[90vh] rounded-2xl border border-slate-200 shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200">
            <form
              className="flex flex-col"
              onSubmit={handleCreateProduct}
            >
              <div className="px-5 md:px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10">
                <h3 className="text-base md:text-lg font-semibold text-slate-900">Create Product</h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetAddFormState();
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Products</span>
                </button>
              </div>

              <div className="p-3 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 flex-1">
                <div className="lg:col-span-2 space-y-4">
                  <section className="bg-white border border-slate-200 rounded-lg">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <h4 className="text-base font-semibold text-slate-900">Basic Information</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Product Name *</label>
                        <input
                          required
                          type="text"
                          name="product_name"
                          placeholder="Enter product name"
                          className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-600">Category *</label>
                          <Select
                            options={categoryOptions}
                            value={selectedCategory}
                            onChange={(option: SingleValue<SelectOption>) => setSelectedCategory(option)}
                            placeholder="Select a Product Category"
                            isClearable
                            styles={selectStyles}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-600">Unit *</label>
                          <Select
                            options={unitOptions}
                            value={selectedUnit}
                            onChange={(option: SingleValue<SelectOption>) => setSelectedUnit(option)}
                            placeholder="Select a Unit"
                            isClearable
                            styles={selectStyles}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-600">Barcode</label>
                          <input
                            type="text"
                            name="barcode"
                            placeholder="Leave empty for auto-generation"
                            className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500"
                          />
                          <p className="text-[11px] text-slate-400">Auto-generated if left empty (e.g., B-01).</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-600">SKU</label>
                          <input
                            type="text"
                            name="sku"
                            placeholder="Enter SKU"
                            className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Description</label>
                        <textarea
                          rows={3}
                          name="description"
                          placeholder="Enter product description"
                          className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500 resize-none"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="bg-white border border-slate-200 rounded-lg">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <h4 className="text-base font-semibold text-slate-900">Variants</h4>
                    </div>
                    <div className="p-4">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={hasMultipleVariants}
                          onChange={(e) => setHasMultipleVariants(e.target.checked)}
                          className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span>This product has multiple variants</span>
                      </label>
                    </div>
                  </section>
                </div>

                <div className="space-y-4">
                  <section className="bg-white border border-slate-200 rounded-lg">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <h4 className="text-base font-semibold text-slate-900">Type &amp; Options</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Type *</label>
                        <Select
                          options={typeOptions}
                          value={selectedType}
                          onChange={(option: SingleValue<SelectOption>) => setSelectedType(option)}
                          placeholder="Select a Type"
                          isClearable
                          styles={selectStyles}
                        />
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={isCafeItem}
                          onChange={(e) => setIsCafeItem(e.target.checked)}
                          className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span>Cafe item</span>
                      </label>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Status</label>
                        <Select
                          options={statusOptions}
                          value={selectedStatus}
                          onChange={(option: SingleValue<SelectOption>) =>
                            setSelectedStatus(option ?? { value: 'Active', label: 'Active' })
                          }
                          placeholder="Select status"
                          isClearable={false}
                          styles={selectStyles}
                        />
                      </div>
                    </div>
                  </section>

                  <section className="bg-white border border-slate-200 rounded-lg">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <h4 className="text-base font-semibold text-slate-900">Pricing</h4>
                    </div>
                    <div className="p-4 space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Selling Price</label>
                      <div className="flex rounded-md border border-slate-300 overflow-hidden">
                        <span className="px-3 py-2.5 bg-slate-50 text-sm text-slate-500 border-r border-slate-300">₱</span>
                        <input
                          type="number"
                          name="selling_price"
                          placeholder="0"
                          className="w-full px-3 py-2.5 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Initial Stock</label>
                        <input
                          type="number"
                          name="initial_stock"
                          placeholder="0"
                          className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="bg-white border border-slate-200 rounded-lg">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <h4 className="text-base font-semibold text-slate-900">Product Image</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Upload image</label>
                        <input type="file" className="block w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:border file:border-slate-300 file:rounded file:bg-white file:text-slate-700" />
                        <p className="text-[11px] text-slate-400">PNG, JPG, GIF up to 2MB. Recommended: 800x600px.</p>
                      </div>
                      <div className="h-28 rounded-md border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                        No image uploaded
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="px-5 md:px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-end gap-2 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetAddFormState();
                  }}
                  className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm shadow-md hover:bg-orange-600 transition-all"
                >
                  Save Product
                </button>
              </div>
            </form>
              </div>
            </div>
          </>,
          document.body
        )
      )}

      {editingProduct &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setEditingProduct(null)}
            />
            <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Edit Product</h3>
                  <p className="text-xs text-slate-500 mt-1">Update product details.</p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Product Name</label>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Price</label>
                      <input
                        type="number"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Stock</label>
                      <input
                        type="number"
                        value={editingStock}
                        onChange={(e) => setEditingStock(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Status</label>
                    <Select
                      options={statusOptions}
                      value={editingStatus}
                      onChange={(option: SingleValue<SelectOption>) =>
                        setEditingStatus(option ?? { value: 'Active', label: 'Active' })
                      }
                      styles={selectStyles}
                      isClearable={false}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateProduct}
                      className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {deletingProduct &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeletingProduct(null)} />
            <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Delete Product</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to delete &quot;{deletingProduct.name}&quot;?
                  </p>
                </div>
                <div className="p-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingProduct(null)}
                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteProduct}
                    className="px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-all"
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
                <h4 className="text-lg font-bold text-slate-900">
                  {feedback.type === 'success' ? 'Success' : 'Error'}
                </h4>
                <p className="text-sm text-slate-600 mt-2">{feedback.text}</p>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className={`mt-5 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all ${
                    feedback.type === 'success'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
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

export default Products;
