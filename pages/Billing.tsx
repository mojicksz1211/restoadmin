import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  RefreshCw,
  Receipt,
  Loader2,
  Eye,
  DollarSign,
  X,
  AlertCircle,
  Banknote,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  getBillings,
  getBillingByOrderId,
  getPaymentHistory,
  updateBilling,
  getBillingStatusLabel,
  BILLING_STATUS,
  type BillingRecord,
  type BillingDetail,
  type PaymentTransaction,
  type UpdateBillingPayload,
} from '../services/billingService';
import { getBranches } from '../services/branchService';
import type { BranchRecord } from '../types';

interface BillingProps {
  selectedBranchId: string;
}

const PAYMENT_METHODS = ['CASH', 'GCASH', 'MAYA', 'CARD'] as const;

const Billing: React.FC<BillingProps> = ({ selectedBranchId }) => {
  const { t } = useTranslation('common');
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [detailBilling, setDetailBilling] = useState<BillingDetail | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransaction[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [payFullBalance, setPayFullBalance] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const paymentMethodDropdownRef = useRef<HTMLDivElement>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const loadBillings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBillings(selectedBranchId);
      setBillings(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load billing records');
      setBillings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadBillings();
  }, [loadBillings]);

  useEffect(() => {
    getBranches().then(setBranches).catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    if (detailBilling && detailBilling.status !== BILLING_STATUS.PAID) {
      const bal = Math.max(0, Number(detailBilling.amountDue) - Number(detailBilling.amountPaid));
      if (payFullBalance) setPaymentAmount(bal.toFixed(2));
    }
  }, [detailBilling, payFullBalance]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paymentMethodDropdownRef.current && !paymentMethodDropdownRef.current.contains(e.target as Node)) {
        setPaymentMethodOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBillings = billings.filter((b) => {
    const matchSearch =
      b.orderNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.branchName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredBillings.length / itemsPerPage));
  const pageSafe = Math.min(currentPage, totalPages);
  const startIdx = (pageSafe - 1) * itemsPerPage;
  const paginatedBillings = filteredBillings.slice(startIdx, startIdx + itemsPerPage);

  const currentBranchName =
    selectedBranchId === 'all'
      ? t('all_branches')
      : branches.find((b) => b.id === selectedBranchId)?.name ?? '';

  const openDetail = async (orderId: number, forRecordPayment = false) => {
    const id = String(orderId);
    setDetailOrderId(id);
    setRecordPaymentModalOpen(forRecordPayment);
    setDetailBilling(null);
    setPaymentHistory([]);
    setDetailLoading(true);
    setPaymentAmount('');
    setPayFullBalance(true);
    setPaymentMethod('CASH');
    setPaymentRef('');
    setPaymentSuccess(false);
    try {
      const [billing, history] = await Promise.all([
        getBillingByOrderId(id),
        getPaymentHistory(id),
      ]);
      setDetailBilling(billing ?? null);
      setPaymentHistory(Array.isArray(history) ? history : []);
    } catch {
      setDetailBilling(null);
      setPaymentHistory([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOrderId(null);
    setRecordPaymentModalOpen(false);
    setDetailBilling(null);
    setPaymentHistory([]);
  };

  const handleRecordPayment = async () => {
    if (!detailOrderId || !detailBilling) return;
    const amount = parseFloat(payFullBalance ? String(balanceFromDetail) : paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setPaymentSubmitting(true);
    try {
      const payload: UpdateBillingPayload = {
        amount_paid: amount,
        payment_method: paymentMethod,
        payment_ref: paymentRef.trim() || null,
      };
      await updateBilling(detailOrderId, payload);
      setPaymentSuccess(true);
      setPaymentAmount('');
      setPaymentRef('');
      setRecordPaymentModalOpen(false);
      const [billing, history] = await Promise.all([
        getBillingByOrderId(detailOrderId),
        getPaymentHistory(detailOrderId),
      ]);
      setDetailBilling(billing ?? null);
      setPaymentHistory(Array.isArray(history) ? history : []);
      loadBillings();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const balanceFromDetail = detailBilling
    ? Math.max(0, Number(detailBilling.amountDue) - Number(detailBilling.amountPaid))
    : 0;

  const statusBadge = (status: number) => {
    const label = getBillingStatusLabel(status);
    const cls =
      status === BILLING_STATUS.PAID
        ? 'bg-green-100 text-green-700'
        : status === BILLING_STATUS.PARTIAL
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-700';
    return <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold ${cls}`}>{label}</span>;
  };

  const paymentMethodBadge = (method: string | null | undefined) => {
    const value = (method || '').trim().toUpperCase();
    const label = value || '—';
    const cls =
      value === 'CASH'
        ? 'bg-emerald-100 text-emerald-700'
        : value === 'GCASH'
          ? 'bg-blue-100 text-blue-700'
          : value === 'MAYA'
            ? 'bg-violet-100 text-violet-700'
            : value === 'CARD'
              ? 'bg-amber-100 text-amber-700'
              : value && value !== '—'
                ? 'bg-slate-100 text-slate-700'
                : '';
    if (!cls) return <span className="text-slate-400 text-sm">—</span>;
    return <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold ${cls}`}>{label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('billing')}</h1>
          <p className="text-slate-500">
            {t('billing_subtitle') || 'View and record payments.'}{' '}
            <span className="text-orange-600 font-semibold">{currentBranchName}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadBillings()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('reset')}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_placeholder') || 'Search...'}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('order_no') || 'Order No'}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('branch')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('payment_method') || 'Payment Method'}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('amount_due') || 'Amount Due'}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('amount_paid') || 'Amount Paid'}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('reference') || 'Ref'}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status') || 'Status'}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('encoded_at') || 'Encoded At'}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('encoded_by') || 'Encoded By'}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t('actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedBillings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-slate-500">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{t('no_billing_found') || 'No billing records found.'}</p>
                    <p className="text-sm">{t('try_changing_filters') || 'Try changing filters or search.'}</p>
                  </td>
                </tr>
              ) : (
                paginatedBillings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex-shrink-0">
                          <Receipt className="w-4 h-4" />
                        </span>
                        <span className="font-bold text-slate-900">{b.orderNo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {b.branchName || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {paymentMethodBadge(b.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₱{Number(b.amountDue).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₱{Number(b.amountPaid).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {b.paymentRef || '—'}
                    </td>
                    <td className="px-6 py-4">{statusBadge(b.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {b.encodedDt
                        ? new Date(b.encodedDt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {b.encodedByName || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openDetail(b.orderId, false)}
                          title={t('view') || 'View'}
                          className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {b.status !== BILLING_STATUS.PAID && (
                          <button
                            type="button"
                            onClick={() => openDetail(b.orderId, true)}
                            title={t('record_payment') || 'Record Payment'}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          >
                            <Banknote className="w-4 h-4" />
                          </button>
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
                {filteredBillings.length === 0 ? 0 : startIdx + 1}
              </span>
              {' – '}
              <span className="text-slate-900 font-bold">
                {Math.min(startIdx + itemsPerPage, filteredBillings.length)}
              </span>
              {' '}{t('of')}{' '}
              <span className="text-slate-900 font-bold">{filteredBillings.length}</span>
              {' '}{t('records') || 'records'}
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

      {/* Detail modal (View) or Record Payment modal */}
      {detailOrderId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full transition-[min-height,max-height] duration-200 ${paymentMethodOpen ? 'min-h-[75vh] max-h-[90vh] overflow-hidden' : 'min-h-0 max-h-[85vh] overflow-y-auto'}`}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {recordPaymentModalOpen
                      ? `${t('record_payment') || 'Record Payment'} – ${detailBilling?.orderNo ?? detailOrderId}`
                      : `${t('billing')} – ${detailBilling?.orderNo ?? detailOrderId}`}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {recordPaymentModalOpen
                      ? (t('enter_payment_details') || 'Enter payment details')
                      : (t('view_payment_details') || 'View and record payments')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="flex items-center gap-2 text-slate-500 py-8">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('loading')}</span>
                </div>
              ) : detailBilling ? (
                recordPaymentModalOpen ? (
                  /* Record Payment form only */
                  <>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">{t('amount_due') || 'Amount Due'}:</span>
                        <span className="font-bold text-slate-900">₱{Number(detailBilling.amountDue).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t('balance') || 'Balance'}:</span>
                        <span className="font-bold text-slate-900">₱{balanceFromDetail.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={payFullBalance}
                          onChange={(e) => {
                            setPayFullBalance(e.target.checked);
                            if (e.target.checked && detailBilling) {
                              const bal = Math.max(0, Number(detailBilling.amountDue) - Number(detailBilling.amountPaid));
                              setPaymentAmount(bal.toFixed(2));
                            } else setPaymentAmount('');
                          }}
                          className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-slate-700">{t('pay_full_balance') || 'Pay full balance'}</span>
                      </label>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('amount') || 'Amount'} (₱)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={payFullBalance ? balanceFromDetail.toFixed(2) : paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          readOnly={payFullBalance}
                          className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${payFullBalance ? 'bg-slate-100 text-slate-700' : 'bg-slate-50'}`}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('payment_method') || 'Payment Method'}</label>
                        <div className="relative" ref={paymentMethodDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setPaymentMethodOpen((o) => !o)}
                            className="w-full flex items-center justify-between pl-4 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium hover:bg-slate-100 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white focus:outline-none transition-colors"
                          >
                            <span>{paymentMethod}</span>
                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${paymentMethodOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {paymentMethodOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 py-1.5 rounded-xl border border-slate-200 bg-white shadow-lg z-50 overflow-visible overflow-y-visible min-h-0">
                              {PAYMENT_METHODS.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => {
                                    setPaymentMethod(m);
                                    setPaymentMethodOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                                    paymentMethod === m
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('reference') || 'Reference'} ({t('optional') || 'Optional'})</label>
                        <input
                          type="text"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-orange-500/20"
                          placeholder="Ref no."
                        />
                      </div>
                      {paymentSuccess && (
                        <div className="p-3 rounded-xl bg-green-50 text-green-700 text-sm font-medium">
                          {t('payment_recorded') || 'Payment recorded successfully.'}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleRecordPayment}
                        disabled={paymentSubmitting || (payFullBalance ? balanceFromDetail <= 0 : !paymentAmount || parseFloat(paymentAmount) <= 0)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50"
                      >
                        {paymentSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        <Banknote className="w-4 h-4" />
                        {t('record_payment') || 'Record Payment'}
                      </button>
                    </div>
                  </>
                ) : (
                  /* View only: summary + payment history */
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">{t('amount_due') || 'Amount Due'}</p>
                        <p className="text-xl font-bold text-slate-900">₱{Number(detailBilling.amountDue).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">{t('amount_paid') || 'Amount Paid'}</p>
                        <p className="text-xl font-bold text-green-600">₱{Number(detailBilling.amountPaid).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">{t('status') || 'Status'}</p>
                        {statusBadge(detailBilling.status)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">{t('balance') || 'Balance'}</p>
                        <p className="text-lg font-semibold text-slate-800">
                          ₱{Math.max(0, Number(detailBilling.amountDue) - Number(detailBilling.amountPaid)).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {paymentHistory.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">{t('payment_history') || 'Payment History'}</h3>
                        <ul className="space-y-2">
                          {paymentHistory.map((tx, i) => (
                            <li key={tx.IDNo ?? i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 text-sm">
                              <span className="text-slate-600">{tx.PAYMENT_METHOD ?? 'CASH'} {tx.PAYMENT_REF ? `· ${tx.PAYMENT_REF}` : ''}</span>
                              <span className="font-semibold text-slate-900">₱{Number(tx.AMOUNT_PAID ?? 0).toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {paymentSuccess && (
                      <div className="p-3 rounded-xl bg-green-50 text-green-700 text-sm font-medium">
                        {t('payment_recorded') || 'Payment recorded successfully.'}
                      </div>
                    )}
                  </>
                )
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
