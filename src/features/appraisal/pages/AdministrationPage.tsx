import { useEffect } from 'react';
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
import FormCard from '@/shared/components/sections/FormCard';
import { useDisclosure } from '@/shared/hooks/useDisclosure';

import {
  useCreateAssignment,
  useGetAppraisalQuotations,
  useGetAssignment,
  useGetCompanyById,
  useGetEligibleCompanies,
  useGetEligibleStaff,
  useGetUserById,
  useSaveAssignmentDraft,
} from '../api/administration';
import { useGetQuotationById } from '@/features/quotation/api/quotation';
import {
  assignmentFormDefaults,
  useAssignmentFormSchema,
  type AssignmentFormType,
} from '../schemas/administration';
import type { ExternalCompany, InternalStaff } from '../types/administration';

import SearchStaffModal from '../components/SearchStaffModal';
import SearchCompanyModal from '../components/SearchCompanyModal';
import StaffDisplay from '../components/StaffDisplay';
import CompanyDisplay from '../components/CompanyDisplay';
import QuotationSection from '../components/QuotationSection';
import QuotationEntryModal from '../components/QuotationEntryModal';
import { useAuthStore } from '@features/auth/store.ts';
import { mapAssignmentResponseToForm } from '@features/appraisal/utils/mappers.ts';
import { useSystemConfigurationBool } from '@shared/api/systemConfiguration';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';

/**
 * AssignmentMethod persisted for an off-system external DRAFT. Matches the backend's
 * AppraisalAssignment.OfflineAssignmentMethod so reopening the draft re-seeds the
 * "External (Appraised Offline)" radio rather than falling back to a plain external method.
 */
const OFFLINE_DRAFT_METHOD = 'Offline';

const AdministrationPage = () => {
  const { t } = useTranslation('appraisal');
  const assignmentSchema = useAssignmentFormSchema();
  const appraisalId = useAppraisalId();
  const requestId = useAppraisalRequestId();
  const currentUser = useAuthStore(state => state.user);

  // Fetch request data to get bankingSegment for company filtering and facilityLimit for routing constraints
  const { data: requestData } = useGetRequestById(requestId ?? '');
  const bankingSegment = (requestData as any)?.detail?.loanDetail?.bankingSegment as
    | string
    | undefined;
  const facilityLimit = ((requestData as any)?.detail?.loanDetail?.facilityLimit ?? 0) as number;
  const isInternalDisabled = facilityLimit > 50_000_000;

  // API hooks
  const { data: assignments, isLoading: isLoadingAssignment } = useGetAssignment(appraisalId ?? '');
  const currentAssignment = assignments?.[0] ?? null;
  const pageReadOnly = usePageReadOnly();
  const localReadOnly =
    !!currentAssignment && currentAssignment.assignmentStatus.toLowerCase() !== 'pending';
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
  const canAssignCompanyInSystem = useSystemConfigurationBool(
    'ExternalCompanyAssignmentEnabled',
    true,
  );

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
  // click away for the exception. 'quotation' is external-only, so the method falls back to manual.
  //
  // Fixing this in the defaults rather than with a corrective effect is deliberate: reset() below
  // re-applies assignmentFormDefaults whenever one of its async deps resolves, so an effect that
  // clears the value afterwards just loses the race.
  const resolvedFormDefaults: AssignmentFormType = canAssignCompanyInSystem
    ? assignmentFormDefaults
    : {
        ...assignmentFormDefaults,
        assignmentType: 'external-offline',
        assignmentMethod: 'manual',
      };

  // A saved draft can still carry 'external' from before the switch was thrown. Move it to the
  // offline equivalent for the same reason — a disabled option must never remain selected.
  useEffect(() => {
    if (!canAssignCompanyInSystem && assignmentType === 'external') {
      setValue('assignmentType', 'external-offline');
      setValue('assignmentMethod', 'manual');
    }
  }, [canAssignCompanyInSystem, assignmentType, setValue]);

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

  // Always fetch all quotations for this appraisal (used for both the quotation section and the lock check)
  const { data: appraisalQuotations = [] } = useGetAppraisalQuotations(appraisalId ?? null);

  // v2: compute lock state — assignment is locked when a non-terminal quotation owns this appraisal
  const NON_TERMINAL_STATUSES = [
    'Draft',
    'Sent',
    'UnderAdminReview',
    'PendingRmSelection',
    'WinnerTentative',
    'Negotiating',
  ];
  const activeNonTerminalQuotation =
    appraisalQuotations.find(q => NON_TERMINAL_STATUSES.includes(q.status)) ?? null;
  const isLockedByQuotation = !!activeNonTerminalQuotation;

  // When quotation method is selected, fetch the linked quotation detail to derive winner for Route-External
  const activeQuotationId = appraisalQuotations[0]?.id ?? null;
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
    if (isInternalDisabled && assignmentType === 'internal') {
      setValue('assignmentType', '' as any);
      setValue('selectedStaff', null);
      setValue('staffId', null);
    }
  }, [isInternalDisabled, assignmentType, setValue]);

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

  // Update form when data is fetched.
  //
  // Guarded on isDirty: this effect re-runs whenever ANY of its async dependencies settles
  // (assignedStaff, assignedCompany, followupStaff, eligibleStaff, the config flag). Without the
  // guard a late-arriving query resets the form underneath the user and discards whatever they had
  // just selected. Seeding is only meaningful before the first edit anyway.
  useEffect(() => {
    if (isDirty) return;
    if (currentAssignment) {
      const formValues = mapAssignmentResponseToForm(currentAssignment);
      // Only re-seed the saved selections when the row holds real data — i.e. a draft has been
      // saved, or the assignment is no longer Pending (already assigned/read-only). A freshly
      // created Pending row keeps the blank defaults (External + Request Quotation).
      const hasSavedSelection =
        !!currentAssignment.draftSavedAt ||
        currentAssignment.assignmentStatus.toLowerCase() !== 'pending';
      // Staff ids stored on the assignment are usernames (from the eligible-assignees pool), but
      // useGetUserById hits /auth/users/{id:guid}, which can't resolve a username. Resolve the
      // display object from the already-loaded eligible pool by id, falling back to the fetch
      // (for guid-based ids not in the pool).
      const resolvedStaff =
        assignedStaff ??
        eligibleStaff?.find(s => s.id === currentAssignment.assigneeUserId) ??
        null;
      const resolvedFollowupStaff =
        followupStaff ??
        eligibleStaff?.find(s => s.id === currentAssignment.internalAppraiserId) ??
        null;
      reset({
        ...resolvedFormDefaults,
        ...(hasSavedSelection ? formValues : {}),
        selectedStaff: resolvedStaff,
        selectedCompany: assignedCompany ?? null,
        selectedFollowupStaff: resolvedFollowupStaff,
        remarks: currentAssignment.remark ?? '',
      });
    }
  }, [
    reset,
    isLoadingAssignment,
    currentAssignment,
    assignedStaff,
    assignedCompany,
    followupStaff,
    eligibleStaff,
    // The config query resolves after the first render, so the reset must re-run once the flag is
    // known — otherwise the form keeps the External default seeded before the answer arrived.
    canAssignCompanyInSystem,
    isDirty,
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
          navigate('/tasks');
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

  if (isLoadingAssignment) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
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
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                <Icon name="lock" style="solid" className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800">
                    {t('administration.assignmentLocked')}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {t('administration.assignmentLockedDesc', {
                      quotationNumber: activeNonTerminalQuotation.quotationNumber,
                      status: activeNonTerminalQuotation.status,
                    })}
                  </p>
                </div>
                <a
                  href="#quotation-section"
                  className="shrink-0 flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
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
                              ? `border-${option.color}-500 bg-${option.color}-50`
                              : 'border-gray-200 hover:border-gray-300 bg-white',
                          )
                        }
                      >
                        {({ checked }) => (
                          <div className="flex items-start gap-3">
                            <div
                              className={clsx(
                                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                                checked ? `bg-${option.color}-200` : 'bg-gray-100',
                              )}
                            >
                              <Icon
                                name={option.icon}
                                style="solid"
                                className={clsx(
                                  'w-5 h-5',
                                  checked ? `text-${option.color}-600` : 'text-gray-400',
                                )}
                              />
                            </div>
                            <div className="flex-1">
                              <div
                                className={clsx(
                                  'text-sm font-medium',
                                  checked ? 'text-gray-900' : 'text-gray-700',
                                )}
                              >
                                {option.label}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {option.description}
                              </div>
                            </div>
                            {checked && (
                              <Icon
                                name="circle-check"
                                style="solid"
                                className={`w-5 h-5 text-${option.color}-500`}
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
                <p className="mt-2 text-sm text-danger">{errors.assignmentType.message}</p>
              )}
              {isInternalDisabled && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <Icon
                    name="circle-info"
                    style="solid"
                    className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-amber-700">
                    {t('administration.assignmentType.internalDisabledHint')}
                  </p>
                </div>
              )}
              {!canAssignCompanyInSystem && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <Icon
                    name="circle-info"
                    style="solid"
                    className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-amber-700">
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
                  <label className="block text-sm font-medium text-gray-700 mb-3">
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
                                  ? 'border-amber-500 bg-amber-50'
                                  : 'border-gray-200 hover:border-gray-300',
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
                                    checked ? 'text-amber-600' : 'text-gray-400',
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={clsx(
                                      'text-sm font-medium',
                                      checked ? 'text-gray-900' : 'text-gray-600',
                                    )}
                                  >
                                    {option.label}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {option.description}
                                  </div>
                                </div>
                                <div
                                  className={clsx(
                                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                    checked ? 'border-amber-500' : 'border-gray-300',
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
                    <label className="block text-sm font-medium text-gray-700 mb-3">
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
                          className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-left hover:bg-amber-50 hover:border-amber-400 transition-colors flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-500">
                            {t('administration.manualStaff.placeholder')}
                          </span>
                          <Icon
                            name="magnifying-glass"
                            style="regular"
                            className="w-4 h-4 text-gray-400"
                          />
                        </button>
                      )
                    )}
                    {errors.staffId && (
                      <p className="mt-2 text-sm text-danger">{errors.staffId.message}</p>
                    )}
                  </div>
                )}

                {assignmentMethod === 'roundrobin' && (
                  <div className="mt-6 rounded-lg bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <Icon
                        name="circle-info"
                        style="solid"
                        className="w-5 h-5 mt-0.5 text-amber-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-amber-900">
                          {t('administration.roundrobinInfo.title')}
                        </p>
                        <p className="text-sm mt-1 text-amber-700">
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
                  <label className="block text-sm font-medium text-gray-700 mb-3">
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
                                      ? 'border-purple-500 bg-purple-50'
                                      : 'border-emerald-500 bg-emerald-50'
                                    : 'border-gray-200 hover:border-gray-300',
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
                                          ? 'text-purple-600'
                                          : 'text-emerald-600'
                                        : 'text-gray-400',
                                    )}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className={clsx(
                                        'text-sm font-medium',
                                        checked ? 'text-gray-900' : 'text-gray-600',
                                      )}
                                    >
                                      {option.label}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
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
                                        : 'border-gray-300',
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-left hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-500">
                            {t('administration.manualStaff.placeholder')}
                          </span>
                          <Icon
                            name="magnifying-glass"
                            style="regular"
                            className="w-4 h-4 text-gray-400"
                          />
                        </button>
                      )
                    )}
                    {errors.staffId && (
                      <p className="mt-2 text-sm text-danger">{errors.staffId.message}</p>
                    )}
                  </div>
                )}

                {/* Manual Selection - External Company */}
                {assignmentMethod === 'manual' && assignmentType === 'external' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-left hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-500">
                            {t('administration.manualCompany.placeholder')}
                          </span>
                          <Icon
                            name="magnifying-glass"
                            style="regular"
                            className="w-4 h-4 text-gray-400"
                          />
                        </button>
                      )
                    )}
                    {errors.companyId && (
                      <p className="mt-2 text-sm text-danger">{errors.companyId.message}</p>
                    )}
                  </div>
                )}

                {/* Round-robin Info */}
                {assignmentMethod === 'roundrobin' && (
                  <div
                    className={clsx(
                      'mb-6 rounded-lg p-4',
                      assignmentType === 'internal' ? 'bg-emerald-50' : 'bg-purple-50',
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
                            assignmentType === 'internal' ? 'text-emerald-900' : 'text-purple-900',
                          )}
                        >
                          {t('administration.roundrobinInfo.title')}
                        </p>
                        <p
                          className={clsx(
                            'text-sm mt-1',
                            assignmentType === 'internal' ? 'text-emerald-700' : 'text-purple-700',
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
                    <label className="block text-sm font-medium text-gray-700 mb-3">
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
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-gray-300',
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
                                      checked ? 'text-purple-600' : 'text-gray-400',
                                    )}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className={clsx(
                                        'text-sm font-medium',
                                        checked ? 'text-gray-900' : 'text-gray-600',
                                      )}
                                    >
                                      {option.label}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {option.description}
                                    </div>
                                  </div>
                                  <div
                                    className={clsx(
                                      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                                      checked ? 'border-purple-500' : 'border-gray-300',
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
                      <div className="rounded-lg p-4 bg-purple-50">
                        <div className="flex items-start gap-3">
                          <Icon
                            name="circle-info"
                            style="solid"
                            className="w-5 h-5 mt-0.5 text-purple-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-purple-900">
                              {t('administration.roundrobinInfo.title')}
                            </p>
                            <p className="text-sm mt-1 text-purple-700">
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
                              className="w-full border border-dashed border-purple-300 rounded-lg p-4 text-left hover:bg-purple-50 hover:border-purple-400 transition-colors flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-500">
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
                            {errors.followupStaffId.message}
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
            {/*        <div className="size-12 rounded-full bg-primary-100 flex items-center justify-center">*/}
            {/*          <Icon name="user" style="solid" className="size-5 text-primary-700" />*/}
            {/*        </div>*/}
            {/*        <div>*/}
            {/*          <div className="text-sm font-medium text-gray-900">*/}
            {/*            {currentAssignment.externalAppraiserName ||*/}
            {/*              currentAssignment.assigneeUserId ||*/}
            {/*              'Assigned'}*/}
            {/*          </div>*/}
            {/*          <div className="text-xs text-gray-500">*/}
            {/*            {currentAssignment.assignmentType}*/}
            {/*          </div>*/}
            {/*        </div>*/}
            {/*        <Badge*/}
            {/*          type="status"*/}
            {/*          value={currentAssignment.assignmentStatus}*/}
            {/*          className="ml-auto"*/}
            {/*        />*/}
            {/*      </div>*/}

            {/*      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">*/}
            {/*        <div>*/}
            {/*          <div className="text-xs text-gray-500">Assignment Source</div>*/}
            {/*          <div className="text-sm font-medium text-gray-900">*/}
            {/*            {currentAssignment.assignmentMethod}*/}
            {/*          </div>*/}
            {/*        </div>*/}
            {/*        <div>*/}
            {/*          <div className="text-xs text-gray-500">Assigned At</div>*/}
            {/*          <div className="text-sm font-medium text-gray-900">*/}
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
                    error={errors.remarks?.message}
                  />
                )}
              />
            </FormCard>
          </div>
        </div>

        {/* Sticky Action Buttons */}
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
