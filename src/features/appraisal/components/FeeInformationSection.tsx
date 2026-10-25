import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Dropdown from '@shared/components/inputs/Dropdown';
import NumberInput from '@shared/components/inputs/NumberInput';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import type { FeeItem } from '../types/appointmentAndFee';
import { VAT_PERCENTAGE } from '../types/appointmentAndFee';
import { useFeeTypeLabel } from '../utils/useFeeTypeLabel';
import type { AppraisalFeeItem } from '../api/fee';
import AddFeeModal from './AddFeeModal';
import AdminFeeBadge from './AdminFeeBadge';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

export const BANK_ABSORB_FEE_TYPES = ['04'];
/** Fee types for which the bank absorbs the entire fee amount automatically (not user-editable). */
export const FULL_BANK_ABSORB_FEE_TYPES = ['05', '06', '07'];
/** Fee types for which the bank-absorb amount input is shown (required for '04', optional for '99'). */
const BANK_ABSORB_SHOW_TYPES = ['04', '99'];

interface FeeInformationSectionProps {
  items: AppraisalFeeItem[];
  vatRate?: number;
  feePaymentType?: string | null;
  onUpdateFeePaymentType?: (value: string) => void;
  /** Resolves false when nothing was sent (the caller says why): the modal stays open. */
  onAddFeeItem?: (data: {
    feeCode: string;
    feeDescription: string;
    feeAmount: number;
  }) => Promise<void | boolean>;
  onUpdateFeeItem?: (
    feeId: string,
    feeItemId: string,
    data: { feeCode: string; feeDescription: string; feeAmount: number },
  ) => Promise<void>;
  onRemoveFeeItem?: (feeId: string, feeItemId: string) => Promise<void>;
  onApproveFeeItem?: (feeId: string, itemId: string) => void;
  onRejectFeeItem?: (feeId: string, itemId: string, reason: string) => void;
  isFeePaymentTypeUpdating?: boolean;
  /**
   * When true, all add/edit/remove fee actions are disabled (approval is awaiting bank review).
   */
  editLocked?: boolean;

  /**
   * Show the Construction Inspection Fee input. Driven by the backend's
   * AppraisalFeeDto.hasBuildingUnderConstruction flag (true when at least one
   * Building or Land+Building property has IsUnderConstruction=true).
   */
  showConstructionInspectionFee?: boolean;
  constructionInspectionFeeAmount?: number | null;
  onUpdateConstructionInspectionFee?: (amount: number | null) => Promise<void>;
  isConstructionInspectionFeeUpdating?: boolean;
  totalFeePaid?: number | null;

  /** Bank-absorb amount input — shown when feePaymentType ∈ ['04','99']. */
  bankAbsorbAmount?: number | null;
  /** Upper bound for the absorb input (totalFeeAfterVAT from backend). */
  totalFeeAfterVAT?: number;
  /** Called on blur when the value has changed; returns Promise so the section can rollback on error. */
  onUpdateBankAbsorbAmount?: (amount: number) => Promise<void>;
  isAbsorbAmountUpdating?: boolean;
}

/**
 * Fee Information section with fee type dropdown and editable fee table
 */
export default function FeeInformationSection({
  items,
  vatRate: vatRateProp,
  feePaymentType,
  onUpdateFeePaymentType,
  onAddFeeItem,
  onUpdateFeeItem,
  onRemoveFeeItem,
  onApproveFeeItem,
  onRejectFeeItem,
  isFeePaymentTypeUpdating,
  editLocked = false,
  showConstructionInspectionFee = false,
  constructionInspectionFeeAmount = null,
  onUpdateConstructionInspectionFee,
  isConstructionInspectionFeeUpdating,
  totalFeePaid,
  bankAbsorbAmount = null,
  totalFeeAfterVAT,
  onUpdateBankAbsorbAmount,
  isAbsorbAmountUpdating,
}: FeeInformationSectionProps) {
  const { t } = useTranslation('appraisal');
  const readOnly = usePageReadOnly();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // By id, not list position: the list can reorder or shrink between opening a dialog and
  // confirming it (a refetch after the previous add/edit/delete lands late), and a position would
  // then point at another item.
  const [editingFee, setEditingFee] = useState<{ id: string; data: FeeItem } | null>(null);
  const [deletingFeeId, setDeletingFeeId] = useState<string | null>(null);

  const [ciFeeDraft, setCiFeeDraft] = useState<number | null>(constructionInspectionFeeAmount);
  useEffect(() => {
    setCiFeeDraft(constructionInspectionFeeAmount);
  }, [constructionInspectionFeeAmount]);

  const handleCiFeeBlur = async () => {
    if (!onUpdateConstructionInspectionFee) return;
    if (ciFeeDraft === constructionInspectionFeeAmount) return;
    try {
      await onUpdateConstructionInspectionFee(ciFeeDraft);
      toast.success(t('fee.toasts.ciFeesSaved'));
    } catch (error: any) {
      toast.error(error?.apiError?.detail || t('fee.toasts.ciFeesFailed'));
      setCiFeeDraft(constructionInspectionFeeAmount); // rollback
    }
  };

  const [absorbDraft, setAbsorbDraft] = useState<number | null>(bankAbsorbAmount);
  useEffect(() => {
    setAbsorbDraft(bankAbsorbAmount);
  }, [bankAbsorbAmount]);

  const showAbsorbInput = BANK_ABSORB_SHOW_TYPES.includes(feePaymentType ?? '');
  const absorbRequired = BANK_ABSORB_FEE_TYPES.includes(feePaymentType ?? '');

  const handleAbsorbBlur = async () => {
    if (!onUpdateBankAbsorbAmount) return;
    const amount = absorbDraft ?? 0;
    if (amount === (bankAbsorbAmount ?? 0)) return;
    try {
      await onUpdateBankAbsorbAmount(amount);
      toast.success(t('fee.toasts.absorbAmountSaved'));
    } catch (error: any) {
      toast.error(error?.apiError?.detail || t('fee.toasts.absorbAmountFailed'));
      setAbsorbDraft(bankAbsorbAmount); // rollback
    }
  };

  // A fee counts toward the billable total only if it doesn't need approval or has been approved.
  // Pending-approval and Rejected fees are excluded (mirrors the backend RecalculateFromItems).
  const isBillable = (item: AppraisalFeeItem) =>
    !item.requiresApproval || item.approvalStatus === 'Approved';

  // Calculate totals from billable API items only
  const subtotal = items.filter(isBillable).reduce((sum, item) => sum + (item.feeAmount || 0), 0);
  const vatRate = vatRateProp ?? VAT_PERCENTAGE;
  const vat = subtotal * (vatRate / 100);
  const total = subtotal + vat;

  // Resolve fee code to label (the same key set as the assignment fee card)
  const getFeeTypeLabel = useFeeTypeLabel();

  // Badge color by fee type code
  const getBadgeClass = (code: string | undefined) => {
    switch (code) {
      case '01':
        return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300';
      case '02':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-(--palette-surface-3) text-(--palette-gray-600)';
    }
  };

  // Format currency
  const formatCurrency = (amount: number | undefined) => {
    return (amount ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // The add/edit handlers return false when the save failed, so the modal stays open with its input.
  const handleAddFee = async (data: Omit<FeeItem, 'id'>): Promise<boolean | void> => {
    if (!onAddFeeItem) return false;
    try {
      const sent = await onAddFeeItem({
        feeCode: data.type,
        feeDescription: data.description,
        feeAmount: data.amount,
      });
      if (sent === false) return false;
      setIsAddModalOpen(false);
      toast.success(t('fee.toasts.feeAdded'));
      return true;
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('fee.toasts.feeAddFailed'));
      return false;
    }
  };

  const handleEditFee = async (data: Omit<FeeItem, 'id'>): Promise<boolean | void> => {
    if (!editingFee || !onUpdateFeeItem) return false;
    const apiItem = items.find(i => i.id === editingFee.id);
    if (!apiItem) {
      toast.error(t('fee.toasts.feeUpdateFailed'));
      return false;
    }
    try {
      await onUpdateFeeItem(apiItem.appraisalFeeId, apiItem.id, {
        feeCode: data.type,
        feeDescription: data.description,
        feeAmount: data.amount,
      });
      setEditingFee(null);
      toast.success(t('fee.toasts.feeUpdated'));
      return true;
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('fee.toasts.feeUpdateFailed'));
      return false;
    }
  };

  const handleDeleteFee = async () => {
    if (deletingFeeId === null || !onRemoveFeeItem) return;
    const item = items.find(i => i.id === deletingFeeId);
    if (!item) {
      toast.error(t('fee.toasts.feeDeleteFailed'));
      setDeletingFeeId(null);
      return;
    }
    const totalPaid = totalFeePaid ?? 0;

    if (totalPaid > 0) {
      // Billable total after removing this item (pending/rejected fees never count — mirrors the
      // displayed subtotal and the backend RecalculateFromItems).
      const newSubtotal = items
        .filter(i => i.id !== deletingFeeId && isBillable(i))
        .reduce((sum, i) => sum + (i.feeAmount || 0), 0);
      const newTotal = newSubtotal * (1 + vatRate / 100);
      if (totalPaid > newTotal) {
        toast.error(
          t('fee.cannotDeleteFee', {
            newTotal: formatCurrency(newTotal),
            totalPaid: formatCurrency(totalPaid),
          }),
          {
            duration: 10000,
          },
        );
        setDeletingFeeId(null);
        return;
      }
    }

    try {
      await onRemoveFeeItem(item.appraisalFeeId, item.id);
      toast.success(t('fee.toasts.feeDeleted'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('fee.toasts.feeDeleteFailed'));
    } finally {
      setDeletingFeeId(null);
    }
  };

  const openEditModal = (apiItem: AppraisalFeeItem) => {
    setEditingFee({
      id: apiItem.id,
      data: {
        id: apiItem.id,
        type: apiItem.feeCode as FeeItem['type'],
        description: apiItem.feeDescription,
        amount: apiItem.feeAmount,
      },
    });
  };

  const getDeletingFeeDescription = () => {
    if (deletingFeeId === null) return '';
    const item = items.find(i => i.id === deletingFeeId);
    return `${item?.feeDescription || 'this fee'} (${formatCurrency(item?.feeAmount || 0)})`;
  };

  // An admin set this item before assignment; whoever got the job can read it but not change it
  // (the server refuses too).
  const isAdminSet = (item: AppraisalFeeItem) => item.source === 'Admin';

  // Check if an item is editable (only type 01 is locked)
  // Base appraisal fee ('01') is never editable; neither is a fee whose approval is finalised
  // (Approved/Rejected) — its amount is locked once the bank has decided — nor an admin's item.
  const isEditable = (item: AppraisalFeeItem) =>
    item.feeCode !== '01' &&
    !isAdminSet(item) &&
    item.approvalStatus !== 'Approved' &&
    item.approvalStatus !== 'Rejected';

  // Delete is allowed for any non-base fee — including approved/rejected ones (the amount is
  // locked from editing, but the line can still be removed) — except an admin's item.
  const isDeletable = (item: AppraisalFeeItem) => item.feeCode !== '01' && !isAdminSet(item);

  // The chip under a row's description saying an admin set it. No "system calculated" figure here:
  // it would be today's recompute, not what was in force when the admin overrode it.
  const renderAdminChips = (item: AppraisalFeeItem) =>
    isAdminSet(item) ? <AdminFeeBadge label={t('fee.adminChip')} /> : null;

  const adminLock = (
    <span
      role="img"
      aria-label={t('fee.lockedAria')}
      title={t('fee.lockedTitle')}
      className="p-1 text-(--palette-gray-400)"
    >
      <Icon name="lock" style="solid" className="size-4!" />
    </span>
  );

  // Get approval info directly from API item
  // New backend fields (approvalSubmittedAt) arrive via .passthrough()
  const getApprovalInfo = (item: AppraisalFeeItem) => {
    if (!item.requiresApproval) return null;
    const status = item.approvalStatus?.toLowerCase();
    const submittedAt = (item as AppraisalFeeItem & { approvalSubmittedAt?: string | null })
      .approvalSubmittedAt;

    if (status === 'approved') {
      return { label: item.approvalStatus!, colorClass: 'bg-success/10 text-success' };
    }
    if (status === 'rejected') {
      return { label: item.approvalStatus!, colorClass: 'bg-danger/10 text-danger' };
    }
    // Pending — distinguish draft (not yet submitted) from submitted (awaiting bank)
    if (submittedAt) {
      return {
        label: t('approval.badge.awaiting'),
        colorClass: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
      };
    }
    return {
      label: t('approval.badge.needsApproval'),
      colorClass: 'bg-amber-100 dark:bg-amber-500/20 text-(--palette-warn)',
    };
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
          <Icon name="file-invoice-dollar" style="solid" className="size-4 text-white" />
        </div>
        <h3 className="text-base font-semibold text-(--palette-ink)">{t('fee.sectionTitle')}</h3>
      </div>

      {/* Fee Type Dropdown */}
      <Dropdown
        name="feePaymentType"
        label={t('fee.feePaymentTypeLabel')}
        required
        group="FeePaymentMethod"
        value={feePaymentType || ''}
        onChange={value => onUpdateFeePaymentType?.(value)}
        disabled={readOnly || isFeePaymentTypeUpdating}
      />

      {/* Bank Absorb Amount — visible when feePaymentType ∈ ['04','99'] */}
      {showAbsorbInput && (
        <div className="border border-blue-200 dark:border-blue-500/30 bg-blue-50/40 dark:bg-blue-500/10 rounded-lg p-4">
          <NumberInput
            name="bankAbsorbAmount"
            label={t('fee.bankAbsorbAmount')}
            required={absorbRequired}
            decimalPlaces={2}
            min={0}
            max={totalFeeAfterVAT}
            value={absorbDraft}
            onChange={e => setAbsorbDraft(e.target.value)}
            onBlur={handleAbsorbBlur}
            disabled={readOnly || editLocked || isAbsorbAmountUpdating}
            placeholder="0.00"
          />
          <p className="mt-2 text-xs text-(--palette-gray-500)">{t('fee.bankAbsorbAmountHint')}</p>
        </div>
      )}

      {/* Fee Table */}
      <div className="border border-(--palette-line) rounded-lg overflow-hidden">
        {/* Table Header - Hidden on mobile */}
        <div className="hidden md:grid bg-(--palette-surface) border-b border-(--palette-line) grid-cols-[120px_1fr_100px_60px] gap-2 px-4 py-3">
          <span className="text-xs text-(--palette-gray-500)">{t('fee.columns.type')}</span>
          <span className="text-xs text-(--palette-gray-500)">{t('fee.columns.description')}</span>
          <span className="text-xs text-(--palette-gray-500) text-right">
            {t('fee.columns.amount')}
          </span>
          <span className="text-xs text-(--palette-gray-500) text-center">
            {t('fee.columns.actions')}
          </span>
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className="bg-emerald-50/50 dark:bg-emerald-500/10 px-6 py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <Icon
                  name="file-invoice-dollar"
                  style="regular"
                  className="size-6! text-emerald-500"
                />
              </div>
            </div>
            <p className="text-sm text-(--palette-gray-600) mb-1">{t('fee.empty')}</p>
            <p className="text-xs text-(--palette-gray-400)">{t('fee.emptyHint')}</p>
          </div>
        )}

        {/* Fee Rows */}
        {items.map(item => {
          // Rejected fees are hidden from the list (a history screen will surface them later).
          if (item.approvalStatus === 'Rejected') return null;

          const editable = isEditable(item);
          const deletable = isDeletable(item);
          const approval = getApprovalInfo(item);

          return (
            <div
              key={item.id}
              className="bg-(--palette-surface) border-b border-(--palette-line) px-4 py-4 hover:bg-(--palette-surface-2) transition-colors animate-fadeIn"
            >
              {/* Desktop Layout */}
              <div className="hidden md:grid grid-cols-[120px_1fr_100px_60px] gap-2 items-center">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit ${getBadgeClass(item.feeCode)}`}
                >
                  {getFeeTypeLabel(item.feeCode)}
                </span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-(--palette-gray-600)">{item.feeDescription}</span>
                    {approval && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${approval.colorClass}`}
                      >
                        {approval.label}
                      </span>
                    )}
                  </div>
                  {renderAdminChips(item)}
                </div>
                <span className="text-sm text-(--palette-gray-600) text-right">
                  {formatCurrency(item.feeAmount)}
                </span>
                <div className="flex items-center justify-center gap-1">
                  {isAdminSet(item) && adminLock}
                  {!readOnly && !editLocked && (
                    <>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="text-(--palette-gray-400) hover:text-secondary transition-colors p-1"
                          aria-label={t('fee.aria.editFee', { description: item.feeDescription })}
                          title={t('fee.aria.editFeeTitle')}
                        >
                          <Icon name="pen" style="regular" className="size-4!" />
                        </button>
                      )}
                      {deletable && (
                        <button
                          type="button"
                          onClick={() => setDeletingFeeId(item.id)}
                          className="text-(--palette-gray-400) hover:text-danger transition-colors p-1"
                          aria-label={t('fee.aria.deleteFee', { description: item.feeDescription })}
                          title={t('fee.aria.deleteFeeTitle')}
                        >
                          <Icon name="trash" style="regular" className="size-4!" />
                        </button>
                      )}
                      {approval && !item.approvalStatus && (
                        <>
                          {onApproveFeeItem && (
                            <button
                              type="button"
                              onClick={() =>
                                onApproveFeeItem(item.appraisalFeeId ?? '', item.id ?? '')
                              }
                              className="text-success hover:text-success/80 transition-colors p-1"
                              title={t('fee.aria.approveFee')}
                            >
                              <Icon name="check" style="solid" className="size-4!" />
                            </button>
                          )}
                          {onRejectFeeItem && (
                            <button
                              type="button"
                              onClick={() =>
                                onRejectFeeItem(item.appraisalFeeId ?? '', item.id ?? '', '')
                              }
                              className="text-danger hover:text-danger/80 transition-colors p-1"
                              title={t('fee.aria.rejectFee')}
                            >
                              <Icon name="xmark" style="solid" className="size-4!" />
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBadgeClass(item.feeCode)}`}
                  >
                    {getFeeTypeLabel(item.feeCode)}
                  </span>
                  <div className="flex items-center gap-2">
                    {approval && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${approval.colorClass}`}
                      >
                        {approval.label}
                      </span>
                    )}
                    {isAdminSet(item) && adminLock}
                    {!readOnly && !editLocked && editable && (
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="text-(--palette-gray-400) hover:text-secondary transition-colors p-1"
                        aria-label={t('fee.aria.editFee', { description: item.feeDescription })}
                      >
                        <Icon name="pen" style="regular" className="size-4!" />
                      </button>
                    )}
                    {!readOnly && !editLocked && deletable && (
                      <button
                        type="button"
                        onClick={() => setDeletingFeeId(item.id)}
                        className="text-(--palette-gray-400) hover:text-danger transition-colors p-1"
                        aria-label={t('fee.aria.deleteFee', { description: item.feeDescription })}
                      >
                        <Icon name="trash" style="regular" className="size-4!" />
                      </button>
                    )}
                  </div>
                </div>
                <span className="text-sm text-(--palette-gray-600)">{item.feeDescription}</span>
                {renderAdminChips(item)}
                <span className="text-sm font-medium text-(--palette-ink)">
                  {formatCurrency(item.feeAmount)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Add Fee Button */}
        {!readOnly && (
          <div className="bg-(--palette-surface) border-b border-(--palette-line) px-4 py-3">
            <button
              type="button"
              onClick={!editLocked ? () => setIsAddModalOpen(true) : undefined}
              disabled={editLocked}
              title={editLocked ? t('approval.banner.awaiting') : undefined}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-emerald-300 dark:border-emerald-500/40 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-(--palette-surface) disabled:hover:border-emerald-300 dark:disabled:hover:border-emerald-500/40"
            >
              <Icon name="circle-plus" style="solid" className="size-5!" />
              <span className="text-sm font-medium">{t('fee.addFee')}</span>
            </button>
          </div>
        )}

        {/* Summary Rows */}
        <div className="bg-(--palette-surface-3) grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_60px] gap-2 px-4 py-2 items-center">
          <span className="text-sm font-medium text-(--palette-ink)">{t('fee.subtotal')}</span>
          <span className="text-sm text-(--palette-gray-600) text-right">
            {formatCurrency(subtotal)}
          </span>
          <span className="hidden md:block" />
        </div>
        <div className="bg-(--palette-surface-3) border-b border-(--palette-line) grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_60px] gap-2 px-4 py-2 items-center">
          <span className="text-sm font-medium text-(--palette-ink) flex items-center gap-1">
            {t('fee.vat', { rate: vatRate })}
            <span className="text-(--palette-gray-400) cursor-help" title={t('fee.vatTooltip')}>
              <Icon name="circle-info" style="regular" className="size-3.5!" />
            </span>
          </span>
          <span className="text-sm text-(--palette-gray-600) text-right">
            {formatCurrency(vat)}
          </span>
          <span className="hidden md:block" />
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_60px] gap-2 px-4 py-3 items-center">
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {t('fee.total')}
          </span>
          <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 text-right">
            {formatCurrency(total)}
          </span>
          <span className="hidden md:block" />
        </div>
      </div>

      {/* Construction Inspection Fee — only visible when at least one building property is under construction */}
      {showConstructionInspectionFee && (
        <div className="border border-amber-200 dark:border-amber-500/30 bg-(--palette-warn-wash)/40 rounded-lg p-4">
          <NumberInput
            name="constructionInspectionFee"
            label={t('fee.constructionInspectionFee')}
            decimalPlaces={2}
            min={0}
            value={ciFeeDraft}
            onChange={e => setCiFeeDraft(e.target.value)}
            onBlur={handleCiFeeBlur}
            disabled={readOnly || isConstructionInspectionFeeUpdating}
            placeholder="0.00"
          />
          <p className="mt-2 text-xs text-(--palette-gray-500)">
            {t('fee.constructionInspectionFeeHint')}
          </p>
        </div>
      )}

      {/* Add/Edit Fee Modal */}
      <AddFeeModal
        readOnly={readOnly}
        isOpen={isAddModalOpen || editingFee !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingFee(null);
        }}
        onSubmit={editingFee ? handleEditFee : handleAddFee}
        defaultValues={editingFee?.data}
        isEditing={editingFee !== null}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingFeeId !== null}
        onClose={() => setDeletingFeeId(null)}
        onConfirm={handleDeleteFee}
        title={t('fee.deleteFeeDialog.title')}
        message={t('fee.deleteFeeDialog.message', { description: getDeletingFeeDescription() })}
        confirmText={t('fee.deleteFeeDialog.confirm')}
        variant="danger"
      />
    </div>
  );
}
