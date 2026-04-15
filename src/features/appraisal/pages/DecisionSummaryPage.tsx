import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppraisalId, useWorkflowInstanceId, useActivityId, useIsTaskOwner, useAppraisalIsPma, useAppraisalFacilityLimit, useAppraisalHasAppraisalBook, useAppraisalContext } from '@/features/appraisal/context/AppraisalContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { formatNumber } from '@/shared/utils/formatUtils';
import { FormProvider, FormFields, type FormField } from '@/shared/components/form';

import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useGetDecisionSummary, useSaveDecisionSummary } from '../api/decisionSummary';
import { useCompleteActivity } from '../api/workflow';
import {
  decisionSummaryFormDefaults,
  decisionSummaryFormSchema,
  type DecisionSummaryFormType,
} from '../schemas/decisionSummary';
import ApproachMatrixTable from '../components/summary/ApproachMatrixTable';
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

// ==================== Page Component ====================

const DecisionSummaryPage = () => {
  const navigate = useNavigate();
  const appraisalId = useAppraisalId();
  const isReadOnly = usePageReadOnly();
  const workflowInstanceId = useWorkflowInstanceId();
  const activityId = useActivityId();
  const isTaskOwner = useIsTaskOwner();

  // Decision state (lifted from DecisionSection)
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [comments, setComments] = useState('');
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

  // Form setup
  const mapDataToForm = useMemo(() => {
    if (!data) return null;
    return {
      isPriceVerified: data.isPriceVerified ?? null,
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
    formState: { isDirty },
  } = methods;

  const { blocker } = useUnsavedChangesWarning(isDirty);

  useEffect(() => {
    if (mapDataToForm) {
      reset(mapDataToForm);
    }
  }, [mapDataToForm, reset]);

  const doCompleteActivity = () => {
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
        isPriceVerified: data.isPriceVerified ?? null,
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
              {/* 1. Decision Approach */}
              <FormCard title="Decision Approach" icon="table-cells" iconColor="teal">
                {data?.approachMatrix && data.approachMatrix.length > 0 ? (
                  <ApproachMatrixTable groups={data.approachMatrix} />
                ) : (
                  <p className="text-sm text-gray-500">No approach data available.</p>
                )}
              </FormCard>

              {/* 3. Total Appraisal Price / Force Selling Price / Building Insurance */}
              <FormCard title="Appraisal Price Summary" icon="coins" iconColor="amber">
                <div className="grid grid-cols-3 gap-6">
                  <ReadOnlyField label="Total Appraisal Price" value={data?.totalAppraisalPrice} />
                  <ReadOnlyField label="Force Selling Price" value={data?.forceSellingPrice} />
                  <ReadOnlyField label="Building Insurance" value={data?.buildingInsurance} />
                </div>
              </FormCard>

              {/* 4. Price Verification */}
              <FormCard title="Price Verification" icon="badge-check" iconColor="emerald">
                <FormFields fields={priceVerificationFields} />
              </FormCard>

              {/* 5. Government Appraisal Price */}
              <FormCard
                title={`Government Appraisal Price${data?.governmentPrices ? ` (${data.governmentPrices.length})` : ''}`}
                icon="landmark"
                iconColor="teal"
              >
                {data?.governmentPrices && data.governmentPrices.length > 0 ? (
                  <GovernmentPriceTable
                    rows={data.governmentPrices}
                    totalArea={data.governmentPriceTotalArea ?? 0}
                    avgPerSqWa={data.governmentPriceAvgPerSqWa ?? 0}
                  />
                ) : (
                  <p className="text-sm text-gray-500">No government price data available.</p>
                )}
              </FormCard>

              {/* 6. Condition */}
              <FormCard title="Condition" icon="clipboard-list" iconColor="blue">
                <div className="space-y-4">
                  <FormFields fields={conditionFields} />
                </div>
              </FormCard>

              {/* 7. Remark */}
              <FormCard title="Remark" icon="message-lines" iconColor="purple">
                <div className="space-y-4">
                  <FormFields fields={remarkFields} />
                </div>
              </FormCard>

              {/* 8. Summary of Appraiser Opinions */}
              <FormCard title="Summary of Appraiser Opinions" icon="user-pen" iconColor="cyan">
                <div className="space-y-4">
                  <FormFields fields={appraiserOpinionFields} />
                </div>
              </FormCard>

              {/* 9. Summary of Appraisal Price Committee Opinions */}
              <FormCard
                title="Summary of Appraisal Price Committee Opinions"
                icon="users"
                iconColor="orange"
              >
                <div className="space-y-4">
                  <FormFields fields={committeeOpinionFields} />
                </div>
              </FormCard>

              {/* 10. Review Prices */}
              <FormCard title="Review Prices" icon="magnifying-glass-dollar" iconColor="amber">
                <div className="grid grid-cols-3 gap-6">
                  <FormFields fields={reviewPriceFields} />
                  <ReadOnlyField
                    label="Force Selling Price (Review)"
                    value={data?.forceSellingPriceReview}
                  />
                  <ReadOnlyField
                    label="Building Insurance (Review)"
                    value={data?.buildingInsuranceReview}
                  />
                </div>
              </FormCard>

              {/* 11. Additional / Special Assumptions */}
              <FormCard title="Additional / Special Assumptions" icon="lightbulb" iconColor="amber">
                <FormFields fields={additionalAssumptionsFields} />
              </FormCard>

              {/* 12. Committee Approval */}
              <ApprovalListSection
                workflowInstanceId={workflowInstanceId}
                activityId={activityId}
              />

              {/* 13. Decision */}
              <DecisionSection
                selectedDecision={selectedDecision}
                onDecisionChange={setSelectedDecision}
                comments={comments}
                onCommentsChange={setComments}
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
                  <Button variant="outline" type="submit" disabled={!appraisalId || !isDirty || isSaving}>
                    <Icon style="regular" name="floppy-disk" className="size-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    type="button"
                    disabled={isSaving || completeActivity.isPending || (isTaskOwner && !selectedDecision)}
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

/** Read-only number display field */
const ReadOnlyField = ({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
      {value != null ? formatNumber(value, 2) : '-'}
    </div>
  </div>
);

export default DecisionSummaryPage;
