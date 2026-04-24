import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import CreateQuotationModal from './CreateQuotationModal';
import ExistingDraftPicker from '@/features/quotation/components/ExistingDraftPicker';
import { useGetMyDraftsForAssembly, useStartQuotationFromTask } from '@/features/quotation/api/quotation';
import type { QuotationDraftSummaryDto } from '@/features/quotation/schemas/quotation';

type Tab = 'new' | 'existing';

interface QuotationEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  appraisalId: string;
  requestId?: string;
  workflowInstanceId?: string;
  bankingSegment?: string;
  appraisalNumber?: string;
  propertyType?: string;
  onSuccess?: () => void;
}

/**
 * Two-tab entry modal for quotation creation.
 * "Create New" tab wraps CreateQuotationModal form.
 * "Add to Existing Draft" tab shows ExistingDraftPicker.
 */
const QuotationEntryModal = ({
  isOpen,
  onClose,
  appraisalId,
  requestId,
  workflowInstanceId,
  bankingSegment,
  appraisalNumber,
  propertyType,
  onSuccess,
}: QuotationEntryModalProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [selectedDraft, setSelectedDraft] = useState<QuotationDraftSummaryDto | null>(null);

  // Fetch existing drafts for the "Add to Existing" tab
  const { data: drafts = [], isLoading: isDraftsLoading } = useGetMyDraftsForAssembly(
    bankingSegment,
    isOpen && activeTab === 'existing',
  );

  const { mutate: startFromTask, isPending: isAdding } = useStartQuotationFromTask();

  const handleClose = () => {
    setActiveTab('new');
    setSelectedDraft(null);
    onClose();
  };

  const handleAddToExisting = () => {
    if (!selectedDraft || !appraisalId || !requestId || !workflowInstanceId) {
      toast.error('Please select a Draft quotation to add to');
      return;
    }

    startFromTask(
      {
        appraisalId,
        requestId,
        workflowInstanceId,
        taskExecutionId: null,
        dueDate: selectedDraft.dueDate ?? new Date(Date.now() + 86400000 * 7).toISOString(),
        bankingSegment: bankingSegment ?? '',
        invitedCompanyIds: [],
        appraisalNumber: appraisalNumber ?? '',
        propertyType: propertyType ?? '',
        existingQuotationRequestId: selectedDraft.id,
      },
      {
        onSuccess: () => {
          toast.success(
            `Appraisal added to ${selectedDraft.quotationNumber}`,
          );
          handleClose();
          onSuccess?.();
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? 'Failed to add appraisal to draft');
        },
      },
    );
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'new', label: 'Create New', icon: 'file-circle-plus' },
    { key: 'existing', label: 'Add to Existing Draft', icon: 'layer-plus' },
  ];

  return (
    <>
      {/* Outer modal — only for the tab switcher + "existing" tab content */}
      {activeTab === 'existing' && (
        <Modal
          isOpen={isOpen}
          onClose={handleClose}
          title="Request Quotation"
          size="xl"
        >
          <div className="flex flex-col gap-4">
            {/* Tab bar */}
            <div className="flex border-b border-gray-200 -mt-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectedDraft(null);
                  }}
                  className={clsx(
                    'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  )}
                >
                  <Icon name={tab.icon} style="solid" className="size-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Existing draft picker */}
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Select an existing Draft quotation to add this appraisal into. Multiple appraisals
                can share one bid invitation.
              </p>
              <ExistingDraftPicker
                drafts={drafts}
                isLoading={isDraftsLoading}
                selectedId={selectedDraft?.id ?? null}
                onSelect={setSelectedDraft}
              />
            </div>

            {/* Selected draft confirmation */}
            {selectedDraft && (
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 flex items-start gap-2">
                <Icon name="circle-check" style="solid" className="size-4 text-purple-500 shrink-0 mt-0.5" />
                <p className="text-sm text-purple-700">
                  Appraisal will be added to{' '}
                  <strong>{selectedDraft.quotationNumber}</strong>{' '}
                  ({selectedDraft.appraisalCount} existing appraisal
                  {selectedDraft.appraisalCount !== 1 ? 's' : ''})
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAddToExisting}
                disabled={!selectedDraft || isAdding || !requestId || !workflowInstanceId}
              >
                {isAdding ? (
                  <>
                    <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Icon name="layer-plus" style="solid" className="size-4 mr-2" />
                    Add to Draft
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* "Create New" tab — delegates to CreateQuotationModal with an injected tab bar */}
      {activeTab === 'new' && isOpen && (
        <CreateQuotationModal
          isOpen={isOpen}
          onClose={handleClose}
          appraisalId={appraisalId}
          requestId={requestId}
          workflowInstanceId={workflowInstanceId}
          bankingSegment={bankingSegment}
          appraisalNumber={appraisalNumber}
          propertyType={propertyType}
          onSuccess={() => {
            handleClose();
            onSuccess?.();
          }}
          headerSlot={
            <div className="flex border-b border-gray-200 -mx-6 px-6 -mt-2 mb-4">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectedDraft(null);
                  }}
                  className={clsx(
                    'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  )}
                >
                  <Icon name={tab.icon} style="solid" className="size-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          }
        />
      )}
    </>
  );
};

export default QuotationEntryModal;
