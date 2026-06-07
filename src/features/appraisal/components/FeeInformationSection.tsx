import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Dropdown from '@shared/components/inputs/Dropdown';
import NumberInput from '@shared/components/inputs/NumberInput';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import type { FeeItem } from '../types/appointmentAndFee';
import { FEE_ITEM_TYPE_OPTIONS, VAT_PERCENTAGE } from '../types/appointmentAndFee';
import type { AppraisalFeeItemDtoType } from '@shared/schemas/v1';
import AddFeeModal from './AddFeeModal';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

export const BANK_ABSORB_FEE_TYPES = ['04'];
/** Fee types for which the bank-absorb amount input is shown (required for '04', optional for '99'). */
const BANK_ABSORB_SHOW_TYPES = ['04', '99'];

interface FeeInformationSectionProps {
  items: AppraisalFeeItemDtoType[];
  vatRate?: number;
  feePaymentType?: string | null;
  onUpdateFeePaymentType?: (value: string) => void;
  onAddFeeItem?: (data: {
    feeCode: string;
    feeDescription: string;
    feeAmount: number;
  }) => Promise<void>;
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
  const [editingFee, setEditingFee] = useState<{ index: number; data: FeeItem } | null>(null);
  const [deletingFeeIndex, setDeletingFeeIndex] = useState<number | null>(null);

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
  const isBillable = (item: AppraisalFeeItemDtoType) =>
    !item.requiresApproval || item.approvalStatus === 'Approved';

  // Calculate totals from billable API items only
  const subtotal = items
    .filter(isBillable)
    .reduce((sum, item) => sum + (item.feeAmount || 0), 0);
  const vatRate = vatRateProp ?? VAT_PERCENTAGE;
  const vat = subtotal * (vatRate / 100);
  const total = subtotal + vat;

  // Resolve fee code to label
  const getFeeTypeLabel = (code: string | undefined) =>
    FEE_ITEM_TYPE_OPTIONS.find(opt => opt.value === code)?.label ?? code ?? '';

  // Badge color by fee type code
  const getBadgeClass = (code: string | undefined) => {
    switch (code) {
      case '01':
        return 'bg-emerald-100 text-emerald-700';
      case '02':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Format currency
  const formatCurrency = (amount: number | undefined) => {
    return (amount ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAddFee = async (data: Omit<FeeItem, 'id'>) => {
    if (!onAddFeeItem) return;
    try {
      await onAddFeeItem({
        feeCode: data.type,
        feeDescription: data.description,
        feeAmount: data.amount,
      });
      setIsAddModalOpen(false);
      toast.success(t('fee.toasts.feeAdded'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('fee.toasts.feeAddFailed'));
    }
  };

  const handleEditFee = async (data: Omit<FeeItem, 'id'>) => {
    if (!editingFee || !onUpdateFeeItem) return;
    const apiItem = items[editingFee.index];
    try {
      await onUpdateFeeItem(apiItem.appraisalFeeId, apiItem.id, {
        feeCode: data.type,
        feeDescription: data.description,
        feeAmount: data.amount,
      });
      setEditingFee(null);
      toast.success(t('fee.toasts.feeUpdated'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('fee.toasts.feeUpdateFailed'));
    }
  };

  const handleDeleteFee = async () => {
    if (deletingFeeIndex === null || !onRemoveFeeItem) return;
    const item = items[deletingFeeIndex];
    const totalPaid = totalFeePaid;

    if (totalPaid > 0) {
      // Billable total after removing this item (pending/rejected fees never count — mirrors the
      // displayed subtotal and the backend RecalculateFromItems).
      const newSubtotal = items
        .filter((i, idx) => idx !== deletingFeeIndex && isBillable(i))
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
        setDeletingFeeIndex(null);
        return;
      }
    }

    try {
      await onRemoveFeeItem(item.appraisalFeeId, item.id);
      toast.success(t('fee.toasts.feeDeleted'));
    } catch (error: any) {
      toast.error(error.apiError?.detail || t('fee.toasts.feeDeleteFailed'));
    } finally {
      setDeletingFeeIndex(null);
    }
  };

  const openEditModal = (index: number) => {
    const apiItem = items[index];
    setEditingFee({
      index,
      data: {
        id: apiItem.id,
        type: apiItem.feeCode as FeeItem['type'],
        description: apiItem.feeDescription,
        amount: apiItem.feeAmount,
      },
    });
  };

  const getDeletingFeeDescription = () => {
    if (deletingFeeIndex === null) return '';
    const item = items[deletingFeeIndex];
    return `${item?.feeDescription || 'this fee'} (${formatCurrency(item?.feeAmount || 0)})`;
  };

  // Check if an item is editable (only type 01 is locked)
  // Base appraisal fee ('01') is never editable; neither is a fee whose approval is finalised
  // (Approved/Rejected) — its amount is locked once the bank has decided.
  const isEditable = (item: AppraisalFeeItemDtoType) =>
    item.feeCode !== '01' &&
    item.approvalStatus !== 'Approved' &&
    item.approvalStatus !== 'Rejected';

  // Delete is allowed for any non-base fee — including approved/rejected ones (the amount is
  // locked from editing, but the line can still be removed).
  const isDeletable = (item: AppraisalFeeItemDtoType) => item.feeCode !== '01';

  // Get approval info directly from API item
  // New backend fields (approvalSubmittedAt) arrive via .passthrough()
  const getApprovalInfo = (item: AppraisalFeeItemDtoType) => {
    if (!item.requiresApproval) return null;
    const status = item.approvalStatus?.toLowerCase();
    const submittedAt = (item as AppraisalFeeItemDtoType & { approvalSubmittedAt?: string | null }).approvalSubmittedAt;

    if (status === 'approved') {
      return { label: item.approvalStatus!, colorClass: 'bg-success/10 text-success' };
    }
    if (status === 'rejected') {
      return { label: item.approvalStatus!, colorClass: 'bg-danger/10 text-danger' };
    }
    // Pending — distinguish draft (not yet submitted) from submitted (awaiting bank)
    if (submittedAt) {
      return { label: t('approval.badge.awaiting'), colorClass: 'bg-blue-100 text-blue-700' };
    }
    return { label: t('approval.badge.needsApproval'), colorClass: 'bg-amber-100 text-amber-700' };
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
          <Icon name="file-invoice-dollar" style="solid" className="size-4 text-white" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">{t('fee.sectionTitle')}</h3>
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
        <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4">
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
          <p className="mt-2 text-xs text-gray-500">{t('fee.bankAbsorbAmountHint')}</p>
        </div>
      )}

      {/* Fee Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Table Header - Hidden on mobile */}
        <div className="hidden md:grid bg-white border-b border-gray-200 grid-cols-[120px_1fr_100px_60px] gap-2 px-4 py-3">
          <span className="text-xs text-gray-500">{t('fee.columns.type')}</span>
          <span className="text-xs text-gray-500">{t('fee.columns.description')}</span>
          <span className="text-xs text-gray-500 text-right">{t('fee.columns.amount')}</span>
          <span className="text-xs text-gray-500 text-center">{t('fee.columns.actions')}</span>
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className="bg-emerald-50/50 px-6 py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Icon
                  name="file-invoice-dollar"
                  style="regular"
                  className="w-6 h-6 text-emerald-500"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">{t('fee.empty')}</p>
            <p className="text-xs text-gray-400">{t('fee.emptyHint')}</p>
          </div>
        )}

        {/* Fee Rows */}
        {items.map((item, index) => {
          // Rejected fees are hidden from the list (a history screen will surface them later).
          // Return null rather than filtering so `index` still maps to the original items array
          // used by edit/delete handlers.
          if (item.approvalStatus === 'Rejected') return null;

          const editable = isEditable(item);
          const deletable = isDeletable(item);
          const approval = getApprovalInfo(item);

          return (
            <div
              key={item.id}
              className="bg-white border-b border-gray-200 px-4 py-4 hover:bg-gray-50 transition-colors animate-fadeIn"
            >
              {/* Desktop Layout */}
              <div className="hidden md:grid grid-cols-[120px_1fr_100px_60px] gap-2 items-center">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit ${getBadgeClass(item.feeCode)}`}
                >
                  {getFeeTypeLabel(item.feeCode)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{item.feeDescription}</span>
                  {approval && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${approval.colorClass}`}
                    >
                      {approval.label}
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600 text-right">
                  {formatCurrency(item.feeAmount)}
                </span>
                <div className="flex items-center justify-center gap-1">
                  {!readOnly && !editLocked && (
                    <>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => openEditModal(index)}
                          className="text-gray-400 hover:text-secondary transition-colors p-1"
                          aria-label={t('fee.aria.editFee', { description: item.feeDescription })}
                          title={t('fee.aria.editFeeTitle')}
                        >
                          <Icon name="pen" style="regular" className="w-4 h-4" />
                        </button>
                      )}
                      {deletable && (
                        <button
                          type="button"
                          onClick={() => setDeletingFeeIndex(index)}
                          className="text-gray-400 hover:text-danger transition-colors p-1"
                          aria-label={t('fee.aria.deleteFee', { description: item.feeDescription })}
                          title={t('fee.aria.deleteFeeTitle')}
                        >
                          <Icon name="trash" style="regular" className="w-4 h-4" />
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
                              <Icon name="check" style="solid" className="w-4 h-4" />
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
                              <Icon name="xmark" style="solid" className="w-4 h-4" />
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
                    {!readOnly && !editLocked && editable && (
                      <button
                        type="button"
                        onClick={() => openEditModal(index)}
                        className="text-gray-400 hover:text-secondary transition-colors p-1"
                        aria-label={t('fee.aria.editFee', { description: item.feeDescription })}
                      >
                        <Icon name="pen" style="regular" className="w-4 h-4" />
                      </button>
                    )}
                    {!readOnly && !editLocked && deletable && (
                      <button
                        type="button"
                        onClick={() => setDeletingFeeIndex(index)}
                        className="text-gray-400 hover:text-danger transition-colors p-1"
                        aria-label={t('fee.aria.deleteFee', { description: item.feeDescription })}
                      >
                        <Icon name="trash" style="regular" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-600">{item.feeDescription}</span>
                <span className="text-sm font-medium text-gray-800">
                  {formatCurrency(item.feeAmount)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Add Fee Button */}
        {!readOnly && (
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <button
              type="button"
              onClick={!editLocked ? () => setIsAddModalOpen(true) : undefined}
              disabled={editLocked}
              title={editLocked ? t('approval.banner.awaiting') : undefined}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-emerald-300"
            >
              <Icon name="circle-plus" style="solid" className="w-5 h-5" />
              <span className="text-sm font-medium">{t('fee.addFee')}</span>
            </button>
          </div>
        )}

        {/* Summary Rows */}
        <div className="bg-gray-100 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_60px] gap-2 px-4 py-2 items-center">
          <span className="text-sm font-medium text-gray-800">{t('fee.subtotal')}</span>
          <span className="text-sm text-gray-600 text-right">{formatCurrency(subtotal)}</span>
          <span className="hidden md:block" />
        </div>
        <div className="bg-gray-100 border-b border-gray-200 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_60px] gap-2 px-4 py-2 items-center">
          <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
            {t('fee.vat', { rate: vatRate })}
            <span className="text-gray-400 cursor-help" title={t('fee.vatTooltip')}>
              <Icon name="circle-info" style="regular" className="w-3.5 h-3.5" />
            </span>
          </span>
          <span className="text-sm text-gray-600 text-right">{formatCurrency(vat)}</span>
          <span className="hidden md:block" />
        </div>
        <div className="bg-emerald-50 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_60px] gap-2 px-4 py-3 items-center">
          <span className="text-sm font-semibold text-emerald-800">{t('fee.total')}</span>
          <span className="text-base font-bold text-emerald-700 text-right">
            {formatCurrency(total)}
          </span>
          <span className="hidden md:block" />
        </div>
      </div>

      {/* Construction Inspection Fee — only visible when at least one building property is under construction */}
      {showConstructionInspectionFee && (
        <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-4">
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
          <p className="mt-2 text-xs text-gray-500">{t('fee.constructionInspectionFeeHint')}</p>
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
        isOpen={deletingFeeIndex !== null}
        onClose={() => setDeletingFeeIndex(null)}
        onConfirm={handleDeleteFee}
        title={t('fee.deleteFeeDialog.title')}
        message={t('fee.deleteFeeDialog.message', { description: getDeletingFeeDescription() })}
        confirmText={t('fee.deleteFeeDialog.confirm')}
        variant="danger"
      />
    </div>
  );
}
