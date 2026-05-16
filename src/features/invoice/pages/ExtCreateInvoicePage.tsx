import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import axios from '@/shared/api/axiosInstance';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Input from '@/shared/components/Input';
import Modal from '@/shared/components/Modal';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { DateInput } from '@/shared/components/inputs';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';
import { useQueryClient } from '@tanstack/react-query';
import {
  invoiceKeys,
  useGetEligibleAssignments,
  useGetInvoiceById,
  useCreateInvoice,
  useUpdateInvoiceDraft,
  useSubmitInvoice,
} from '../api/invoice';
import type { EligibleAssignment } from '../types/invoice';
import toast from 'react-hot-toast';

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

const toDateOnly = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : undefined);

// Debounce helper
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

interface ExtCreateInvoicePageProps {
  /** When provided the page operates in edit mode for an existing Pending draft */
  editId?: string;
}

const ExtCreateInvoicePageInner = ({ editId }: ExtCreateInvoicePageProps) => {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation('invoice');
  useBreadcrumb(editId ? t('maintenance.editTitle') : t('maintenance.createTitle'));

  // ─── Edit mode: hydrate from existing invoice ─────────────────────────────
  const { data: existingInvoice } = useGetInvoiceById(editId ?? null);

  // ─── Invoice id for this session ─────────────────────────────────────────
  // null = brand-new unsaved, string = created (either editId or newly created)
  const [invoiceId, setInvoiceId] = useState<string | null>(editId ?? null);

  // ─── Search filters for left pane ─────────────────────────────────────────
  const [searchAppraisalNo, setSearchAppraisalNo] = useState('');
  const [submittedDateFrom, setSubmittedDateFrom] = useState<string | null>(null);
  const [submittedDateTo, setSubmittedDateTo] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchAppraisalNo, 300);

  const { data: assignments = [], isLoading: isLoadingAssignments } = useGetEligibleAssignments({
    searchAppraisalNo: debouncedSearch || undefined,
    submittedDateFrom: toDateOnly(submittedDateFrom),
    submittedDateTo: toDateOnly(submittedDateTo),
    currentInvoiceId: invoiceId ?? undefined,
  });

  // ─── Selection state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedAssignments, setSelectedAssignments] = useState<EligibleAssignment[]>([]);

  // Pre-check items when editing
  useEffect(() => {
    if (existingInvoice && editId) {
      const ids = new Set(existingInvoice.items.map(i => i.assignmentId));
      setSelectedIds(ids);
    }
  }, [existingInvoice, editId]);

  // ─── Invoice number input ─────────────────────────────────────────────────
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceNumberError, setInvoiceNumberError] = useState<string | null>(null);

  // Hydrate invoice number from existing invoice
  useEffect(() => {
    if (existingInvoice?.invoiceNumber) {
      setInvoiceNumber(existingInvoice.invoiceNumber);
    }
  }, [existingInvoice]);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const queryClient = useQueryClient();
  const { mutateAsync: createInvoice } = useCreateInvoice();
  const { mutateAsync: updateDraft } = useUpdateInvoiceDraft(invoiceId ?? '');
  const { mutateAsync: submitInvoice, isPending: isSubmitting } = useSubmitInvoice();

  const [isSaving, setIsSaving] = useState(false);

  // ─── Keep selectedAssignments in sync with selectedIds + assignments list ─
  useEffect(() => {
    setSelectedAssignments(prev => {
      // Preserve assignments already in the list even if not in current page filter
      const existingMap = new Map(prev.map(a => [a.assignmentId, a]));
      const assignmentMap = new Map(assignments.map(a => [a.assignmentId, a]));
      const next: EligibleAssignment[] = [];
      for (const id of selectedIds) {
        const a = assignmentMap.get(id) ?? existingMap.get(id);
        if (a) next.push(a);
      }
      return next;
    });
  }, [selectedIds, assignments]);

  // ─── Selection toggles (local state only; persisted on Save Draft / Submit) ─
  const toggleItem = (assignment: EligibleAssignment) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(assignment.assignmentId)) {
        next.delete(assignment.assignmentId);
      } else {
        next.add(assignment.assignmentId);
      }
      return next;
    });
  };

  const removeFromDraft = (assignmentId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(assignmentId);
      return next;
    });
  };

  const allSelected =
    assignments.length > 0 && assignments.every(a => selectedIds.has(a.assignmentId));
  const someSelected = assignments.some(a => selectedIds.has(a.assignmentId)) && !allSelected;

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        assignments.forEach(a => next.delete(a.assignmentId));
      } else {
        assignments.forEach(a => next.add(a.assignmentId));
      }
      return next;
    });
  };

  // Persist items + invoice number for the current state. Creates the invoice
  // on first save; updates the existing draft on subsequent saves / edit mode.
  // Returns the invoice id (newly created or existing).
  const persistDraft = async (): Promise<string> => {
    let id = invoiceId;
    if (!id) {
      const result = await createInvoice({ assignmentIds: Array.from(selectedIds) });
      id = result.invoiceId;
      setInvoiceId(id);
    } else {
      await updateDraft({ assignmentIds: Array.from(selectedIds) });
    }
    if (invoiceNumber.trim()) {
      await axios.patch(`/invoices/${id}/number`, { invoiceNumber: invoiceNumber.trim() });
    }
    // Direct axios calls bypass React Query mutation hooks, so invalidate
    // manually to make sure the detail/list pages re-fetch fresh data.
    queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    return id;
  };

  const totalAmount = selectedAssignments.reduce((s, a) => s + a.bankAbsorbAmount, 0);

  // ─── Mobile drawer toggle ─────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ─── Save draft ───────────────────────────────────────────────────────────
  // Drafts can be empty (no items, blank invoice number) — only the Submit
  // path enforces the "must have items + invoice number" rule.
  const handleSaveDraft = async () => {
    setInvoiceNumberError(null);
    setIsSaving(true);
    try {
      await persistDraft();
      toast.success(t('draft.savedDraft'));
      navigate('/ext/invoices');
    } catch (err) {
      const axiosErr = err as AxiosError<{ status: number }>;
      if (axiosErr?.response?.status === 409) {
        setInvoiceNumberError(t('errors.duplicateNumber'));
      } else {
        toast.error(t('errors.saveFailed'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      toast.error(t('draft.selectFirst'));
      return;
    }
    if (!invoiceNumber.trim()) {
      setInvoiceNumberError(t('errors.duplicateNumber'));
      return;
    }
    setInvoiceNumberError(null);
    try {
      const id = await persistDraft();
      await submitInvoice({ id, invoiceNumber: invoiceNumber.trim() });
      toast.success(t('draft.submitted'));
      navigate('/ext/invoices');
    } catch (err) {
      const axiosErr = err as AxiosError<{ status: number }>;
      if (axiosErr?.response?.status === 409) {
        setInvoiceNumberError(t('errors.duplicateNumber'));
      } else {
        toast.error(t('errors.submitFailed'));
      }
    }
  };

  const feePaymentMethods = useParametersByGroup('FeePaymentMethod');
  const getFeePaymentMethodLabel = (code: string | null): string => {
    if (!code) return '—';
    return feePaymentMethods.find(p => p.code === code)?.description ?? code;
  };

  // ─── Right pane — styled as an invoice paper ─────────────────────────────
  const rightPane = (
    <div className="flex flex-col gap-3 h-full">
      {/* Invoice paper */}
      <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-primary shrink-0" />

        {/* Paper header */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-dashed border-gray-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-primary tracking-[0.25em] uppercase">
                Invoice
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {existingInvoice?.submittedAt
                  ? formatLocaleDate(existingInvoice.submittedAt, i18n.language)
                  : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Items</p>
              <p className="text-sm font-semibold text-gray-900 tabular-nums">
                {selectedAssignments.length}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">
              {t('maintenance.invoiceNumber')}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={e => {
                setInvoiceNumber(e.target.value);
                setInvoiceNumberError(null);
              }}
              maxLength={20}
              placeholder={t('maintenance.invoiceNumberPlaceholder')}
              className={`w-full bg-transparent text-base font-bold text-gray-900 border-0 border-b pb-1 outline-none placeholder:font-normal placeholder:text-gray-300 ${invoiceNumberError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-primary'}`}
            />
            {invoiceNumberError && (
              <p className="text-xs text-red-500 mt-1">{invoiceNumberError}</p>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="flex-1 overflow-auto min-h-0">
          {selectedAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6 py-8">
              <Icon style="regular" name="receipt" className="size-10 text-gray-200" />
              <p className="text-xs text-gray-400">{t('draft.noItemsHint')}</p>
            </div>
          ) : (
            <div className="px-6 py-2 divide-y divide-gray-100">
              {selectedAssignments.map((a, idx) => (
                <div
                  key={a.assignmentId}
                  className="flex items-start justify-between gap-3 py-2.5 group"
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className="text-[10px] text-gray-400 tabular-nums shrink-0 mt-1 w-4 text-right">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {a.appraisalNumber ?? '—'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {a.customerName ?? '—'}
                      </p>
                      {a.submittedDate && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatLocaleDate(a.submittedDate, i18n.language)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-1 shrink-0">
                    <span className="text-xs font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(a.bankAbsorbAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromDraft(a.assignmentId)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 -mt-0.5 text-gray-300 hover:text-red-500 transition-all"
                      aria-label={t('maintenance.delete')}
                    >
                      <Icon style="solid" name="xmark" className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        <div className="shrink-0 px-6 py-4 border-t-2 border-double border-gray-300 bg-gray-50/50">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
              {t('maintenance.totalAmount')}
            </span>
            <span className="text-2xl font-bold text-primary tabular-nums">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Auto-save indicator strip */}
        {isSaving && (
          <div className="shrink-0 flex items-center justify-center gap-1.5 px-6 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400">
            <Icon style="solid" name="spinner" className="size-3 animate-spin" />
            {t('draft.saving')}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex flex-col gap-2">
        <Button
          variant="primary"
          size="sm"
          fullWidth
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={
            selectedAssignments.length === 0 || !invoiceNumber.trim() || isSubmitting
          }
        >
          {t('maintenance.saveAndSubmit')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          fullWidth
          onClick={handleSaveDraft}
          isLoading={isSaving}
          disabled={isSaving || isSubmitting}
        >
          {t('maintenance.saveDraft')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() => navigate('/ext/invoices')}
          disabled={isSubmitting}
        >
          {t('maintenance.cancel')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Page header — breadcrumb (rendered by Layout) handles navigation back */}
      <div className="shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">
          {editId ? t('maintenance.editTitle') : t('maintenance.createTitle')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('maintenance.subtitle')}</p>
      </div>

      {/* Two-pane layout */}
      <div className="flex-1 min-h-0 flex gap-4 relative">
        {/* Left pane — Appraisal book listing */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Left pane header / search */}
          <div className="shrink-0 flex items-end gap-3 px-4 py-3 border-b border-gray-100 flex-wrap">
            <div className="flex-1 max-w-xs">
              <Input
                placeholder={t('book.searchPlaceholder')}
                value={searchAppraisalNo}
                onChange={e => setSearchAppraisalNo(e.target.value)}
                leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3.5" />}
              />
            </div>
            <div className="w-36">
              <DateInput
                label={t('book.submittedFrom')}
                value={submittedDateFrom}
                onChange={setSubmittedDateFrom}
                placeholder="dd/mm/yyyy"
              />
            </div>
            <div className="w-36">
              <DateInput
                label={t('book.submittedTo')}
                value={submittedDateTo}
                onChange={setSubmittedDateTo}
                placeholder="dd/mm/yyyy"
              />
            </div>
            {(searchAppraisalNo || submittedDateFrom || submittedDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchAppraisalNo('');
                  setSubmittedDateFrom(null);
                  setSubmittedDateTo(null);
                }}
              >
                <Icon style="regular" name="xmark" className="size-3.5 mr-1" />
                {t('list.clearFilters')}
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2.5 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleSelectAll}
                      disabled={assignments.length === 0}
                      className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                    />
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap text-xs">
                    {t('book.col.appraisalReportNo')}
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 text-xs">
                    {t('book.col.customerName')}
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 text-xs">
                    {t('book.col.feePaymentMethod')}
                  </th>
                  <th className="text-right font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap text-xs">
                    {t('book.col.feeAmount')}
                  </th>
                  <th className="text-right font-medium text-gray-600 px-3 py-2.5 text-xs">
                    {t('book.col.vat')}
                  </th>
                  <th className="text-right font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap text-xs">
                    {t('book.col.totalAmount')}
                  </th>
                  <th className="text-right font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap text-xs">
                    {t('book.col.payPartialAmount')}
                  </th>
                  <th className="text-right font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap text-xs">
                    {t('book.col.bankAbsorbAmount')}
                  </th>
                  <th className="text-right font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap text-xs">
                    {t('book.col.remainingFee')}
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap text-xs">
                    {t('book.col.lastPaymentDate')}
                  </th>
                  <th className="text-left font-medium text-gray-600 px-3 py-2.5 whitespace-nowrap text-xs">
                    {t('book.col.submittedDate')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoadingAssignments ? (
                  <TableRowSkeleton
                    columns={[
                      { width: 'w-6' },
                      { width: 'w-24' },
                      { width: 'w-32' },
                      { width: 'w-28' },
                      { width: 'w-20' },
                      { width: 'w-10' },
                      { width: 'w-20' },
                      { width: 'w-20' },
                      { width: 'w-20' },
                      { width: 'w-20' },
                      { width: 'w-20' },
                      { width: 'w-20' },
                    ]}
                    rows={5}
                  />
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Icon style="regular" name="folder-open" className="size-8 text-gray-300" />
                        <p className="text-xs text-gray-500">{t('book.empty')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  assignments.map(item => {
                    const isSelected = selectedIds.has(item.assignmentId);
                    return (
                      <tr
                        key={item.assignmentId}
                        onClick={() => toggleItem(item)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-gray-50 even:bg-gray-50/50'}`}
                      >
                        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItem(item)}
                            className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-primary whitespace-nowrap text-xs">
                          {item.appraisalNumber ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 text-xs">{item.customerName ?? '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600 text-xs max-w-36 truncate" title={getFeePaymentMethodLabel(item.feePaymentType)}>
                          {getFeePaymentMethodLabel(item.feePaymentType)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap text-xs">
                          {formatCurrency(item.feeBeforeVAT)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">
                          {formatCurrency(item.vatAmount)}{' '}
                          <span className="text-gray-400">({item.vatRate}%)</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-gray-900 tabular-nums whitespace-nowrap text-xs">
                          {formatCurrency(item.totalFeeAfterVAT)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">
                          {formatCurrency(item.payPartialAmount)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">
                          {formatCurrency(item.bankAbsorbAmount)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">
                          {formatCurrency(item.remainingFee)}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap text-xs">
                          {item.lastPaymentDate
                            ? formatLocaleDate(item.lastPaymentDate, i18n.language)
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap text-xs">
                          {item.submittedDate
                            ? formatLocaleDate(item.submittedDate, i18n.language)
                            : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right pane — Desktop (lg+) */}
        <div className="hidden lg:flex w-[400px] shrink-0 flex-col bg-white rounded-lg border border-gray-200 p-4 overflow-hidden">
          {rightPane}
        </div>
      </div>

      {/* Mobile: sticky "Invoice Draft (N)" button */}
      <div className="lg:hidden shrink-0">
        <Button
          variant="primary"
          size="sm"
          fullWidth
          onClick={() => setDrawerOpen(true)}
          leftIcon={<Icon style="solid" name="file-invoice" className="size-3.5" />}
        >
          {t('draft.title')} ({selectedAssignments.length})
        </Button>
      </div>

      {/* Mobile drawer */}
      <Modal
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`${t('draft.title')} (${selectedAssignments.length})`}
        size="md"
      >
        <div className="h-[70vh] overflow-hidden flex flex-col">
          {rightPane}
        </div>
      </Modal>
    </div>
  );
};

/**
 * Wrapper that reads the optional :id param and passes it as editId.
 * Used for both /ext/invoices/new and /ext/invoices/:id/edit routes.
 */
const ExtCreateInvoicePage = () => {
  const { id } = useParams<{ id?: string }>();
  return <ExtCreateInvoicePageInner editId={id} key={id ?? 'new'} />;
};

export default ExtCreateInvoicePage;
