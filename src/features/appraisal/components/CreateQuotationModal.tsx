import { type ReactNode, useMemo, useState } from 'react';
import clsx from 'clsx';
import { addHours, formatISO } from 'date-fns';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import DateTimePickerInput from '@/shared/components/inputs/DateTimePickerInput';
import NumberInput from '@/shared/components/inputs/NumberInput';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useCreateQuotation, useGetEligibleCompanies } from '../api/administration';
import { useAppealExclusionStore } from '@/features/collateralMaster/store/appealExclusionStore';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { MissingSegmentsBadge } from '@/features/quotation/components/SegmentBadges';
import {
  getSelectAllState,
  useCoveringCompanySearch,
} from '@/features/quotation/hooks/useCoveringCompanySearch';
import { useSegmentLabel } from '@/features/quotation/hooks/useSegmentLabel';
import { buildSegmentSet, getMissingSegments } from '@/features/quotation/utils/segmentCoverage';

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appraisalId: string;
  requestId?: string;
  workflowInstanceId?: string;
  bankingSegment?: string;
  /** True while the parent is still loading `bankingSegment`; the company list waits for it. */
  isSegmentLoading?: boolean;
  /** True when loading `bankingSegment` failed; the company list shows a load error instead. */
  isSegmentError?: boolean;
  onSuccess?: () => void;
  /** Optional slot rendered at the top of the modal body (used by QuotationEntryModal to inject the tab bar). */
  headerSlot?: ReactNode;
  assignmentType?: string | null;
  assignmentMethod?: string | null;
  internalFollowupAssignmentMethod?: string | null;
}

interface SelectedCompany {
  id: string;
  companyName: string;
  companyNameLocal?: string | null;
  loanTypes: string[];
}

const CreateQuotationModal = ({
  isOpen,
  onClose,
  appraisalId,
  requestId,
  workflowInstanceId,
  bankingSegment,
  isSegmentLoading,
  isSegmentError,
  onSuccess,
  headerSlot,
  assignmentType,
  assignmentMethod,
  internalFollowupAssignmentMethod,
}: CreateQuotationModalProps) => {
  const { t } = useTranslation(['appraisal', 'quotation']);
  const localizeCompanyName = useLocalizedCompanyName();
  const segmentLabel = useSegmentLabel();
  const [selectedCompanies, setSelectedCompanies] = useState<SelectedCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cutOffDateTime, setCutOffDateTime] = useState<string | null>(() =>
    formatISO(addHours(new Date(), 1)),
  );
  const [maxAppraisalDays, setMaxAppraisalDays] = useState<number | null>(null);
  const [remarks, setRemarks] = useState('');

  // Appeal exclusion: most-recent prior company id captured at collateral lookup time.
  // Wrapped in single-element array for the v1 plural-list contract on start-from-task.
  const excludedCompanyId = useAppealExclusionStore(s => s.excludedCompanyId);

  // Unfiltered fetch, then the same client-side Segment Coverage filter as the other pickers; the
  // list waits for the parent to finish loading the segment so it never flashes every company.
  // A blank segment is skipped by Segment Coverage (it covers everything).
  const segmentReady = !isSegmentLoading && !isSegmentError;
  const {
    data: rawCompanies,
    isLoading: isLoadingCompaniesQuery,
    isError: isCompaniesError,
  } = useGetEligibleCompanies(undefined, isOpen && segmentReady, false);
  const isLoadingCompanies = isLoadingCompaniesQuery || !!isSegmentLoading;

  const segmentSet = useMemo(() => buildSegmentSet([bankingSegment]), [bankingSegment]);

  // Map raw company data to the SelectedCompany shape, filtering out the appeal-excluded company
  const allCompanies: SelectedCompany[] = useMemo(
    () =>
      // A cached full list may exist even though the query is disabled; never show it while the
      // segment is loading or failed.
      segmentReady
        ? (rawCompanies ?? [])
            .filter(c => c.id !== excludedCompanyId)
            .map(c => ({
              id: c.id,
              companyName: c.companyName,
              companyNameLocal: c.companyNameLocal,
              loanTypes: c.loanTypes ?? [],
            }))
        : [],
    [rawCompanies, excludedCompanyId, segmentReady],
  );

  const {
    covering,
    filtered: companyList,
    noCoverage,
  } = useCoveringCompanySearch(allCompanies, segmentSet, searchQuery);

  const { mutate: startQuotation, isPending } = useCreateQuotation();

  const handleClose = () => {
    setSelectedCompanies([]);
    setSearchQuery('');
    setCutOffDateTime(null);
    setMaxAppraisalDays(null);
    setRemarks('');
    onClose();
  };

  const handleToggleCompany = (company: SelectedCompany) => {
    setSelectedCompanies(prev => {
      const isSelected = prev.some(c => c.id === company.id);
      return isSelected ? prev.filter(c => c.id !== company.id) : [...prev, company];
    });
  };

  const handleRemoveCompany = (companyId: string) => {
    setSelectedCompanies(prev => prev.filter(c => c.id !== companyId));
  };

  const handleSubmit = () => {
    if (selectedCompanies.length === 0 || !cutOffDateTime) return;
    if (!appraisalId || !requestId || !workflowInstanceId) {
      toast.error(t('toasts.quotationTaskContextMissing'));
      return;
    }

    // taskExecutionId is the workflow activityId (e.g. "appraisal-assignment"),
    // not a Guid — backend accepts it as optional since the original auto-complete
    // callback path was removed. We omit it rather than sending an invalid Guid.
    startQuotation(
      {
        appraisalId,
        requestId,
        workflowInstanceId,
        taskExecutionId: null,
        cutOffTime: cutOffDateTime,
        invitedCompanyIds: selectedCompanies.map(c => c.id),
        specialRequirements: remarks || null,
        maxAppraisalDays: maxAppraisalDays ?? null,
        assignmentType: assignmentType ?? null,
        assignmentMethod: assignmentMethod ?? null,
        internalFollowupAssignmentMethod: internalFollowupAssignmentMethod ?? null,
        // Appeal exclusion — most-recent prior company only; wrapped in array for v1 contract
        excludedCompanyIds: excludedCompanyId ? [excludedCompanyId] : null,
      },
      {
        onSuccess: () => {
          toast.success(t('toasts.quotationStarted'));
          handleClose();
          onSuccess?.();
        },
        onError: (err: any) => {
          toast.error(err?.apiError?.detail ?? 'Failed to start quotation');
        },
      },
    );
  };

  const isCompanySelected = (companyId: string) => selectedCompanies.some(c => c.id === companyId);
  const { allVisibleSelected, allChecked, indeterminate, hiddenSelected } = getSelectAllState(
    companyList,
    covering,
    selectedCompanies,
    searchQuery,
  );

  // Nothing to select, and nothing hidden to clear (or the list is loading / failed to load).
  const selectAllDisabled =
    isLoadingCompanies ||
    !segmentReady ||
    (companyList.length === 0 && hiddenSelected.length === 0);

  const handleToggleAllCompany = () => {
    setSelectedCompanies(prev => {
      // An empty visible list can still hide selected companies: clear them rather than add nothing.
      if (allVisibleSelected || companyList.length === 0) {
        const drop = new Set([...companyList, ...hiddenSelected].map(c => c.id));
        return prev.filter(c => !drop.has(c.id));
      }
      const ids = new Set(prev.map(c => c.id));
      return [...prev, ...companyList.filter(c => !ids.has(c.id))];
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request Quotation" size="lg">
      <div className="flex flex-col gap-5">
        {headerSlot}
        {/* Selected Companies Display */}
        {selectedCompanies.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Selected Companies ({selectedCompanies.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedCompanies.map(company => (
                <div
                  key={company.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm"
                >
                  <Icon name="building" style="solid" className="size-3.5" />
                  <span className="font-medium">
                    {localizeCompanyName(company.companyName, company.companyNameLocal)}
                  </span>
                  <MissingSegmentsBadge
                    missing={getMissingSegments(segmentSet, company.loanTypes)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCompany(company.id)}
                    className="p-0.5 rounded-full hover:bg-purple-200 transition-colors"
                  >
                    <Icon name="xmark" style="solid" className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Company Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Select External Companies <span className="text-danger">*</span>
          </label>
          {segmentSet.length > 0 && (
            <p className="text-xs text-purple-600 mb-1.5 flex items-center gap-1">
              <Icon name="circle-info" style="solid" className="size-3.5" />
              {t('quotation.editDraft.showingEligibleFor', {
                segment: segmentLabel(segmentSet[0]),
              })}
            </p>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex p-2 border-b border-gray-100">
              <button
                type="button"
                role="checkbox"
                aria-checked={indeterminate ? 'mixed' : allChecked}
                aria-label={t('quotation:aria.selectAllVisibleCompanies')}
                disabled={selectAllDisabled}
                onClick={() => handleToggleAllCompany()}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  allChecked
                    ? 'bg-purple-50 enabled:hover:bg-purple-100'
                    : 'enabled:hover:bg-gray-50',
                )}
              >
                <div
                  className={clsx(
                    'size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                    allChecked || indeterminate
                      ? 'bg-purple-500 border-purple-500'
                      : 'border-gray-300 bg-white',
                  )}
                >
                  {allChecked && <Icon name="check" style="solid" className="size-3 text-white" />}
                  {indeterminate && <span className="h-0.5 w-2.5 rounded bg-white" />}
                </div>
              </button>
              <div className="relative w-full">
                <Icon
                  name="magnifying-glass"
                  style="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search company name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border-0 focus:ring-0 outline-none"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {isLoadingCompanies ? (
                <div className="px-4 py-6 text-center text-gray-500">
                  <Icon
                    name="spinner"
                    style="solid"
                    className="w-4 h-4 animate-spin mx-auto mb-1"
                  />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : companyList.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                  {isSegmentError
                    ? t('quotation.segmentLoadFailed')
                    : isCompaniesError
                      ? t('quotation.editDraft.failedToLoadCompanies')
                      : noCoverage
                        ? t('quotation.editDraft.noCoveringCompanies')
                        : t('quotation.editDraft.noCompaniesFound')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {companyList.map(company => {
                    const isSelected = isCompanySelected(company.id);
                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => handleToggleCompany(company)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                          isSelected ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50',
                        )}
                      >
                        <div
                          className={clsx(
                            'size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-gray-300 bg-white',
                          )}
                        >
                          {isSelected && (
                            <Icon name="check" style="solid" className="size-3 text-white" />
                          )}
                        </div>
                        <div className="size-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <Icon name="building" style="solid" className="size-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {localizeCompanyName(company.companyName, company.companyNameLocal)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cut-off Date & Time */}
        <div>
          <DateTimePickerInput
            label="Cut-off Date & Time"
            required
            helperText="The deadline for companies to submit their quotation responses"
            placeholder="dd/mm/yyyy hh:mm"
            value={cutOffDateTime}
            onChange={setCutOffDateTime}
            disablePastDates
          />
        </div>

        {/* Max Appraisal Duration — admin-set cap, companies must not exceed this on Submit */}
        <div>
          <NumberInput
            label="Max Appraisal Duration (Day)"
            helperText="Maximum duration you allow the appraiser to complete this appraisal. Companies' estimated mandays must not exceed this value."
            placeholder="e.g. 7"
            value={maxAppraisalDays}
            decimalPlaces={0}
            thousandSeparator={false}
            maxIntegerDigits={3}
            min={1}
            onChange={e => setMaxAppraisalDays(e.target.value)}
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Special Requirements <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Add any special instructions or requirements..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{remarks.length}/500</p>
        </div>

        {/* Context warning if required fields are missing */}
        {(!requestId || !workflowInstanceId) && (
          <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
            <Icon
              name="triangle-exclamation"
              style="solid"
              className="size-4 text-amber-500 shrink-0 mt-0.5"
            />
            <p className="text-xs text-amber-700">
              This quotation must be started from an active admin workflow task. Make sure you have
              opened this page from the task list.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedCompanies.length === 0 || !cutOffDateTime || isPending}
          >
            {isPending ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Icon name="file-circle-plus" style="solid" className="size-4 mr-2" />
                Start Quotation
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateQuotationModal;
