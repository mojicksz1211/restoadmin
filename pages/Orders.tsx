import React, { useState, useEffect, useCallback } from 'react';
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
  ChevronRight,
  XCircle,
} from 'lucide-react';
import {
  getOrders,
  getOrderItems,
  updateOrderStatus,
  getOrderStatusLabel,
  ORDER_STATUS,
  type OrderRecord,
  type OrderItemRecord,
} from '../services/orderService';
import { getBranches } from '../services/branchService';
import type { BranchRecord } from '../types';

interface OrdersProps {
  selectedBranchId: string;
}

type SwalState = {
  type: 'question' | 'success' | 'error' | 'warning';
  title: string;
  text: string;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
} | null;

const Orders: React.FC<OrdersProps> = ({ selectedBranchId }) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [detailOrder, setDetailOrder] = useState<OrderRecord | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItemRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [swal, setSwal] = useState<SwalState>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrders(selectedBranchId);
      setOrders(data);
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
      ? 'All Branches'
      : branches.find((b) => b.id === selectedBranchId)?.name ?? 'Branch';

  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      statusFilter === 'all' || String(order.STATUS) === statusFilter;
    const matchSearch =
      !searchTerm.trim() ||
      order.ORDER_NO.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.TABLE_NUMBER && order.TABLE_NUMBER.toString().includes(searchTerm));
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const pageSafe = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (pageSafe - 1) * itemsPerPage,
    pageSafe * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, orders.length]);

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

  const confirmUpdateStatus = (order: OrderRecord, newStatus: number) => {
    const label = getOrderStatusLabel(newStatus);
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
            title: 'Error!',
            text: e instanceof Error ? e.message : 'Failed to update status',
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
        ? 'Dine-in'
        : normalized === 'TAKE_OUT'
        ? 'Take out'
        : normalized === 'DELIVERY'
        ? 'Delivery'
        : normalized === 'PICKUP'
        ? 'Pickup'
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
          <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500">
            Orders for <span className="text-orange-600 font-semibold">{currentBranchName}</span>.
          </p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search order no, table..."
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
            <option value="all">All statuses</option>
            <option value={ORDER_STATUS.PENDING}>Pending</option>
            <option value={ORDER_STATUS.CONFIRMED}>Confirmed</option>
            <option value={ORDER_STATUS.SETTLED}>Settled</option>
            <option value={ORDER_STATUS.CANCELLED}>Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Unable to load orders</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Order No</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Table</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                {selectedBranchId === 'all' && (
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch</th>
                )}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
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
                      <span>Loading orders...</span>
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
                    <p className="font-medium">No orders found</p>
                    <p className="text-sm">Try changing filters or branch.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
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
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {order.STATUS !== ORDER_STATUS.SETTLED && order.STATUS !== ORDER_STATUS.CANCELLED && (
                          <>
                            <button
                              onClick={() => confirmUpdateStatus(order, ORDER_STATUS.SETTLED)}
                              disabled={statusSubmitting}
                              title="Mark as Settled"
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => confirmUpdateStatus(order, ORDER_STATUS.CANCELLED)}
                              disabled={statusSubmitting}
                              title="Cancel Order"
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
              Showing{' '}
              <span className="text-slate-900 font-bold">
                {filteredOrders.length === 0
                  ? 0
                  : (pageSafe - 1) * itemsPerPage + 1}
              </span>
              {' – '}
              <span className="text-slate-900 font-bold">
                {Math.min(pageSafe * itemsPerPage, filteredOrders.length)}
              </span>
              {' of '}
              <span className="text-slate-900 font-bold">{filteredOrders.length}</span>
              {' orders'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold shadow-sm transition-all ${
                    p === pageSafe
                      ? 'bg-orange-500 text-white shadow-orange-500/20'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
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
                    Order {detailOrder.ORDER_NO}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Table {detailOrder.TABLE_NUMBER ?? '—'} · {detailOrder.BRANCH_NAME ?? ''}
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                  <div className="mt-0.5">{statusBadge(detailOrder.STATUS)}</div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Grand Total</p>
                  <p className="font-bold text-slate-900">
                    ₱{Number(detailOrder.GRAND_TOTAL).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Subtotal</p>
                  <p className="text-slate-700">₱{Number(detailOrder.SUBTOTAL).toLocaleString()}</p>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-700 mb-2">Items</h3>
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : detailItems.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No items.</p>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold text-slate-600">Item</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-600">Qty</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-600">Unit</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-600">Total</th>
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
                  {swal.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  if (swal.onConfirm) await swal.onConfirm();
                }}
                disabled={statusSubmitting}
                className={`px-6 py-2.5 text-white rounded-xl font-semibold flex items-center justify-center gap-2 ${
                  swal.type === 'error'
                    ? 'bg-red-500 hover:bg-red-600'
                    : swal.type === 'success'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                } disabled:opacity-50`}
              >
                {statusSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {swal.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
