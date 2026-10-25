import { useEffect, useMemo, useState } from 'react';
import { taskListUrl } from '@features/task/utils/taskReturn';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useAppraisalId,
  useAppraisalRequestId,
  useIsTaskOwner,
  useWorkflowInstanceId,
} from '@/features/appraisal/context/AppraisalContext';
import { useGetRequestById } from '@/features/request/api';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Textarea from '@/shared/components/inputs/Textarea';
import { ValidationText } from '@/shared/components/form/ValidationText';
import FormCard from '@/shared/components/sections/FormCard';
import { useDisclosure } from '@/shared/hooks/useDisclosure';

import {
  useCreateAssignment,
  useGetAppraisalQuotations,
  useGetAssignment,
  useGetAssignmentDefaults,
  useGetCompanyById,
  useGetEligibleCompanies,
  useGetEligibleStaff,
  useGetUserById,
  useSaveAssignmentDraft,
} from '../api/administration';
import { useGetQuotationById } from '@/features/quotation/api/quotation';
import {
  NON_TERMINAL_QUOTATION_STATUSES,
  pickActiveQuotation,
} from '@/features/quotation/utils/pickActiveQuotation';
import {
  assignmentFormDefaults,
  type AssignmentFormType,
  useAssignmentFormSchema,
} from '../schemas/administration';
import type { ExternalCompany, InternalStaff } from '../types/administration';
import {
  correctSavedSelection,
  isAwaitingSeed,
  isReadyToSeed,
  shouldSkipTypeDefaults,
  resolveFormDefaults,
  shouldSeed,
} from '../utils/assignmentDefaults';

import SearchStaffModal from '../components/SearchStaffModal';
import SearchCompanyModal from '../components/SearchCompanyModal';
import StaffDisplay from '../components/StaffDisplay';
import CompanyDisplay from '../components/CompanyDisplay';
import QuotationSection from '../components/QuotationSection';
import QuotationEntryModal from '../components/QuotationEntryModal';
import { useAuthStore } from '@features/auth/store.ts';
import { mapAssignmentResponseToForm } from '@features/appraisal/utils/mappers.ts';
import { configToBool, useSystemConfiguration } from '@shared/api/systemConfiguration';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';

/**
 * AssignmentMethod persisted for an off-system external DRAFT. Matches the backend's
 * AppraisalAssignment.OfflineAssignmentMethod so reopening the draft re-seeds the
 * "External (Appraised Offline)" radio rather than falling back to a plain external method.
 */
const OFFLINE_DRAFT_METHOD = 'Offline';

/**
 * The seed decides fresh vs saved row and the quotation skip from the assignment and the quotations
 * list, so a cached copy of either (global staleTime) must be refetched whenever the page is entered,
 * including a route change that keeps it mounted; the isFetching gates then wait for the fresh copy.
 */
const ENTRY_REFETCH = { staleTime: 0 };

/** Assignment-type card colours. Static strings so Tailwind sees them, each with its dark pair. */
const ASSIGNMENT_TYPE_COLORS = {
  emerald: {
    card: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15',
    iconBox: 'bg-emerald-200 dark:bg-emerald-500/30',
    icon: 'text-emerald-600 dark:text-emerald-300',
    check: 'text-emerald-500 dark:text-emerald-300',
  },
  purple: {
    card: 'border-purple-500 bg-purple-50 dark:bg-purple-500/15',
    iconBox: 'bg-purple-200 dark:bg-purple-500/30',
    icon: 'text-purple-600 dark:text-purple-300',
    check: 'text-purple-500 dark:text-purple-300',
  },
  amber: {
    card: 'border-amber-500 bg-amber-50 dark:bg-amber-500/15',
    iconBox: 'bg-amber-200 dark:bg-amber-500/30',
    icon: 'text-amber-600 dark:text-amber-300',
    check: 'text-amber-500 dark:text-amber-300',
  },
} as const;

const AdministrationPage = () => {
  const { t } = useTranslation('appraisal');
  const assignmentSchema = useAssignmentFormSchema();
  const appraisalId = useAppraisalId();
  const requestId = useAppraisalRequestId();
  const currentUser = useAuthStore(state => state.user);

  // Fetch request data to get bankingSegment for company filtering and facilityLimit for routing constraints
  const {
    data: requestData,
    isLoading: isRequestLoading,
    isError: isRequestError,
    isFetching: isFetchingRequest,
  } = useGetRequestById(requestId ?? '');
  const bankingSegment = (requestData as any)?.detail?.loanDetail?.bankingSegment as
    | string
    | undefined;
  const facilityLimit = ((requestData as any)?.detail?.loanDetail?.facilityLimit ?? 0) as number;
  const isInternalDisabled = facilityLimit > 50_000_000;

  // API hooks
  const {
    data: assignments,
    isLoading: isLoadingAssignment,
    isFetching: isFetchingAssignment,
  } = useGetAssignment(appraisalId ?? '', ENTRY_REFETCH);
  const currentAssignment = assignments?.[0] ?? null;
  // A saved draft or a non-Pending row holds real selections, which win over any default.
  const isPendingRow = currentAssignment?.assignmentStatus.toLowerCase() === 'pending';
  const hasSavedSelection =
    !!currentAssignment && (!!currentAssignment.draftSavedAt || !isPendingRow);
  // Fetched in parallel with the assignment. A fresh row waits for it, for the request data that
  // decides the facility-limit rule, for the quotations (an existing one wins over the defaults) and
  // for the kill-switch config, so the reset seeds the form with its final values rather than the baseline.
  // isFetching turns false once a call has failed (after its retries: the request query retries
  // everything but a 404 three times, the others follow the global policy), so a failed call opens
  // the page on the built-in defaults.
  const { data: assignmentDefaults, isFetching: isFetchingDefaults } = useGetAssignmentDefaults(
    appraisalId ?? '',
  );
  // All quotations for this appraisal (used for the quotation section, the lock check and the defaults).
  // Refetched on entry (mount or appraisal change): the one-time seed decides from this list, and a
  // cached copy could miss a quotation someone else started meanwhile.
  const {
    data: quotationsData,
    isError: isQuotationsError,
    isFetching: isFetchingQuotations,
  } = useGetAppraisalQuotations(appraisalId ?? null, true, ENTRY_REFETCH);
  const appraisalQuotations = quotationsData ?? [];
  // Whether the Appraisal Type defaults must be left out; see shouldSkipTypeDefaults.
  const skipTypeDefaults = shouldSkipTypeDefaults({
    quotations: quotationsData,
    isQuotationsError,
    hasRequestData: !!requestData,
    isRequestError,
    requestId,
  });
  const pageReadOnly = usePageReadOnly();
  const localReadOnly = !!currentAssignment && !isPendingRow;
  const isReadOnly = pageReadOnly || localReadOnly;
  const { mutate: createAssignment, isPending: isCreating } = useCreateAssignment();
  const { mutate: saveAssignmentDraft, isPending: isSavingDraft } = useSaveAssignmentDraft();

  const navigate = useNavigate();
  const workflowInstanceId = useWorkflowInstanceId();
  const isTaskOwner = useIsTaskOwner();

  // Phase-1 go-live kill switch. While this is false, CompanySelectionActivity refuses to assign
  // ANY company in-system — round-robin, an admin's manual pick, a quotation winner and the CI
  // carry-over alike — and escalates back to admin. So "Route to External" must not be offered at
  // all: submitting it would hand the case straight back to the admin who just submitted it.
  // Defaults to true so a missing key behaves exactly as before the switch existed.
  const {
    data: killSwitchConfig,
    isLoading: isLoadingConfig,
    isFetching: isFetchingConfig,
  } = useSystemConfiguration('ExternalCompanyAssignmentEnabled');
  const canAssignCompanyInSystem = configToBool(killSwitchConfig, isLoadingConfig, true);
  // Relay endpoint advances the appraisal-assignment workflow task, which only the task owner
  // can complete. Gate the Assign button on both: missing workflow context (deep-linked outside
  // a task) or non-owner can browse the page read-only, but cannot submit.
  const canSubmitAssignment = isTaskOwner && !!workflowInstanceId;

  // Fetch assigned staff/company by ID for display
  const { data: assignedStaff } = useGetUserById(currentAssignment?.assigneeUserId ?? null);
  const { data: assignedCompany } = useGetCompanyById(currentAssignment?.assigneeCompanyId ?? null);
  const { data: followupStaff } = useGetUserById(currentAssignment?.internalAppraiserId ?? null);

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<AssignmentFormType>({
    defaultValues: assignmentFormDefaults,
    resolver: zodResolver(assignmentSchema),
  });

  // Warn (in-app navigation + browser tab close) when leaving with unsaved changes.
  const { blocker, skipWarning } = useUnsavedChangesWarning(isDirty);

  // Watch form values for conditional rendering
  const assignmentType = watch('assignmentType');
  const assignmentMethod = watch('assignmentMethod');
  const selectedStaff = watch('selectedStaff');
  const selectedCompany = watch('selectedCompany');
  const selectedFollowupStaff = watch('selectedFollowupStaff');
  const followupStaffMethod = watch('followupStaffMethod');

  // The form defaults to External + Request Quotation. While in-system company assignment is
  // disabled that is a DISABLED option, so it cannot stay the default — the admin would land on a
  // greyed-out selection with the External Assignment Details form open beneath it and could submit
  // an assignment the backend bounces straight back.
  //
  // It falls back to 'external-offline' rather than to no selection because during the go-live
  // window virtually every case reaching this screen IS an off-system engagement — the bank is
  // engaging companies outside CAS, and rule 40 routes all of them here. Internal remains one
  // click away for the exception. Whenever the type has to move off what was configured, the method
  // falls back to manual too ('quotation' is external-only).
  //
  // Fixing this in the defaults rather than with a corrective effect is deliberate: the seeding
  // reset below writes the whole form, so an effect that clears the value in the same commit would
  // lose the race. The Appraisal Type defaults (type, method, followup method) are applied here, in
  // that one seed of a fresh row; the method is kept only if the type is still the configured one.
  // Switching the type by hand later resets the method to manual.
  const resolvedFormDefaults = useMemo(
    () =>
      resolveFormDefaults({
        base: assignmentFormDefaults,
        defaults: assignmentDefaults,
        canAssignCompanyInSystem,
        isInternalDisabled,
        skipTypeDefaults,
      }),
    [assignmentDefaults, canAssignCompanyInSystem, isInternalDisabled, skipTypeDefaults],
  );
  // A saved draft can still carry 'external' from before the switch was thrown. Move it to the
  // offline equivalent for the same reason — a disabled option must never remain selected.
  useEffect(() => {
    if (!isReadOnly && !canAssignCompanyInSystem && assignmentType === 'external') {
      setValue('assignmentType', 'external-offline');
      setValue('assignmentMethod', 'manual');
    }
  }, [isReadOnly, canAssignCompanyInSystem, assignmentType, setValue]);

  // Eligible internal staff — used for internal manual selection, the external followup staff, and
  // the offline keyer. All three activities resolve to the IntAppraisalStaff group and return the
  // same people, so ONE fixed activity id is queried deliberately: this result is a dependency of
  // the seeding reset below, and re-keying it on assignmentType made every type change refetch and
  // reset the form, snapping the user's choice back to the default.
  const { data: eligibleStaff } = useGetEligibleStaff(
    workflowInstanceId ?? undefined,
    'appraisal-book-verification',
  );

  // Get eligible companies for external selection, filtered by bankingSegment (loanType)
  const { data: eligibleCompanies } = useGetEligibleCompanies(
    bankingSegment,
    assignmentType === 'external',
  );

  // v2: compute lock state — assignment is locked when a non-terminal quotation owns this appraisal
  // The active quotation for this page: the open one first, else the latest finalized. Only an open
  // one locks the assignment, and the finalized one supplies the Route-External winner. (The
  // quotation section on this page shows the newest list row instead, so the two can differ.)
  const activeQuotation = pickActiveQuotation(appraisalQuotations);
  const activeNonTerminalQuotation =
    activeQuotation && NON_TERMINAL_QUOTATION_STATUSES.includes(activeQuotation.status)
      ? activeQuotation
      : null;
  const isLockedByQuotation = !!activeNonTerminalQuotation;

  // When quotation method is selected, fetch the linked quotation detail to derive winner for Route-External.
  const activeQuotationId = activeQuotation?.id ?? null;
  const { data: quotationDetail } = useGetQuotationById(
    assignmentMethod === 'quotation' ? activeQuotationId : null,
  );
  const isQuotationFinalized = quotationDetail?.status === 'Finalized';
  const quotationWinner =
    isQuotationFinalized && quotationDetail
      ? ((quotationDetail.companyQuotations ?? []).find(
          cq => cq.id === quotationDetail.tentativeWinnerQuotationId,
        ) ?? null)
      : null;

  // Modal states
  const {
    isOpen: isStaffModalOpen,
    onOpen: openStaffModal,
    onClose: closeStaffModal,
  } = useDisclosure();

  const {
    isOpen: isCompanyModalOpen,
    onOpen: openCompanyModal,
    onClose: closeCompanyModal,
  } = useDisclosure();

  const {
    isOpen: isQuotationEntryModalOpen,
    onOpen: openQuotationEntryModal,
    onClose: closeQuotationEntryModal,
  } = useDisclosure();

  const {
    isOpen: isFollowupStaffModalOpen,
    onOpen: openFollowupStaffModal,
    onClose: closeFollowupStaffModal,
  } = useDisclosure();

  // Handle staff selection
  const handleStaffSelect = (staff: InternalStaff) => {
    setValue('selectedStaff', staff, { shouldDirty: true });
    setValue('staffId', staff.id, { shouldDirty: true });
  };

  // Handle company selection
  const handleCompanySelect = (company: ExternalCompany) => {
    setValue('selectedCompany', company, { shouldDirty: true });
    setValue('companyId', company.id, { shouldDirty: true });
  };

  // Handle followup staff selection
  const handleFollowupStaffSelect = (staff: InternalStaff) => {
    setValue('selectedFollowupStaff', staff, { shouldDirty: true });
    setValue('followupStaffId', staff.id, { shouldDirty: true });
  };

  // Clear followup staff when method changes
  const handleFollowupMethodChange = (method: 'manual' | 'roundrobin') => {
    setValue('followupStaffMethod', method, { shouldDirty: true });
    setValue('selectedFollowupStaff', null, { shouldDirty: true });
    setValue('followupStaffId', null, { shouldDirty: true });
  };

  // Clear internal selection if facilityLimit constraint kicks in
  useEffect(() => {
    if (!isReadOnly && isInternalDisabled && assignmentType === 'internal') {
      setValue('assignmentType', '' as any);
      setValue('selectedStaff', null);
      setValue('staffId', null);
    }
  }, [isReadOnly, isInternalDisabled, assignmentType, setValue]);

  // Clear selections when user manually changes assignment type
  const handleAssignmentTypeChange = (value: string, fieldOnChange: (value: string) => void) => {
    fieldOnChange(value);
    setValue('selectedStaff', null);
    setValue('staffId', null);
    setValue('selectedCompany', null);
    setValue('companyId', null);
    setValue('assignmentMethod', 'manual');
    // Neither internal nor off-system external uses a FOLLOWUP staff member: internal has no
    // company to follow up on, and off-system external skips appraisal-book-verification (the
    // only activity that consumes the followup staff) entirely. Both DO use the staff picker
    // above, which selects who performs the work.
    if (value === 'internal' || value === 'external-offline') {
      setValue('selectedFollowupStaff', null);
      setValue('followupStaffId', null);
    }
  };

  // Update form when data is fetched. A fresh row is seeded once per appraisal when every input is
  // idle (so a refetch or a draft save never re-seeds it); a saved row is re-seeded while not dirty
  // as its staff/company data settles, but not while the assignment is refetching (right after a
  // draft save the cached row is still the old one). A different appraisal (page kept mounted across
  // a route change) is always seeded. The isDirty guard stops a late-arriving query from resetting
  // the form underneath the user. The loading screen below (isAwaitingSeed) holds the page back
  // until this appraisal has been seeded, so neither the baseline nor another appraisal's cached
  // selections are shown first.
  const [seededAppraisalId, setSeededAppraisalId] = useState<string | undefined>(undefined);
  const isSeedReady = isReadyToSeed({
    hasSavedSelection,
    isFetchingAssignment,
    isFetchingConfig,
    isFetchingInputs: isFetchingDefaults || isFetchingQuotations || isFetchingRequest,
  });
  const seedNow = shouldSeed({
    seededAppraisalId,
    appraisalId,
    hasSavedSelection,
    isDirty,
    isReady: isSeedReady,
  });
  useEffect(() => {
    if (!seedNow) return;
    setSeededAppraisalId(appraisalId);
    // Staff ids stored on the assignment are usernames (from the eligible-assignees pool), but
    // useGetUserById hits /auth/users/{id:guid}, which can't resolve a username. Resolve the
    // display object from the already-loaded eligible pool by id, falling back to the fetch
    // (for guid-based ids not in the pool).
    const resolvedStaff =
      assignedStaff ?? eligibleStaff?.find(s => s.id === currentAssignment?.assigneeUserId) ?? null;
    const resolvedFollowupStaff =
      followupStaff ??
      eligibleStaff?.find(s => s.id === currentAssignment?.internalAppraiserId) ??
      null;
    const values: AssignmentFormType = {
      ...resolvedFormDefaults,
      ...(currentAssignment && hasSavedSelection
        ? mapAssignmentResponseToForm(currentAssignment)
        : {}),
      selectedStaff: resolvedStaff,
      selectedCompany: assignedCompany ?? null,
      selectedFollowupStaff: resolvedFollowupStaff,
      remarks: currentAssignment?.remark ?? '',
    };
    // The correction effects below only see later changes; a reset in the same commit would
    // overwrite them, so a saved draft is corrected here too (a fresh row's defaults already are).
    // A read-only page (an assignment that was made, or the history view) shows the values as stored.
    reset(
      hasSavedSelection
        ? correctSavedSelection(values, {
            canAssignCompanyInSystem,
            isInternalDisabled,
            isReadOnly,
          })
        : values,
    );
  }, [
    reset,
    currentAssignment,
    assignedStaff,
    assignedCompany,
    followupStaff,
    eligibleStaff,
    appraisalId,
    resolvedFormDefaults,
    canAssignCompanyInSystem,
    isInternalDisabled,
    hasSavedSelection,
    isReadOnly,
    seedNow,
  ]);

  // Handle form submission
  const onSubmit = (data: AssignmentFormType) => {
    if (!appraisalId) return;

    if (!workflowInstanceId) {
      toast.error(t('administration.toasts.noWorkflowTask'));
      return;
    }

    if (!isTaskOwner) {
      toast.error(t('administration.toasts.notTaskOwner'));
      return;
    }

    // Guard: assignment is locked while an active quotation owns this appraisal
    if (isLockedByQuotation) {
      toast.error(
        t('administration.toasts.quotationLocked', {
          quotationNumber: activeNonTerminalQuotation?.quotationNumber ?? '',
          status: activeNonTerminalQuotation?.status ?? '',
        }),
      );
      return;
    }

    // Guard: quotation method requires a finalized quotation with a winner
    if (data.assignmentMethod === 'quotation' && (!isQuotationFinalized || !quotationWinner)) {
      toast.error(t('administration.toasts.quotationNotFinalized'));
      return;
    }

    // assignmentType always reflects the user's Internal/External choice — the backend
    // AssignmentType value object only accepts those two codes. The "quotation" choice
    // lives on assignmentMethod, not on assignmentType.
    //
    // Off-system external counts as External for the backend value object, but nothing is
    // selected here: the keyer records the company and the book date at int-offline-book-keyin,
    // so company / followup-staff fields are all sent null.
    const isOfflineExternal = data.assignmentType === 'external-offline';
    const isExternal = data.assignmentType === 'external' || isOfflineExternal;
    const isQuotationMethod = data.assignmentMethod === 'quotation';

    // For quotation method on an external assignment, send the finalized winner's company id
    // (not whatever was previously selected manually). Internal+quotation falls back to staffId.
    const resolvedAssigneeCompanyId =
      isExternal && !isOfflineExternal
        ? isQuotationMethod && quotationWinner
          ? quotationWinner.companyId
          : data.companyId
        : null;

    // Derive decisionTaken and assigneeCompanyName to send to the backend relay.
    // EXTO routes to int-offline-book-keyin; EXT to company-selection; INT to int-appraisal-execution.
    const decisionTaken = isOfflineExternal
      ? ('EXTO' as const)
      : isExternal
        ? ('EXT' as const)
        : ('INT' as const);
    const resolvedAssigneeCompanyName =
      isExternal && !isOfflineExternal
        ? isQuotationMethod && quotationWinner
          ? quotationWinner.companyName
          : (data.selectedCompany?.companyName ?? null)
        : null;

    createAssignment(
      {
        appraisalId: appraisalId ?? '',
        assignmentType: isExternal ? 'External' : 'Internal',
        // The offline path is External for the backend value object, but the person chosen here is
        // the INTERNAL appraiser who will key the book in — so the staff id travels exactly as it
        // does for Internal, and the handler pins them onto int-offline-book-keyin.
        assigneeUserId: isExternal && !isOfflineExternal ? null : data.staffId,
        assigneeCompanyId: resolvedAssigneeCompanyId,
        assigneeCompanyName: resolvedAssigneeCompanyName,
        assignmentMethod: data.assignmentMethod,
        internalAppraiserId: isExternal && !isOfflineExternal ? data.followupStaffId : null,
        internalFollowupAssignmentMethod:
          isExternal && !isOfflineExternal ? data.followupStaffMethod : null,
        assignedBy: currentUser?.username ?? null,
        workflowInstanceId,
        decisionTaken,
        remark: data.remarks,
      },
      {
        onSuccess: () => {
          toast.success(t('administration.toasts.assignmentCreated'));
          // The form is still dirty after assigning; skip the unsaved-changes guard for this redirect.
          skipWarning();
          navigate(taskListUrl());
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || t('administration.toasts.assignmentFailed'));
        },
      },
    );
  };

  // Handle cancel — leave the page. If the form is dirty, the useBlocker-based guard
  // intercepts this navigation and shows the unsaved-changes dialog first.
  const handleCancel = () => {
    navigate(-1);
  };

  // Save the in-progress decision (selections + remark) as a draft without assigning.
  // Deliberately skips the Assign validation guards so incomplete work can be saved.
  const handleSaveDraft = () => {
    if (!appraisalId) return;
    const data = getValues();
    // 'external-offline' is External too. Collapsing it to Internal here silently discarded the
    // admin's choice: the draft round-tripped as Internal, the radio re-seeded to "Internal Staff"
    // on reopen, and an unnoticing admin then relayed decisionTaken 'INT' — sending an internal
    // appraiser to re-do work the bank had already paid an outside company for.
    const isDraftOfflineExternal = data.assignmentType === 'external-offline';
    const isExternal = data.assignmentType === 'external' || isDraftOfflineExternal;
    saveAssignmentDraft(
      {
        appraisalId,
        assignmentType: isExternal ? 'External' : 'Internal',
        // Off-system external DOES carry a staff id — the internal appraiser who will key the book
        // in. Only a true external assignment has no internal assignee. Dropping it here (as the
        // plain `isExternal ? null` test did) silently discarded the admin's chosen keyer, so the
        // draft came back with the picker empty.
        assigneeUserId: isExternal && !isDraftOfflineExternal ? null : data.staffId,
        // Off-system external picks no company here — the keyer records it later.
        assigneeCompanyId: isExternal && !isDraftOfflineExternal ? data.companyId : null,
        assignmentMethod: isDraftOfflineExternal ? OFFLINE_DRAFT_METHOD : data.assignmentMethod,
        internalAppraiserId: isExternal && !isDraftOfflineExternal ? data.followupStaffId : null,
        internalFollowupAssignmentMethod:
          isExternal && !isDraftOfflineExternal ? data.followupStaffMethod : null,
        remark: data.remarks,
      },
      {
        onSuccess: () => {
          toast.success(t('administration.toasts.draftSaved'));
          // Rebase the dirty baseline to the just-saved values so the exit warning + Save Draft
          // button clear (nothing new to save until the user edits again).
          reset(getValues());
        },
        onError: (error: any) =>
          toast.error(error.apiError?.detail || t('administration.toasts.draftSaveFailed')),
      },
    );
  };

  if (
    isAwaitingSeed({
      appraisalId,
      seededAppraisalId,
      isLoadingAssignment,
      isLoadingConfig,
    })
  ) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon
          name="spinner"
          style="solid"
          className="w-8 h-8 animate-spin text-(--palette-primary-text)"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Main Form Content */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 pb-6 pr-4">
            {/* Assignment lock banner — shown when a non-terminal quotation owns this appraisal */}
            {isLockedByQuotation && activeNonTerminalQuotation && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-(--palette-warn-wash) px-4 py-3 flex items-start gap-3">
                <Icon name="lock" style="solid" className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {t('administration.assignmentLocked')}
                  </p>
                  <p className="text-xs text-(--palette-warn) mt-0.5">
                    {t('administration.assignmentLockedDesc', {
                      quotationNumber: activeNonTerminalQuotation.quotationNumber,
                      status: activeNonTerminalQuotation.status,
                    })}
                  </p>
                </div>
                <a
                  href="#quotation-section"
                  className="shrink-0 flex items-center gap-1 text-xs font-medium text-(--palette-warn) hover:text-amber-900 dark:hover:text-amber-200 underline underline-offset-2"
                >
                  {t('administration.openQuotation')}
                  <Icon name="arrow-down" style="solid" className="size-3" />
                </a>
              </div>
            )}

            {/* Assignment Type Card */}
            <FormCard
              title={t('administration.assignmentType.title')}
              subtitle={t('administration.assignmentType.subtitle')}
              icon="users-gear"
              iconColor="blue"
            >
              <Controller
                name="assignmentType"
                control={control}
                render={({ field }) => (
                  <HeadlessRadioGroup
                    value={field.value}
                    onChange={(value: string) => handleAssignmentTypeChange(value, field.onChange)}
                    className="flex flex-row gap-4"
                    disabled={isReadOnly || isLockedByQuotation}
                  >
                    {[
                      {
                        value: 'internal',
                        label: t('administration.assignmentType.internal'),
                        description: t('administration.assignmentType.internalDesc'),
                        icon: 'user',
                        color: 'emerald',
                        disabled: isInternalDisabled || isLockedByQuotation,
                      },
                      {
                        value: 'external',
                        label: t('administration.assignmentType.external'),
                        description: t('administration.assignmentType.externalDesc'),
                        icon: 'building',
                        color: 'purple',
                        // Shown but disabled while the go-live switch is off, with the hint below
                        // explaining why — mirroring how isInternalDisabled is handled. Submitting
                        // it would reach company-selection, which escalates the case straight back
                        // here; leaving it visible tells the admin the path exists and is paused,
                        // rather than silently removing an option they expect to see.
                        disabled: !canAssignCompanyInSystem,
                      },
                      {
                        value: 'external-offline',
                        label: t('administration.assignmentType.externalOffline'),
                        description: t('administration.assignmentType.externalOfflineDesc'),
                        icon: 'keyboard',
                        color: 'amber',
                        // Company selection happens outside CAS, so a pending quotation on this
                        // appraisal has no bearing on whether this option is available.
                        disabled: false,
                      },
                    ].map(option => (
                      <HeadlessRadioGroup.Option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        className={({ checked, disabled }) =>
                          clsx(
                            'flex-1 rounded-xl border-2 p-4 transition-all',
                            disabled
                              ? 'pointer-events-none opacity-50 cursor-not-allowed'
                              : 'cursor-pointer',
                            checked
                              ? ASSIGNMENT_TYPE_COLORS[
                                  option.color as keyof typeof ASSIGNMENT_TYPE_COLORS
                                ].card
                              : 'border-(--palette-line) hover:border-(--palette-line-strong) bg-(--palette-surface)',
                          )
                        }
                      >
                        {({ checked }) => (
                          <div className="flex items-start gap-3">
                            <div
                              className={clsx(
                                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                                checked
                                  ? ASSIGNMENT_TYPE_COLORS[
                                      option.color as keyof typeof ASSIGNMENT_TYPE_COLORS
                                    ].iconBox
                                  : 'bg-(--palette-surface-3)',
                              )}
                            >
                              <Icon
                                name={option.icon}
                                style="solid"
                                className={clsx(
                                  'w-5 h-5',
                                  checked
                                    ? ASSIGNMENT_TYPE_COLORS[
                                        option.color as keyof typeof ASSIGNMENT_TYPE_COLORS
                                      ].icon
                                    : 'text-(--palette-ink-2)',
                                )}
                              />
                            </div>
                            <div className="flex-1">
                              <div
                                className={clsx(
                                  'text-sm font-medium',
                                  checked ? 'text-(--palette-ink)' : 'text-(--palette-ink)',
                                )}
                              >
                                {option.label}
                              </div>
                              <div className="text-xs text-(--palette-gray-500) mt-0.5">
                                {option.description}
                              </div>
                            </div>
                            {checked && (
                              <Icon
                                name="circle-check"
                                style="solid"
                                className={clsx(
                                  'w-5 h-5',
                                  ASSIGNMENT_TYPE_COLORS[
                                    option.color as keyof typeof ASSIGNMENT_TYPE_COLORS
                                  ].check,
                                )}
                              />
                            )}
                          </div>
                        )}
                      </HeadlessRadioGroup.Option>
                    ))}
                  </HeadlessRadioGroup>
                )}
              />
              {errors.assignmentType && (
                <p className="mt-2 text-sm text-danger">
                  <ValidationText message={errors.assignmentType.message} />
                </p>
              )}
              {isInternalDisabled && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-(--palette-warn-wash) border border-amber-200 dark:border-amber-500/30 px-3 py-2">
                  <Icon
                    name="circle-info"
                    style="solid"
                    className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-(--palette-warn)">
                    {t('administration.assignmentType.internalDisabledHint')}
                  </p>
                </div>
              )}
              {!canAssignCompanyInSystem && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-(--palette-warn-wash) border border-amber-200 dark:border-amber-500/30 px-3 py-2">
                  <Icon
                    name="circle-info"
                    style="solid"
                    className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-(--palette-warn)">
                    {t('administration.assignmentType.externalDisabledHint')}
                  </p>
                </div>
              )}
            </FormCard>

            {/* Off-system external: nothing to select here. The company and the book's appraisal
                date are recorded by the keyer at int-offline-book-keyin, who has the paper book. */}
            {assignmentType === 'external-offline' && (
              <FormCard
                title={t('administration.offlineExternal.title')}
                subtitle={t('administration.offlineExternal.subtitle')}
                icon="keyboard"
                iconColor="amber"
              >
                {/* Who keys the book in. Kept here, in amber, rather than reusing the Internal
                    Assignment Details card: the person is an internal appraiser, but the decision
                    belongs to this engagement and reads as part of it. */}
                <div>
                  <label className="block text-sm font-medium text-(--palette-ink) mb-3">
                    {t('administration.offlineExternal.keyerMethodLabel')}
                  </label>
                  <Controller
                    name="assignmentMethod"
                    control={control}
                    render={({ field }) => (
                      <HeadlessRadioGroup
                        value={field.value}
                        onChange={field.onChange}
                        className="grid grid-cols-2 gap-3"
                        disabled={isReadOnly}
                      >
                        {[
                          {
                            value: 'manual',
                            label: t('administration.assignmentDetails.manual'),
                            description: t('administration.assignmentDetails.manualDesc'),
                            icon: 'hand-pointer',
                          },
                          {
                            value: 'roundrobin',
                            label: t('administration.assignmentDetails.roundrobin'),
                            description: t('administration.assignmentDetails.roundrobinDesc'),
                            icon: 'rotate',
                          },
                        ].map(option => (
                          <HeadlessRadioGroup.Option
                            key={option.value}
                            value={option.value}
                            className={({ checked, disabled }) =>
                              clsx(
                                'rounded-lg border p-3 transition-all',
                                disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer',
                                checked
                                  ? 'border-amber-500 bg-(--palette-warn-wash)'
                                  : 'border-(--palette-line) hover:border-(--palette-line-strong)',
                              )
                            }
                          >
                            {({ checked }) => (
                              <div className="flex items-center gap-3">
                                <Icon
                                  name={option.icon}
                                  style={checked ? 'solid' : 'regular'}
                                  className={clsx(
                                    'w-4 h-4 shrink-0',
                                    checked
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-(--palette-gray-400)',
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={clsx(
                                      'text-sm font-medium',
                                      checked
                                        ? 'text-(--palette-ink)'
                                        : 'text-(--palette-gray-600)',
                                    )}
                                  >
                                    {option.label}
                                  </div>
                                  <div className="text-xs text-(--palette-gray-500) truncate">
                                    {option.description}
                                  </div>
                                </div>
                                <div
                                  className={clsx(
                                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                    checked ? 'border-amber-500' : 'border-(--palette-line-strong)',
                                  )}
                                >
                                  {checked && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                                </div>
                              </div>
                            )}
                          </HeadlessRadioGroup.Option>
                        ))}
                      </HeadlessRadioGroup>
                    )}
                  />
                </div>

                {assignmentMethod === 'manual' && (
                  <div className="mt-6">
                    {/* Same classes and spacing as the "Who keys in the book" label above, so the
                        two read as one stack rather than two differently-spaced sections. */}
                    <label className="block text-sm font-medium text-(--palette-ink) mb-3">
                      {t('administration.manualStaff.label')} <span className="text-danger">*</span>
                    </label>
                    {selectedStaff ? (
                      <StaffDisplay
                        staff={selectedStaff}
                        onClear={
                          isReadOnly
                            ? undefined
                            : () => {
                                setValue('selectedStaff', null, { shouldDirty: true });
                                setValue('staffId', null, { shouldDirty: true });
                              }
                        }
                      />
                    ) : (
                      !isReadOnly && (
                        <button
                          type="button"
                          onClick={openStaffModal}
                          className="w-full border border-dashed border-(--palette-line-strong) rounded-lg p-4 text-left hover:bg-(--palette-warn-wash) hover:border-amber-400 transition-colors flex items-center justify-between"
                        >
                          <span className="text-sm text-(--palette-gray-500)">
                            {t('administration.manualStaff.placeholder')}
                          </span>
                          <Icon
                            name="magnifying-glass"
                            style="regular"
                            className="w-4 h-4 text-(--palette-gray-400)"
                          />
                        </button>
                      )
                    )}
                    {errors.staffId && (
                      <p className="mt-2 text-sm text-danger">
                        <ValidationText message={errors.staffId.message} />
                      </p>
                    )}
                  </div>
                )}

                {assignmentMethod === 'roundrobin' && (
                  <div className="mt-6 rounded-lg bg-(--palette-warn-wash) p-4">
                    <div className="flex items-start gap-3">
                      <Icon
                        name="circle-info"
                        style="solid"
                        className="w-5 h-5 mt-0.5 text-amber-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                          {t('administration.roundrobinInfo.title')}
                        </p>
                        <p className="text-sm mt-1 text-(--palette-warn)">
                          {t('administration.offlineExternal.keyerRoundrobinDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </FormCard>
            )}

            {/* Assignment Details Card */}
            {/* Only render the details form for a REAL selection. With nothing selected (the
                default while in-system company assignment is disabled) there is no assignee kind
                to configure, and showing the external form under a greyed-out option is what made
                a disabled path look submittable. */}
            {(assignmentType === 'internal' || assignmentType === 'external') && (
              <FormCard
                title={
                  assignmentType === 'internal'
                    ? t('administration.assignmentDetails.titleInternal')
                    : t('administration.assignmentDetails.titleExternal')
                }
                subtitle={t('administration.assignmentDetails.subtitle')}
                icon={assignmentType === 'internal' ? 'user' : 'building'}
                iconColor={assignmentType === 'internal' ? 'emerald' : 'purple'}
              >
                {/* Assignment Method */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-(--palette-ink) mb-3">
                    {t('administration.assignmentDetails.methodLabel')}
                  </label>
                  <Controller
                    name="assignmentMethod"
                    control={control}
                    render={({ field }) => {
                      // Define options based on assignment type
                      const baseOptions = [
                        {
                          value: 'manual',
                          label: t('administration.assignmentDetails.manual'),
                          description: t('administration.assignmentDetails.manualDesc'),
                          icon: 'hand-pointer',
                        },
                        {
                          value: 'roundrobin',
                          label: t('administration.assignmentDetails.roundrobin'),
                          description: t('administration.assignmentDetails.roundrobinDesc'),
                          icon: 'rotate',
                        },
                      ];

                      // Add quotation option for external only
                      const options =
                        assignmentType === 'external'
                          ? [
                              ...baseOptions,
                              {
                                value: 'quotation',
                                label: t('administration.assignmentDetails.quotation'),
                                description: t('administration.assignmentDetails.quotationDesc'),
                                icon: 'file-invoice-dollar',
                              },
                            ]
                          : baseOptions;

                      // Use purple for external, primary for internal
                      const isExternal = assignmentType === 'external';

                      return (
                        <HeadlessRadioGroup
                          value={field.value}
                          onChange={field.onChange}
                          className={clsx('grid gap-3', isExternal ? 'grid-cols-3' : 'grid-cols-2')}
                          disabled={isReadOnly || isLockedByQuotation}
                        >
                          {options.map(option => (
                            <HeadlessRadioGroup.Option
                              key={option.value}
                              value={option.value}
                              className={({ checked, disabled }) =>
                                clsx(
                                  'rounded-lg border p-3 transition-all',
                                  disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer',
                                  checked
                                    ? isExternal
                                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                                      : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                                    : 'border-(--palette-line) hover:border-(--palette-line-strong)',
                                )
                              }
                            >
                              {({ checked }) => (
                                <div className="flex items-center gap-3">
                                  <Icon
                                    name={option.icon}
                                    style={checked ? 'solid' : 'regular'}
                                    className={clsx(
                                      'w-4 h-4 shrink-0',
                                      checked
                                        ? isExternal
                                          ? 'text-purple-600 dark:text-purple-400'
                                          : 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-(--palette-gray-400)',
                                    )}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className={clsx(
                                        'text-sm font-medium',
                                        checked
                                          ? 'text-(--palette-ink)'
                                          : 'text-(--palette-gray-600)',
                                      )}
                                    >
                                      {option.label}
                                    </div>
                                    <div className="text-xs text-(--palette-gray-500) truncate">
                                      {option.description}
                                    </div>
                                  </div>
                                  <div
                                    className={clsx(
                                      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                      checked
                                        ? isExternal
                                          ? 'border-purple-500'
                                          : 'border-emerald-500'
                                        : 'border-(--palette-line-strong)',
                                    )}
                                  >
                                    {checked && (
                                      <div
                                        className={clsx(
                                          'w-2 h-2 rounded-full',
                                          isExternal ? 'bg-purple-500' : 'bg-emerald-500',
                                        )}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                            </HeadlessRadioGroup.Option>
                          ))}
                        </HeadlessRadioGroup>
                      );
                    }}
                  />
                </div>

                {/* Manual Selection - Internal Staff */}
                {assignmentMethod === 'manual' && assignmentType === 'internal' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-(--palette-ink) mb-2">
                      {t('administration.manualStaff.label')} <span className="text-danger">*</span>
                    </label>
                    {selectedStaff ? (
                      <StaffDisplay
                        staff={selectedStaff}
                        onClear={
                          isReadOnly || isLockedByQuotation
                            ? undefined
                            : () => {
                                setValue('selectedStaff', null, { shouldDirty: true });
                                setValue('staffId', null, { shouldDirty: true });
                              }
                        }
                      />
                    ) : (
                      !isReadOnly &&
                      !isLockedByQuotation && (
                        <button
                          type="button"
                          onClick={openStaffModal}
                          className="w-full border border-dashed border-(--palette-line-strong) rounded-lg p-4 text-left hover:bg-(--palette-surface-2) hover:border-(--palette-line-strong) transition-colors flex items-center justify-between"
                        >
                          <span className="text-sm text-(--palette-gray-500)">
                            {t('administration.manualStaff.placeholder')}
                          </span>
                          <Icon
                            name="magnifying-glass"
                            style="regular"
                            className="w-4 h-4 text-(--palette-gray-400)"
                          />
                        </button>
                      )
                    )}
                    {errors.staffId && (
                      <p className="mt-2 text-sm text-danger">
                        <ValidationText message={errors.staffId.message} />
                      </p>
                    )}
                  </div>
                )}

                {/* Manual Selection - External Company */}
                {assignmentMethod === 'manual' && assignmentType === 'external' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-(--palette-ink) mb-2">
                      {t('administration.manualCompany.label')}{' '}
                      <span className="text-danger">*</span>
                    </label>
                    {selectedCompany ? (
                      <CompanyDisplay
                        company={selectedCompany}
                        onClear={
                          isReadOnly || isLockedByQuotation
                            ? undefined
                            : () => {
                                setValue('selectedCompany', null, { shouldDirty: true });
                                setValue('companyId', null, { shouldDirty: true });
                              }
                        }
                      />
                    ) : (
                      !isReadOnly &&
                      !isLockedByQuotation && (
                        <button
                          type="button"
                          onClick={openCompanyModal}
                          className="w-full border border-dashed border-(--palette-line-strong) rounded-lg p-4 text-left hover:bg-(--palette-surface-2) hover:border-(--palette-line-strong) transition-colors flex items-center justify-between"
                        >
                          <span className="text-sm text-(--palette-gray-500)">
                            {t('administration.manualCompany.placeholder')}
                          </span>
                          <Icon
                            name="magnifying-glass"
                            style="regular"
                            className="w-4 h-4 text-(--palette-gray-400)"
                          />
                        </button>
                      )
                    )}
                    {errors.companyId && (
                      <p className="mt-2 text-sm text-danger">
                        <ValidationText message={errors.companyId.message} />
                      </p>
                    )}
                  </div>
                )}

                {/* Round-robin Info */}
                {assignmentMethod === 'roundrobin' && (
                  <div
                    className={clsx(
                      'mb-6 rounded-lg p-4',
                      assignmentType === 'internal'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10'
                        : 'bg-purple-50 dark:bg-purple-500/10',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon
                        name="circle-info"
                        style="solid"
                        className={clsx(
                          'w-5 h-5 mt-0.5',
                          assignmentType === 'internal' ? 'text-emerald-500' : 'text-purple-500',
                        )}
                      />
                      <div>
                        <p
                          className={clsx(
                            'text-sm font-medium',
                            assignmentType === 'internal'
                              ? 'text-emerald-900 dark:text-emerald-200'
                              : 'text-purple-900 dark:text-purple-200',
                          )}
                        >
                          {t('administration.roundrobinInfo.title')}
                        </p>
                        <p
                          className={clsx(
                            'text-sm mt-1',
                            assignmentType === 'internal'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-purple-700 dark:text-purple-300',
                          )}
                        >
                          {assignmentType === 'internal'
                            ? t('administration.roundrobinInfo.internalDesc')
                            : t('administration.roundrobinInfo.externalDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Internal Followup Staff - Only for external assignments */}
                {assignmentType === 'external' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-(--palette-ink) mb-3">
                      {t('administration.followupStaff.label')}{' '}
                      {followupStaffMethod === 'manual' && <span className="text-danger">*</span>}
                    </label>

                    {/* Followup method chooser */}
                    <Controller
                      name="followupStaffMethod"
                      control={control}
                      render={({ field }) => (
                        <HeadlessRadioGroup
                          value={field.value}
                          onChange={(value: 'manual' | 'roundrobin') =>
                            handleFollowupMethodChange(value)
                          }
                          className="grid grid-cols-2 gap-3 mb-4"
                          disabled={isReadOnly || isLockedByQuotation}
                        >
                          {[
                            {
                              value: 'manual',
                              label: t('administration.followupStaff.manualLabel'),
                              description: t('administration.followupStaff.manualDesc'),
                              icon: 'hand-pointer',
                            },
                            {
                              value: 'roundrobin',
                              label: t('administration.followupStaff.roundrobinLabel'),
                              description: t('administration.followupStaff.roundrobinDesc'),
                              icon: 'rotate',
                            },
                          ].map(option => (
                            <HeadlessRadioGroup.Option
                              key={option.value}
                              value={option.value}
                              className={({ checked, disabled }) =>
                                clsx(
                                  'rounded-lg border p-3 transition-all',
                                  disabled ? 'pointer-events-none opacity-60' : 'cursor-pointer',
                                  checked
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                                    : 'border-(--palette-line) hover:border-(--palette-line-strong)',
                                )
                              }
                            >
                              {({ checked }) => (
                                <div className="flex items-center gap-3">
                                  <Icon
                                    name={option.icon}
                                    style={checked ? 'solid' : 'regular'}
                                    className={clsx(
                                      'w-4 h-4 shrink-0',
                                      checked
                                        ? 'text-purple-600 dark:text-purple-400'
                                        : 'text-(--palette-gray-400)',
                                    )}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className={clsx(
                                        'text-sm font-medium',
                                        checked
                                          ? 'text-(--palette-ink)'
                                          : 'text-(--palette-gray-600)',
                                      )}
                                    >
                                      {option.label}
                                    </div>
                                    <div className="text-xs text-(--palette-gray-500) truncate">
                                      {option.description}
                                    </div>
                                  </div>
                                  <div
                                    className={clsx(
                                      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                      checked
                                        ? 'border-purple-500'
                                        : 'border-(--palette-line-strong)',
                                    )}
                                  >
                                    {checked && (
                                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                                    )}
                                  </div>
                                </div>
                              )}
                            </HeadlessRadioGroup.Option>
                          ))}
                        </HeadlessRadioGroup>
                      )}
                    />

                    {/* Round-robin info box */}
                    {followupStaffMethod === 'roundrobin' && (
                      <div className="rounded-lg p-4 bg-purple-50 dark:bg-purple-500/10">
                        <div className="flex items-start gap-3">
                          <Icon
                            name="circle-info"
                            style="solid"
                            className="w-5 h-5 mt-0.5 text-purple-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
                              {t('administration.roundrobinInfo.title')}
                            </p>
                            <p className="text-sm mt-1 text-purple-700 dark:text-purple-300">
                              {t('administration.followupStaff.roundrobinInfo')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Manual staff selection */}
                    {followupStaffMethod === 'manual' && (
                      <>
                        {selectedFollowupStaff ? (
                          <StaffDisplay
                            staff={selectedFollowupStaff}
                            onClear={
                              isReadOnly || isLockedByQuotation
                                ? undefined
                                : () => {
                                    setValue('selectedFollowupStaff', null, { shouldDirty: true });
                                    setValue('followupStaffId', null, { shouldDirty: true });
                                  }
                            }
                            variant="purple"
                          />
                        ) : (
                          !isReadOnly &&
                          !isLockedByQuotation && (
                            <button
                              type="button"
                              onClick={openFollowupStaffModal}
                              className="w-full border border-dashed border-purple-300 dark:border-purple-500/40 rounded-lg p-4 text-left hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:border-purple-400 transition-colors flex items-center justify-between"
                            >
                              <span className="text-sm text-(--palette-gray-500)">
                                {t('administration.followupStaff.placeholder')}
                              </span>
                              <Icon
                                name="magnifying-glass"
                                style="regular"
                                className="w-4 h-4 text-purple-400"
                              />
                            </button>
                          )
                        )}
                        {errors.followupStaffId && (
                          <p className="mt-2 text-sm text-danger">
                            <ValidationText message={errors.followupStaffId.message} />
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </FormCard>
            )}

            {/* Current Assignment Info (if already assigned) */}
            {/*{currentAssignment && (*/}
            {/*  <FormCard*/}
            {/*    title="Current Assignment"*/}
            {/*    subtitle="This appraisal has been assigned"*/}
            {/*    icon="check-circle"*/}
            {/*    iconColor="emerald"*/}
            {/*  >*/}
            {/*    <div className="space-y-4">*/}
            {/*      <div className="flex items-center gap-4">*/}
            {/*        <div className="size-12 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">*/}
            {/*          <Icon name="user" style="solid" className="size-5 text-(--palette-accent-ink)" />*/}
            {/*        </div>*/}
            {/*        <div>*/}
            {/*          <div className="text-sm font-medium text-(--palette-ink)">*/}
            {/*            {currentAssignment.externalAppraiserName ||*/}
            {/*              currentAssignment.assigneeUserId ||*/}
            {/*              'Assigned'}*/}
            {/*          </div>*/}
            {/*          <div className="text-xs text-(--palette-gray-500)">*/}
            {/*            {currentAssignment.assignmentType}*/}
            {/*          </div>*/}
            {/*        </div>*/}
            {/*        <Badge*/}
            {/*          type="status"*/}
            {/*          value={currentAssignment.assignmentStatus}*/}
            {/*          className="ml-auto"*/}
            {/*        />*/}
            {/*      </div>*/}

            {/*      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-(--palette-line-soft)">*/}
            {/*        <div>*/}
            {/*          <div className="text-xs text-(--palette-gray-500)">Assignment Source</div>*/}
            {/*          <div className="text-sm font-medium text-(--palette-ink)">*/}
            {/*            {currentAssignment.assignmentMethod}*/}
            {/*          </div>*/}
            {/*        </div>*/}
            {/*        <div>*/}
            {/*          <div className="text-xs text-(--palette-gray-500)">Assigned At</div>*/}
            {/*          <div className="text-sm font-medium text-(--palette-ink)">*/}
            {/*            {new Date(currentAssignment.assignedAt).toLocaleString('th-TH')}*/}
            {/*          </div>*/}
            {/*        </div>*/}
            {/*      </div>*/}
            {/*    </div>*/}
            {/*  </FormCard>*/}
            {/*)}*/}

            {/* Quotation Section - visible when quotation method is selected OR when a
                non-terminal quotation already owns this appraisal (refresh case). */}
            {/* Method-driven visibility is external-only (a stale 'quotation' method must not open
                this section when no type is selected), but a locked appraisal always shows it —
                the lock banner above links to #quotation-section. */}
            {((assignmentType === 'external' && assignmentMethod === 'quotation') ||
              isLockedByQuotation) && (
              <div id="quotation-section">
                <QuotationSection
                  appraisalId={appraisalId ?? ''}
                  onCreateNew={openQuotationEntryModal}
                  // This appraisal's appraisal-assignment task is open on this page; auto-assign
                  // would resume that same task and leave the form below acting on a finished one.
                  allowAutoAssign={false}
                />
              </div>
            )}

            {/* Remark Card — kept at the bottom of the form */}
            <FormCard
              title={t('administration.remark.title')}
              subtitle={t('administration.remark.subtitle')}
              icon="note-sticky"
              iconColor="amber"
            >
              <Controller
                name="remarks"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder={t('administration.remark.placeholder')}
                    maxLength={4000}
                    showCharCount
                    disabled={isReadOnly}
                    error={errors.remarks?.message}
                  />
                )}
              />
            </FormCard>
          </div>
        </div>

        {/* Sticky Action Buttons */}
        {!isReadOnly && (
          <div className="shrink-0 bg-(--palette-surface) border-t border-(--palette-line) px-4 py-3 pr-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button variant="ghost" type="button" onClick={handleCancel}>
                  Cancel
                </Button>
                <div className="h-6 w-px bg-(--palette-line)" />
                {isDirty && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {t('administration.unsavedChanges')}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || isCreating || !isDirty}
                >
                  {isSavingDraft ? (
                    <>
                      <Icon style="solid" name="spinner" className="size-4 mr-2 animate-spin" />
                      {t('administration.savingDraft')}
                    </>
                  ) : (
                    <>
                      <Icon style="solid" name="floppy-disk" className="size-4 mr-2" />
                      {t('administration.saveDraft')}
                    </>
                  )}
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || isLockedByQuotation || !canSubmitAssignment}
                >
                  {isCreating ? (
                    <>
                      <Icon style="solid" name="spinner" className="size-4 mr-2 animate-spin" />
                      {t('administration.assigning')}
                    </>
                  ) : (
                    <>
                      <Icon style="solid" name="paper-plane" className="size-4 mr-2" />
                      {t('administration.assign')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>

      <UnsavedChangesDialog blocker={blocker} />

      {/* Modals */}
      {!isReadOnly && (
        <>
          <SearchStaffModal
            isOpen={isStaffModalOpen}
            onClose={closeStaffModal}
            onSelect={handleStaffSelect}
            eligibleStaff={eligibleStaff}
          />
          <SearchStaffModal
            isOpen={isFollowupStaffModalOpen}
            onClose={closeFollowupStaffModal}
            onSelect={handleFollowupStaffSelect}
            eligibleStaff={eligibleStaff}
          />
          <SearchCompanyModal
            isOpen={isCompanyModalOpen}
            onClose={closeCompanyModal}
            onSelect={handleCompanySelect}
            eligibleCompanies={eligibleCompanies}
          />
          <QuotationEntryModal
            isOpen={isQuotationEntryModalOpen}
            onClose={closeQuotationEntryModal}
            appraisalId={appraisalId ?? ''}
            requestId={requestId}
            workflowInstanceId={workflowInstanceId ?? undefined}
            bankingSegment={bankingSegment}
            isSegmentLoading={isRequestLoading}
            // A failed background refetch keeps the last known data, so it must not blank the segment.
            isSegmentError={isRequestError && !requestData}
            assignmentType={
              assignmentType
                ? assignmentType.charAt(0).toUpperCase() + assignmentType.slice(1)
                : null
            }
            assignmentMethod={
              assignmentMethod
                ? assignmentMethod.charAt(0).toUpperCase() + assignmentMethod.slice(1)
                : null
            }
            internalFollowupAssignmentMethod={followupStaffMethod ?? null}
          />
        </>
      )}
    </div>
  );
};

export default AdministrationPage;
