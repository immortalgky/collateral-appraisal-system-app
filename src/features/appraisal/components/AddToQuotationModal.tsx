import { useState } from 'react';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useGetPendingQuotations, useAddToQuotation } from '../api/administration';
import type { Quotation } from '../types/administration';

interface AddToQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appraisalId: string;
  onSuccess?: () => void;
}

const AddToQuotationModal = ({
  isOpen,
  onClose,
  appraisalId,
  onSuccess,
}: AddToQuotationModalProps) => {
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Fetch all pending quotations
  const { data: quotations = [], isLoading } = useGetPendingQuotations(null, isOpen);
  const { mutate: addToQuotation, isPending } = useAddToQuotation();

  const handleClose = () => {
    setSelectedQuotation(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedQuotation) return;

    addToQuotation(
      {
        appraisalId,
        quotationId: selectedQuotation.id,
      },
      {
        onSuccess: () => {
          handleClose();
          onSuccess?.();
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      Draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      Pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
      Quoted: { label: 'Quoted', className: 'bg-blue-100 text-blue-700' },
      Approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
      Rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
      Expired: { label: 'Expired', className: 'bg-gray-100 text-gray-500' },
    };

    const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span
        className={clsx(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          config.className
        )}
      >
        {config.label}
      </span>
    );
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add to Existing Quotation" size="lg">
      <div className="flex flex-col gap-4">
        {/* Info */}
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Icon name="circle-info" style="solid" className="size-4 text-purple-500 mt-0.5" />
            <p className="text-sm text-purple-700">
              Select a pending quotation to add this appraisal. Only quotations with status "Draft"
              or "Pending" are shown.
            </p>
          </div>
        </div>

        {/* Quotation List */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center">
                <Icon name="spinner" style="solid" className="size-5 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading quotations...</p>
              </div>
            ) : quotations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Icon name="file-invoice" style="regular" className="size-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No pending quotations available</p>
                <p className="text-xs text-gray-400 mt-1">
                  Create a new quotation instead
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {quotations.map(quotation => (
                  <button
                    key={quotation.id}
                    type="button"
                    onClick={() => setSelectedQuotation(quotation)}
                    className={clsx(
                      'w-full flex items-center gap-4 px-4 py-3 text-left transition-colors',
                      selectedQuotation?.id === quotation.id
                        ? 'bg-purple-50 hover:bg-purple-100'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    {/* Quotation Icon */}
                    <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <Icon name="file-invoice-dollar" style="solid" className="size-5 text-purple-600" />
                    </div>

                    {/* Quotation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {quotation.quotationNumber}
                        </span>
                        {getStatusBadge(quotation.status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Icon name="file-lines" style="regular" className="size-3" />
                          {quotation.totalAppraisals} appraisals
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="clock" style="regular" className="size-3" />
                          Due: {formatDateTime(quotation.dueDate)}
                        </span>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    <div
                      className={clsx(
                        'size-5 rounded-full border-2 flex items-center justify-center shrink-0',
                        selectedQuotation?.id === quotation.id
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      )}
                    >
                      {selectedQuotation?.id === quotation.id && (
                        <Icon name="check" style="solid" className="size-3 text-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedQuotation || isPending}
            className={clsx(
              selectedQuotation && !isPending ? 'bg-purple-600 hover:bg-purple-700' : ''
            )}
          >
            {isPending ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Icon name="plus" style="solid" className="size-4 mr-2" />
                Add to Quotation
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddToQuotationModal;
