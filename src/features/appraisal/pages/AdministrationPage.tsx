import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useActivityId,
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
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { Textarea } from '@/shared/components';
import { useCompleteActivity } from '../api';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';

const AdministrationPage = () => {
  const { t } = useTranslation('appraisal');
  const assignmentSchema = useAssignmentFormSchema();
  const appraisalId = useAppraisalId();
  const requestId = useAppraisalRequestId();
  const currentUser = useAuthStore(state => state.user);
  const hasResetRef = useRef(false);
  const activityId = useActivityId();
  const completeActivity = useCompleteActivity();

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

  // Track which button is in flight so each spinner shows on the right button.
  const [pendingAction, setPendingAction] = useState<'save' | 'assign' | null>(null);
  const isSaving = pendingAction === 'save' && isCreating;
  const isAssigning = pendingAction === 'assign' && isCreating;
  const navigate = useNavigate();
  const workflowInstanceId = useWorkflowInstanceId();
  const isTaskOwner = useIsTaskOwner();
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
    formState: { errors, isDirty },
  } = useForm<AssignmentFormType>({
    defaultValues: assignmentFormDefaults,
    resolver: zodResolver(assignmentSchema),
  });

  const { blocker, skipWarning } = useUnsavedChangesWarning(isDirty);

  // Watch form values for conditional rendering
  const assignmentType = watch('assignmentType');
  const assignmentMethod = watch('assignmentMethod');
  const selectedStaff = watch('selectedStaff');
  const selectedCompany = watch('selectedCompany');
  const selectedFollowupStaff = watch('selectedFollowupStaff');
  const followupStaffMethod = watch('followupStaffMethod');

  // Get eligible internal staff (used for both internal manual selection and external followup staff)
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
    setValue('assignmentMethod', 'quotation');
    if (value === 'internal') {
      setValue('selectedFollowupStaff', null);
      setValue('followupStaffId', null);
      setValue('assignmentMethod', 'manual');
    }
  };

  // Update form when data is fetched
  useEffect(() => {
    if (currentAssignment) {
      if (hasResetRef.current) {
        hasResetRef.current = false;
        return;
      }
      const formValues = mapAssignmentResponseToForm(currentAssignment);
      reset({
        ...formValues,
        selectedStaff: assignedStaff ?? null,
        selectedCompany: assignedCompany ?? null,
        selectedFollowupStaff: followupStaff ?? null,
      });
    }
  }, [
    reset,
    isLoadingAssignment,
    currentAssignment,
    assignedStaff,
    assignedCompany,
    followupStaff,
  ]);

  // ── Shared payload builder ────────────────────────────────────────────────

  const buildPayload = (data: AssignmentFormType, submitToWorkflow: boolean) => {
    // assignmentType always reflects the user's Internal/External choice — the backend
    // AssignmentType value object only accepts those two codes. The "quotation" choice
    // lives on assignmentMethod, not on assignmentType.
    const isExternal = data.assignmentType === 'external';
    const isQuotationMethod = data.assignmentMethod === 'quotation';

    // For quotation method on an external assignment, send the finalized winner's company id
    // (not whatever was previously selected manually). Internal+quotation falls back to staffId.
    const resolvedCompanyId = isExternal
      ? isQuotationMethod && quotationWinner
        ? quotationWinner.companyId
        : (data.companyId ?? null)
      : null;

    // Derive decisionTaken and assigneeCompanyName to send to the backend relay
    const decisionTaken = isExternal ? ('EXT' as const) : ('INT' as const);
    const resolvedCompanyName = isExternal
      ? isQuotationMethod && quotationWinner
        ? quotationWinner.companyName
        : (data.selectedCompany?.companyName ?? null)
      : null;

    return {
      appraisalId: appraisalId ?? '',
      assignmentType: isExternal ? 'External' : 'Internal',
      assigneeUserId: isExternal ? null : data.staffId,
      assigneeCompanyId: resolvedCompanyId,
      assigneeCompanyName: resolvedCompanyName,
      assignmentMethod: data.assignmentMethod,
      internalAppraiserId: isExternal ? data.followupStaffId : null,
      internalAppraiserName: isExternal ? data.selectedFollowupStaff?.name : null,
      internalFollowupAssignmentMethod: isExternal ? data.followupStaffMethod : null,
      assignedBy: currentUser?.username ?? null,
      workflowInstanceId: workflowInstanceId ?? '',
      comment: data.comment ?? null,
      decisionTaken: decisionTaken,
      submitToWorkflow,
    };
  };

  // ── Save (no workflow) ────────────────────────────────────────────────────

  const handleSave = () => {
    const data = watch();
    setPendingAction('save');
    createAssignment(buildPayload(data, false), {
      onSuccess: () => {
        toast.success('Saved');
        hasResetRef.current = true;
        reset(data, { keepValues: false });
        setPendingAction(null);
      },
      onError: (error: any) => {
        toast.error(error.apiError?.detail || 'Save failed');
        setPendingAction(null);
      },
    });
  };

  // ── Assign (save + workflow) ──────────────────────────────────────────────

  const onSubmit = (data: AssignmentFormType) => {
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
    const isExternal = data.assignmentType === 'external';
    const comment = watch('comment');
    const decisionTaken = isExternal ? ('EXT' as const) : ('INT' as const);

    setPendingAction('assign');
    createAssignment(buildPayload(data, true), {
      onSuccess: () => {
        completeActivity.mutate({
          workflowInstanceId: workflowInstanceId!,
          activityId: activityId!,
          input: {
            decisionTaken: decisionTaken,
            comments: comment ?? '',
          },
        });
        toast.success(t('administration.toasts.assignmentCreated'));
        skipWarning();
        setPendingAction(null);
        navigate('/tasks');
      },
      onError: (error: any) => {
        toast.error(error.apiError?.detail || t('administration.toasts.assignmentFailed'));
        setPendingAction(null);
      },
    });
  };

  const handleCancel = () => reset(assignmentFormDefaults);

  // ── Render ────────────────────────────────────────────────────────────────

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
            </FormCard>

            {/* Assignment Details Card */}
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
                    {t('administration.manualCompany.label')} <span className="text-danger">*</span>
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
                        <p className="mt-2 text-sm text-danger">{errors.followupStaffId.message}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </FormCard>

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
            {(assignmentMethod === 'quotation' || isLockedByQuotation) && (
              <div id="quotation-section">
                <QuotationSection
                  appraisalId={appraisalId ?? ''}
                  onCreateNew={openQuotationEntryModal}
                />
              </div>
            )}

            <div>
              <Controller
                name="comment"
                control={control}
                render={({ field }) => (
                  <Textarea
                    label={'Comments'}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    disabled={isReadOnly}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Sticky Action Buttons */}
        {!isReadOnly && (
          <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 pr-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button variant="ghost" type="button" onClick={handleCancel} disabled={isCreating}>
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
                {/* Save — save only, no workflow */}
                <Button variant="outline" type="button" onClick={handleSave} isLoading={isSaving}>
                  <Icon style="regular" name="floppy-disk" className="size-4 mr-2" />
                  Save
                </Button>

                {/* Assign — starts workflow */}
                <Button
                  type="submit"
                  isLoading={isAssigning}
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
