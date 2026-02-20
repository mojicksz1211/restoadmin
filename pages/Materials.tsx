import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Select, { type SingleValue, type StylesConfig } from 'react-select';
import { AlertCircle, ArrowLeft, CheckCircle2, Edit3, Package, Plus, Search, Trash2 } from 'lucide-react';
import { getProductCategories } from '../services/productCategoryStore';
import {
  createInventoryMaterial,
  deleteInventoryMaterial,
  getInventoryMaterials,
  type InventoryMaterial,
  updateInventoryMaterial,
} from '../services/inventoryMaterialService';

interface MaterialsProps {
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

const Materials: React.FC<MaterialsProps> = ({ selectedBranchId }) => {
  const { t } = useTranslation('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<SelectOption>({ value: 'Active', label: 'Active' });
  const [selectedUnit, setSelectedUnit] = useState<SelectOption | null>(null);
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<InventoryMaterial | null>(null);
  const [editingMaterialName, setEditingMaterialName] = useState('');
  const [editingMaterialSku, setEditingMaterialSku] = useState('');
  const [editingMaterialBarcode, setEditingMaterialBarcode] = useState('');
  const [editingMaterialDescription, setEditingMaterialDescription] = useState('');
  const [editingMaterialStock, setEditingMaterialStock] = useState('0');
  const [editingMaterialUnitCost, setEditingMaterialUnitCost] = useState('0');
  const [editingCategory, setEditingCategory] = useState<SelectOption | null>(null);
  const [editingStatus, setEditingStatus] = useState<SelectOption>({ value: 'Active', label: 'Active' });
  const [editingUnit, setEditingUnit] = useState<SelectOption | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<InventoryMaterial | null>(null);

  const filteredMaterials = useMemo(() => {
    const lowered = searchTerm.trim().toLowerCase();
    if (!lowered) return materials;
    return materials.filter((item) => item.name.toLowerCase().includes(lowered));
  }, [materials, searchTerm]);

  const loadMaterials = async () => {
    try {
      const rows = await getInventoryMaterials(selectedBranchId);
      setMaterials(rows);
    } catch {
      setMaterials([]);
      showFeedback('error', 'Failed to load materials.');
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [selectedBranchId]);

  const branchLabel = selectedBranchId === 'all' ? t('all_branches') : `Branch ${selectedBranchId}`;
  const categoryOptions: SelectOption[] = useMemo(
    () =>
      getProductCategories()
        .filter((category) => category.status === 'Active')
        .map((category) => ({
          value: category.id,
          label: category.name,
        })),
    [isAddModalOpen, editingMaterial]
  );
  const statusOptions: SelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];
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

  const showFeedback = (type: FeedbackMessage['type'], text: string) => {
    setFeedback({ type, text });
  };

  const resetAddForm = () => {
    setSelectedCategory(null);
    setSelectedStatus({ value: 'Active', label: 'Active' });
    setSelectedUnit(null);
  };

  const handleCreateMaterial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const name = String(formData.get('material_name') ?? '').trim();
    if (!name) {
      showFeedback('error', 'Material name is required.');
      return;
    }
    if (!selectedCategory || !selectedUnit) {
      showFeedback('error', 'Category and Unit are required.');
      return;
    }
    const stock = Number(formData.get('initial_stock') ?? 0);
    const unitCost = Number(formData.get('unit_cost') ?? 0);
    if (selectedBranchId === 'all') {
      showFeedback('error', 'Select a specific branch before adding a material.');
      return;
    }
    try {
      await createInventoryMaterial({
        name,
        category: selectedCategory.label,
        unit: selectedUnit.label,
        status: selectedStatus.value === 'Inactive' ? 'Inactive' : 'Active',
        stock: Number.isFinite(stock) ? stock : 0,
        unitCost: Number.isFinite(unitCost) ? unitCost : 0,
        sku: String(formData.get('sku') ?? ''),
        barcode: String(formData.get('barcode') ?? ''),
        description: String(formData.get('description') ?? ''),
        branchId: selectedBranchId,
      });
      await loadMaterials();
      setIsAddModalOpen(false);
      resetAddForm();
      formElement.reset();
      showFeedback('success', 'Material added successfully.');
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Failed to add material.');
    }
  };

  const openEditMaterialModal = (material: InventoryMaterial) => {
    setEditingMaterial(material);
    setEditingMaterialName(material.name);
    setEditingMaterialSku(material.sku || '');
    setEditingMaterialBarcode(material.barcode || '');
    setEditingMaterialDescription(material.description || '');
    setEditingMaterialStock(String(material.stock));
    setEditingMaterialUnitCost(String(material.unitCost));
    setEditingStatus({ value: material.status, label: material.status });
    const matchedCategory = categoryOptions.find((option) => option.label === material.category);
    setEditingCategory(matchedCategory ?? (material.category ? { value: material.category, label: material.category } : null));
    const matchedUnit = unitOptions.find((option) => option.label === material.unit);
    setEditingUnit(matchedUnit ?? (material.unit ? { value: material.unit, label: material.unit } : null));
  };

  const handleUpdateMaterial = async () => {
    if (!editingMaterial) return;
    const name = editingMaterialName.trim();
    if (!name) {
      showFeedback('error', 'Material name is required.');
      return;
    }
    if (!editingCategory || !editingUnit) {
      showFeedback('error', 'Category and Unit are required.');
      return;
    }
    try {
      await updateInventoryMaterial(editingMaterial.id, {
        ...editingMaterial,
        name,
        category: editingCategory.label,
        sku: editingMaterialSku,
        barcode: editingMaterialBarcode,
        description: editingMaterialDescription,
        unit: editingUnit.label,
        status: editingStatus.value === 'Inactive' ? 'Inactive' : 'Active',
        stock: Number(editingMaterialStock) || 0,
        unitCost: Number(editingMaterialUnitCost) || 0,
      });
      await loadMaterials();
      setEditingMaterial(null);
      showFeedback('success', 'Material updated successfully.');
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Failed to update material.');
    }
  };

  const handleDeleteMaterial = async () => {
    if (!deletingMaterial) return;
    try {
      await deleteInventoryMaterial(deletingMaterial.id);
      await loadMaterials();
      setDeletingMaterial(null);
      showFeedback('success', 'Material deleted successfully.');
    } catch (error) {
      showFeedback('error', error instanceof Error ? error.message : 'Failed to delete material.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Materials</h1>
          <p className="text-slate-500">Track material stock levels for {branchLabel}.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-md hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Material</span>
        </button>
      </div>

      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search materials..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredMaterials.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="flex flex-col items-center justify-center text-slate-400">
              <Package className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No materials found</p>
              <p className="text-sm">Add materials to start tracking stock.</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Material</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Barcode</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Cost</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMaterials.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 text-slate-700">{item.category || '-'}</td>
                  <td className="px-6 py-4 text-slate-700">{item.sku || '-'}</td>
                  <td className="px-6 py-4 text-slate-700">{item.barcode || '-'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        item.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{item.unit}</td>
                  <td className="px-6 py-4 text-slate-700">₱{item.unitCost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-700">{item.stock}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditMaterialModal(item)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit material"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingMaterial(item)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingMaterial &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingMaterial(null)} />
            <div className="fixed inset-0 z-[111] flex items-center justify-center p-3 md:p-6">
              <div className="relative bg-slate-100 w-full max-w-6xl max-h-[90vh] rounded-2xl border border-slate-200 shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200">
                <form
                  className="flex flex-col"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateMaterial();
                  }}
                >
                  <div className="px-5 md:px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10">
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">Edit Material</h3>
                    <button
                      type="button"
                      onClick={() => setEditingMaterial(null)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Materials</span>
                    </button>
                  </div>

                  <div className="p-3 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 flex-1">
                    <div className="lg:col-span-2 space-y-4">
                      <section className="bg-white border border-slate-200 rounded-lg">
                        <div className="px-4 py-3 border-b border-slate-200">
                          <h4 className="text-base font-semibold text-slate-900">Basic Information</h4>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-600">Material Name *</label>
                              <input
                                type="text"
                                value={editingMaterialName}
                                onChange={(e) => setEditingMaterialName(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-600">SKU</label>
                              <input
                                type="text"
                                value={editingMaterialSku}
                                onChange={(e) => setEditingMaterialSku(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-600">Category *</label>
                              <Select
                                options={categoryOptions}
                                value={editingCategory}
                                onChange={(option: SingleValue<SelectOption>) => setEditingCategory(option)}
                                placeholder="Select a Product Category"
                                isClearable
                                styles={selectStyles}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-600">Barcode</label>
                              <input
                                type="text"
                                value={editingMaterialBarcode}
                                onChange={(e) => setEditingMaterialBarcode(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">Description</label>
                            <textarea
                              rows={3}
                              value={editingMaterialDescription}
                              onChange={(e) => setEditingMaterialDescription(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                            />
                          </div>
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
                            <label className="text-xs font-medium text-slate-600">Status</label>
                            <Select
                              options={statusOptions}
                              value={editingStatus}
                              onChange={(option: SingleValue<SelectOption>) =>
                                setEditingStatus(option ?? { value: 'Active', label: 'Active' })
                              }
                              placeholder="Select status"
                              isClearable={false}
                              styles={selectStyles}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">Unit *</label>
                            <Select
                              options={unitOptions}
                              value={editingUnit}
                              onChange={(option: SingleValue<SelectOption>) => setEditingUnit(option)}
                              placeholder="Select a Unit"
                              isClearable
                              styles={selectStyles}
                            />
                          </div>
                        </div>
                      </section>

                      <section className="bg-white border border-slate-200 rounded-lg">
                        <div className="px-4 py-3 border-b border-slate-200">
                          <h4 className="text-base font-semibold text-slate-900">Pricing &amp; Stock</h4>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">Unit Cost</label>
                            <div className="flex rounded-md border border-slate-300 overflow-hidden">
                              <span className="px-3 py-2.5 bg-slate-50 text-sm text-slate-500 border-r border-slate-300">₱</span>
                              <input
                                type="number"
                                value={editingMaterialUnitCost}
                                onChange={(e) => setEditingMaterialUnitCost(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm focus:outline-none bg-white"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">Initial Stock</label>
                            <input
                              type="number"
                              value={editingMaterialStock}
                              onChange={(e) => setEditingMaterialStock(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>

                  <div className="px-5 md:px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-end gap-2 sticky bottom-0">
                    <button
                      type="button"
                      onClick={() => setEditingMaterial(null)}
                      className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>,
          document.body
        )}

      {deletingMaterial &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeletingMaterial(null)} />
            <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Delete Material</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to delete &quot;{deletingMaterial.name}&quot;?
                  </p>
                </div>
                <div className="p-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingMaterial(null)}
                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteMaterial}
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

      {isAddModalOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => {
                setIsAddModalOpen(false);
                resetAddForm();
              }}
            />
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-3 md:p-6">
              <div className="relative bg-slate-100 w-full max-w-6xl max-h-[90vh] rounded-2xl border border-slate-200 shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200">
                <form className="flex flex-col" onSubmit={handleCreateMaterial}>
                  <div className="px-5 md:px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10">
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">Create Material</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        resetAddForm();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Materials</span>
                    </button>
                  </div>

                  <div className="p-3 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 flex-1">
                    <div className="lg:col-span-2 space-y-4">
                      <section className="bg-white border border-slate-200 rounded-lg">
                        <div className="px-4 py-3 border-b border-slate-200">
                          <h4 className="text-base font-semibold text-slate-900">Basic Information</h4>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-600">Material Name *</label>
                              <input name="material_name" type="text" placeholder="Material Name" className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-600">SKU</label>
                              <input name="sku" type="text" placeholder="SKU" className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                            </div>
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
                              <label className="text-xs font-medium text-slate-600">Barcode</label>
                              <input name="barcode" type="text" placeholder="Leave empty to auto-generate" className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                              <p className="text-[11px] text-slate-500">Leave empty to auto-generate barcode as B-[product_id]</p>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">Description</label>
                            <textarea name="description" rows={3} placeholder="Description" className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none" />
                          </div>
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
                      </section>

                      <section className="bg-white border border-slate-200 rounded-lg">
                        <div className="px-4 py-3 border-b border-slate-200">
                          <h4 className="text-base font-semibold text-slate-900">Pricing &amp; Stock</h4>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">Unit Cost</label>
                            <div className="flex rounded-md border border-slate-300 overflow-hidden">
                              <span className="px-3 py-2.5 bg-slate-50 text-sm text-slate-500 border-r border-slate-300">₱</span>
                              <input
                                type="number"
                                name="unit_cost"
                                placeholder="0"
                                className="w-full px-3 py-2.5 text-sm focus:outline-none bg-white"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">Initial Stock</label>
                            <input
                              type="number"
                              name="initial_stock"
                              placeholder="0"
                              className="w-full px-3 py-2.5 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                          </div>
                        </div>
                      </section>

                      <section className="bg-white border border-slate-200 rounded-lg">
                        <div className="px-4 py-3 border-b border-slate-200">
                          <h4 className="text-base font-semibold text-slate-900">Material Image</h4>
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
                        resetAddForm();
                      }}
                      className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm shadow-md hover:bg-orange-600 transition-all"
                    >
                      Save Material
                    </button>
                  </div>
                </form>
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

export default Materials;
