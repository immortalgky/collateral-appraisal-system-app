import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import NumberInput from '@/shared/components/inputs/NumberInput';
import CreateQuotationModal from './CreateQuotationModal';
import ExistingDraftPicker from '@/features/quotation/components/ExistingDraftPicker';
import {
  useGetMyDraftsForAssembly,
  useStartQuotationFromTask,
} from '@/features/quotation/api/quotation';
import type { QuotationDraftSummaryDto } from '@/features/quotation/schemas/quotation';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useSegmentLabel } from '@/features/quotation/hooks/useSegmentLabel';
import { buildSegmentSet, getMissingSegments } from '@/features/quotation/utils/segmentCoverage';

type Tab = 'new' | 'existing';

interface QuotationEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  appraisalId: string;
  requestId?: string;
  workflowInstanceId?: string;
  bankingSegment?: string;
  /** True while the parent is still loading `bankingSegment`; the Create New company list waits for it. */
  isSegmentLoading?: boolean;
  /** True when loading `bankingSegment` failed; the Create New company list shows a load error. */
  isSegmentError?: boolean;
  onSuccess?: () => void;
  assignmentType?: string | null;
  assignmentMethod?: string | null;
  internalFollowupAssignmentMethod?: string | null;
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
  isSegmentLoading,
  isSegmentError,
  onSuccess,
  assignmentType,
  assignmentMethod,
  internalFollowupAssignmentMethod,
}: QuotationEntryModalProps) => {
  const readOnly = usePageReadOnly();
  const { t } = useTranslation('appraisal');
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [selectedDraftSnapshot, setSelectedDraft] = useState<QuotationDraftSummaryDto | null>(null);
  const [maxAppraisalDays, setMaxAppraisalDays] = useState<number | null>(null);

  // Every Draft owned by this admin, regardless of banking segment — any appraisal can join any
  // Draft. bankingSegment (the prop) is used below only so the picker can warn when the appraisal
  // being added introduces a segment the draft doesn't already have; the API doesn't filter on it.
  const { data: drafts = [], isLoading: isDraftsLoading } = useGetMyDraftsForAssembly(
    isOpen && activeTab === 'existing',
  );

  // Prefer the freshest copy from the list so a refetch (new invited companies, new segments)
  // updates the warning. A draft that left the list (sent, cancelled or deleted elsewhere) counts as
  // unselected; the snapshot only stands in while the list is still loading.
  const selectedDraft =
    drafts.find(d => d.id === selectedDraftSnapshot?.id) ??
    (isDraftsLoading ? selectedDraftSnapshot : null);

  const { mutate: startFromTask, isPending: isAdding } = useStartQuotationFromTask();
  const segmentLabel = useSegmentLabel();

  // Only matters when the draft already has invited companies that could fall short of the new segment.
  // buildSegmentSet drops a blank/whitespace segment, so an appraisal without one never warns.
  // Not evaluated while the parent is still loading the appraisal's segment.
  const introducesNewSegment =
    !isSegmentLoading &&
    !!selectedDraft &&
    selectedDraft.totalCompaniesInvited > 0 &&
    getMissingSegments(buildSegmentSet([bankingSegment]), selectedDraft.bankingSegment).length > 0;

  const handleClose = () => {
    setActiveTab('new');
    setSelectedDraft(null);
    setMaxAppraisalDays(null);
    onClose();
  };

  const handleAddToExisting = () => {
    if (!selectedDraft || !appraisalId || !requestId || !workflowInstanceId) {
      toast.error(t('toasts.quotationAddSelectDraft'));
      return;
    }

    startFromTask(
      {
        appraisalId,
        requestId,
        workflowInstanceId,
        taskExecutionId: null,
        cutOffTime: selectedDraft.cutOffTime ?? new Date(Date.now() + 86400000 * 7).toISOString(),
        invitedCompanyIds: [],
        existingQuotationRequestId: selectedDraft.id,
        maxAppraisalDays: maxAppraisalDays ?? null,
      },
      {
        onSuccess: () => {
          toast.success(
            t('toasts.quotationAddedToDraft', { quotationNumber: selectedDraft.quotationNumber }),
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
        <Modal isOpen={isOpen} onClose={handleClose} title="Request Quotation" size="xl">
          <div className="flex flex-col gap-4">
            {/* Tab bar */}
            <div className="flex border-b border-(--palette-line) -mt-1">
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
                      ? 'border-primary text-(--palette-primary-text)'
                      : 'border-transparent text-(--palette-gray-500) hover:text-(--palette-ink) hover:border-(--palette-line-strong)',
                  )}
                >
                  <Icon name={tab.icon} style="solid" className="size-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Existing draft picker */}
            <div>
              <p className="text-sm text-(--palette-gray-600) mb-3">
                Select an existing Draft quotation to add this appraisal into. Multiple appraisals
                can share one bid invitation.
              </p>
              <ExistingDraftPicker
                drafts={drafts}
                isLoading={isDraftsLoading}
                selectedId={selectedDraft?.id ?? null}
                onSelect={readOnly ? () => {} : setSelectedDraft}
              />
            </div>

            {/* Selected draft confirmation */}
            {selectedDraft && (
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex items-start gap-2">
                <Icon
                  name="circle-check"
                  style="solid"
                  className="size-4 text-purple-500 shrink-0 mt-0.5"
                />
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Appraisal will be added to <strong>{selectedDraft.quotationNumber}</strong> (
                  {selectedDraft.totalAppraisals} existing appraisal
                  {selectedDraft.totalAppraisals !== 1 ? 's' : ''})
                </p>
              </div>
            )}

            {/* Segment Coverage is warn-only here: adding is never blocked, but Send requires every
                invited company to cover every segment, so a company already invited to this draft
                that lacks the segment the new appraisal introduces blocks Send. Inviting another
                covering company does not help — only removing the non-covering companies or the
                out-of-segment appraisals does. */}
            {introducesNewSegment && (
              <div className="p-3 rounded-lg bg-(--palette-warn-wash) border border-amber-200 dark:border-amber-500/30 flex items-start gap-2">
                <Icon
                  name="triangle-exclamation"
                  style="solid"
                  className="size-4! text-amber-500 shrink-0 mt-0.5"
                />
                <p className="text-sm text-(--palette-warn)">
                  {t('quotation.existingDraftSegmentWarning', {
                    segment: segmentLabel(bankingSegment!),
                  })}
                </p>
              </div>
            )}

            {/* Max Appraisal Duration — per-appraisal cap for the appraisal being added */}
            {selectedDraft && (
              <div>
                <NumberInput
                  label="Max Appraisal Duration (Day)"
                  helperText="Maximum duration you allow the appraiser to complete this appraisal. Applies to the appraisal being added."
                  placeholder="e.g. 7"
                  value={maxAppraisalDays}
                  decimalPlaces={0}
                  thousandSeparator={false}
                  maxIntegerDigits={3}
                  min={1}
                  onChange={e => setMaxAppraisalDays(e.target.value)}
                />
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAddToExisting}
                disabled={
                  readOnly ||
                  !selectedDraft ||
                  isAdding ||
                  isSegmentLoading ||
                  isSegmentError ||
                  !requestId ||
                  !workflowInstanceId
                }
                title={
                  isSegmentLoading
                    ? t('common.loading')
                    : isSegmentError
                      ? t('quotation.segmentLoadFailed')
                      : undefined
                }
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
          isSegmentLoading={isSegmentLoading}
          isSegmentError={isSegmentError}
          assignmentType={assignmentType}
          assignmentMethod={assignmentMethod}
          internalFollowupAssignmentMethod={internalFollowupAssignmentMethod}
          onSuccess={() => {
            handleClose();
            onSuccess?.();
          }}
          headerSlot={
            <div className="flex border-b border-(--palette-line) -mx-6 px-6 -mt-2 mb-4">
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
                      ? 'border-primary text-(--palette-primary-text)'
                      : 'border-transparent text-(--palette-gray-500) hover:text-(--palette-ink) hover:border-(--palette-line-strong)',
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
