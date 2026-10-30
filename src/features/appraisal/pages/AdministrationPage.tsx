import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { taskListUrl } from '@features/task/utils/taskReturn';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useAppraisalContextSafe,
  useAppraisalId,
  useAppraisalRequestId,
  useIsTaskOwner,
  useWorkflowInstanceId,
} from '@/features/appraisal/context/AppraisalContext';
import { useGetRequestById } from '@/features/request/api';
import { Controller, type FieldErrors, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import Icon from '@/shared/components/Icon';
import Textarea from '@/shared/components/inputs/Textarea';
import { translateValidationMessage } from '@/shared/components/form/validationMessage';
import FormCard from '@/shared/components/sections/FormCard';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';

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
import { useQueryClient } from '@tanstack/react-query';
import { invalidateFeePreviews, useGetFeePreview } from '../api/feePreview';
import { useGetQuotationById } from '@/features/quotation/api/quotation';
import {
  NON_TERMINAL_QUOTATION_STATUSES,
  pickShownQuotation,
} from '@/features/quotation/utils/pickActiveQuotation';
import {
  ASSIGNMENT_REMARKS_MAX,
  assignmentFormDefaults,
  type AssignmentFormType,
  useAssignmentFormSchema,
} from '../schemas/administration';
import type { ExternalCompany, InternalStaff } from '../types/administration';
import type { FeePreviewParams } from '../types/feePreview';
import { personLabel } from '../utils/personLabel';
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
import StaffDisplay, { StoredCode } from '../components/StaffDisplay';
import CompanyDisplay from '../components/CompanyDisplay';
import PreviousCompanyBanner from '../components/PreviousCompanyBanner';
import ChangeCompanyDialog from '../components/ChangeCompanyDialog';
import AssignmentFeeCard from '../components/AssignmentFeeCard';
import QuotationSection from '../components/QuotationSection';
import QuotationEntryModal from '../components/QuotationEntryModal';
import SegmentedChoice, {
  type SegmentedOption,
} from '../components/administration/SegmentedChoice';
import AssignmentSlip, {
  type AssignmentSlipProps,
} from '../components/administration/AssignmentSlip';
import AssignmentSlipBar from '../components/administration/AssignmentSlipBar';
import {
  FieldError,
  FieldLabel,
  InlineNotice,
  PickerButton,
} from '../components/administration/AdministrationFields';
import {
  computeSlipChecks,
  feeStatusOf,
  type SlipCheckId,
} from '../components/administration/slipChecks';
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

/** Where "go fix" lands inside a section: the checked radio, a text field, or the first button. */
const FIX_FOCUS_TARGET =
  '[role="radio"][tabindex="0"], textarea, input:not([disabled]), button:not([disabled])';

/** Track width of the Manual / Round-robin choice (the off-system keyer's and the follow-up staff's). */
const TWO_WAY_CHOICE_WIDTH = 'max-w-[18.5rem]';

type FixTarget = 'type' | 'assignee' | 'followup' | 'fee' | 'remarks' | 'quotation';

const AdministrationPage = () => {
  const { t } = useTranslation('appraisal');
  const assignmentSchema = useAssignmentFormSchema();
  const appraisalId = useAppraisalId();
  const requestId = useAppraisalRequestId();
  const reportNo = useAppraisalContextSafe()?.appraisal?.appraisalReportNo;
  const currentUser = useAuthStore(state => state.user);
  const localizeCompanyName = useLocalizedCompanyName();
  const labelsId = useId();

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
  // The company that did the prior inspection (its display object is resolved below, once the
  // eligible list is known).
  const previousCompany = assignmentDefaults?.previousCompany ?? null;
  // The tag on the previous company wherever it is listed or shown (no number for the original).
  const previousCompanyBadge =
    previousCompany?.inspectionNumber != null
      ? t('administration.previousCompany.badge', { n: previousCompany.inspectionNumber })
      : t('administration.previousCompany.badgeNoInspection');
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
  // can complete. Missing workflow context (deep-linked outside a task) or a non-owner can browse
  // the page, but cannot submit, and cannot change fees either (those writes are immediate).
  // (The slip's checklist carries the same two conditions as its block reasons.)
  const canSubmitAssignment = isTaskOwner && !!workflowInstanceId;

  // Fetch assigned staff/company by ID for display
  const { data: assignedStaff } = useGetUserById(currentAssignment?.assigneeUserId ?? null);
  const { data: assignedCompany } = useGetCompanyById(currentAssignment?.assigneeCompanyId ?? null);
  const { data: followupStaff } = useGetUserById(currentAssignment?.internalAppraiserId ?? null);

  // Form setup
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    getValues,
    formState: { isDirty, submitCount },
  } = useForm<AssignmentFormType>({
    defaultValues: assignmentFormDefaults,
    resolver: zodResolver(assignmentSchema),
  });

  // Warn (in-app navigation + browser tab close) when leaving with unsaved changes.
  const { blocker, skipWarning } = useUnsavedChangesWarning(isDirty);

  // Watch form values for conditional rendering
  const assignmentMethod = useWatch({ control, name: 'assignmentMethod' });
  const selectedStaff = useWatch({ control, name: 'selectedStaff' });
  const selectedCompany = useWatch({ control, name: 'selectedCompany' });
  const selectedFollowupStaff = useWatch({ control, name: 'selectedFollowupStaff' });
  const followupStaffMethod = useWatch({ control, name: 'followupStaffMethod' });
  const staffId = useWatch({ control, name: 'staffId' });
  const companyId = useWatch({ control, name: 'companyId' });
  const followupStaffId = useWatch({ control, name: 'followupStaffId' });
  // (A made off-system assignment is stored with AssignmentMethod 'Offline', which
  // mapAssignmentResponseToForm already turns into 'external-offline'.)
  const assignmentType = useWatch({ control, name: 'assignmentType' });
  // Only whether the remark is over the limit reaches the page, so typing does not re-render it.
  const remarksTooLong = useWatch({
    control,
    name: 'remarks',
    compute: (value: string) => value.length > ASSIGNMENT_REMARKS_MAX,
  });

  // The companies the manual picker offers for the request's customer segment (bankingSegment is
  // the loanType filter). Also fetched while a fresh row is waiting to be seeded: the previous
  // company is preselected only if it is one of them.
  // Whether the seed may preselect the previous company at all: not over a saved draft or made
  // assignment (the admin's own choice), not with the type defaults skipped, and not while in-system
  // assignment is switched off. The one rule for the list fetch, the seed's wait and the preselect.
  const canPreselect = !hasSavedSelection && !skipTypeDefaults && canAssignCompanyInSystem;
  const needsPreselectCheck = !!previousCompany?.mouActive && canPreselect;
  // Which appraisal the form has been seeded for (see the seed below).
  const [seededAppraisalId, setSeededAppraisalId] = useState<string | undefined>(undefined);
  // After the seed only an external type needs the list (picker, change-company dialog); what the
  // banner reads stays in the query cache, so switching type does not lose it.
  const isEligibleListWanted =
    assignmentType === 'external' || (needsPreselectCheck && seededAppraisalId !== appraisalId);
  const { data: eligibleCompanies, isFetching: isFetchingEligibleCompanies } =
    useGetEligibleCompanies(bankingSegment, isEligibleListWanted);
  const previousCompanyListed = previousCompany
    ? eligibleCompanies?.find(c => c.id === previousCompany.companyId)
    : undefined;
  const isPreviousCompanyEligible =
    !!previousCompany?.mouActive &&
    !!previousCompanyListed &&
    previousCompanyListed.isAssignable !== false;
  // The previous company's display object (preselect, banner name, "keep") is the eligible list's
  // entry. Only a company the list does not hold (an inactive MOU, another segment) is looked up on
  // its own, and only once the list has answered or is not being fetched, so the common case sends
  // no GET /companies/{id}. That fetch feeds the banner's name only, never the seed.
  const isEligibleListPending =
    isEligibleListWanted &&
    !eligibleCompanies &&
    (isFetchingEligibleCompanies || isFetchingRequest);
  const { data: previousCompanyFetched } = useGetCompanyById(
    previousCompany && !previousCompanyListed && !isEligibleListPending
      ? previousCompany.companyId
      : null,
  );
  const previousCompanyData = previousCompanyListed ?? previousCompanyFetched;

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
        preselectCompany: canPreselect && isPreviousCompanyEligible ? previousCompanyData : null,
      }),
    [
      assignmentDefaults,
      canAssignCompanyInSystem,
      isInternalDisabled,
      skipTypeDefaults,
      canPreselect,
      isPreviousCompanyEligible,
      previousCompanyData,
    ],
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

  // v2: compute lock state — assignment is locked when a non-terminal quotation owns this appraisal.
  // ONE quotation is "the" one for this page: the one the quotation section shows (the open one,
  // else the latest Finalized, else the newest row; pickShownQuotation). It decides the lock, the Route-External winner (only
  // when it is Finalized) and the slip, so what the admin sees and what is sent never disagree.
  const shownQuotation = pickShownQuotation(appraisalQuotations);
  const activeNonTerminalQuotation =
    shownQuotation && NON_TERMINAL_QUOTATION_STATUSES.includes(shownQuotation.status)
      ? shownQuotation
      : null;
  const isLockedByQuotation = !!activeNonTerminalQuotation;

  // When quotation method is selected, fetch the linked quotation detail to derive winner for Route-External.
  const activeQuotationId = shownQuotation?.id ?? null;
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

  // "Touched" = the admin has dealt with that field (picked, cleared, closed its picker, left it) or
  // pressed "go fix" on the slip. A field's error only shows once touched, so a fresh page is not red.
  const [touched, setTouched] = useState<Partial<Record<SlipCheckId, boolean>>>({});
  const touch = (id: SlipCheckId) =>
    setTouched(prev => (prev[id] ? prev : { ...prev, [id]: true }));
  const untouch = (...ids: SlipCheckId[]) =>
    setTouched(prev => {
      const next = { ...prev };
      ids.forEach(id => delete next[id]);
      return next;
    });
  const sectionRefs = useRef<Partial<Record<FixTarget, HTMLElement | null>>>({});
  const sectionRef = (id: FixTarget) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

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
  const clearStaff = () => {
    setValue('selectedStaff', null, { shouldDirty: true });
    setValue('staffId', null, { shouldDirty: true });
    touch('assignee');
  };

  // Handle company selection. Choosing any company other than the prior inspection's (its MOU is
  // active and the picker offers it) asks first, whatever is selected now; the pick waits in
  // pendingCompany until confirmed. Choosing the prior inspection's company is applied directly.
  const [pendingCompany, setPendingCompany] = useState<ExternalCompany | null>(null);
  // The system chose the previous company when it seeded a fresh row, and nothing has changed the
  // company since. Any pick, clear or type change ends it for good (the banner says "chosen for you").
  const [previousPreselected, setPreviousPreselected] = useState(false);
  // The page can stay mounted across a route change to another appraisal: the touched fields, a
  // pick waiting for confirmation and the flags above belong to the one before.
  const [trackedAppraisalId, setTrackedAppraisalId] = useState(appraisalId);
  if (trackedAppraisalId !== appraisalId) {
    setTrackedAppraisalId(appraisalId);
    setTouched({});
    setPendingCompany(null);
    setPreviousPreselected(false);
  }
  const applyCompany = (company: ExternalCompany) => {
    setValue('selectedCompany', company, { shouldDirty: true });
    setValue('companyId', company.id, { shouldDirty: true });
    setPreviousPreselected(false);
  };
  const handleCompanySelect = (company: ExternalCompany) => {
    // Picking the company that is already selected changes nothing (and keeps "chosen for you").
    // If only its id is held (a saved company whose record could not be looked up), the pick
    // supplies the record so the card shows it: not a change, so not dirty and no hint is lost.
    if (getValues('companyId') === company.id) {
      if (getValues('selectedCompany')?.id !== company.id) setValue('selectedCompany', company);
      return;
    }
    // Any other company than the previous one is asked about, whatever is selected now (also after
    // a clear, or a switch of type and back); picking the previous company itself is applied.
    if (previousCompany && isPreviousCompanyEligible && company.id !== previousCompany.companyId) {
      setPendingCompany(company);
      return;
    }
    applyCompany(company);
  };
  const clearCompany = () => {
    setValue('selectedCompany', null, { shouldDirty: true });
    setValue('companyId', null, { shouldDirty: true });
    setPreviousPreselected(false);
    touch('assignee');
  };
  // "Keep the previous company": drops the pick and selects the previous company (the same two
  // fields a normal select writes). If it is already the selected one nothing is written, so the
  // "chosen for you" hint stays as it was.
  const keepPreviousCompany = () => {
    if (previousCompanyListed && getValues('companyId') !== previousCompanyListed.id) {
      applyCompany(previousCompanyListed);
    }
    setPendingCompany(null);
  };
  // Esc, the backdrop or a close: only drops the pick; whatever is selected stays.
  const cancelCompanyChange = () => setPendingCompany(null);
  const confirmCompanyChange = () => {
    if (pendingCompany) applyCompany(pendingCompany);
    setPendingCompany(null);
  };

  // Handle followup staff selection
  const handleFollowupStaffSelect = (staff: InternalStaff) => {
    setValue('selectedFollowupStaff', staff, { shouldDirty: true });
    setValue('followupStaffId', staff.id, { shouldDirty: true });
  };
  const clearFollowupStaff = () => {
    setValue('selectedFollowupStaff', null, { shouldDirty: true });
    setValue('followupStaffId', null, { shouldDirty: true });
    touch('followup');
  };

  // Clear followup staff when method changes
  const handleFollowupMethodChange = (method: 'manual' | 'roundrobin') => {
    setValue('followupStaffMethod', method, { shouldDirty: true });
    setValue('selectedFollowupStaff', null, { shouldDirty: true });
    setValue('followupStaffId', null, { shouldDirty: true });
    untouch('followup');
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
    setPreviousPreselected(false);
    // The picks were just cleared: their fields start fresh, not red.
    untouch('assignee', 'followup');
  };

  // Update form when data is fetched. A fresh row is seeded once per appraisal when every input is
  // idle (so a refetch or a draft save never re-seeds it); a saved row is re-seeded while not dirty
  // as its staff/company data settles, but not while the assignment is refetching (right after a
  // draft save the cached row is still the old one). A different appraisal (page kept mounted across
  // a route change) is always seeded. The isDirty guard stops a late-arriving query from resetting
  // the form underneath the user. The loading screen below (isAwaitingSeed) holds the page back
  // until this appraisal has been seeded, so neither the baseline nor another appraisal's cached
  // selections are shown first.
  const isSeedReady = isReadyToSeed({
    hasSavedSelection,
    isFetchingAssignment,
    isFetchingConfig,
    isFetchingInputs:
      isFetchingDefaults ||
      isFetchingQuotations ||
      isFetchingRequest ||
      // The seed waits for the eligible list only when it decides a preselection.
      (needsPreselectCheck && isFetchingEligibleCompanies),
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
    const saved =
      currentAssignment && hasSavedSelection
        ? mapAssignmentResponseToForm(currentAssignment)
        : null;
    const values: AssignmentFormType = {
      ...resolvedFormDefaults,
      ...saved,
      selectedStaff: resolvedStaff,
      // companyId and selectedCompany come from ONE source, never mixed: the saved row's company
      // (its record, else the picker's list entry for that id), or on a fresh row the defaults'
      // (the prior inspection's company when preselected, else none).
      selectedCompany: saved
        ? (assignedCompany ?? eligibleCompanies?.find(c => c.id === saved.companyId) ?? null)
        : resolvedFormDefaults.selectedCompany,
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
    // What the seed did about the previous company: chose it on a fresh row (the banner may say
    // so until anything changes). Saving a draft turns the row into a saved one and seeds again:
    // the state is kept then for as long as the selected company is still that same one.
    setPreviousPreselected(wasPreselected =>
      hasSavedSelection
        ? wasPreselected && !!values.companyId && values.companyId === previousCompany?.companyId
        : !!resolvedFormDefaults.selectedCompany &&
          resolvedFormDefaults.selectedCompany.id === previousCompany?.companyId,
    );
  }, [
    reset,
    previousCompany,
    eligibleCompanies,
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

  const awaitingSeed = isAwaitingSeed({
    appraisalId,
    seededAppraisalId,
    isLoadingAssignment,
    isLoadingConfig,
  });

  // The fee estimate for the selection above. A made assignment (read-only page) asks for the
  // actual one instead, since the form then only shows what was stored. The fee card reads the
  // same query with the same params, so React Query serves both from one request; the slip takes
  // its figures from here. Held back until the form is seeded so the defaults ask for nothing.
  // An editable page with no type selected has nothing to estimate (null): asking with no params
  // would return the STORED assignment's fee, which is not what this form is about.
  // Empty params only once the assignment is actually made (localReadOnly): a page that is
  // read-only via pageReadOnly while the row is still Pending/draft shows the draft's type/method,
  // so its fee must be estimated from those, not read off the stored row.
  const feeParams: FeePreviewParams | null = localReadOnly
    ? {}
    : assignmentType
      ? {
          assignmentType,
          assignmentMethod,
          // No companyId: the backend reads it only on the quotation path, where the page never
          // sends one (a quotation's winner is the company), so a pick must not change the key.
        }
      : null;
  const {
    data: feePreview,
    isPlaceholderData: isFeePlaceholder,
    isError: isFeeError,
    isFetching: isFeeFetching,
  } = useGetFeePreview(appraisalId ?? '', feeParams ?? {}, !awaitingSeed && feeParams !== null);
  // A cached preview that still waits for a winner while the shown quotation already has one (it was
  // finalized elsewhere; the preview cache outlives the quotation's) is stale: read it again once
  // per winner, and claim nothing about the fee until that read has landed.
  const queryClient = useQueryClient();
  const winnerId = quotationWinner?.id ?? null;
  const isPreviewStaleForWinner = !!winnerId && feePreview?.baseSource.kind === 'QuotationPending';
  const [refetchedForWinner, setRefetchedForWinner] = useState<string | null>(null);
  useEffect(() => {
    if (!isPreviewStaleForWinner || !appraisalId || refetchedForWinner === winnerId) return;
    setRefetchedForWinner(winnerId);
    invalidateFeePreviews(queryClient, [appraisalId]);
  }, [isPreviewStaleForWinner, appraisalId, winnerId, refetchedForWinner, queryClient]);
  const isAwaitingFreshPreview =
    isPreviewStaleForWinner && (refetchedForWinner !== winnerId || isFeeFetching);
  // While the previous selection's figures are on screen (the card dims them), or there is nothing
  // to estimate, the slip claims nothing: no total, and the fee check is neither ok nor warn.
  const feeStatus =
    feeParams === null || isFeePlaceholder || isAwaitingFreshPreview
      ? 'unknown'
      : feeStatusOf(feePreview, !!quotationWinner);

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

    // Guard: the fee-preview has loaded and has no base amount (the server rejects it too)
    if (feeStatus === 'missing') {
      toast.error(t('administration.slip.reason.feeMissing'));
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
    // A pick left in the form by switching to another method is not sent: only a manual method
    // has a chosen person or company (the form keeps it, so switching back shows it again).
    const isManualMethod = data.assignmentMethod === 'manual';

    // For quotation method on an external assignment, send the finalized winner's company id
    // (not whatever was previously selected manually).
    const resolvedAssigneeCompanyId =
      isExternal && !isOfflineExternal
        ? isQuotationMethod && quotationWinner
          ? quotationWinner.companyId
          : isManualMethod
            ? data.companyId
            : null
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
          : isManualMethod
            ? (data.selectedCompany?.companyName ?? null)
            : null
        : null;

    createAssignment(
      {
        appraisalId: appraisalId ?? '',
        assignmentType: isExternal ? 'External' : 'Internal',
        // The offline path is External for the backend value object, but the person chosen here is
        // the INTERNAL appraiser who will key the book in — so the staff id travels exactly as it
        // does for Internal, and the handler pins them onto int-offline-book-keyin.
        assigneeUserId:
          isExternal && !isOfflineExternal ? null : isManualMethod ? data.staffId : null,
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
          // The server's detail is English: this code has its own translated message.
          toast.error(
            error.apiError?.errorCode === 'FeeBaseMissing'
              ? t('administration.slip.reason.feeMissing')
              : error.apiError?.detail || t('administration.toasts.assignmentFailed'),
          );
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
    // Only a manual method has a chosen person or company; a pick left in the form after switching
    // to another method is not saved (the form keeps it, so switching back shows it again).
    const isManualMethod = data.assignmentMethod === 'manual';
    saveAssignmentDraft(
      {
        appraisalId,
        assignmentType: isExternal ? 'External' : 'Internal',
        // Off-system external DOES carry a staff id — the internal appraiser who will key the book
        // in. Only a true external assignment has no internal assignee. Dropping it here (as the
        // plain `isExternal ? null` test did) silently discarded the admin's chosen keyer, so the
        // draft came back with the picker empty.
        assigneeUserId:
          isExternal && !isDraftOfflineExternal ? null : isManualMethod ? data.staffId : null,
        // Off-system external picks no company here — the keyer records it later.
        assigneeCompanyId:
          isExternal && !isDraftOfflineExternal && isManualMethod ? data.companyId : null,
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

  // A schema failure that the slip's checklist does not mirror would otherwise make Assign do
  // nothing. The attempt reveals every error (submitCount), and the first invalid field is named.
  const onInvalid = (errors: FieldErrors<AssignmentFormType>) => {
    // The schema's messages are tokens (translated where shown), so resolve it for the toast.
    const first = Object.values(errors)[0]?.message;
    toast.error(
      typeof first === 'string' && first
        ? translateValidationMessage(t, first)
        : t('administration.toasts.selectAssignee'),
    );
  };
  const submit = handleSubmit(onSubmit, onInvalid);

  if (awaitingSeed) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon
          name="spinner"
          style="solid"
          className="animate-spin text-3xl text-(--palette-primary-text)"
        />
      </div>
    );
  }

  // ---- Presentation -------------------------------------------------------------------------

  const isStaffAssignee = assignmentType === 'internal' || assignmentType === 'external-offline';
  const isExternalType = assignmentType === 'external';
  // The pickers: not while read-only, nor while a quotation owns the appraisal (the off-system
  // keyer picker is the one that ignores the quotation lock, as before).
  const canEditPicker = !isReadOnly && !isLockedByQuotation;

  const slipResult = computeSlipChecks({
    assignmentType: assignmentType ?? '',
    assignmentMethod,
    staffId,
    companyId,
    followupStaffMethod,
    followupStaffId,
    remarksTooLong,
    hasWorkflowTask: !!workflowInstanceId,
    isTaskOwner,
    isLockedByQuotation,
    lockedQuotation: activeNonTerminalQuotation
      ? {
          quotationNumber: activeNonTerminalQuotation.quotationNumber,
          status: activeNonTerminalQuotation.status,
        }
      : null,
    quotationStatus: shownQuotation?.status ?? null,
    quotationWinnerReady: !!quotationWinner,
    feeStatus,
    revealed: touched,
    submitted: submitCount > 0,
  });

  // A field's error: only once touched (or after a submit attempt), and only if its check failed.
  const fieldError = (id: SlipCheckId, message: string) =>
    (submitCount > 0 || touched[id]) &&
    slipResult.checks.some(check => check.id === id && check.status === 'error')
      ? message
      : undefined;
  const typeError = fieldError('type', t('validation.assignmentTypeRequired'));
  const assigneeError = fieldError(
    'assignee',
    isExternalType ? t('validation.selectCompany') : t('validation.selectAssignee'),
  );
  const followupError = fieldError('followup', t('validation.selectFollowupStaff'));
  const remarksError = fieldError(
    'remarks',
    t('validation.remarksMaxLength', { max: ASSIGNMENT_REMARKS_MAX }),
  );

  // "Go fix" on the slip: mark the field touched (so its error shows), scroll it into view and
  // focus its first control.
  const handleFix = (id: SlipCheckId) => {
    touch(id);
    const target: FixTarget = id === 'quotationSent' || id === 'quotationWinner' ? 'quotation' : id;
    const section = sectionRefs.current[target];
    section?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    // A control the section marks as its fix (the fee card's "Set amount") wins over the first one.
    (
      section?.querySelector<HTMLElement>('[data-fix-target]:not([disabled])') ??
      section?.querySelector<HTMLElement>(FIX_FOCUS_TARGET)
    )?.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
  };

  const typeOptions: SegmentedOption<AssignmentFormType['assignmentType']>[] = [
    {
      value: 'internal',
      label: t('administration.assignmentType.internal'),
      description: t('administration.assignmentType.internalDesc'),
      // A quotation lock disables the whole group, not this option.
      disabled: isInternalDisabled,
      disabledReason: t('administration.assignmentType.internalDisabledReason'),
    },
    {
      value: 'external',
      label: t('administration.assignmentType.external'),
      description: t('administration.assignmentType.externalDesc'),
      // Shown but disabled while the go-live switch is off: the card gives the short reason and the
      // hint below says what to use instead. Submitting it would reach company-selection,
      // which escalates the case straight back here; leaving it visible tells the admin the path
      // exists and is paused, rather than silently removing an option they expect to see.
      disabled: !canAssignCompanyInSystem,
      disabledReason: t('administration.assignmentType.externalDisabledReason'),
    },
    {
      value: 'external-offline',
      label: t('administration.assignmentType.externalOffline'),
      description: t('administration.assignmentType.externalOfflineDesc'),
      // Not disabled by itself: neither the facility limit nor the in-system kill switch applies
      // to an engagement made outside CAS. (While a quotation owns the appraisal, the whole type
      // choice is locked through the control's own `disabled`, so this option is locked with it.)
      disabled: false,
    },
  ];

  const methodOptions: SegmentedOption<AssignmentFormType['assignmentMethod']>[] = [
    {
      value: 'manual',
      label: t('administration.assignmentDetails.manual'),
      description: t('administration.assignmentDetails.manualDesc'),
    },
    {
      value: 'roundrobin',
      label: t('administration.assignmentDetails.roundrobin'),
      description: t(
        isExternalType
          ? 'administration.roundrobinInfo.externalDesc'
          : 'administration.roundrobinInfo.internalDesc',
      ),
    },
    // Quotation is external-only.
    ...(isExternalType
      ? [
          {
            value: 'quotation' as const,
            label: t('administration.assignmentDetails.quotation'),
            description: t('administration.assignmentDetails.quotationDesc'),
          },
        ]
      : []),
  ];

  // The off-system keyer and the follow-up staff choose between the same two things; only the
  // round-robin hint differs (manual opens a picker, which needs no hint).
  const staffMethodOptions = (
    roundrobinHint: string,
  ): SegmentedOption<'manual' | 'roundrobin'>[] => [
    { value: 'manual', label: t('administration.assignmentDetails.manual') },
    {
      value: 'roundrobin',
      label: t('administration.assignmentDetails.roundrobin'),
      description: roundrobinHint,
    },
  ];
  const keyerOptions = staffMethodOptions(t('administration.offlineExternal.keyerRoundrobinDesc'));
  const followupOptions = staffMethodOptions(t('administration.followupStaff.roundrobinInfo'));

  // The names the saved assignment carries, valid only while the form still holds that same pick.
  const storedAssigneeName =
    staffId && staffId === currentAssignment?.assigneeUserId
      ? currentAssignment.assigneeUserName
      : null;
  const storedFollowupName =
    followupStaffId && followupStaffId === currentAssignment?.internalAppraiserId
      ? currentAssignment.internalAppraiserName
      : null;
  // The staff member the form holds as "Name (code)": the looked-up person, else the stored name,
  // else the stored code alone. Null when nobody is picked.
  const staffPersonLabel = (
    staff: InternalStaff | null,
    id: string | null,
    name: string | null | undefined,
  ) =>
    staff
      ? personLabel(staff.name, staff.employeeId || staff.id)
      : id
        ? personLabel(name, id)
        : null;

  const renderStaffPicker = (o: {
    staff: InternalStaff | null;
    placeholder: string;
    labelId: string;
    onOpen: () => void;
    onClear: () => void;
    canEdit: boolean;
    error?: string;
    /** The id or code stored for this pick when its staff record could not be resolved. */
    storedCode?: string | null;
    /** The name the assignment record carries for that code, if any. */
    storedName?: string | null;
  }) => (
    <>
      {o.staff ? (
        <StaffDisplay
          staff={o.staff}
          onChange={o.canEdit ? o.onOpen : undefined}
          onClear={o.canEdit ? o.onClear : undefined}
        />
      ) : o.storedCode ? (
        <StoredCode
          code={o.storedCode}
          name={o.storedName}
          onChange={o.canEdit ? o.onOpen : undefined}
          onClear={o.canEdit ? o.onClear : undefined}
        />
      ) : o.canEdit ? (
        <PickerButton
          placeholder={o.placeholder}
          onClick={o.onOpen}
          invalid={!!o.error}
          labelledBy={o.labelId}
        />
      ) : (
        // Read-only and nothing stored: say so, rather than leave an empty slot.
        isReadOnly && (
          <p className="text-sm text-(--palette-gray-500)">{t('administration.noData')}</p>
        )
      )}
      <FieldError>{o.error}</FieldError>
    </>
  );

  const slipProps: AssignmentSlipProps = {
    subtitle: reportNo,
    readOnly: isReadOnly,
    isAssigned: localReadOnly,
    assignmentType: assignmentType ?? '',
    assignmentMethod,
    // A person is "Name (code)", or the code alone when no name is known. A stored code that does
    // not resolve to a person is still the record's own value.
    assigneeName: isStaffAssignee
      ? staffPersonLabel(selectedStaff, staffId, storedAssigneeName)
      : selectedCompany
        ? localizeCompanyName(selectedCompany.companyName, selectedCompany.companyNameLocal)
        : companyId,
    isPreviousCompany:
      isExternalType && !!selectedCompany && selectedCompany.id === previousCompany?.companyId,
    followupMethod: followupStaffMethod,
    followupName: staffPersonLabel(selectedFollowupStaff, followupStaffId, storedFollowupName),
    quotationWinnerName: quotationWinner
      ? localizeCompanyName(quotationWinner.companyName, quotationWinner.companyNameLocal)
      : undefined,
    fee: feeStatus === 'ready' ? (feePreview ?? null) : null,
    feeStatus,
    result: slipResult,
    onFix: handleFix,
    isDirty,
    isAssigning: isCreating,
    isSavingDraft,
    onAssign: () => {
      void submit();
    },
    onSaveDraft: handleSaveDraft,
    onCancel: handleCancel,
    assignedAt: localReadOnly ? currentAssignment?.assignedAt : null,
    assignedBy: localReadOnly ? currentAssignment?.assignedBy : null,
    assignedByName: localReadOnly ? currentAssignment?.assignedByName : null,
  };

  return (
    // The page content is a size container: the slip sits in a right rail once it is at least
    // 64rem wide, and below that the form is one column with the slip as a bar at the bottom.
    <div className="@container flex h-full min-h-0 flex-col">
      {/* Not a <form>: Assign and Save draft are plain buttons that call submit / the draft save
          themselves, and a form would let Enter in a nested text field (the quotation section's)
          submit the page. */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* relative: absolutely positioned descendants (sr-only cells) must be clipped here, not extend the document. */}
        <div className="relative min-h-0 flex-1 overflow-y-auto pr-4 pb-6">
          <div className="grid grid-cols-1 items-start gap-x-5 gap-y-3 @5xl:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="flex min-w-0 flex-col gap-3">
              {/* Assignment lock banner — shown when a non-terminal quotation owns this appraisal */}
              {isLockedByQuotation && activeNonTerminalQuotation && (
                <InlineNotice
                  tone="amber"
                  action={
                    <a
                      href="#quotation-section"
                      className="flex items-center gap-1 font-medium whitespace-nowrap underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
                    >
                      {t('administration.openQuotation')}
                      <Icon name="arrow-down" style="solid" />
                    </a>
                  }
                >
                  <span className="font-medium">{t('administration.assignmentLocked')}</span>{' '}
                  {t('administration.assignmentLockedDesc', {
                    quotationNumber: activeNonTerminalQuotation.quotationNumber,
                    status: activeNonTerminalQuotation.status,
                  })}
                </InlineNotice>
              )}

              {/* Construction Inspection: the company that did the prior inspection. Shown even while
                  in-system external assignment is switched off, so the admin still knows who it was. */}
              {previousCompany && (
                <PreviousCompanyBanner
                  previousCompany={previousCompany}
                  companyNameLocal={previousCompanyData?.companyNameLocal}
                  isEligible={eligibleCompanies ? isPreviousCompanyEligible : undefined}
                  isPreselected={previousPreselected}
                  readOnly={isReadOnly}
                  // Only a manual pick is sent, so only then is the company "selected" (the form
                  // keeps it across a method change; switching back shows it again).
                  isSelected={
                    assignmentType === 'external' &&
                    assignmentMethod === 'manual' &&
                    selectedCompany?.id === previousCompany.companyId
                  }
                />
              )}

              {isReadOnly && (
                <InlineNotice tone="gray">
                  {t(
                    localReadOnly
                      ? 'administration.readOnlyBanner.assigned'
                      : 'administration.readOnlyBanner.viewOnly',
                  )}
                </InlineNotice>
              )}

              {/* Assignment Type Card */}
              <FormCard
                title={t('administration.assignmentType.title')}
                subtitle={t('administration.assignmentType.subtitle')}
              >
                <div ref={sectionRef('type')}>
                  <Controller
                    name="assignmentType"
                    control={control}
                    render={({ field }) => (
                      <SegmentedChoice
                        ariaLabel={t('administration.assignmentType.title')}
                        options={typeOptions}
                        value={assignmentType}
                        onChange={value => {
                          handleAssignmentTypeChange(value, field.onChange);
                          touch('type');
                        }}
                        variant="cards"
                        disabled={isReadOnly || isLockedByQuotation}
                      />
                    )}
                  />
                  <FieldError>{typeError}</FieldError>
                  {/* What to pick instead; nothing to pick while the type choice is locked. */}
                  {!canAssignCompanyInSystem && !isReadOnly && !isLockedByQuotation && (
                    <p className="mt-2 text-xs text-(--palette-warn)">
                      {t('administration.assignmentType.externalDisabledHint')}
                    </p>
                  )}
                </div>
              </FormCard>

              {/* Off-system external: nothing to select here. The company and the book's appraisal
                  date are recorded by the keyer at int-offline-book-keyin, who has the paper book. */}
              {assignmentType === 'external-offline' && (
                <FormCard
                  title={t('administration.offlineExternal.title')}
                  subtitle={t('administration.offlineExternal.subtitle')}
                >
                  {/* Who keys the book in. The person is an internal appraiser, but the decision
                      belongs to this engagement and reads as part of it. */}
                  <FieldLabel id={`${labelsId}-keyer`} required={!isReadOnly} first>
                    {t('administration.offlineExternal.keyerMethodLabel')}
                  </FieldLabel>
                  <Controller
                    name="assignmentMethod"
                    control={control}
                    render={({ field }) => (
                      <SegmentedChoice
                        ariaLabel={t('administration.offlineExternal.keyerMethodLabel')}
                        options={keyerOptions}
                        value={field.value === 'quotation' ? '' : field.value}
                        onChange={field.onChange}
                        disabled={isReadOnly || isLockedByQuotation}
                        className={TWO_WAY_CHOICE_WIDTH}
                      />
                    )}
                  />

                  {assignmentMethod === 'manual' && (
                    <div className="mt-2" ref={sectionRef('assignee')}>
                      {renderStaffPicker({
                        staff: selectedStaff,
                        storedCode: staffId,
                        storedName: storedAssigneeName,
                        placeholder: t('administration.manualStaff.placeholder'),
                        labelId: `${labelsId}-keyer`,
                        onOpen: openStaffModal,
                        onClear: clearStaff,
                        canEdit: !isReadOnly,
                        error: assigneeError,
                      })}
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
                >
                  {/* Assignment Method */}
                  <FieldLabel first>{t('administration.assignmentDetails.methodLabel')}</FieldLabel>
                  <Controller
                    name="assignmentMethod"
                    control={control}
                    render={({ field }) => (
                      <SegmentedChoice
                        ariaLabel={t('administration.assignmentDetails.methodLabel')}
                        options={methodOptions}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isReadOnly || isLockedByQuotation}
                      />
                    )}
                  />

                  {/* Manual Selection - Internal Staff */}
                  {assignmentMethod === 'manual' && assignmentType === 'internal' && (
                    <div ref={sectionRef('assignee')}>
                      <FieldLabel id={`${labelsId}-staff`} required={!isReadOnly}>
                        {t('administration.manualStaff.label')}
                      </FieldLabel>
                      {renderStaffPicker({
                        staff: selectedStaff,
                        storedCode: staffId,
                        storedName: storedAssigneeName,
                        placeholder: t('administration.manualStaff.placeholder'),
                        labelId: `${labelsId}-staff`,
                        onOpen: openStaffModal,
                        onClear: clearStaff,
                        canEdit: canEditPicker,
                        error: assigneeError,
                      })}
                    </div>
                  )}

                  {/* Manual Selection - External Company */}
                  {assignmentMethod === 'manual' && assignmentType === 'external' && (
                    <div ref={sectionRef('assignee')}>
                      <FieldLabel id={`${labelsId}-company`} required={!isReadOnly}>
                        {t('administration.manualCompany.label')}
                      </FieldLabel>
                      {selectedCompany ? (
                        <CompanyDisplay
                          company={selectedCompany}
                          badge={
                            previousCompany?.companyId === selectedCompany.id
                              ? previousCompanyBadge
                              : undefined
                          }
                          onChange={canEditPicker ? openCompanyModal : undefined}
                          onClear={canEditPicker ? clearCompany : undefined}
                        />
                      ) : companyId ? (
                        // The saved id whose company record could not be looked up: shown as it is
                        // stored (the assignment carries no company name), never as "not selected".
                        <StoredCode
                          code={companyId}
                          changeLabel={t('administration.changeCompanyButton')}
                          onChange={canEditPicker ? openCompanyModal : undefined}
                          onClear={canEditPicker ? clearCompany : undefined}
                        />
                      ) : canEditPicker ? (
                        <PickerButton
                          placeholder={t('administration.manualCompany.placeholder')}
                          onClick={openCompanyModal}
                          invalid={!!assigneeError}
                          labelledBy={`${labelsId}-company`}
                        />
                      ) : (
                        isReadOnly && (
                          <p className="text-sm text-(--palette-gray-500)">
                            {t('administration.noData')}
                          </p>
                        )
                      )}
                      <FieldError>{assigneeError}</FieldError>
                    </div>
                  )}

                  {/* Internal Followup Staff - Only for external assignments */}
                  {assignmentType === 'external' && (
                    <div ref={sectionRef('followup')}>
                      <FieldLabel
                        id={`${labelsId}-followup`}
                        required={followupStaffMethod === 'manual' && !isReadOnly}
                      >
                        {t('administration.followupStaff.label')}
                      </FieldLabel>

                      {/* Followup method chooser */}
                      <Controller
                        name="followupStaffMethod"
                        control={control}
                        render={({ field }) => (
                          <SegmentedChoice
                            ariaLabel={t('administration.followupStaff.label')}
                            options={followupOptions}
                            value={field.value}
                            onChange={handleFollowupMethodChange}
                            disabled={isReadOnly || isLockedByQuotation}
                            className={TWO_WAY_CHOICE_WIDTH}
                          />
                        )}
                      />

                      {/* Manual staff selection */}
                      {followupStaffMethod === 'manual' && (
                        <div className="mt-2">
                          {renderStaffPicker({
                            staff: selectedFollowupStaff,
                            storedCode: followupStaffId,
                            storedName: storedFollowupName,
                            placeholder: t('administration.followupStaff.placeholder'),
                            labelId: `${labelsId}-followup`,
                            onOpen: openFollowupStaffModal,
                            onClear: clearFollowupStaff,
                            canEdit: canEditPicker,
                            error: followupError,
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </FormCard>
              )}

              {/* Quotation Section - visible when quotation method is selected OR when a
                  non-terminal quotation already owns this appraisal (refresh case). */}
              {/* Method-driven visibility is external-only (a stale 'quotation' method must not open
                  this section when no type is selected), but a locked appraisal always shows it —
                  the lock banner above links to #quotation-section. */}
              {((assignmentType === 'external' && assignmentMethod === 'quotation') ||
                isLockedByQuotation) && (
                <div id="quotation-section" ref={sectionRef('quotation')}>
                  <QuotationSection
                    appraisalId={appraisalId ?? ''}
                    onCreateNew={openQuotationEntryModal}
                    // This appraisal's appraisal-assignment task is open on this page; auto-assign
                    // would resume that same task and leave the form below acting on a finished one.
                    allowAutoAssign={false}
                  />
                </div>
              )}

              {/* Fee estimate for the selection above (the same params the slip's figures use). */}
              <div ref={sectionRef('fee')}>
                <AssignmentFeeCard
                  appraisalId={appraisalId ?? ''}
                  params={feeParams}
                  editable={!isReadOnly && canSubmitAssignment}
                />
              </div>

              {/* Remark Card — kept at the bottom of the form */}
              <div ref={sectionRef('remarks')}>
                <FormCard
                  title={t('administration.remark.title')}
                  subtitle={t('administration.remark.subtitle')}
                >
                  {isReadOnly ? (
                    // Read-only: the stored remark as text (an empty box would read as "type here").
                    currentAssignment?.remark?.trim() ? (
                      <p className="text-sm break-words whitespace-pre-wrap text-(--palette-ink)">
                        {currentAssignment.remark}
                      </p>
                    ) : (
                      <p className="text-sm text-(--palette-gray-500)">
                        {t('administration.remark.empty')}
                      </p>
                    )
                  ) : (
                    <Controller
                      name="remarks"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          onBlur={() => {
                            field.onBlur();
                            touch('remarks');
                          }}
                          placeholder={t('administration.remark.placeholder')}
                          maxLength={ASSIGNMENT_REMARKS_MAX}
                          showCharCount
                          error={remarksError}
                        />
                      )}
                    />
                  )}
                </FormCard>
              </div>

              {/* Narrow and read-only: no bar to open the slip from, so it ends the form. */}
              {isReadOnly && (
                <div className="@5xl:hidden">
                  <AssignmentSlip {...slipProps} />
                </div>
              )}
            </div>

            {/* The slip: a sticky rail from 64rem up, the bar below replaces it under that. */}
            <div className="hidden @5xl:sticky @5xl:top-0 @5xl:block">
              <AssignmentSlip {...slipProps} />
            </div>
          </div>
        </div>

        {/* Narrow: the slip as a bar at the bottom. data-page-actions: the layouts drop their bottom
            padding for it (as for ActionBar), so the bar sits on the bottom edge. Only present when
            there is something to act on. */}
        {!isReadOnly && (
          <div data-page-actions="" className="shrink-0 @5xl:hidden">
            <AssignmentSlipBar {...slipProps} />
          </div>
        )}
      </div>

      <UnsavedChangesDialog blocker={blocker} />

      {/* Modals */}
      {!isReadOnly && (
        <>
          <SearchStaffModal
            isOpen={isStaffModalOpen}
            onClose={() => {
              closeStaffModal();
              touch('assignee');
            }}
            onSelect={handleStaffSelect}
            eligibleStaff={eligibleStaff}
          />
          <SearchStaffModal
            isOpen={isFollowupStaffModalOpen}
            onClose={() => {
              closeFollowupStaffModal();
              touch('followup');
            }}
            onSelect={handleFollowupStaffSelect}
            eligibleStaff={eligibleStaff}
          />
          <SearchCompanyModal
            isOpen={isCompanyModalOpen}
            onClose={() => {
              closeCompanyModal();
              touch('assignee');
            }}
            onSelect={handleCompanySelect}
            eligibleCompanies={eligibleCompanies}
            previousCompany={
              previousCompany
                ? { id: previousCompany.companyId, badge: previousCompanyBadge }
                : null
            }
          />
          {previousCompany?.mouActive && (
            <ChangeCompanyDialog
              previousCompany={previousCompany}
              previousCompanyNameLocal={previousCompanyData?.companyNameLocal}
              newCompany={pendingCompany}
              // The picker only opens for a manual external assignment, which is what the page's
              // preview is for; anything else loading or stale is not shown as this pick's fee.
              feePreview={
                !isFeePlaceholder && feeParams?.assignmentMethod === 'manual'
                  ? feePreview
                  : undefined
              }
              feeError={isFeeError && !feePreview}
              onKeepPrevious={keepPreviousCompany}
              onCancel={cancelCompanyChange}
              onConfirm={confirmCompanyChange}
            />
          )}
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
