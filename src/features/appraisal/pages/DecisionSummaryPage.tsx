import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppraisalId, useWorkflowInstanceId, useActivityId, useIsTaskOwner, useAppraisalIsPma, useAppraisalFacilityLimit, useAppraisalHasAppraisalBook, useAppraisalContext } from '@/features/appraisal/context/AppraisalContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { formatNumber } from '@/shared/utils/formatUtils';
import { FormProvider, FormFields, type FormField } from '@/shared/components/form';
import { FormReadOnlyContext } from '@/shared/components/form/context';

import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useGetDecisionSummary, useSaveDecisionSummary } from '../api/decisionSummary';
import { useCompleteActivity, useGetActivityActions } from '../api/workflow';
import {
  decisionSummaryFormDefaults,
  decisionSummaryFormSchema,
  type DecisionSummaryFormType,
} from '../schemas/decisionSummary';
import InlineSubSection from '@/shared/components/sections/InlineSubSection';
import GroupCard from '@/shared/components/sections/GroupCard';
import ApproachMatrixTable from '../components/summary/ApproachMatrixTable';
import BlockApproachMatrixTable from '../components/summary/BlockApproachMatrixTable';
import BlockPriceSummaryTable from '../components/summary/BlockPriceSummaryTable';
import GovernmentPriceTable from '../components/summary/GovernmentPriceTable';
import ApprovalListSection from '../components/summary/ApprovalListSection';
import DecisionSection from '../components/summary/DecisionSection';

// ==================== Field Definitions ====================

const CONDITION_TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'special', label: 'Special' },
  { value: 'other', label: 'Other' },
];

const REMARK_TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'special', label: 'Special' },
  { value: 'other', label: 'Other' },
];

const OPINION_TYPE_OPTIONS = [
  { value: 'agree', label: 'Agree' },
  { value: 'disagree', label: 'Disagree' },
  { value: 'conditional', label: 'Conditional' },
];

const priceVerificationFields: FormField[] = [
  {
    type: 'boolean-toggle',
    name: 'isPriceVerified',
    label: 'Price Verification',
    options: ['Not Verified', 'Verified'],
  },
];

const conditionFields: FormField[] = [
  {
    type: 'dropdown',
    name: 'conditionType',
    label: 'Condition Type',
    options: CONDITION_TYPE_OPTIONS,
    placeholder: 'Select condition type...',
  },
  {
    type: 'textarea',
    name: 'condition',
    label: 'Condition Details',
    placeholder: 'Enter condition details...',
  },
];

const remarkFields: FormField[] = [
  {
    type: 'dropdown',
    name: 'remarkType',
    label: 'Remark Type',
    options: REMARK_TYPE_OPTIONS,
    placeholder: 'Select remark type...',
  },
  {
    type: 'textarea',
    name: 'remark',
    label: 'Remark Details',
    placeholder: 'Enter remark...',
  },
];

const appraiserOpinionFields: FormField[] = [
  {
    type: 'dropdown',
    name: 'appraiserOpinionType',
    label: 'Opinion Type',
    options: OPINION_TYPE_OPTIONS,
    placeholder: 'Select opinion type...',
  },
  {
    type: 'textarea',
    name: 'appraiserOpinion',
    label: 'Appraiser Opinion',
    placeholder: 'Enter appraiser opinion...',
  },
];

const committeeOpinionFields: FormField[] = [
  {
    type: 'dropdown',
    name: 'committeeOpinionType',
    label: 'Opinion Type',
    options: OPINION_TYPE_OPTIONS,
    required: true,
    placeholder: 'Select opinion type...',
  },
  {
    type: 'textarea',
    name: 'committeeOpinion',
    label: 'Committee Opinion',
    required: true,
    placeholder: 'Enter committee opinion...',
  },
];

const reviewPriceFields: FormField[] = [
  {
    type: 'number-input',
    name: 'totalAppraisalPriceReview',
    label: 'Total Appraisal Price (Review)',
    decimalPlaces: 2,
    wrapperClassName: 'col-span-1',
  },
];

const additionalAssumptionsFields: FormField[] = [
  {
    type: 'textarea',
    name: 'additionalAssumptions',
    label: 'Details',
    placeholder: 'Enter additional or special assumptions...',
  },
];

// ==================== Section Visibility Config ====================

type SectionKey =
  | 'decisionApproach'
  | 'priceSummary'
  | 'priceVerification'
  | 'governmentPrice'
  | 'condition'
  | 'remark'
  | 'appraiserOpinion'
  | 'committeeOpinion'
  | 'reviewPrices'
  | 'additionalAssumptions'
  | 'committeeApproval';

interface ActivitySectionConfig {
  sections: SectionKey[];
  readOnly?: boolean;
  editableSections?: SectionKey[];
}

const ACTIVITY_SECTION_CONFIG: Record<string, ActivitySectionConfig> = {
  'appraisal-initiation-check': { sections: [] },
  'appraisal-initiation':       { sections: [] },
  'appraisal-assignment':        { sections: [] },
  'ext-appraisal-assignment':    { sections: [] },
  'ext-appraisal-execution':     { sections: ['decisionApproach', 'priceSummary', 'governmentPrice', 'appraiserOpinion', 'additionalAssumptions'] },
  'ext-appraisal-check':         { sections: ['decisionApproach', 'priceSummary', 'governmentPrice', 'appraiserOpinion', 'additionalAssumptions'], readOnly: true },
  'ext-appraisal-verification':  { sections: ['decisionApproach', 'priceSummary', 'governmentPrice', 'appraiserOpinion', 'additionalAssumptions'], readOnly: true },
  'appraisal-book-verification': { sections: ['decisionApproach', 'priceSummary', 'priceVerification', 'governmentPrice', 'condition', 'remark', 'appraiserOpinion', 'committeeOpinion', 'reviewPrices', 'additionalAssumptions'], readOnly: true, editableSections: ['priceVerification', 'condition', 'remark', 'appraiserOpinion', 'committeeOpinion', 'reviewPrices', 'additionalAssumptions'] },
  'int-appraisal-execution':     { sections: ['decisionApproach', 'priceSummary', 'governmentPrice', 'condition', 'remark', 'appraiserOpinion', 'committeeOpinion', 'additionalAssumptions'] },
  'int-appraisal-check':         { sections: ['decisionApproach', 'priceSummary', 'priceVerification', 'governmentPrice', 'condition', 'remark', 'appraiserOpinion', 'committeeOpinion', 'reviewPrices', 'additionalAssumptions'], readOnly: true },
  'int-appraisal-verification':  { sections: ['decisionApproach', 'priceSummary', 'priceVerification', 'governmentPrice', 'condition', 'remark', 'appraiserOpinion', 'committeeOpinion', 'reviewPrices', 'additionalAssumptions'], readOnly: true },
  'pending-approval':            { sections: ['committeeApproval'] },
};

/** Wraps children with FormReadOnlyContext override when forceReadOnly is true */
const SectionReadOnlyWrap = ({
  forceReadOnly,
  children,
}: {
  forceReadOnly: boolean;
  children: ReactNode;
}) =>
  forceReadOnly ? (
    <FormReadOnlyContext.Provider value={true}>{children}</FormReadOnlyContext.Provider>
  ) : (
    <>{children}</>
  );

// ==================== Page Component ====================

const DecisionSummaryPage = () => {
  const navigate = useNavigate();
  const appraisalId = useAppraisalId();
  const isReadOnly = usePageReadOnly();
  const workflowInstanceId = useWorkflowInstanceId();
  const activityId = useActivityId();
  const isTaskOwner = useIsTaskOwner();

  // Section visibility by activity
  const sectionConfig = activityId
    ? ACTIVITY_SECTION_CONFIG[activityId] ?? { sections: [] }
    : null; // null = no activityId = show all sections
  const showSection = (key: SectionKey) =>
    sectionConfig === null || sectionConfig.sections.includes(key);
  const isActivityReadOnly = sectionConfig?.readOnly ?? false;
  const shouldForceReadOnly = (key: SectionKey) =>
    !isReadOnly && isActivityReadOnly && !sectionConfig?.editableSections?.includes(key);
  const hasEditableSections =
    sectionConfig === null ? false : !sectionConfig.readOnly || (sectionConfig.editableSections?.length ?? 0) > 0;

  // Decision state (lifted from DecisionSection)
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [selectedAssigneeUserId, setSelectedAssigneeUserId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Routing variables from context (for appraisal-initiation refresh)
  const isPma = useAppraisalIsPma();
  const facilityLimit = useAppraisalFacilityLimit();
  const hasAppraisalBook = useAppraisalHasAppraisalBook();
  const { appraisal } = useAppraisalContext();

  // API hooks
  const { data, isLoading } = useGetDecisionSummary(appraisalId);
  const { mutate: saveSummary, isPending: isSaving } = useSaveDecisionSummary();
  const completeActivity = useCompleteActivity();
  const { data: actionsData } = useGetActivityActions(workflowInstanceId, activityId);

  const selectedAction = useMemo(
    () => (actionsData?.actions ?? []).find(a => a.value === selectedDecision) ?? null,
    [actionsData, selectedDecision],
  );

  const isManualAssignment =
    selectedAction?.assignmentMode === 'user' && !!selectedAction.targetActivityId;

  // Form setup
  const mapDataToForm = useMemo(() => {
    if (!data) return null;
    return {
      isPriceVerified: data.isPriceVerified ?? true,
      conditionType: data.conditionType ?? null,
      condition: data.condition ?? null,
      remarkType: data.remarkType ?? null,
      remark: data.remark ?? null,
      appraiserOpinionType: data.appraiserOpinionType ?? null,
      appraiserOpinion: data.appraiserOpinion ?? null,
      committeeOpinionType: data.committeeOpinionType ?? null,
      committeeOpinion: data.committeeOpinion ?? null,
      totalAppraisalPriceReview: data.totalAppraisalPriceReview ?? null,
      additionalAssumptions: data.additionalAssumptions ?? null,
    };
  }, [data]);

  const methods = useForm<DecisionSummaryFormType>({
    defaultValues: mapDataToForm ?? decisionSummaryFormDefaults,
    resolver: zodResolver(decisionSummaryFormSchema),
  });

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty },
  } = methods;

  const { blocker } = useUnsavedChangesWarning(isDirty);

  // When price verification is shown and set to Verified, lock appraiser
  // opinion and additional assumptions (no reasoning needed if price is verified).
  const isPriceVerifiedNow = watch('isPriceVerified');
  const priceVerifiedLock =
    (sectionConfig === null || sectionConfig.sections.includes('priceVerification')) &&
    isPriceVerifiedNow === true;
  // notVerifiedLock covers both false and null: server saves 0/0/0 for both.
  const notVerifiedLock =
    (sectionConfig === null || sectionConfig.sections.includes('priceVerification')) &&
    isPriceVerifiedNow !== true;

  // Track whether the user has toggled isPriceVerified after the data loaded.
  // This lets us distinguish "loaded as verified → show stored review values"
  // from "user toggled to verified → show current computed buildingInsurance".
  // useState (not useRef) so that the display value re-computes on change.
  const [isPriceVerifiedToggled, setIsPriceVerifiedToggled] = useState(false);
  // useRef to compare previous value without triggering extra renders.
  const prevIsPriceVerifiedNow = useRef(isPriceVerifiedNow);

  useEffect(() => {
    // Skip marking as toggled on the initial data load (reset propagation).
    if (prevIsPriceVerifiedNow.current !== isPriceVerifiedNow) {
      setIsPriceVerifiedToggled(true);
      prevIsPriceVerifiedNow.current = isPriceVerifiedNow;
    }
  }, [isPriceVerifiedNow]);

  // Reset the toggled flag whenever fresh data loads so the "show stored values"
  // path applies again on each page load / data refresh.
  useEffect(() => {
    if (mapDataToForm) {
      setIsPriceVerifiedToggled(false);
      // Mirror exactly what reset() will set so the toggle-tracking effect
      // does not misfire when the reset causes isPriceVerifiedNow to change.
      prevIsPriceVerifiedNow.current = mapDataToForm.isPriceVerified;
    }
  }, [mapDataToForm]);

  // When toggled to Not Verified (or null), zero out the editable review price.
  useEffect(() => {
    if (notVerifiedLock) {
      setValue('totalAppraisalPriceReview', 0, { shouldDirty: true });
    }
  }, [notVerifiedLock, setValue]);

  // Force Selling Price (Review) is derived = 70% of Total Appraisal Price (Review).
  const totalAppraisalPriceReviewNow = watch('totalAppraisalPriceReview');
  const forceSellingPriceReviewDerived =
    totalAppraisalPriceReviewNow != null ? totalAppraisalPriceReviewNow * 0.7 : null;

  // Building Insurance (Review) display value:
  // - Not verified (false/null): 0 — matches what backend will persist.
  // - Verified, page just loaded: show stored buildingInsuranceReview.
  // - Verified, user toggled to verified this session: show computed buildingInsurance.
  const buildingInsuranceReviewDisplay = notVerifiedLock
    ? 0
    : isPriceVerifiedToggled
      ? (data?.buildingInsurance ?? 0)
      : (data?.buildingInsuranceReview ?? 0);

  const anyVisible = (...keys: SectionKey[]) => keys.some(showSection);
  const EmptyLine = ({ text }: { text: string }) => (
    <p className="text-sm text-gray-500 py-2">{text}</p>
  );

  useEffect(() => {
    if (mapDataToForm) {
      reset(mapDataToForm);
    }
  }, [mapDataToForm, reset]);

  const doCompleteActivity = () => {
    const targetId = selectedAction?.targetActivityId;
    const overrides =
      isManualAssignment && selectedAssigneeUserId && targetId
        ? { [targetId]: { runtimeAssignee: selectedAssigneeUserId } }
        : undefined;

    completeActivity.mutate(
      {
        workflowInstanceId: workflowInstanceId!,
        activityId: activityId!,
        input: {
          decisionTaken: selectedDecision!,
          comments,
          // For appraisal-initiation: refresh routing variables after maker edits
          ...(activityId === 'appraisal-initiation' && {
            isPma,
            facilityLimit,
            priority: appraisal?.priority ?? 'normal',
            hasAppraisalBook,
          }),
        },
        nextAssignmentOverrides: overrides,
      },
      {
        onSuccess: (result) => {
          setIsConfirmOpen(false);
          if (result.validationErrors && result.validationErrors.length > 0) {
            result.validationErrors.forEach(err => toast.error(err));
            return;
          }
          toast.success('Decision submitted successfully');
          navigate('/tasks');
        },
        onError: (error: any) => {
          setIsConfirmOpen(false);
          const message = error?.response?.data?.detail || error?.message || 'Failed to submit decision';
          toast.error(message);
        },
      },
    );
  };

  const onSubmit = (formData: DecisionSummaryFormType) => {
    const canComplete = isTaskOwner && workflowInstanceId && activityId && selectedDecision;

    // Guard: if this user is the task owner, ensure actions have loaded and the picked
    // decision resolves to a known action — otherwise a manual-mode action could silently
    // submit as system mode while the actions API is still in flight.
    if (canComplete && (!actionsData || !selectedAction)) {
      setIsConfirmOpen(false);
      toast.error('Loading decision options, please try again in a moment.');
      return;
    }

    if (isManualAssignment && !selectedAssigneeUserId) {
      setIsConfirmOpen(false);
      toast.error('Please select the next assignee before submitting.');
      return;
    }

    if (appraisalId) {
      // Normal path: save summary first, then optionally complete activity
      saveSummary(
        { appraisalId, body: formData },
        {
          onSuccess: () => {
            if (canComplete) {
              doCompleteActivity();
            } else {
              setIsConfirmOpen(false);
              toast.success('Decision summary saved successfully');
            }
          },
          onError: (error: any) => {
            setIsConfirmOpen(false);
            toast.error(
              error.apiError?.detail || 'Failed to save decision summary. Please try again.',
            );
          },
        },
      );
    } else {
      // No appraisal yet: skip summary save, complete activity directly
      if (canComplete) {
        doCompleteActivity();
      }
    }
  };

  const handleCancel = () => {
    if (data) {
      reset({
        isPriceVerified: data.isPriceVerified ?? true,
        conditionType: data.conditionType ?? null,
        condition: data.condition ?? null,
        remarkType: data.remarkType ?? null,
        remark: data.remark ?? null,
        appraiserOpinionType: data.appraiserOpinionType ?? null,
        appraiserOpinion: data.appraiserOpinion ?? null,
        committeeOpinionType: data.committeeOpinionType ?? null,
        committeeOpinion: data.committeeOpinion ?? null,
        totalAppraisalPriceReview: data.totalAppraisalPriceReview ?? null,
        additionalAssumptions: data.additionalAssumptions ?? null,
      });
    } else {
      reset(decisionSummaryFormDefaults);
    }
  };

  if (appraisalId && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <FormProvider methods={methods} schema={decisionSummaryFormSchema}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="flex flex-col gap-6 pb-6 pr-4">

              {/* Group A — Valuation */}
              {anyVisible('decisionApproach', 'priceSummary', 'governmentPrice') && (
                <GroupCard icon="scale-balanced" iconColor="teal" title="Valuation">
                    {showSection('decisionApproach') && (
                      <InlineSubSection title="Decision Approach">
                        {data?.isBlock ? (
                          <BlockApproachMatrixTable
                            rows={data.blockApproachMatrix ?? []}
                            projectTotal={data.totalAppraisalPrice ?? 0}
                          />
                        ) : data?.approachMatrix?.length ? (
                          <ApproachMatrixTable groups={data.approachMatrix} />
                        ) : (
                          <EmptyLine text="No approach data available." />
                        )}
                      </InlineSubSection>
                    )}
                    {showSection('priceSummary') && (
                      <InlineSubSection title="Appraisal Price Summary">
                        {data?.isBlock ? (
                          <BlockPriceSummaryTable
                            rows={data.blockModelPrices ?? []}
                            projectTotal={data.totalAppraisalPrice ?? 0}
                            forceSellingPrice={data.forceSellingPrice ?? 0}
                            buildingInsurance={data.buildingInsurance ?? 0}
                          />
                        ) : (
                          <div className="grid grid-cols-3 gap-6">
                            <ReadOnlyField label="Total Appraisal Price" value={data?.totalAppraisalPrice} />
                            <ReadOnlyField label="Force Selling Price" value={data?.forceSellingPrice} />
                            <ReadOnlyField label="Building Insurance" value={data?.buildingInsurance} />
                          </div>
                        )}
                      </InlineSubSection>
                    )}
                    {showSection('governmentPrice') && (
                      <InlineSubSection
                        title="Government Appraisal Price"
                        rightSlot={data?.governmentPrices ? `(${data.governmentPrices.length})` : undefined}
                      >
                        {data?.governmentPrices?.length
                          ? <GovernmentPriceTable
                              rows={data.governmentPrices}
                              totalArea={data.governmentPriceTotalArea ?? 0}
                              avgPerSqWa={data.governmentPriceAvgPerSqWa ?? 0}
                            />
                          : <EmptyLine text="No government price data available." />}
                      </InlineSubSection>
                    )}
                </GroupCard>
              )}

              {/* Group B — Review & Opinions */}
              {anyVisible('priceVerification', 'reviewPrices', 'condition', 'remark', 'appraiserOpinion', 'committeeOpinion', 'additionalAssumptions') && (
                <GroupCard icon="users" iconColor="cyan" title="Review & Opinions">
                    {showSection('priceVerification') && (
                      <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('priceVerification')}>
                        <InlineSubSection title="Price Verification">
                          <FormFields fields={priceVerificationFields} />
                        </InlineSubSection>
                      </SectionReadOnlyWrap>
                    )}
                    {showSection('reviewPrices') && (
                      <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('reviewPrices') || notVerifiedLock}>
                        <InlineSubSection title="Review Prices">
                          <div className="grid grid-cols-3 gap-6">
                            <FormFields fields={reviewPriceFields} />
                            <ReadOnlyField
                              label="Force Selling Price (Review)"
                              value={notVerifiedLock ? 0 : forceSellingPriceReviewDerived}
                            />
                            <ReadOnlyField
                              label="Building Insurance (Review)"
                              value={buildingInsuranceReviewDisplay}
                            />
                          </div>
                        </InlineSubSection>
                      </SectionReadOnlyWrap>
                    )}
                    {showSection('condition') && (
                      <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('condition')}>
                        <InlineSubSection title="Condition">
                          <FormFields fields={conditionFields} />
                        </InlineSubSection>
                      </SectionReadOnlyWrap>
                    )}
                    {showSection('remark') && (
                      <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('remark')}>
                        <InlineSubSection title="Remark">
                          <FormFields fields={remarkFields} />
                        </InlineSubSection>
                      </SectionReadOnlyWrap>
                    )}
                    {showSection('appraiserOpinion') && (
                      <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('appraiserOpinion') || priceVerifiedLock}>
                        <InlineSubSection title="Summary of Appraiser Opinions">
                          <FormFields fields={appraiserOpinionFields} />
                        </InlineSubSection>
                      </SectionReadOnlyWrap>
                    )}
                    {showSection('committeeOpinion') && (
                      <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('committeeOpinion')}>
                        <InlineSubSection title="Summary of Appraisal Price Committee Opinions">
                          <FormFields fields={committeeOpinionFields} />
                        </InlineSubSection>
                      </SectionReadOnlyWrap>
                    )}
                    {showSection('additionalAssumptions') && (
                      <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('additionalAssumptions') || priceVerifiedLock}>
                        <InlineSubSection title="Additional / Special Assumptions">
                          <FormFields fields={additionalAssumptionsFields} />
                        </InlineSubSection>
                      </SectionReadOnlyWrap>
                    )}
                </GroupCard>
              )}

              {/* Committee Approval — standalone */}
              {showSection('committeeApproval') && (
                <ApprovalListSection
                  workflowInstanceId={workflowInstanceId}
                  activityId={activityId}
                />
              )}

              {/* Decision — standalone */}
              <DecisionSection
                selectedDecision={selectedDecision}
                onDecisionChange={setSelectedDecision}
                comments={comments}
                onCommentsChange={setComments}
                selectedAssigneeUserId={selectedAssigneeUserId}
                onAssigneeChange={setSelectedAssigneeUserId}
              />
            </div>
          </div>

          {/* 14. Sticky Footer */}
          {!isReadOnly && (
            <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 pr-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" type="button" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <div className="h-6 w-px bg-gray-200" />
                  {isDirty && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Unsaved changes
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  {hasEditableSections && (
                    <Button variant="outline" type="submit" disabled={!appraisalId || !isDirty || isSaving}>
                      <Icon style="regular" name="floppy-disk" className="size-4 mr-2" />
                      Save
                    </Button>
                  )}
                  <Button
                    type="button"
                    disabled={
                      isSaving ||
                      completeActivity.isPending ||
                      (isTaskOwner && !selectedDecision) ||
                      (isTaskOwner && !!selectedDecision && !selectedAction) ||
                      (isTaskOwner && isManualAssignment && !selectedAssigneeUserId)
                    }
                    onClick={() => setIsConfirmOpen(true)}
                  >
                    <Icon style="solid" name="paper-plane" className="size-4 mr-2" />
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      </FormProvider>

      <UnsavedChangesDialog blocker={blocker} />
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => handleSubmit(onSubmit)()}
        title="Submit Decision Summary"
        message="Are you sure you want to submit this decision summary?"
        confirmText="Submit"
        cancelText="Cancel"
        variant="primary"
        isLoading={isSaving || completeActivity.isPending}
      />
    </div>
  );
};

/** Read-only number display field — styled to match a disabled NumberInput */
const ReadOnlyField = ({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
    <div className="block px-3 py-2 border border-gray-200 rounded-lg text-sm text-right bg-gray-50 text-gray-500">
      {value != null ? formatNumber(value, 2) : '-'}
    </div>
  </div>
);

export default DecisionSummaryPage;
