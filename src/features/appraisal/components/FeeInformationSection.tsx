import { useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '@shared/components/Icon';
import Dropdown from '@shared/components/inputs/Dropdown';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import type { FeeItem } from '../types/appointmentAndFee';
import { FEE_ITEM_TYPE_OPTIONS, FEE_TYPE_OPTIONS, VAT_PERCENTAGE, } from '../types/appointmentAndFee';
import type { AppraisalFeeItemDtoType } from '@shared/schemas/v1';
import AddFeeModal from './AddFeeModal';

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
}: FeeInformationSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<{ index: number; data: FeeItem } | null>(null);
  const [deletingFeeIndex, setDeletingFeeIndex] = useState<number | null>(null);

  // Calculate totals from API items
  const subtotal = items.reduce((sum, item) => sum + (item.feeAmount || 0), 0);
  const vatRate = vatRateProp ?? VAT_PERCENTAGE;
  const vat = subtotal * (vatRate / 100);
  const total = subtotal + vat;

  // Resolve fee code to label
  const getFeeTypeLabel = (code: string) =>
    FEE_ITEM_TYPE_OPTIONS.find(opt => opt.value === code)?.label ?? code;

  // Badge color by fee type code
  const getBadgeClass = (code: string) => {
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
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
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
      toast.success('Fee added successfully');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to add fee item.');
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
      toast.success('Fee updated successfully');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to update fee item.');
    }
  };

  const handleDeleteFee = async () => {
    if (deletingFeeIndex === null || !onRemoveFeeItem) return;
    const item = items[deletingFeeIndex];
    try {
      await onRemoveFeeItem(item.appraisalFeeId, item.id);
      toast.success('Fee deleted successfully');
    } catch (error: any) {
      toast.error(error.apiError?.detail || 'Failed to delete fee item.');
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
  const isEditable = (item: AppraisalFeeItemDtoType) => item.feeCode !== '01';

  // Get approval info directly from API item
  const getApprovalInfo = (item: AppraisalFeeItemDtoType) => {
    if (!item.requiresApproval) return null;
    const status = item.approvalStatus?.toLowerCase();
    const colorClass =
      status === 'approved'
        ? 'bg-success/10 text-success'
        : status === 'rejected'
          ? 'bg-danger/10 text-danger'
          : 'bg-warning/10 text-warning';
    return { label: item.approvalStatus || 'Pending', colorClass };
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
          <Icon name="file-invoice-dollar" style="solid" className="size-4 text-white" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">Fee Information</h3>
      </div>

      {/* Fee Type Dropdown */}
      <Dropdown
        name="feePaymentType"
        label="Fee Payment Type"
        required
        options={FEE_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
        value={feePaymentType || ''}
        onChange={value => onUpdateFeePaymentType?.(value)}
        disabled={isFeePaymentTypeUpdating}
      />

      {/* Fee Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Table Header - Hidden on mobile */}
        <div className="hidden md:grid bg-white border-b border-gray-200 grid-cols-[120px_1fr_100px_60px] gap-2 px-4 py-3">
          <span className="text-xs text-gray-500">Type</span>
          <span className="text-xs text-gray-500">Description</span>
          <span className="text-xs text-gray-500 text-right">Amount</span>
          <span className="text-xs text-gray-500 text-center">Actions</span>
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
            <p className="text-sm text-gray-600 mb-1">No fees added yet</p>
            <p className="text-xs text-gray-400">Add your first fee to get started</p>
          </div>
        )}

        {/* Fee Rows */}
        {items.map((item, index) => {
          const editable = isEditable(item);
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
                  {editable ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(index)}
                        className="text-gray-400 hover:text-secondary transition-colors p-1"
                        aria-label={`Edit fee: ${item.feeDescription}`}
                        title="Edit fee"
                      >
                        <Icon name="pen" style="regular" className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingFeeIndex(index)}
                        className="text-gray-400 hover:text-danger transition-colors p-1"
                        aria-label={`Delete fee: ${item.feeDescription}`}
                        title="Delete fee"
                      >
                        <Icon name="trash" style="regular" className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      {approval && !item.approvalStatus && (
                        <>
                          {onApproveFeeItem && (
                            <button
                              type="button"
                              onClick={() => onApproveFeeItem(item.appraisalFeeId, item.id)}
                              className="text-success hover:text-success/80 transition-colors p-1"
                              title="Approve"
                            >
                              <Icon name="check" style="solid" className="w-4 h-4" />
                            </button>
                          )}
                          {onRejectFeeItem && (
                            <button
                              type="button"
                              onClick={() => onRejectFeeItem(item.appraisalFeeId, item.id, '')}
                              className="text-danger hover:text-danger/80 transition-colors p-1"
                              title="Reject"
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
                    {editable && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(index)}
                          className="text-gray-400 hover:text-secondary transition-colors p-1"
                          aria-label={`Edit fee: ${item.feeDescription}`}
                        >
                          <Icon name="pen" style="regular" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingFeeIndex(index)}
                          className="text-gray-400 hover:text-danger transition-colors p-1"
                          aria-label={`Delete fee: ${item.feeDescription}`}
                        >
                          <Icon name="trash" style="regular" className="w-4 h-4" />
                        </button>
                      </>
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
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
          >
            <Icon name="circle-plus" style="solid" className="w-5 h-5" />
            <span className="text-sm font-medium">Add additional fee</span>
          </button>
        </div>

        {/* Summary Rows */}
        <div className="bg-gray-100 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_60px] gap-2 px-4 py-2 items-center">
          <span className="text-sm font-medium text-gray-800">Subtotal</span>
          <span className="text-sm text-gray-600 text-right">{formatCurrency(subtotal)}</span>
          <span className="hidden md:block" />
        </div>
        <div className="bg-gray-100 border-b border-gray-200 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_60px] gap-2 px-4 py-2 items-center">
          <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
            VAT ({vatRate}%)
            <span
              className="text-gray-400 cursor-help"
              title="Value Added Tax calculated on subtotal"
            >
              <Icon name="circle-info" style="regular" className="w-3.5 h-3.5" />
            </span>
          </span>
          <span className="text-sm text-gray-600 text-right">{formatCurrency(vat)}</span>
          <span className="hidden md:block" />
        </div>
        <div className="bg-emerald-50 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_60px] gap-2 px-4 py-3 items-center">
          <span className="text-sm font-semibold text-emerald-800">Total</span>
          <span className="text-base font-bold text-emerald-700 text-right">
            {formatCurrency(total)}
          </span>
          <span className="hidden md:block" />
        </div>
      </div>

      {/* Add/Edit Fee Modal */}
      <AddFeeModal
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
        title="Delete Fee"
        message={`Are you sure you want to delete ${getDeletingFeeDescription()}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
