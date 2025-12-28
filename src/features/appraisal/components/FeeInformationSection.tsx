import { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import Icon from '@shared/components/Icon';
import Dropdown from '@shared/components/inputs/Dropdown';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { FEE_TYPE_OPTIONS, VAT_PERCENTAGE } from '../types/appointmentAndFee';
import type { FeeItem, AppointmentAndFeeFormType } from '../types/appointmentAndFee';
import AddFeeModal from './AddFeeModal';

/**
 * Fee Information section with fee type dropdown and editable fee table
 */
export default function FeeInformationSection() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<{ index: number; data: FeeItem } | null>(null);
  const [deletingFeeIndex, setDeletingFeeIndex] = useState<number | null>(null);

  const { control, watch, setValue } = useFormContext<AppointmentAndFeeFormType>();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'fee.items',
  });

  const feeItems = watch('fee.items') || [];
  const feeType = watch('fee.feeType');

  // Calculate totals
  const subtotal = feeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const vat = subtotal * (VAT_PERCENTAGE / 100);
  const total = subtotal + vat;

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAddFee = (data: Omit<FeeItem, 'id'>) => {
    const newItem: FeeItem = {
      ...data,
      id: crypto.randomUUID(),
    };
    append(newItem);
    setIsAddModalOpen(false);
    toast.success('Fee added successfully');
  };

  const handleEditFee = (data: Omit<FeeItem, 'id'>) => {
    if (editingFee) {
      update(editingFee.index, { ...data, id: editingFee.data.id });
      setEditingFee(null);
      toast.success('Fee updated successfully');
    }
  };

  const handleDeleteFee = () => {
    if (deletingFeeIndex !== null) {
      remove(deletingFeeIndex);
      setDeletingFeeIndex(null);
      toast.success('Fee deleted successfully');
    }
  };

  const openEditModal = (index: number) => {
    setEditingFee({ index, data: feeItems[index] });
  };

  const getDeletingFeeDescription = () => {
    if (deletingFeeIndex === null) return '';
    const fee = feeItems[deletingFeeIndex];
    return `${fee?.description || 'this fee'} (${formatCurrency(fee?.amount || 0)})`;
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
        name="fee.feeType"
        label="Fee Type"
        required
        options={FEE_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
        value={feeType || ''}
        onChange={value => setValue('fee.feeType', value)}
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
        {fields.length === 0 && (
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
        {fields.map((field, index) => {
          const item = feeItems[index];
          return (
            <div
              key={field.id}
              className="bg-white border-b border-gray-200 px-4 py-4 hover:bg-gray-50 transition-colors animate-fadeIn"
            >
              {/* Desktop Layout */}
              <div className="hidden md:grid grid-cols-[120px_1fr_100px_60px] gap-2 items-center">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit ${
                    item?.type === 'appraisal'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {item?.type === 'appraisal' ? 'Appraisal' : 'Other'}
                </span>
                <span className="text-sm text-gray-600">{item?.description}</span>
                <span className="text-sm text-gray-600 text-right">
                  {formatCurrency(item?.amount || 0)}
                </span>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(index)}
                    className="text-gray-400 hover:text-secondary transition-colors p-1"
                    aria-label={`Edit fee: ${item?.description}`}
                    title="Edit fee"
                  >
                    <Icon name="pen" style="regular" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingFeeIndex(index)}
                    className="text-gray-400 hover:text-danger transition-colors p-1"
                    aria-label={`Delete fee: ${item?.description}`}
                    title="Delete fee"
                  >
                    <Icon name="trash" style="regular" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item?.type === 'appraisal'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item?.type === 'appraisal' ? 'Appraisal' : 'Other'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(index)}
                      className="text-gray-400 hover:text-secondary transition-colors p-1"
                      aria-label={`Edit fee: ${item?.description}`}
                    >
                      <Icon name="pen" style="regular" className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingFeeIndex(index)}
                      className="text-gray-400 hover:text-danger transition-colors p-1"
                      aria-label={`Delete fee: ${item?.description}`}
                    >
                      <Icon name="trash" style="regular" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <span className="text-sm text-gray-600">{item?.description}</span>
                <span className="text-sm font-medium text-gray-800">
                  {formatCurrency(item?.amount || 0)}
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
            VAT ({VAT_PERCENTAGE}%)
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
