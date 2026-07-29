import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ActivityCompletionChecklist from '../components/ActivityCompletionChecklist';
import ActivityCompletionErrors from '../components/ActivityCompletionErrors';
import { useActivityProgressStore } from '../store/activityProgressStore';
import type { StructuredValidationError, StructuredWarning } from '../api/workflow';
import { useNavigate, useParams } from 'react-router-dom';
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
import NumberInput from '@/shared/components/inputs/NumberInput';

import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useConnectionStatus } from '@/features/notification/hooks/useConnectionStatus';
import {
  useGetDecisionSummary,
  useSaveDecisionSummary,
  useUpdateForceSaleRate,
} from '../api/decisionSummary';
import { useGetAssignment } from '../api/administration';
import ValuationEngagementChips from '../components/ValuationEngagementChips';
import { useAuthStore } from '@features/auth/store.ts';
import {
  useCompleteActivity,
  useGetActivityActions,
  useGetTaskById,
  useGetWorkflowProgress,
  useSaveTaskDecisionDraft,
} from '../api/workflow';
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
import CondoGovernmentPriceTable from '../components/summary/CondoGovernmentPriceTable';
import {
  LiveApprovalListSection,
  ApprovalHistorySection,
} from '../components/summary/ApprovalListSection';
import DecisionSection from '../components/summary/DecisionSection';
import { OpenFollowupBanner } from '@/features/document-followup/components/OpenFollowupBanner';
import ConstructionSummaryTable from '../components/summary/ConstructionSummaryTable';
import ConstructionBuildingDetailTable from '../components/summary/ConstructionBuildingDetailTable';
import ConstructionCompletedBuildingsTable from '../components/summary/ConstructionCompletedBuildingsTable';
import { AssetSummaryDrawer } from '@/features/common/assetSummary/AssetSummaryDrawer';
import { useGetAssetSummary } from '@/features/appraisal/api/assetSummary';

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
        wrapperClassName: 'mt-3',
        maxLength: 4000,
        showCharCount: true,
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
        wrapperClassName: 'mt-3',
        maxLength: 4000,
        showCharCount: true,
      },
    ],
    externalAppraiserOpinionFields: [
      {
        type: 'dropdown' as const,
        name: 'externalAppraiserOpinionType',
        label: t('decisionSummary.fields.opinionType'),
        options: opinionTypeOptions,
        placeholder: t('decisionSummary.fields.opinionTypePlaceholder'),
      },
      {
        type: 'textarea' as const,
        name: 'externalAppraiserOpinion',
        label: t('decisionSummary.fields.externalAppraiserOpinion'),
        placeholder: t('decisionSummary.fields.externalAppraiserOpinionPlaceholder'),
        wrapperClassName: 'mt-3',
        maxLength: 4000,
        showCharCount: true,
      },
    ],
    internalAppraiserOpinionFields: [
      {
        type: 'dropdown' as const,
        name: 'internalAppraiserOpinionType',
        label: t('decisionSummary.fields.opinionType'),
        options: opinionTypeOptions,
        placeholder: t('decisionSummary.fields.opinionTypePlaceholder'),
      },
      {
        type: 'textarea' as const,
        name: 'internalAppraiserOpinion',
        label: t('decisionSummary.fields.internalAppraiserOpinion'),
        placeholder: t('decisionSummary.fields.internalAppraiserOpinionPlaceholder'),
        wrapperClassName: 'mt-3',
        maxLength: 4000,
        showCharCount: true,
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
        wrapperClassName: 'mt-3',
        maxLength: 4000,
        showCharCount: true,
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
        maxLength: 4000,
        showCharCount: true,
      },
    ],
    constructionDocumentsFields: [
      {
        type: 'checkbox' as const,
        name: 'hasConstructionLicenseDoc',
        label: t('decisionSummary.fields.constructionLicenseDoc'),
      },
      {
        type: 'checkbox' as const,
        name: 'hasConstructionProgressTableDoc',
        label: t('decisionSummary.fields.constructionProgressTableDoc'),
      },
      {
        type: 'checkbox' as const,
        name: 'hasConstructionPhotoDoc',
        label: t('decisionSummary.fields.constructionPhotoDoc'),
      },
    ],
  };
};

// ==================== Section Visibility Config ====================

type SectionKey =
  | 'decisionApproach'
  | 'priceSummary'
  | 'constructionSummary'
  | 'constructionDocuments'
  | 'priceVerification'
  | 'governmentPrice'
  | 'condition'
  | 'remark'
  | 'externalAppraiserOpinion'
  | 'committeeOpinion'
  | 'internalAppraiserOpinion'
  | 'reviewPrices'
  | 'additionalAssumptions'
  | 'committeeApproval';

interface ActivitySectionConfig {
  sections: SectionKey[];
  readOnly?: boolean;
  editableSections?: SectionKey[];
  readOnlySections?: SectionKey[];
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
      'constructionDocuments',
      'governmentPrice',
      'externalAppraiserOpinion',
      'additionalAssumptions',
    ],
  },
  'ext-appraisal-check': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'constructionDocuments',
      'governmentPrice',
      'externalAppraiserOpinion',
      'additionalAssumptions',
    ],
    readOnly: true,
  },
  'ext-appraisal-verification': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'constructionDocuments',
      'governmentPrice',
      'externalAppraiserOpinion',
      'additionalAssumptions',
    ],
    readOnly: true,
  },
  'appraisal-book-verification': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'constructionDocuments',
      'priceVerification',
      'governmentPrice',
      'condition',
      'remark',
      'externalAppraiserOpinion',
      'committeeOpinion',
      'internalAppraiserOpinion',
      'reviewPrices',
      'additionalAssumptions',
    ],
    readOnly: true,
    editableSections: [
      'constructionDocuments',
      'priceVerification',
      'condition',
      'remark',
      'committeeOpinion',
      'internalAppraiserOpinion',
      'reviewPrices',
    ],
  },
  'int-appraisal-execution': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'constructionDocuments',
      'governmentPrice',
      'condition',
      'remark',
      'internalAppraiserOpinion',
      'committeeOpinion',
      'additionalAssumptions',
    ],
    // No `readOnly` flag here, so this list is not the usual "stays editable despite readOnly"
    // exemption — it is the opt-in whitelist that 'constructionDocuments' checks on its own
    // (see the SectionReadOnlyWrap below). The internal appraiser attaches the docs, so they
    // may tick the boxes; every other section here is already editable and is unaffected.
    editableSections: ['constructionDocuments'],
  },
  'int-offline-book-keyin': {
    // Mirrors int-appraisal-execution (fully editable — the keyer reproduces the whole book),
    // plus externalAppraiserOpinion: the case is External, so the report prints the EXTERNAL
    // opinion column of AppraisalDecisions and the keyer must be able to transcribe the company's
    // opinion from the paper book into it. The company + book date are not a section — they live in
    // the Valuation header (ValuationEngagementChips) alongside the appraisal date.
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'constructionDocuments',
      'governmentPrice',
      'condition',
      'remark',
      'externalAppraiserOpinion',
      'internalAppraiserOpinion',
      'committeeOpinion',
      'additionalAssumptions',
    ],
    editableSections: ['constructionDocuments'],
  },
  'int-appraisal-check': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'constructionDocuments',
      'priceVerification',
      'governmentPrice',
      'condition',
      'remark',
      'externalAppraiserOpinion',
      'committeeOpinion',
      'internalAppraiserOpinion',
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
      'constructionDocuments',
      'priceVerification',
      'governmentPrice',
      'condition',
      'remark',
      'externalAppraiserOpinion',
      'committeeOpinion',
      'internalAppraiserOpinion',
      'reviewPrices',
      'additionalAssumptions',
    ],
    readOnly: true,
  },
  'pending-approval': {
    sections: [
      'decisionApproach',
      'priceSummary',
      'constructionSummary',
      'constructionDocuments',
      'priceVerification',
      'governmentPrice',
      'condition',
      'remark',
      'externalAppraiserOpinion',
      'internalAppraiserOpinion',
      'committeeOpinion',
      'reviewPrices',
      'additionalAssumptions',
      'committeeApproval',
    ],
    readOnly: true,
  },
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
  const { taskId } = useParams<{ taskId: string }>();
  const appraisalId = useAppraisalId();
  const isReadOnly = usePageReadOnly();
  const workflowInstanceId = useWorkflowInstanceId();
  const activityId = useActivityId();
  const isTaskOwner = useIsTaskOwner();
  const currentUser = useAuthStore(state => state.user);

  // The offline-engagement card posts to its own endpoint, so it cannot live in this page's RHF
  // form. It hands back a save handle instead, which the action-bar Save calls alongside the
  // decision save — one Save button for the user, two writes underneath.
  const engagementSaveRef = useRef<(() => Promise<boolean>) | null>(null);

  const [engagementDirty, setEngagementDirty] = useState(false);
  const [engagementComplete, setEngagementComplete] = useState(true);

  // On the appraisal route (no taskId) the context has no workflow ids, so the live
  // approval / activity-tracking / meeting sections would render empty. Resolve them
  // from the appraisal's workflow progress and fall back to context on the task route.
  const { data: workflowProgress } = useGetWorkflowProgress(taskId ? undefined : appraisalId);
  const resolvedWorkflowInstanceId =
    workflowInstanceId ?? workflowProgress?.workflowInstanceId ?? undefined;
  const resolvedActivityId = activityId ?? workflowProgress?.currentActivityId ?? undefined;

  // Internal vs external path. The endpoint already drops Rejected/Cancelled rows and orders newest
  // first (GetAssignmentsQueryHandler), so the head row is the current assignment — the same "latest
  // live assignment" rule the report loader and the opinion-split migration backfill use.
  const { data: assignments } = useGetAssignment(appraisalId ?? '');
  const isExternalPath = assignments?.[0]?.assignmentType?.toLowerCase() === 'external';
  // Mirror of the backend guard in SetOfflineExternalEngagementCommandHandler: only the owner of
  // the live off-system key-in task may change the engagement, and only before the book has been
  // handed on for review. Everyone else — including every normal external case — sees it read-only.
  const engagementAssignment = assignments?.[0] ?? null;
  const engagementStatus = engagementAssignment?.assignmentStatus?.toLowerCase();
  const canEditOfflineEngagement =
    activityId === 'int-offline-book-keyin' &&
    isTaskOwner &&
    !isReadOnly &&
    (!engagementStatus || ['pending', 'assigned', 'inprogress'].includes(engagementStatus));

  // Section visibility by activity — intentionally keyed off the *context* activityId
  // (undefined on the appraisal route) so Appraisal Search still shows all sections.
  const sectionConfig = activityId
    ? (ACTIVITY_SECTION_CONFIG[activityId] ?? { sections: [] })
    : null; // null = no activityId = show all sections
  const showSection = (key: SectionKey) =>
    sectionConfig === null || sectionConfig.sections.includes(key);
  const isActivityReadOnly = sectionConfig?.readOnly ?? false;
  const shouldForceReadOnly = (key: SectionKey) =>
    (!isReadOnly && isActivityReadOnly && !sectionConfig?.editableSections?.includes(key)) ||
    (sectionConfig?.readOnlySections?.includes(key) ?? false);
  const hasEditableSections =
    sectionConfig === null
      ? false
      : !sectionConfig.readOnly || (sectionConfig.editableSections?.length ?? 0) > 0;
  // The 3 construction-doc checkboxes may only be persisted as an override by someone who could
  // actually see AND edit them (same predicate the section's SectionReadOnlyWrap uses below).
  // Every other save echoes the stored value back untouched, so `override ?? auto` keeps
  // auto-deriving from the uploaded D026/D012/D011 documents.
  const canEditConstructionDocs =
    showSection('constructionDocuments') &&
    !isReadOnly &&
    (!activityId || !!sectionConfig?.editableSections?.includes('constructionDocuments'));

  // Decision state (lifted from DecisionSection)
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [reasonCode, setReasonCode] = useState<string | null>(null);
  const [selectedAssigneeUserId, setSelectedAssigneeUserId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isHistorySearchOpen, setIsHistorySearchOpen] = useState(false);
  const [isAssetSummaryOpen, setIsAssetSummaryOpen] = useState(false);
  const [failures, setFailures] = useState<StructuredValidationError[]>([]);
  const [warnings, setWarnings] = useState<StructuredWarning[]>([]);
  const resetProgressStore = useActivityProgressStore(s => s.reset);

  // Routing variables from context (for appraisal-initiation refresh)
  const isPma = useAppraisalIsPma();
  const facilityLimit = useAppraisalFacilityLimit();
  const hasAppraisalBook = useAppraisalHasAppraisalBook();
  const { appraisal } = useAppraisalContext();
  const isCiAppraisal = useIsCiAppraisal();

  // API hooks to get Asset Summary information
  const { data: assetSummaryData, isLoading: isLoadingAssetSummary } =
    useGetAssetSummary(appraisalId);
  const hasAssetSummary =
    assetSummaryData?.groups?.length > 0 || assetSummaryData?.items?.length > 0;

  // API hooks
  const { data, isLoading } = useGetDecisionSummary(appraisalId);
  const { mutate: saveSummary, isPending: isSaving } = useSaveDecisionSummary();
  const updateForceSaleRate = useUpdateForceSaleRate();
  const completeActivity = useCompleteActivity();
  // SignalR hub status — when not connected, live step progress won't arrive, so the
  // submitting fallback message is adjusted instead of waiting on step animations.
  const hubStatus = useConnectionStatus();
  const { data: actionsData } = useGetActivityActions(workflowInstanceId, activityId);

  // Task decision draft — same per-task draft the 360 Comment footer reads/writes.
  // Same query key as TaskLayout's fetch, so this is served from cache when present.
  const { data: taskData } = useGetTaskById(taskId);
  const { mutate: saveDraft } = useSaveTaskDecisionDraft();

  // Seed decision state from the draft ONCE so later refetches / mid-session edits
  // are not clobbered (mirrors the reason-overwrite behavior in DecisionSection).
  const draftSeededRef = useRef(false);
  useEffect(() => {
    if (draftSeededRef.current || taskData === undefined) return;
    setSelectedDecision(taskData.decisionTaken ?? null);
    setComments(taskData.comment ?? '');
    setReasonCode(taskData.reasonCode ?? null);
    setSelectedAssigneeUserId(taskData.assignee ?? null);
    draftSeededRef.current = true;
  }, [taskData]);

  // True when the decision draft diverges from what was seeded — lets a comment-only
  // change enable Save even when the RHF form itself (`isDirty`) hasn't changed.
  const draftDirty =
    selectedDecision !== (taskData?.decisionTaken ?? null) ||
    comments !== (taskData?.comment ?? '') ||
    reasonCode !== (taskData?.reasonCode ?? null) ||
    selectedAssigneeUserId !== (taskData?.assignee ?? null);

  const selectedAction = useMemo(
    () => (actionsData?.actions ?? []).find(a => a.value === selectedDecision) ?? null,
    [actionsData, selectedDecision],
  );

  const isManualAssignment =
    selectedAction?.assignmentMode === 'user' && !!selectedAction.targetActivityId;

  const reasonRequired = selectedAction?.movement === 'C' || selectedAction?.movement === 'B';

  // Form setup
  const mapDataToForm = useMemo(() => {
    if (!data) return null;
    return {
      isPriceVerified: data.isPriceVerified ?? true,
      conditionType: data.conditionType ?? null,
      condition: data.condition ?? null,
      remarkType: data.remarkType ?? null,
      remark: data.remark ?? null,
      externalAppraiserOpinionType: data.externalAppraiserOpinionType ?? null,
      externalAppraiserOpinion: data.externalAppraiserOpinion ?? null,
      committeeOpinionType: data.committeeOpinionType ?? null,
      committeeOpinion: data.committeeOpinion ?? null,
      internalAppraiserOpinionType: data.internalAppraiserOpinionType ?? null,
      internalAppraiserOpinion: data.internalAppraiserOpinion ?? null,
      totalAppraisalPriceReview: data.totalAppraisalPriceReview ?? null,
      additionalAssumptions: data.additionalAssumptions ?? null,
      hasConstructionLicenseDoc:
        data.hasConstructionLicenseDoc ?? data.constructionLicenseDocAttached ?? false,
      hasConstructionProgressTableDoc:
        data.hasConstructionProgressTableDoc ?? data.constructionProgressTableDocAttached ?? false,
      hasConstructionPhotoDoc:
        data.hasConstructionPhotoDoc ?? data.constructionPhotoDocAttached ?? false,
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

  // External Appraiser Opinion card. Shown whenever the activity's section config lists it — on the
  // read-only activities it renders empty rather than disappearing, so a missing external comment is
  // distinguishable from "section not applicable" (an appraisal can pass ext-appraisal-execution, the
  // only place the field is editable, without one being captured). Editability is unchanged and comes
  // from shouldForceReadOnly / priceVerifiedLock at the render site.
  const externalOpinionVisible = showSection('externalAppraiserOpinion');
  // Additional/Special Assumptions are the *appraiser's* input, so they follow the path: on the
  // external path they belong with the external appraiser (rendered inside this External card,
  // editable only at ext-appraisal-execution and read-only reference everywhere else on that path
  // — including book verification); on the internal path they belong with the internal appraiser
  // (rendered in Group B). The path comes from the appraisal's current assignment — NOT from whether
  // an external opinion happens to have a value, which misfiled an external job's assumptions into
  // the internal section whenever the external appraiser left the opinion blank. The
  // !showSection('internalAppraiserOpinion') clause keeps the pure ext-* screens correct before the
  // assignment query resolves (they have no internal opinion section at all).
  const assumptionsInExternalCard =
    showSection('additionalAssumptions') &&
    (isExternalPath || !showSection('internalAppraiserOpinion'));

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

  // Force Selling Price rate override — NOT part of the RHF form. It persists immediately on
  // blur via a dedicated endpoint (not the whole-form save), so the stored ForcedSaleValue
  // that feeds reports/AS400 never drifts from what the screen shows. Local draft + resync
  // from the server value, mirroring the Construction Inspection Fee pattern in
  // FeeInformationSection.tsx.
  const [forceSaleRateDraft, setForceSaleRateDraft] = useState<number | null>(
    data?.forceSellingRateOverride ?? null,
  );
  useEffect(() => {
    setForceSaleRateDraft(data?.forceSellingRateOverride ?? null);
  }, [data?.forceSellingRateOverride]);

  const handleForceSaleRateBlur = async () => {
    if (!appraisalId) return;
    if (forceSaleRateDraft === (data?.forceSellingRateOverride ?? null)) return;
    try {
      await updateForceSaleRate.mutateAsync({
        appraisalId,
        forceSellingRateOverride: forceSaleRateDraft,
      });
      toast.success(t('decisionSummary.toasts.forceSaleRateSaved'));
    } catch (error: any) {
      toast.error(error?.apiError?.detail || t('decisionSummary.toasts.forceSaleRateFailed'));
      setForceSaleRateDraft(data?.forceSellingRateOverride ?? null); // rollback
    }
  };

  // Effective rate: the in-progress draft, or the server-resolved rate while inheriting (no
  // override set). Never hardcode a fallback percentage here.
  const effectiveForceSellingRate = forceSaleRateDraft ?? data?.forceSellingRate ?? null;

  // Force Selling Price (Review) is derived = effective rate % of Total Appraisal Price (Review).
  const totalAppraisalPriceReviewNow = watch('totalAppraisalPriceReview');
  const forceSellingPriceReviewDerived =
    totalAppraisalPriceReviewNow != null && effectiveForceSellingRate != null
      ? (totalAppraisalPriceReviewNow * effectiveForceSellingRate) / 100
      : null;

  // The rate now round-trips through the server on blur, so the displayed FSP amount can
  // come straight from the server-resolved value — no client-side preview needed.
  const forceSellingPriceDisplay = data?.forceSellingPrice ?? null;

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

    if (reasonRequired && !reasonCode) {
      return;
    }

    completeActivity.mutate(
      {
        workflowInstanceId: workflowInstanceId!,
        activityId: activityId!,
        input: {
          decisionTaken: selectedDecision!,
          comments,
          ...(reasonCode && { reasonCode }),
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
          const apiErr = (
            error as { apiError?: { detail?: string; stepName?: string; errorCode?: string } }
          )?.apiError;
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

  // Persist the decision. `complete` distinguishes the two footer actions:
  //   Save   → persist summary + task draft only (never completes the activity)
  //   Submit → save summary, then complete the workflow activity (via ConfirmDialog)
  const persistDecision = (formData: DecisionSummaryFormType, complete: boolean) => {
    const canComplete =
      complete && isTaskOwner && workflowInstanceId && activityId && selectedDecision;

    // Guard: if this user is the task owner, ensure actions have loaded and the picked
    // decision resolves to a known action — otherwise a manual-mode action could silently
    // submit as system mode while the actions API is still in flight.
    if (canComplete && (!actionsData || !selectedAction)) {
      setIsConfirmOpen(false);
      toast.error(t('administration.toasts.loadingActions'));
      return;
    }

    if (complete && isManualAssignment && !selectedAssigneeUserId) {
      setIsConfirmOpen(false);
      toast.error(t('administration.toasts.selectAssignee'));
      return;
    }

    const draftPayload =
      isTaskOwner && taskId
        ? {
            taskId,
            decisionTaken: selectedDecision,
            comment: comments,
            reasonCode,
            assignee: selectedAssigneeUserId,
          }
        : null;

    // Only persist the summary form when completing, or when the activity actually has
    // editable summary sections — review-only activities just persist the decision draft.
    const shouldSaveSummary = !!appraisalId && (complete || hasEditableSections);

    if (shouldSaveSummary) {
      // On Save, also keep the per-task decision draft (and the 360 Comment footer) in
      // sync. On Submit, completion writes the final decision to the CompletedTask.
      if (!complete && draftPayload) {
        saveDraft(draftPayload);
      }
      // The save is a full replace, so a form that merely *carries* the construction-doc
      // checkboxes (they live in defaultValues even when the section is hidden) would freeze the
      // seeded value as an explicit override. Echo the server's stored value back instead —
      // neither creating a new override nor erasing a real one from book verification.
      const summaryBody = canEditConstructionDocs
        ? formData
        : {
            ...formData,
            hasConstructionLicenseDoc: data?.hasConstructionLicenseDoc ?? null,
            hasConstructionProgressTableDoc: data?.hasConstructionProgressTableDoc ?? null,
            hasConstructionPhotoDoc: data?.hasConstructionPhotoDoc ?? null,
          };
      saveSummary(
        { appraisalId, body: summaryBody },
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
      return;
    }

    if (complete) {
      // No appraisal / nothing to save: complete the activity directly.
      if (canComplete) {
        doCompleteActivity();
      }
      return;
    }

    // Save on a review-only activity (no editable summary) → persist the draft on its own.
    if (draftPayload) {
      saveDraft(draftPayload, {
        onSuccess: () => {
          setIsConfirmOpen(false);
          toast.success(t('decisionSummary.toasts.saved'));
        },
        onError: () => toast.error(t('decisionSummary.toasts.saveFailed')),
      });
    }
  };

  // Save button (and Enter key) → persist only. Submit → complete (via ConfirmDialog).
  const onSave = async (formData: DecisionSummaryFormType) => {
    // Abort if the engagement has pending edits that fail validation — persisting the decision
    // while silently dropping the company or book date would be worse than saving nothing.
    if (engagementSaveRef.current && !(await engagementSaveRef.current())) return;
    return persistDecision(formData, false);
  };
  const onSubmit = async (formData: DecisionSummaryFormType) => {
    // Submit means "hand the book on", so persist any staged engagement first.
    if (engagementSaveRef.current && !(await engagementSaveRef.current())) return;

    // Then refuse to complete an External assignment with no company recorded. The completion
    // pipeline enforces the same rule via the existing ValidateAppraisalFields step
    // (externalCompanyRecorded, from vw_AppraisalValidationContext); failing here just gives a
    // plain message instead of a pipeline error.
    if (canEditOfflineEngagement && !engagementComplete) {
      toast.error(t('offlineEngagement.blockedOnSubmit'));
      return;
    }
    return persistDecision(formData, true);
  };

  const handleCancel = () => {
    if (data) {
      reset({
        isPriceVerified: data.isPriceVerified ?? true,
        conditionType: data.conditionType ?? null,
        condition: data.condition ?? null,
        remarkType: data.remarkType ?? null,
        remark: data.remark ?? null,
        externalAppraiserOpinionType: data.externalAppraiserOpinionType ?? null,
        externalAppraiserOpinion: data.externalAppraiserOpinion ?? null,
        committeeOpinionType: data.committeeOpinionType ?? null,
        committeeOpinion: data.committeeOpinion ?? null,
        internalAppraiserOpinionType: data.internalAppraiserOpinionType ?? null,
        internalAppraiserOpinion: data.internalAppraiserOpinion ?? null,
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
        <form onSubmit={handleSubmit(onSave)} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="flex flex-col gap-6 pb-6 pr-4">
              {/* Open followup banner — compact info at the top; full/interactive lives on the Document Checklist page */}
              {taskId && <OpenFollowupBanner raisingTaskId={taskId} compact />}

              {/* Group A — Valuation */}
              {anyVisible('decisionApproach', 'priceSummary', 'governmentPrice') && (
                <GroupCard
                  icon="scale-balanced"
                  iconColor="teal"
                  title={t('decisionSummary.sections.valuation')}
                  rightSlot={
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      {/* Asset Summary icon */}
                      {!isLoadingAssetSummary && hasAssetSummary && (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsAssetSummaryOpen(true)}
                            title={'Asset Summary'}
                            className="flex items-center gap-1.5 px-2 py-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs cursor-pointer"
                          >
                            <Icon name="file-chart-pie" style="solid" className="w-4 h-4" />
                            <span className="hidden sm:inline">Asset Summary</span>
                          </button>
                          <div className="h-6 w-px bg-gray-200" />
                        </>
                      )}
                      {/* Who appraised it — shown for any case that has an external company, so a
                          normal external assignment is as legible here as an off-system one. Also
                          the edit affordance for an off-system engagement. */}
                      {appraisalId && (
                        <ValuationEngagementChips
                          appraisalId={appraisalId}
                          assignment={assignments?.[0] ?? null}
                          canEdit={canEditOfflineEngagement}
                          currentUsername={currentUser?.username ?? null}
                          saveHandleRef={engagementSaveRef}
                          onDirtyChange={setEngagementDirty}
                          onCompletenessChange={setEngagementComplete}
                        />
                      )}
                      {data?.appraisalDate ? (
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
                      ) : undefined}
                    </div>
                  }
                >
                  {showSection('priceSummary') && (
                    <div className="py-4 space-y-4">
                      {/* The three headline figures render for BOTH block and non-block. Block
                          additionally gets the per-model breakdown table below; it used to
                          REPLACE this strip, which left block appraisals with no headline
                          appraised / force-selling / insurance values on the page. */}
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
                            {forceSellingPriceDisplay != null
                              ? formatNumber(forceSellingPriceDisplay, 2)
                              : '-'}
                          </p>
                          <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('priceSummary')}>
                            <div className="flex items-center justify-center gap-1.5 mt-0.5">
                              {/* Not an RHF field — persists immediately on blur via a
                                    dedicated endpoint (see handleForceSaleRateBlur), so
                                    FormFields/schema validation don't apply here.
                                    Empty when no override — placeholder shows the resolved
                                    (inherited) rate greyed out, so blank visibly means "using
                                    the system default", not "zero". */}
                              <NumberInput
                                name="forceSellingRateOverride"
                                fullWidth={false}
                                className="w-20"
                                decimalPlaces={2}
                                thousandSeparator={false}
                                maxIntegerDigits={3}
                                min={0.01}
                                max={100}
                                suffix="%"
                                value={forceSaleRateDraft}
                                onChange={e => setForceSaleRateDraft(e.target.value)}
                                onBlur={handleForceSaleRateBlur}
                                disabled={updateForceSaleRate.isPending}
                                placeholder={
                                  data?.forceSellingRate != null
                                    ? data.forceSellingRate.toFixed(2)
                                    : undefined
                                }
                              />
                              <span className="text-xs text-gray-400">
                                {t('decisionSummary.fields.forceSellingPriceHint')}
                              </span>
                            </div>
                          </SectionReadOnlyWrap>
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
                      {data?.isBlock && (
                        <BlockPriceSummaryTable
                          rows={data.blockModelPrices ?? []}
                          projectTotal={data.totalAppraisalPrice ?? 0}
                          forceSellingPrice={data.forceSellingPrice ?? 0}
                          buildingInsurance={data.buildingInsurance ?? 0}
                        />
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
                    >
                      {data?.governmentPrices?.length ? (
                        <InlineSubSection
                          compact
                          title={t('governmentPriceTable.landSectionTitle')}
                          rightSlot={`(${data.governmentPrices.length})`}
                        >
                          <GovernmentPriceTable
                            rows={data.governmentPrices}
                            totalArea={data.governmentPriceTotalArea ?? 0}
                            surveyedArea={data.governmentPriceSurveyedArea ?? 0}
                            avgPerSqWa={data.governmentPriceAvgPerSqWa ?? 0}
                          />
                        </InlineSubSection>
                      ) : null}
                      {data?.condoGovernmentPrices?.length ? (
                        <InlineSubSection
                          compact
                          title={t('governmentPriceTable.condoSectionTitle')}
                          rightSlot={`(${data.condoGovernmentPrices.length})`}
                        >
                          <CondoGovernmentPriceTable
                            rows={data.condoGovernmentPrices}
                            totalArea={data.condoGovernmentPriceTotalArea ?? 0}
                            avgPerSqm={data.condoGovernmentPriceAvgPerSqm ?? 0}
                          />
                        </InlineSubSection>
                      ) : null}
                      {!data?.governmentPrices?.length && !data?.condoGovernmentPrices?.length && (
                        <EmptyLine text={t('decisionSummary.empty.noGovernmentPrice')} />
                      )}
                    </InlineSubSection>
                  )}
                </GroupCard>
              )}

              {/* Construction Summary — only on Construction Inspection appraisals */}
              {isCiAppraisal && showSection('constructionSummary') && data?.constructionSummary && (
                <GroupCard
                  icon="helmet-safety"
                  iconColor="yellow"
                  title={t('decisionSummaryPageExtra.constructionSummaryTitle')}
                >
                  <InlineSubSection>
                    <ConstructionSummaryTable
                      village={data.constructionSummary.village}
                      rows={data.constructionSummary.rows}
                    />
                  </InlineSubSection>
                  {(data.constructionSummary.buildings ?? []).length > 0 && (
                    <InlineSubSection title={t('constructionBuildingDetailTable.title')}>
                      <ConstructionBuildingDetailTable
                        rows={data.constructionSummary.buildings ?? []}
                      />
                    </InlineSubSection>
                  )}
                  {(data.constructionSummary.completedBuildings ?? []).length > 0 && (
                    <InlineSubSection title={t('constructionCompletedBuildingsTable.title')}>
                      <ConstructionCompletedBuildingsTable
                        rows={data.constructionSummary.completedBuildings ?? []}
                      />
                    </InlineSubSection>
                  )}

                  {/* Supporting Documents (เอกสารประกอบ) — lives inside the Construction Summary card.
                      Each checkbox's initial value is the EFFECTIVE value (manual override ?? auto-
                      detected document presence) computed in mapDataToForm; ticking here always saves
                      as an explicit override via the whole-form save.
                      Editable ONLY where an activity whitelists 'constructionDocuments' in
                      editableSections (today: appraisal-book-verification). Elsewhere it renders
                      read-only — including the execution activities that lack a `readOnly` flag, which
                      shouldForceReadOnly alone would leave editable. On the appraisal-search route
                      (activityId undefined) the page-level read-only mode applies, as for other sections. */}
                  {showSection('constructionDocuments') && (
                    <SectionReadOnlyWrap
                      forceReadOnly={
                        !!activityId &&
                        !sectionConfig?.editableSections?.includes('constructionDocuments')
                      }
                    >
                      <InlineSubSection
                        title={t('decisionSummaryPageExtra.constructionDocumentsTitle')}
                        description={t('decisionSummaryPageExtra.constructionDocumentsHint')}
                      >
                        <div className="grid grid-cols-1 gap-2">
                          <FormFields fields={fields.constructionDocumentsFields} />
                        </div>
                      </InlineSubSection>
                    </SectionReadOnlyWrap>
                  )}
                </GroupCard>
              )}

              {/* External Appraiser Opinion — standalone card, above Group B. Rendered on every
                  activity whose section config lists it, empty included: shared activities
                  (int-appraisal-check / int-appraisal-verification / book verification) run on both
                  paths, and hiding a null made a never-captured external comment indistinguishable
                  from the section simply not applying. */}
              {(externalOpinionVisible || assumptionsInExternalCard) && (
                <GroupCard
                  icon="user-tie"
                  iconColor="blue"
                  title={t('decisionSummary.fields.externalAppraiserOpinions')}
                >
                  {externalOpinionVisible && (
                    <SectionReadOnlyWrap
                      forceReadOnly={
                        shouldForceReadOnly('externalAppraiserOpinion') || priceVerifiedLock
                      }
                    >
                      <InlineSubSection>
                        <FormFields fields={fields.externalAppraiserOpinionFields} />
                      </InlineSubSection>
                    </SectionReadOnlyWrap>
                  )}
                  {/* Additional / Special Assumptions live here on the external-only screens
                      (no internal opinion present) — the external appraiser's input. On internal /
                      book-verification screens they render in Group B with the internal opinion. */}
                  {assumptionsInExternalCard && (
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

              {/* Group B — Review & Opinions */}
              {anyVisible(
                'priceVerification',
                'reviewPrices',
                'condition',
                'remark',
                'internalAppraiserOpinion',
                'committeeOpinion',
              ) && (
                <GroupCard
                  icon="users"
                  iconColor="cyan"
                  title={
                    anyVisible('priceVerification', 'reviewPrices')
                      ? t('decisionSummary.sections.reviewOpinions')
                      : t('decisionSummary.sections.opinions')
                  }
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
                  {showSection('internalAppraiserOpinion') && (
                    <SectionReadOnlyWrap
                      forceReadOnly={shouldForceReadOnly('internalAppraiserOpinion')}
                    >
                      <InlineSubSection
                        title={t('decisionSummary.fields.internalAppraiserOpinions')}
                      >
                        <FormFields fields={fields.internalAppraiserOpinionFields} />
                      </InlineSubSection>
                    </SectionReadOnlyWrap>
                  )}
                  {showSection('committeeOpinion') && (
                    <SectionReadOnlyWrap forceReadOnly={shouldForceReadOnly('committeeOpinion')}>
                      <InlineSubSection title={t('decisionSummary.fields.committeeOpinions')}>
                        <FormFields fields={fields.committeeOpinionFields} />
                      </InlineSubSection>
                    </SectionReadOnlyWrap>
                  )}
                  {/* Additional / Special Assumptions — shown here only on the internal path
                      (the internal appraiser's input). On the external path they render inside the
                      External Appraiser Opinion card instead (see assumptionsInExternalCard). */}
                  {showSection('additionalAssumptions') && !assumptionsInExternalCard && (
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
                  workflowInstanceId={resolvedWorkflowInstanceId}
                  activityId={resolvedActivityId}
                />
              )}

              {/* Committee Approval History — shown when workflow has ended */}
              {isTerminalStatus(appraisal?.status) && (
                <ApprovalHistorySection appraisalId={appraisalId} activityId="pending-approval" />
              )}

              {/* Decision — standalone */}
              <DecisionSection
                selectedDecision={selectedDecision}
                onDecisionChange={value => {
                  setSelectedDecision(value);
                  setReasonCode(null);
                }}
                comments={comments}
                onCommentsChange={setComments}
                selectedAssigneeUserId={selectedAssigneeUserId}
                onAssigneeChange={setSelectedAssigneeUserId}
                selectedReasonCode={reasonCode}
                onReasonChange={setReasonCode}
                workflowInstanceId={resolvedWorkflowInstanceId}
                activityId={resolvedActivityId}
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
                  {(hasEditableSections || (isTaskOwner && !!taskId)) && (
                    <Button
                      variant="outline"
                      type="submit"
                      disabled={
                        (!appraisalId && !(isTaskOwner && !!taskId)) ||
                        (!isDirty && !draftDirty && !engagementDirty) ||
                        isSaving
                      }
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
                      (isTaskOwner && isManualAssignment && !selectedAssigneeUserId) ||
                      (isTaskOwner && reasonRequired && !reasonCode)
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

      {/* Asset Summary drawer */}
      <AssetSummaryDrawer
        isOpen={isAssetSummaryOpen}
        onClose={() => setIsAssetSummaryOpen(false)}
        data={assetSummaryData}
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
          <Alert
            variant="warning"
            title={t('decisionSummary.warnings.title')}
            className="mt-3 text-left"
          >
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
