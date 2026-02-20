import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Edit3, Plus, Search, Tags, Trash2 } from 'lucide-react';
import Select, { type SingleValue, type StylesConfig } from 'react-select';
import {
  addProductCategory,
  deleteProductCategory,
  getProductCategories,
  type ProductCategoryItem,
  updateProductCategory,
} from '../services/productCategoryStore';

interface ProductCategoriesProps {
  selectedBranchId: string;
}

type StatusOption = {
  value: ProductCategoryItem['status'];
  label: ProductCategoryItem['status'];
};

type FeedbackMessage = {
  type: 'success' | 'error';
  text: string;
};

const ProductCategories: React.FC<ProductCategoriesProps> = ({ selectedBranchId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<ProductCategoryItem[]>(() => getProductCategories());
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryStatus, setNewCategoryStatus] = useState<ProductCategoryItem['status']>('Active');
  const [editingCategory, setEditingCategory] = useState<ProductCategoryItem | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryStatus, setEditingCategoryStatus] = useState<ProductCategoryItem['status']>('Active');
  const [deletingCategory, setDeletingCategory] = useState<ProductCategoryItem | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const filteredCategories = useMemo(() => {
    const lowered = searchTerm.trim().toLowerCase();
    if (!lowered) return categories;
    return categories.filter((item) => item.name.toLowerCase().includes(lowered));
  }, [categories, searchTerm]);

  const branchLabel = selectedBranchId === 'all' ? 'All Branches' : `Branch ${selectedBranchId}`;
  const statusOptions: StatusOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];
  const selectedStatusOption = statusOptions.find((option) => option.value === newCategoryStatus) ?? null;

  const selectStyles: StylesConfig<StatusOption, false> = {
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

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showFeedback('error', 'Category name is required.');
      return;
    }
    const exists = categories.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showFeedback('error', 'Category already exists.');
      return;
    }
    const next = addProductCategory(trimmed, newCategoryStatus);
    setCategories(next);
    setNewCategoryName('');
    setNewCategoryStatus('Active');
    setIsAdding(false);
    showFeedback('success', 'Category added successfully.');
  };

  const handleEditCategory = () => {
    if (!editingCategory) return;
    const trimmed = editingCategoryName.trim();
    if (!trimmed) {
      showFeedback('error', 'Category name is required.');
      return;
    }
    const exists = categories.some(
      (item) => item.id !== editingCategory.id && item.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      showFeedback('error', 'Category already exists.');
      return;
    }
    const next = updateProductCategory(editingCategory.id, trimmed, editingCategoryStatus);
    setCategories(next);
    setEditingCategory(null);
    setEditingCategoryName('');
    setEditingCategoryStatus('Active');
    showFeedback('success', 'Category updated successfully.');
  };

  const openEditCategoryModal = (category: ProductCategoryItem) => {
    setEditingCategory(category);
    setEditingCategoryName(category.name);
    setEditingCategoryStatus(category.status);
  };

  const handleDeleteCategory = () => {
    if (!deletingCategory) return;
    const before = categories.length;
    const next = deleteProductCategory(deletingCategory.id);
    if (next.length === before) {
      showFeedback('error', 'Failed to delete category.');
      setDeletingCategory(null);
      return;
    }
    setCategories(next);
    setDeletingCategory(null);
    showFeedback('success', 'Category deleted successfully.');
  };

  const openDeleteCategoryModal = (category: ProductCategoryItem) => {
    setDeletingCategory(category);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Product Categories</h1>
          <p className="text-slate-500">Manage product groupings for {branchLabel}.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full sm:w-auto bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-md hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Product Category</span>
        </button>
      </div>

      {isAdding &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setIsAdding(false);
                setNewCategoryName('');
                setNewCategoryStatus('Active');
              }}
            />
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Add Product Category</h3>
                  <p className="text-xs text-slate-500 mt-1">Create a new category for product grouping.</p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Category Name</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Status</label>
                    <Select
                      options={statusOptions}
                      value={selectedStatusOption}
                      onChange={(option: SingleValue<StatusOption>) =>
                        setNewCategoryStatus(option?.value ?? 'Active')
                      }
                      placeholder="Select status"
                      styles={selectStyles}
                      isClearable={false}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setNewCategoryName('');
                        setNewCategoryStatus('Active');
                      }}
                      className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Save Category
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      {editingCategory &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setEditingCategory(null);
                setEditingCategoryName('');
                setEditingCategoryStatus('Active');
              }}
            />
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Edit Product Category</h3>
                  <p className="text-xs text-slate-500 mt-1">Update the category name.</p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Category Name</label>
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      placeholder="Enter category name"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600">Status</label>
                    <Select
                      options={statusOptions}
                      value={statusOptions.find((option) => option.value === editingCategoryStatus) ?? null}
                      onChange={(option: SingleValue<StatusOption>) =>
                        setEditingCategoryStatus(option?.value ?? 'Active')
                      }
                      placeholder="Select status"
                      styles={selectStyles}
                      isClearable={false}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setEditingCategoryName('');
                        setEditingCategoryStatus('Active');
                      }}
                      className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleEditCategory}
                      disabled={!editingCategoryName.trim()}
                      className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

      {deletingCategory &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setDeletingCategory(null)}
            />
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Delete Product Category</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to delete &quot;{deletingCategory.name}&quot;?
                  </p>
                </div>
                <div className="p-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingCategory(null)}
                    className="px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCategory}
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
            <div className="fixed inset-0 z-[140] bg-slate-900/50 backdrop-blur-sm" />
            <div className="fixed inset-0 z-[141] flex items-center justify-center p-4">
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

      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredCategories.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="flex flex-col items-center justify-center text-slate-400">
              <Tags className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No categories found</p>
              <p className="text-sm">Create a category to organize your products.</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCategories.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditCategoryModal(item)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit category"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteCategoryModal(item)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete category"
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
    </div>
  );
};

export default ProductCategories;
