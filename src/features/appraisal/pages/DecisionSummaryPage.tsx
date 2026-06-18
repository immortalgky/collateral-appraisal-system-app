import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ActivityCompletionChecklist from '../components/ActivityCompletionChecklist';
import ActivityCompletionErrors from '../components/ActivityCompletionErrors';
import { useActivityProgressStore } from '../store/activityProgressStore';
import type { StructuredValidationError, StructuredWarning } from '../api/workflow';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useAppraisalId,
  useWorkflowInstanceId,
  useActivityId,
  useIsTaskOwner,
  useAppraisalIsPma,
  useAppraisalFacilityLimit,
  useAppraisalHasAppraisalBook,
  useAppraisalContext,
  useIsCiAppraisal,
} from '@/features/appraisal/context/AppraisalContext';
import { isTerminalStatus } from '@shared/config/navigationTypes';
import { HistorySearchMapDrawer } from '@/features/common/historySearch/HistorySearchMapDrawer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import Alert from '@/shared/components/Alert';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { formatNumber } from '@/shared/utils/formatUtils';
import { FormProvider, FormFields, type FormField } from '@/shared/components/form';
import { FormReadOnlyContext } from '@/shared/components/form/context';

import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useConnectionStatus } from '@/features/notification/hooks/useConnectionStatus';
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
import {
  LiveApprovalListSection,
  ApprovalHistorySection,
} from '../components/summary/ApprovalListSection';
import DecisionSection from '../components/summary/DecisionSection';
import ConstructionSummaryTable from '../components/summary/ConstructionSummaryTable';

// ==================== Field Definitions ====================

// Static fallback options (English) — replaced at render time via makeDecisionFields()
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

/** Build translated field definitions for DecisionSummaryPage */
const makeDecisionFields = (t: import('i18next').TFunction<'appraisal'>) => {
  const conditionTypeOptions = [
    { value: 'normal', label: t('decisionSummary.options.conditionType.normal') },
    { value: 'special', label: t('decisionSummary.options.conditionType.special') },
    { value: 'other', label: t('decisionSummary.options.conditionType.other') },
  ];
  const remarkTypeOptions = [
    { value: 'normal', label: t('decisionSummary.options.remarkType.normal') },
    { value: 'special', label: t('decisionSummary.options.remarkType.special') },
    { value: 'other', label: t('decisionSummary.options.remarkType.other') },
  ];
  const opinionTypeOptions = [
    { value: 'agree', label: t('decisionSummary.options.opinionType.agree') },
    { value: 'disagree', label: t('decisionSummary.options.opinionType.disagree') },
    { value: 'conditional', label: t('decisionSummary.options.opinionType.conditional') },
  ];
  return {
    priceVerificationFields: [
      {
        type: 'boolean-toggle' as const,
        name: 'isPriceVerified',
        label: t('decisionSummary.fields.priceVerification'),
        options: t('decisionSummary.fields.priceVerificationOptions', {
          returnObjects: true,
        }) as string[],
      },
    ],
    conditionFields: [
      {
        type: 'dropdown' as const,
        name: 'conditionType',
        label: t('decisionSummary.fields.conditionType'),
        options: conditionTypeOptions,
        placeholder: t('decisionSummary.fields.conditionTypePlaceholder'),
      },
      {
        type: 'textarea' as const,
        name: 'condition',
        label: t('decisionSummary.fields.conditionDetails'),
        placeholder: t('decisionSummary.fields.conditionDetailsPlaceholder'),
      },
    ],
    remarkFields: [
      {
        type: 'dropdown' as const,
        name: 'remarkType',
        label: t('decisionSummary.fields.remarkType'),
        options: remarkTypeOptions,
        placeholder: t('decisionSummary.fields.remarkTypePlaceholder'),
      },
      {
        type: 'textarea' as const,
        name: 'remark',
        label: t('decisionSummary.fields.remarkDetails'),
        placeholder: t('decisionSummary.fields.remarkPlaceholder'),
      },
    ],
    appraiserOpinionFields: [
      {
        type: 'dropdown' as const,
        name: 'appraiserOpinionType',
        label: t('decisionSummary.fields.opinionType'),
        options: opinionTypeOptions,
        placeholder: t('decisionSummary.fields.opinionTypePlaceholder'),
      },
      {
        type: 'textarea' as const,
        name: 'appraiserOpinion',
        label: t('decisionSummary.fields.appraiserOpinion'),
        placeholder: t('decisionSummary.fields.appraiserOpinionPlaceholder'),
      },
    ],
    committeeOpinionFields: [
      {
        type: 'dropdown' as const,
        name: 'committeeOpinionType',
        label: t('decisionSummary.fields.opinionType'),
        options: opinionTypeOptions,
        required: true,
        placeholder: t('decisionSummary.fields.opinionTypePlaceholder'),
      },
      {
        type: 'textarea' as const,
        name: 'committeeOpinion',
        label: t('decisionSummary.fields.committeeOpinion'),
        required: true,
        placeholder: t('decisionSummary.fields.committeeOpinionPlaceholder'),
      },
    ],
    reviewPriceFields: [
      {
        type: 'number-input' as const,
        name: 'totalAppraisalPriceReview',
        label: t('decisionSummary.fields.totalAppraisalPriceReview'),
        decimalPlaces: 2,
        wrapperClassName: 'col-span-1',
      },
    ],
    additionalAssumptionsFields: [
      {
        type: 'textarea' as const,
        name: 'additionalAssumptions',
        label: t('decisionSummary.fields.additionalAssumptionsDetails'),
        placeholder: t('decisionSummary.fields.additionalAssumptionsPlaceholder'),
      },
    ],
  };
};

// ==================== Section Visibility Config ====================

type SectionKey =
  | 'decisionApproach'
  | 'priceSummary'
  | 'constructionSummary'
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
  'appraisal-initiation': { sections: [] },
  'appraisal-assignment': { sections: [] },
  'ext-appraisal-assignment': { sections: [] },
  'int-pma-input': { sections: [] },
  'ext-appraisal-execution': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'governmentPrice',
      'appraiserOpinion',
      'additionalAssumptions',
    ],
  },
  'ext-appraisal-check': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'governmentPrice',
      'appraiserOpinion',
      'additionalAssumptions',
    ],
    readOnly: true,
  },
  'ext-appraisal-verification': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'governmentPrice',
      'appraiserOpinion',
      'additionalAssumptions',
    ],
    readOnly: true,
  },
  'appraisal-book-verification': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'priceVerification',
      'governmentPrice',
      'condition',
      'remark',
      'appraiserOpinion',
      'committeeOpinion',
      'reviewPrices',
      'additionalAssumptions',
    ],
    readOnly: true,
    editableSections: [
      'priceVerification',
      'condition',
      'remark',
      'appraiserOpinion',
      'committeeOpinion',
      'reviewPrices',
      'additionalAssumptions',
    ],
  },
  'int-appraisal-execution': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'governmentPrice',
      'condition',
      'remark',
      'appraiserOpinion',
      'committeeOpinion',
      'additionalAssumptions',
    ],
  },
  'int-appraisal-check': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'priceVerification',
      'governmentPrice',
      'condition',
      'remark',
      'appraiserOpinion',
      'committeeOpinion',
      'reviewPrices',
      'additionalAssumptions',
    ],
    readOnly: true,
  },
  'int-appraisal-verification': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'priceVerification',
      'governmentPrice',
      'condition',
      'remark',
      'appraiserOpinion',
      'committeeOpinion',
      'reviewPrices',
      'additionalAssumptions',
    ],
    readOnly: true,
  },
  'pending-approval': { sections: ['committeeApproval'] },
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

// ==================== Helpers ====================

/**
 * Splits an admin-authored warning message into individual sentence bullets.
 * Splits on '. ' (period-space) so single sentences pass through as one bullet.
 * Re-appends a period to each sentence so each reads as a complete statement.
 */
const splitWarningMessage = (message: string): string[] =>
  message
    .split(/\.\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => (s.endsWith('.') ? s : `${s}.`));

// ==================== Page Component ====================

const DecisionSummaryPage = () => {
  const { t } = useTranslation('appraisal');
  const fields = makeDecisionFields(t);
  const navigate = useNavigate();
  const appraisalId = useAppraisalId();
  const isReadOnly = usePageReadOnly();
  const workflowInstanceId = useWorkflowInstanceId();
  const activityId = useActivityId();
  const isTaskOwner = useIsTaskOwner();

  // Section visibility by activity
  const sectionConfig = activityId
    ? (ACTIVITY_SECTION_CONFIG[activityId] ?? { sections: [] })
    : null; // null = no activityId = show all sections
  const showSection = (key: SectionKey) =>
    sectionConfig === null || sectionConfig.sections.includes(key);
  const isActivityReadOnly = sectionConfig?.readOnly ?? false;
  const shouldForceReadOnly = (key: SectionKey) =>
    !isReadOnly && isActivityReadOnly && !sectionConfig?.editableSections?.includes(key);
  const hasEditableSections =
    sectionConfig === null
      ? false
      : !sectionConfig.readOnly || (sectionConfig.editableSections?.length ?? 0) > 0;

  // Decision state (lifted from DecisionSection)
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [selectedAssigneeUserId, setSelectedAssigneeUserId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isHistorySearchOpen, setIsHistorySearchOpen] = useState(false);
  const [failures, setFailures] = useState<StructuredValidationError[]>([]);
  const [warnings, setWarnings] = useState<StructuredWarning[]>([]);
  const resetProgressStore = useActivityProgressStore(s => s.reset);

  // Routing variables from context (for appraisal-initiation refresh)
  const isPma = useAppraisalIsPma();
  const facilityLimit = useAppraisalFacilityLimit();
  const hasAppraisalBook = useAppraisalHasAppraisalBook();
  const { appraisal } = useAppraisalContext();
  const isCiAppraisal = useIsCiAppraisal();

  // API hooks
  const { data, isLoading } = useGetDecisionSummary(appraisalId);
  const { mutate: saveSummary, isPending: isSaving } = useSaveDecisionSummary();
  const completeActivity = useCompleteActivity();
  // SignalR hub status — when not connected, live step progress won't arrive, so the
  // submitting fallback message is adjusted instead of waiting on step animations.
  const hubStatus = useConnectionStatus();
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

  const doCompleteActivity = (acknowledgedWarningTokens?: string[]) => {
    const isAckCall = acknowledgedWarningTokens !== undefined;
    // On a fresh (non-ack) call, reset all prior feedback.
    // On an ack re-call, only reset failures so the warning panel stays visible
    // until the server responds.
    setFailures([]);
    if (!isAckCall) {
      setWarnings([]);
    }
    resetProgressStore();

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
        acknowledgedWarningTokens,
      },
      {
        onSuccess: result => {
          if (result.status === 'WarningsRequireAcknowledgement') {
            // Non-blocking warnings — keep dialog open and show warning panel
            setWarnings(result.warnings ?? []);
            return;
          }
          if (result.status === 'ValidationFailed' || result.status === 'Failed') {
            // Keep dialog open; show structured errors in the panel
            const errs = result.validationErrors ?? [];
            if (errs.length > 0) {
              setFailures(errs);
            } else {
              setFailures([
                { stepName: '', errorCode: '', message: t('decisionSummary.toasts.submitFailed') },
              ]);
            }
            return;
          }
          // Success — close dialog and navigate away
          setWarnings([]);
          setIsConfirmOpen(false);
          toast.success(t('decisionSummary.toasts.submitted'));
          navigate('/tasks');
        },
        onError: (error: unknown) => {
          // Keep dialog open; show the error in the panel
          const apiErr = (error as { apiError?: { detail?: string; stepName?: string; errorCode?: string } })
            ?.apiError;
          setFailures([
            {
              stepName: apiErr?.stepName ?? '',
              errorCode: apiErr?.errorCode ?? '',
              message:
                apiErr?.detail ??
                (error as { message?: string })?.message ??
                t('decisionSummary.toasts.submitFailed'),
            },
          ]);
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
      toast.error(t('administration.toasts.loadingActions'));
      return;
    }

    if (isManualAssignment && !selectedAssigneeUserId) {
      setIsConfirmOpen(false);
      toast.error(t('administration.toasts.selectAssignee'));
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
              toast.success(t('decisionSummary.toasts.saved'));
            }
          },
          onError: (error: any) => {
            setIsConfirmOpen(false);
            toast.error(error.apiError?.detail || t('decisionSummary.toasts.saveFailed'));
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
                <GroupCard
                  icon="scale-balanced"
                  iconColor="teal"
                  title={t('decisionSummary.sections.valuation')}
                  rightSlot={
                    data?.appraisalDate ? (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-sm leading-none">🗓️</span>
                        <span>{t('decisionSummary.appraisalDate')}</span>
                        <span className="font-semibold text-gray-700">
                          {new Date(data.appraisalDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    ) : undefined
                  }
                >
                  {showSection('priceSummary') && (
                    <div className="py-4">
                      {data?.isBlock ? (
                        <BlockPriceSummaryTable
                          rows={data.blockModelPrices ?? []}
                          projectTotal={data.totalAppraisalPrice ?? 0}
                          forceSellingPrice={data.forceSellingPrice ?? 0}
                          buildingInsurance={data.buildingInsurance ?? 0}
                        />
                      ) : (
                        <div className="grid grid-cols-3 gap-6">
                          <div className="text-left">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                              {t('decisionSummary.fields.totalAppraisalPrice')}
                            </p>
                            <p className="text-xl font-semibold tabular-nums text-teal-700 mt-1">
                              {data?.totalAppraisalPrice != null
                                ? formatNumber(data.totalAppraisalPrice, 2)
                                : '-'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                              {t('decisionSummary.fields.forceSellingPrice')}
                            </p>
                            <p className="text-xl font-semibold tabular-nums text-amber-700 mt-1">
                              {data?.forceSellingPrice != null
                                ? formatNumber(data.forceSellingPrice, 2)
                                : '-'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {t('decisionSummary.fields.forceSellingPriceHint')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                              {t('decisionSummary.fields.buildingInsurance')}
                            </p>
                            <p className="text-xl font-semibold tabular-nums text-gray-700 mt-1">
                              {data?.buildingInsurance != null
                                ? formatNumber(data.buildingInsurance, 2)
                                : '-'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {t('decisionSummary.fields.buildingInsuranceHint')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {showSection('decisionApproach') && (
                    <InlineSubSection title={t('decisionSummary.fields.decisionApproach')}>
                      {data?.isBlock ? (
                        <BlockApproachMatrixTable
                          rows={data.blockApproachMatrix ?? []}
                          projectTotal={data.totalAppraisalPrice ?? 0}
                        />
                      ) : data?.approachMatrix?.length ? (
                        <ApproachMatrixTable groups={data.approachMatrix} />
                      ) : (
                        <EmptyLine text={t('decisionSummary.empty.noApproachData')} />
                      )}
                    </InlineSubSection>
                  )}
                  {showSection('governmentPrice') && (
                    <InlineSubSection
                      title={t('decisionSummaryPageExtra.governmentAppraisalPrice')}
                      rightSlot={
                        data?.governmentPrices ? `(${data.governmentPrices.length})` : undefined
                      }
                    >
                      {data?.governmentPrices?.length ? (
                        <GovernmentPriceTable
                          rows={data.governmentPrices}
                          totalArea={data.governmentPriceTotalArea ?? 0}
                          avgPerSqWa={data.governmentPriceAvgPerSqWa ?? 0}
                        />
                      ) : (
                        <EmptyLine text={t('decisionSummary.empty.noGovernmentPrice')} />
                      )}
                    </InlineSubSection>
                  )}
                </GroupCard>
              )}

              {/* Construction Summary — only on Construction Inspection appraisals */}
              {isCiAppraisal && showSection('constructionSummary') && data?.constructionSummary && (
                <GroupCard icon="helmet-safety" iconColor="yellow" title={t('decisionSummaryPageExtra.constructionSummaryTitle')}>
                  <ConstructionSummaryTable rows={data.constructionSummary.rows} />
                </GroupCard>
              )}

              {/* Group B — Review & Opinions */}
              {anyVisible(
                'priceVerification',
                'reviewPrices',
                'condition',
                'remark',
                'appraiserOpinion',
                'committeeOpinion',
                'additionalAssumptions',
              ) && (
                <GroupCard
                  icon="users"
                  iconColor="cyan"
                  title={t('decisionSummary.sections.reviewOpinions')}
                >
                  {showSection('priceVerification') && (
                    <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('priceVerification')}>
                      <InlineSubSection title={t('decisionSummary.fields.priceVerification')}>
                        <FormFields fields={fields.priceVerificationFields} />
                      </InlineSubSection>
                    </SectionReadOnlyWrap>
                  )}
                  {showSection('reviewPrices') && (
                    <SectionReadOnlyWrap
                      forceReadOnly={shouldForceReadOnly('reviewPrices') || notVerifiedLock}
                    >
                      <InlineSubSection title={t('decisionSummary.fields.reviewPrices')}>
                        <div className="grid grid-cols-3 gap-6">
                          <FormFields fields={fields.reviewPriceFields} />
                          <ReadOnlyField
                            label={t('decisionSummary.fields.forceSellingPriceReview')}
                            value={notVerifiedLock ? 0 : forceSellingPriceReviewDerived}
                          />
                          <ReadOnlyField
                            label={t('decisionSummary.fields.buildingInsuranceReview')}
                            value={buildingInsuranceReviewDisplay}
                          />
                        </div>
                      </InlineSubSection>
                    </SectionReadOnlyWrap>
                  )}
                  {showSection('condition') && (
                    <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('condition')}>
                      <InlineSubSection title={t('decisionSummary.fields.condition')}>
                        <FormFields fields={fields.conditionFields} />
                      </InlineSubSection>
                    </SectionReadOnlyWrap>
                  )}
                  {showSection('remark') && (
                    <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('remark')}>
                      <InlineSubSection title={t('decisionSummary.fields.remark')}>
                        <FormFields fields={fields.remarkFields} />
                      </InlineSubSection>
                    </SectionReadOnlyWrap>
                  )}
                  {showSection('appraiserOpinion') && showSection('committeeOpinion') ? (
                    <div className="grid grid-cols-2 gap-6">
                      <SectionReadOnlyWrap
                        forceReadOnly={shouldForceReadOnly('appraiserOpinion') || priceVerifiedLock}
                      >
                        <InlineSubSection title={t('decisionSummary.fields.appraiserOpinions')}>
                          <FormFields fields={fields.appraiserOpinionFields} />
                        </InlineSubSection>
                      </SectionReadOnlyWrap>
                      <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('committeeOpinion')}>
                        <InlineSubSection title={t('decisionSummary.fields.committeeOpinions')}>
                          <FormFields fields={fields.committeeOpinionFields} />
                        </InlineSubSection>
                      </SectionReadOnlyWrap>
                    </div>
                  ) : (
                    <>
                      {showSection('appraiserOpinion') && (
                        <SectionReadOnlyWrap
                          forceReadOnly={
                            shouldForceReadOnly('appraiserOpinion') || priceVerifiedLock
                          }
                        >
                          <InlineSubSection title={t('decisionSummary.fields.appraiserOpinions')}>
                            <FormFields fields={fields.appraiserOpinionFields} />
                          </InlineSubSection>
                        </SectionReadOnlyWrap>
                      )}
                      {showSection('committeeOpinion') && (
                        <SectionReadOnlyWrap
                          forceReadOnly={shouldForceReadOnly('committeeOpinion')}
                        >
                          <InlineSubSection title={t('decisionSummary.fields.committeeOpinions')}>
                            <FormFields fields={fields.committeeOpinionFields} />
                          </InlineSubSection>
                        </SectionReadOnlyWrap>
                      )}
                    </>
                  )}
                  {showSection('additionalAssumptions') && (
                    <SectionReadOnlyWrap
                      forceReadOnly={
                        shouldForceReadOnly('additionalAssumptions') || priceVerifiedLock
                      }
                    >
                      <InlineSubSection title={t('decisionSummary.fields.additionalAssumptions')}>
                        <FormFields fields={fields.additionalAssumptionsFields} />
                      </InlineSubSection>
                    </SectionReadOnlyWrap>
                  )}
                </GroupCard>
              )}

              {/* Committee Approval — standalone (active workflow). Hidden once the appraisal has
                  reached a terminal status: completed/migrated appraisals show only the history
                  section below (avoids the "not active yet" placeholder next to real history). */}
              {showSection('committeeApproval') && !isTerminalStatus(appraisal?.status) && (
                <LiveApprovalListSection
                  workflowInstanceId={workflowInstanceId}
                  activityId={activityId}
                />
              )}

              {/* Committee Approval History — shown when workflow has ended */}
              {isTerminalStatus(appraisal?.status) && (
                <ApprovalHistorySection appraisalId={appraisalId} activityId="pending-approval" />
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
                    {t('decisionSummaryPageExtra.cancelButton')}
                  </Button>
                  <div className="h-6 w-px bg-gray-200" />
                  {/* History Search map icon — opens nearby appraisal/MC map */}
                  <button
                    type="button"
                    onClick={() => setIsHistorySearchOpen(true)}
                    title={t('decisionSummary.historySearchTitle')}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs"
                  >
                    <Icon name="map-location-dot" style="solid" className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('decisionSummary.historySearch')}</span>
                  </button>
                  <div className="h-6 w-px bg-gray-200" />
                  {isDirty && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {t('decisionSummary.unsavedChanges')}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  {hasEditableSections && (
                    <Button
                      variant="outline"
                      type="submit"
                      disabled={!appraisalId || !isDirty || isSaving}
                    >
                      <Icon style="regular" name="floppy-disk" className="size-4 mr-2" />
                      {t('decisionSummaryPageExtra.saveButton')}
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
                    {t('decisionSummaryPageExtra.submitButton')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      </FormProvider>

      {/* History Search map drawer */}
      <HistorySearchMapDrawer
        isOpen={isHistorySearchOpen}
        onClose={() => setIsHistorySearchOpen(false)}
      />

      <UnsavedChangesDialog blocker={blocker} />
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setFailures([]);
          setWarnings([]);
          resetProgressStore();
        }}
        onConfirm={() => handleSubmit(onSubmit)()}
        title={t('decisionSummary.confirmDialog.title')}
        message={t('decisionSummary.confirmDialog.message')}
        confirmText={t('decisionSummary.confirmDialog.confirm')}
        cancelText={t('decisionSummary.confirmDialog.cancel')}
        variant="primary"
        isLoading={isSaving || completeActivity.isPending}
        hasError={failures.length > 0}
        hasWarning={warnings.length > 0 && failures.length === 0}
        customFooter={
          <>
            <button
              type="button"
              onClick={() => {
                setIsConfirmOpen(false);
                setWarnings([]);
                resetProgressStore();
              }}
              disabled={completeActivity.isPending}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('decisionSummary.confirmDialog.cancel')}
            </button>
            <button
              type="button"
              onClick={() => doCompleteActivity(warnings.map(w => w.ackToken))}
              disabled={completeActivity.isPending}
              className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/80 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {completeActivity.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="spinner" style="solid" className="size-4 animate-spin shrink-0" />
                  <span className="truncate">{t('decisionSummary.confirmDialog.submitting')}</span>
                </span>
              ) : (
                t('decisionSummary.warnings.continueAnyway')
              )}
            </button>
          </>
        }
      >
        {failures.length > 0 ? (
          <>
            {/* Not pending: renders nothing when no live steps arrived (e.g. SignalR
                disconnected), or the settled/failed checklist when steps did arrive. */}
            <ActivityCompletionChecklist />
            <ActivityCompletionErrors
              errors={failures}
              title={t('decisionSummary.confirmDialog.validationErrorsTitle')}
            />
          </>
        ) : warnings.length > 0 ? (
          <Alert variant="warning" title={t('decisionSummary.warnings.title')} className="mt-3 text-left">
            <ul className="mt-2 space-y-2">
              {warnings.flatMap((w, wi) =>
                splitWarningMessage(w.message).map((sentence, si) => (
                  <li key={`${wi}-${si}`} className="flex items-start gap-2 text-sm text-amber-800">
                    <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{sentence}</span>
                  </li>
                )),
              )}
            </ul>
          </Alert>
        ) : isSaving || completeActivity.isPending ? (
          <ActivityCompletionChecklist pending liveUnavailable={hubStatus !== 'connected'} />
        ) : null}
      </ConfirmDialog>
    </div>
  );
};

/** Read-only number display field — styled to match a disabled NumberInput */
const ReadOnlyField = ({ label, value }: { label: string; value: number | null | undefined }) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
    <div className="block px-3 py-2 border border-gray-200 rounded-lg text-sm text-right bg-gray-50 text-gray-500">
      {value != null ? formatNumber(value, 2) : '-'}
    </div>
  </div>
);

export default DecisionSummaryPage;
