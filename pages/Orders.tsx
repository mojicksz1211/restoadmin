import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  RefreshCw,
  Filter,
  Receipt,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Eye,
  XCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  getOrders,
  getOrderItems,
  createOrder,
  updateOrderStatus,
  getOrderStatusLabel,
  ORDER_STATUS,
  type OrderRecord,
  type OrderItemRecord,
} from '../services/orderService';
import { getBranches } from '../services/branchService';
import { getMenus } from '../services/menuService';
import { getRestaurantTables, type RestaurantTableRecord } from '../services/tableService';
import type { BranchRecord, MenuRecord } from '../types';

interface OrdersProps {
  selectedBranchId: string;
}

type SwalState = {
  type: 'question' | 'success' | 'error' | 'warning';
  title: string;
  text: string;
  showCancel?: boolean;
  confirmText?: string;
  confirmVariant?: 'orange' | 'green' | 'red';
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
} | null;

type NewOrderItem = {
  menuId: string;
  name: string;
  unitPrice: number;
  qty: number;
};

const Orders: React.FC<OrdersProps> = ({ selectedBranchId }) => {
  const { t } = useTranslation('common');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);

  const [detailOrder, setDetailOrder] = useState<OrderRecord | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItemRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [swal, setSwal] = useState<SwalState>(null);

  // --- New order modal state ---
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [newOrderSubmitting, setNewOrderSubmitting] = useState(false);
  const [newOrderLoadingRefs, setNewOrderLoadingRefs] = useState(false);
  const [newOrderMenus, setNewOrderMenus] = useState<MenuRecord[]>([]);
  const [newOrderTables, setNewOrderTables] = useState<RestaurantTableRecord[]>([]);

  const [newOrderNo, setNewOrderNo] = useState('');
  const [newOrderType, setNewOrderType] = useState<'DINE_IN' | 'TAKE_OUT' | 'DELIVERY'>('DINE_IN');
  const [newOrderTableId, setNewOrderTableId] = useState<string>('');

  const [newOrderItems, setNewOrderItems] = useState<NewOrderItem[]>([]);
  const [newOrderSelectedMenuId, setNewOrderSelectedMenuId] = useState<string>('');
  const [newOrderQty, setNewOrderQty] = useState<number>(1);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrders(selectedBranchId);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    getBranches().then(setBranches).catch(() => setBranches([]));
  }, []);

  const currentBranchName =
    selectedBranchId === 'all'
      ? t('all_branches')
      : branches.find((b) => b.id === selectedBranchId)?.name ?? t('branch');

  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      statusFilter === 'all' || String(order.STATUS) === statusFilter;
    const matchSearch =
      !searchTerm.trim() ||
      order.ORDER_NO.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.TABLE_NUMBER && order.TABLE_NUMBER.toString().includes(searchTerm));
    return matchStatus && matchSearch;
  });

  const displayedOrders = filteredOrders.slice(0, itemsPerPage);

  const openDetail = async (order: OrderRecord) => {
    setDetailOrder(order);
    setDetailLoading(true);
    setDetailItems([]);
    try {
      const items = await getOrderItems(String(order.IDNo));
      setDetailItems(items);
    } catch {
      setDetailItems([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOrder(null);
    setDetailItems([]);
  };

  const generateOrderNo = () => {
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `ORD-${y}${m}${day}-${hh}${mm}${ss}`;
  };

  const openNewOrder = () => {
    if (selectedBranchId === 'all') {
      setSwal({
        type: 'warning',
        title: 'Select a Branch First',
        text: 'Please select a specific branch to create a new order.',
        confirmText: 'OK',
        confirmVariant: 'orange',
        onConfirm: () => setSwal(null),
      });
      return;
    }
    setNewOrderNo(generateOrderNo());
    setNewOrderType('DINE_IN');
    setNewOrderTableId('');
    setNewOrderItems([]);
    setNewOrderSelectedMenuId('');
    setNewOrderQty(1);
    setNewOrderOpen(true);
  };

  const closeNewOrder = () => {
    if (newOrderSubmitting) return;
    setNewOrderOpen(false);
  };

  useEffect(() => {
    if (!newOrderOpen) return;
    if (selectedBranchId === 'all') return;

    let cancelled = false;
    setNewOrderLoadingRefs(true);
    Promise.all([
      getMenus(selectedBranchId),
      getRestaurantTables(selectedBranchId),
    ])
      .then(([menus, tables]) => {
        if (cancelled) return;
        const usableMenus = (Array.isArray(menus) ? menus : []).filter((m) => m.active && m.isAvailable);
        setNewOrderMenus(usableMenus);
        setNewOrderTables(Array.isArray(tables) ? tables : []);
      })
      .catch(() => {
        if (cancelled) return;
        setNewOrderMenus([]);
        setNewOrderTables([]);
      })
      .finally(() => {
        if (cancelled) return;
        setNewOrderLoadingRefs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [newOrderOpen, selectedBranchId]);

  const newOrderSubtotal = newOrderItems.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const newOrderGrandTotal = newOrderSubtotal;

  const addNewOrderItem = () => {
    const menuId = newOrderSelectedMenuId;
    const qty = Number(newOrderQty);
    if (!menuId) {
      setSwal({
        type: 'warning',
        title: 'Select an Item',
        text: 'Please select a menu item first.',
        confirmText: 'OK',
        confirmVariant: 'orange',
        onConfirm: () => setSwal(null),
      });
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setSwal({
        type: 'warning',
        title: 'Invalid Quantity',
        text: 'Quantity must be greater than 0.',
        confirmText: 'OK',
        confirmVariant: 'orange',
        onConfirm: () => setSwal(null),
      });
      return;
    }

    const menu = newOrderMenus.find((m) => m.id === menuId);
    if (!menu) return;

    setNewOrderItems((prev) => {
      const idx = prev.findIndex((p) => p.menuId === menuId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
        return copy;
      }
      return [
        ...prev,
        { menuId, name: menu.name, unitPrice: Number(menu.price || 0), qty },
      ];
    });
    setNewOrderSelectedMenuId('');
    setNewOrderQty(1);
  };

  const removeNewOrderItem = (menuId: string) => {
    setNewOrderItems((prev) => prev.filter((p) => p.menuId !== menuId));
  };

  const submitNewOrder = async () => {
    if (selectedBranchId === 'all') return;
    if (!newOrderNo.trim()) {
      setSwal({
        type: 'warning',
        title: 'Order No Required',
        text: 'Please provide an order number.',
        confirmText: 'OK',
        confirmVariant: 'orange',
        onConfirm: () => setSwal(null),
      });
      return;
    }
    if (newOrderType === 'DINE_IN' && !newOrderTableId) {
      setSwal({
        type: 'warning',
        title: 'Table Required',
        text: 'Please select a table for Dine-in orders.',
        confirmText: 'OK',
        confirmVariant: 'orange',
        onConfirm: () => setSwal(null),
      });
      return;
    }
    if (newOrderItems.length === 0) {
      setSwal({
        type: 'warning',
        title: 'Add Items',
        text: 'Please add at least one item before creating the order.',
        confirmText: 'OK',
        confirmVariant: 'orange',
        onConfirm: () => setSwal(null),
      });
      return;
    }

    setNewOrderSubmitting(true);
    try {
      await createOrder({
        ORDER_NO: newOrderNo.trim(),
        order_no: newOrderNo.trim(),
        BRANCH_ID: selectedBranchId,
        branch_id: selectedBranchId,
        TABLE_ID: newOrderType === 'DINE_IN' && newOrderTableId ? Number(newOrderTableId) : null,
        table_id: newOrderType === 'DINE_IN' && newOrderTableId ? Number(newOrderTableId) : null,
        ORDER_TYPE: newOrderType,
        order_type: newOrderType,
        STATUS: ORDER_STATUS.PENDING,
        SUBTOTAL: newOrderSubtotal,
        TAX_AMOUNT: 0,
        SERVICE_CHARGE: 0,
        DISCOUNT_AMOUNT: 0,
        GRAND_TOTAL: newOrderGrandTotal,
        ORDER_ITEMS: newOrderItems.map((it) => ({
          menu_id: Number(it.menuId),
          qty: Number(it.qty),
          unit_price: Number(it.unitPrice),
          line_total: Number(it.qty) * Number(it.unitPrice),
          status: ORDER_STATUS.PENDING,
        })),
        // Compatibility payload for API-style handlers (ignored by web /orders if unused)
        items: newOrderItems.map((it) => ({
          menu_id: Number(it.menuId),
          qty: Number(it.qty),
          unit_price: Number(it.unitPrice),
          line_total: Number(it.qty) * Number(it.unitPrice),
          status: ORDER_STATUS.PENDING,
        })),
      });

      setNewOrderOpen(false);
      await loadOrders();
      setSwal({
        type: 'success',
        title: 'Created!',
        text: `Order ${newOrderNo.trim()} has been created.`,
        confirmText: 'OK',
        confirmVariant: 'green',
        onConfirm: () => setSwal(null),
      });
    } catch (e) {
      setSwal({
        type: 'error',
        title: 'Error!',
        text: e instanceof Error ? e.message : 'Failed to create order',
        confirmText: 'OK',
        confirmVariant: 'red',
        onConfirm: () => setSwal(null),
      });
    } finally {
      setNewOrderSubmitting(false);
    }
  };

  const confirmUpdateStatus = (order: OrderRecord, newStatus: number) => {
    const label = getOrderStatusLabel(newStatus);
    const isSettled = newStatus === ORDER_STATUS.SETTLED;
    const isCancelled = newStatus === ORDER_STATUS.CANCELLED;

    const title = isSettled
      ? 'Mark Order as Settled?'
      : isCancelled
      ? 'Cancel Order?'
      : 'Update Order Status?';

    const text = isSettled
      ? `Mark order ${order.ORDER_NO} as "${label}"?`
      : isCancelled
      ? `Cancel order ${order.ORDER_NO}? This action cannot be undone.`
      : `Change order ${order.ORDER_NO} to "${label}"?`;

    const confirmText = isSettled
      ? 'Yes, Settle'
      : isCancelled
      ? 'Yes, Cancel'
      : 'Yes, Update';

    setSwal({
      type: 'question',
      title: 'Update Order Status?',
      text: `Change order ${order.ORDER_NO} to "${label}"?`,
      showCancel: true,
      confirmText: 'Yes, Update',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setSwal(null);
        setStatusSubmitting(true);
        try {
          await updateOrderStatus(String(order.IDNo), newStatus);
          await loadOrders();
          if (detailOrder?.IDNo === order.IDNo) {
            const updated = orders.find((o) => o.IDNo === order.IDNo);
            if (updated) setDetailOrder({ ...updated, STATUS: newStatus });
          }
          setSwal({
            type: 'success',
            title: 'Updated!',
            text: `Order ${order.ORDER_NO} is now ${label}.`,
            onConfirm: () => setSwal(null),
          });
        } catch (e) {
          setSwal({
            type: 'error',
            title: t('error'),
            text: e instanceof Error ? e.message : t('failed_to_update_status'),
            onConfirm: () => setSwal(null),
          });
        } finally {
          setStatusSubmitting(false);
        }
      },
      onCancel: () => setSwal(null),
    });
  };

  const statusBadge = (status: number) => {
    const label = getOrderStatusLabel(status);
    const style =
      status === ORDER_STATUS.SETTLED
        ? 'bg-green-100 text-green-700'
        : status === ORDER_STATUS.CANCELLED
        ? 'bg-red-100 text-red-700'
        : status === ORDER_STATUS.CONFIRMED
        ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-700';
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${style}`}
      >
        {label}
      </span>
    );
  };

  const orderTypeBadge = (orderType: string | null | undefined) => {
    if (!orderType || !orderType.trim()) {
      return <span className="text-slate-400 text-sm">—</span>;
    }
    const normalized = orderType.trim().toUpperCase().replace(/\s+/g, '_');
    const label =
      normalized === 'DINE_IN'
        ? t('dine_in')
        : normalized === 'TAKE_OUT'
        ? t('take_out')
        : normalized === 'DELIVERY'
        ? t('delivery')
        : normalized === 'PICKUP'
        ? t('pickup')
        : orderType;
    const style =
      normalized === 'DINE_IN'
        ? 'bg-slate-100 text-slate-700 border border-slate-200'
        : normalized === 'TAKE_OUT'
        ? 'bg-amber-50 text-amber-800 border border-amber-200'
        : normalized === 'DELIVERY'
        ? 'bg-blue-50 text-blue-800 border border-blue-200'
        : normalized === 'PICKUP'
        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        : 'bg-slate-100 text-slate-600 border border-slate-200';
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${style}`}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('orders')}</h1>
          <p className="text-slate-500">
            {t('orders_for')} <span className="text-orange-600 font-semibold">{currentBranchName}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNewOrder}
            aria-disabled={selectedBranchId === 'all'}
            className={`bg-orange-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-orange-600 shadow-sm ${
              selectedBranchId === 'all' ? 'opacity-60' : ''
            }`}
            title={selectedBranchId === 'all' ? 'Select a branch to create an order' : 'Create new order'}
          >
            <Plus className="w-4 h-4" />
            New Order
          </button>
          <button
            onClick={loadOrders}
            disabled={loading}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_order_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600"
          >
            <option value="all">{t('all_statuses')}</option>
            <option value={ORDER_STATUS.PENDING}>{t('pending')}</option>
            <option value={ORDER_STATUS.CONFIRMED}>{t('confirmed')}</option>
            <option value={ORDER_STATUS.SETTLED}>{t('settled')}</option>
            <option value={ORDER_STATUS.CANCELLED}>{t('cancelled')}</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold">{t('unable_to_load_orders')}</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* New order modal */}
      {newOrderOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-900">New Order</h2>
                <p className="text-xs text-slate-500">
                  Branch: <span className="font-semibold text-slate-700">{currentBranchName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeNewOrder}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50"
                disabled={newOrderSubmitting}
                title="Close"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Order No</label>
                  <input
                    value={newOrderNo}
                    onChange={(e) => setNewOrderNo(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500/20 focus:bg-white focus:outline-none"
                    placeholder="e.g. ORD-20260211-101530"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Order Type</label>
                  <select
                    value={newOrderType}
                    onChange={(e) => setNewOrderType(e.target.value as typeof newOrderType)}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700"
                  >
                    <option value="DINE_IN">Dine-in</option>
                    <option value="TAKE_OUT">Take out</option>
                    <option value="DELIVERY">Delivery</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Table</label>
                  <select
                    value={newOrderTableId}
                    onChange={(e) => setNewOrderTableId(e.target.value)}
                    disabled={newOrderType !== 'DINE_IN' || newOrderLoadingRefs}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 disabled:opacity-60"
                  >
                    <option value="">
                      {newOrderType !== 'DINE_IN'
                        ? 'Not required for this order type'
                        : newOrderLoadingRefs
                        ? 'Loading tables...'
                        : 'Select a table'}
                    </option>
                    {newOrderTables.filter((t) => t.status === 1).map((t) => (
                        <option key={t.id} value={t.id}>
                          Table {t.tableNumber} {t.capacity ? `· ${t.capacity} pax` : ''}
                        </option>
                      ))}
                  </select>
                  {newOrderType === 'DINE_IN' && !newOrderLoadingRefs && newOrderTables.filter((t) => t.status === 1).length === 0 && (
                    <p className="mt-1 text-xs text-slate-500">No available tables found.</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Items</h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-8">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Menu Item</label>
                    <select
                      value={newOrderSelectedMenuId}
                      onChange={(e) => setNewOrderSelectedMenuId(e.target.value)}
                      disabled={newOrderLoadingRefs}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 disabled:opacity-60"
                    >
                      <option value="">
                        {newOrderLoadingRefs ? 'Loading menu...' : 'Select an item'}
                      </option>
                      {newOrderMenus.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — ₱{Number(m.price).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={newOrderQty}
                      onChange={(e) => setNewOrderQty(Number(e.target.value))}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={addNewOrderItem}
                      disabled={newOrderLoadingRefs}
                      className="w-full px-3 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden bg-white">
                  {newOrderItems.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">No items added yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-bold text-slate-600">Item</th>
                          <th className="px-4 py-2 text-right font-bold text-slate-600">Qty</th>
                          <th className="px-4 py-2 text-right font-bold text-slate-600">Unit</th>
                          <th className="px-4 py-2 text-right font-bold text-slate-600">Total</th>
                          <th className="px-4 py-2 text-right font-bold text-slate-600">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {newOrderItems.map((it) => (
                          <tr key={it.menuId}>
                            <td className="px-4 py-2">{it.name}</td>
                            <td className="px-4 py-2 text-right">{it.qty}</td>
                            <td className="px-4 py-2 text-right">₱{Number(it.unitPrice).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right font-medium">₱{Number(it.qty * it.unitPrice).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeNewOrderItem(it.menuId)}
                                className="inline-flex items-center justify-center p-2 rounded-lg text-red-600 hover:bg-red-50"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                  <div className="text-sm text-slate-600">
                    Subtotal:{' '}
                    <span className="font-bold text-slate-900">₱{Number(newOrderSubtotal).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    Grand Total:{' '}
                    <span className="font-bold text-slate-900">₱{Number(newOrderGrandTotal).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeNewOrder}
                disabled={newOrderSubmitting}
                className="px-6 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitNewOrder}
                disabled={newOrderSubmitting}
                className="px-6 py-2.5 text-white bg-green-500 hover:bg-green-600 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {newOrderSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('order_no')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('table')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('type')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('total')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('date')}</th>
                {selectedBranchId === 'all' && (
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('branch')}</th>
                )}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={selectedBranchId === 'all' ? 8 : 7}
                    className="px-6 py-12 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>{t('loading_orders')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={selectedBranchId === 'all' ? 8 : 7}
                    className="px-6 py-16 text-center text-slate-500"
                  >
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{t('no_orders_found')}</p>
                    <p className="text-sm">{t('try_changing_filters')}</p>
                  </td>
                </tr>
              ) : (
                displayedOrders.map((order) => (
                  <tr
                    key={order.IDNo}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex-shrink-0">
                          <Receipt className="w-4 h-4" />
                        </span>
                        <span className="font-bold text-slate-900">{order.ORDER_NO}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {order.TABLE_NUMBER ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      {orderTypeBadge(order.ORDER_TYPE)}
                    </td>
                    <td className="px-6 py-4">{statusBadge(order.STATUS)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₱{Number(order.GRAND_TOTAL).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {order.ENCODED_DT
                        ? new Date(order.ENCODED_DT).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    {selectedBranchId === 'all' && (
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {order.BRANCH_NAME || order.BRANCH_CODE || '—'}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() => openDetail(order)}
                          className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                          title={t('view_details')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {order.STATUS !== ORDER_STATUS.SETTLED && order.STATUS !== ORDER_STATUS.CANCELLED && (
                          <>
                            <button
                              onClick={() => confirmUpdateStatus(order, ORDER_STATUS.SETTLED)}
                              disabled={statusSubmitting}
                              title={t('mark_as_settled')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmUpdateStatus(order, ORDER_STATUS.CANCELLED)}
                              disabled={statusSubmitting}
                              title={t('cancel_order')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <p className="text-xs font-medium text-slate-500">
              {t('showing')}{' '}
              <span className="text-slate-900 font-bold">
                {displayedOrders.length}
              </span>
              {' '}{t('of')}{' '}
              <span className="text-slate-900 font-bold">{filteredOrders.length}</span>
              {' '}{t('orders_label')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-slate-500">
              {t('items_per_page') || 'Items per page'}:
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={150}>150</option>
              <option value={200}>200</option>
              <option value={250}>250</option>
              <option value={300}>300</option>
              <option value={350}>350</option>
              <option value={400}>400</option>
              <option value={450}>450</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {detailOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <Receipt className="w-6 h-6 text-orange-500" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {t('order')} {detailOrder.ORDER_NO}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t('table')} {detailOrder.TABLE_NUMBER ?? '—'} · {detailOrder.BRANCH_NAME ?? ''}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDetail}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex flex-wrap gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{t('status')}</p>
                  <div className="mt-0.5">{statusBadge(detailOrder.STATUS)}</div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{t('grand_total')}</p>
                  <p className="font-bold text-slate-900">
                    ₱{Number(detailOrder.GRAND_TOTAL).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{t('subtotal')}</p>
                  <p className="text-slate-700">₱{Number(detailOrder.SUBTOTAL).toLocaleString()}</p>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-700 mb-2">{t('items')}</h3>
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : detailItems.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">{t('no_items')}</p>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold text-slate-600">{t('item')}</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-600">{t('qty')}</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-600">{t('unit')}</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-600">{t('total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detailItems.map((item) => (
                        <tr key={item.IDNo}>
                          <td className="px-4 py-2">{item.MENU_NAME ?? `Menu #${item.MENU_ID}`}</td>
                          <td className="px-4 py-2 text-right">{item.QTY}</td>
                          <td className="px-4 py-2 text-right">₱{Number(item.UNIT_PRICE).toLocaleString()}</td>
                          <td className="px-4 py-2 text-right font-medium">₱{Number(item.LINE_TOTAL).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SweetAlert-style popup */}
      {swal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
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
                  className="px-6 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                >
                  {swal.cancelText || t('cancel')}
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  if (swal.onConfirm) await swal.onConfirm();
                }}
                disabled={statusSubmitting}
                className={`px-6 py-2.5 text-white rounded-xl font-semibold flex items-center justify-center gap-2 ${
                  swal.confirmVariant === 'red'
                    ? 'bg-red-500 hover:bg-red-600'
                    : swal.confirmVariant === 'green'
                    ? 'bg-green-500 hover:bg-green-600'
                    : swal.type === 'error'
                    ? 'bg-red-500 hover:bg-red-600'
                    : swal.type === 'success'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                } disabled:opacity-50`}
              >
                {statusSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {swal.confirmText || t('ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
