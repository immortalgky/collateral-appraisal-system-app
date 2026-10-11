import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  useCreateRequestForm,
  createRequestFormDefault,
  type createRequestFormType,
  type UserDtoType,
  type RequestorDtoType,
} from '@features/request/schemas/form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider } from '@shared/components/form';
import { type SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/store';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';
import AddressForm from '../forms/AddressForm';
import { useRequestLevelRequiredDocuments } from '../hooks/useRequiredDocuments';
import Button from '@/shared/components/Button';
import RequestComments, { type LocalComment } from '../components/page/RequestComments';
import CommentsDrawer from '../components/page/CommentsDrawer';
import RequestHeaderStrip from '../components/page/RequestHeaderStrip';
import RequestPageSkeleton from '../components/page/RequestPageSkeleton';
import RequestSectionNav from '../components/page/RequestSectionNav';
import MissingFieldsChip from '../components/page/MissingFieldsChip';
import MoreActionsMenu from '../components/page/MoreActionsMenu';
import UploadBusyGate from '../components/page/UploadBusyGate';
import SubmitConfirmDialog from '../components/page/SubmitConfirmDialog';
import {
  MissingFieldsProvider,
  type MissingFieldsHandle,
} from '../components/page/MissingFieldsProvider';
import { useGetComments } from '../api';
import CustomersForm from '../forms/CustomersForm';
import PropertiesForm from '../forms/PropertiesForm';
import RequestForm from '../forms/RequestForm';
import AppointmentAndFeeForm from '../forms/AppointmentAndFeeForm';
import TitleInformationForm from '../forms/TitleInformationForm';
import AttachDocumentForm from '../forms/AttachDocumentForm';
import type { CreateDraftRequestRequestType } from '../api';
import {
  createUploadSession,
  useCreateDraftRequest,
  useCreateRequest,
  useDeleteRequest,
  useGetRequestById,
  useSubmitRequest,
  useUpdateDraftRequest,
  useUpdateRequest,
} from '../api';
import { useSearchRequestors } from '../api/requestors';
import {
  mapPriorAppraisalToForm,
  withoutForeignIds,
  mapRequestResponseToForm,
  priorReference,
} from '../utils/mappers';
import { CI_PURPOSES } from '../configs/fields';
import type { GetRequiredDocumentsResponse, UploadedDocument } from '../types/document';
import { mergeChecklistSlots } from '../hooks/useRequiredDocuments';
import { runGuarded } from '@/shared/utils/runGuarded';
import { requiredDocumentsKey } from '../api/requiredDocuments';
import {
  carriableDocuments,
  loadPriorAppraisalDocuments,
  priorAppraisalKeys,
  useNextInspectionNumber,
  type PriorAppraisal,
  type PriorAppraisalDocuments,
} from '@/features/appraisal/api/priorAppraisal';
import {
  applyCarryForward,
  countCarriedFiles,
  countOwnFiles,
  dropCarried,
  blockedByRequestUploads,
  rehomeOwnFiles,
} from '../utils/carryForward';
import { isRequestSubmitted } from '../utils/status';
import { hasDirtyFields } from '../utils/formDirty';
import { emptyRowFor } from '../components/tables/formTableUtils';
import {
  CUSTOMER_COLUMNS,
  PROPERTY_COLUMNS,
  buildRequestPayload,
  submitCounts,
} from '../utils/requestRows';
import { AppraisalCopyProvider } from '../contexts/AppraisalCopyContext';
import type { CreateRequestRequestType } from '@shared/schemas/v1';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Section from '@/shared/components/sections/Section';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useActivityId, useBasePath } from '@features/appraisal/context/AppraisalContext.tsx';

// A create form starts with one empty customer and one empty property row. They are part of the
// defaults, so a pristine form equals them (not dirty) and a reset to the defaults brings them back.
const createRequestFormDefaults: createRequestFormType = {
  ...createRequestFormDefault,
  // The prior-appraisal field registers this key with null; without it in the defaults, isDirty
  // (which compares key sets as well as values) reads "changed" as soon as the field mounts.
  detail: { ...createRequestFormDefault.detail, prevAppraisalReportNo: null },
  // Form-only facts about the request (never sent): whether it has been submitted, which switches
  // off the rules that only apply before submit (see buildRequestPayload, which drops it)
  meta: { isSubmitted: false },
  customers: [emptyRowFor(CUSTOMER_COLUMNS)],
  properties: [emptyRowFor(PROPERTY_COLUMNS)],
};

/**
 * Component that initializes request-level required documents.
 * Must be rendered inside FormProvider to access form context.
 */
const RequiredDocumentsInitializer = () => {
  useRequestLevelRequiredDocuments();
  return null;
};

/**
 * Unified Request Page component that handles both create and edit modes.
 * - Create mode: When no `requestId` is present in URL params
 * - Edit mode: When `requestId` is present in URL params
 */
function RequestPage() {
  const { t } = useTranslation(['request', 'common']);
  const createRequestForm = useCreateRequestForm();
  const readOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const location = useLocation();
  const currentUser = useAuthStore(state => state.user);
  // Activity detection
  const activityId = useActivityId();
  const isRouteBackFollowup = activityId === 'appraisal-initiation';
  // Get requestId from URL params - determines create vs edit mode
  const { requestId } = useParams<{ requestId?: string }>();
  const isEditMode = Boolean(requestId);

  // Fetch request data (only in edit mode - enabled: !!id is built into the hook)
  const {
    data: requestData,
    isLoading: isLoadingRequest,
    isError,
    error,
  } = useGetRequestById(requestId);

  // A submitted request belongs to the appraisal workflow: it can no longer be deleted, saved as
  // a draft or re-submitted -- the backend rejects all three with a 400. Duplicate is hidden with
  // them by product decision, not because the backend blocks it; it only seeds a new request.
  // Only a validated Save stays available, so the maker can still fix data after a route-back to
  // appraisal-initiation.
  //
  // requestedAt is passed alongside status so this matches the backend invariant exactly: legacy
  // rows demoted to 'New' by the original bug still read as submitted here.
  //
  // Guarded on isEditMode because isRequestSubmitted fails closed on missing data, which would
  // otherwise hide Submit on the create route where no request is loaded yet.
  const isSubmitted =
    isEditMode && isRequestSubmitted(requestData?.status, requestData?.requestedAt);

  // Add minimum loading delay for better UX (show skeleton) - only in edit mode
  // When data is cached, isLoadingRequest will be false immediately, so we skip the delay
  const [minLoadingDone, setMinLoadingDone] = useState(true);

  useEffect(() => {
    if (isEditMode && isLoadingRequest) {
      setMinLoadingDone(false);
      const timer = setTimeout(() => {
        setMinLoadingDone(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isEditMode, isLoadingRequest]);

  // Skeleton until the request has arrived (retries included), and for at least the minimum above.
  // Not on a background refetch of a request we already have. Never the empty form: it used to show
  // for the rest of a slow load once the 500 ms minimum had run out.
  const isLoading = isEditMode && (isLoadingRequest || !minLoadingDone);

  // Update breadcrumb with request number (only in edit mode)
  useBreadcrumb(isEditMode ? (requestData?.requestNumber ?? undefined) : undefined, 'folder-open');

  // Form setup
  const methods = useForm<createRequestFormType>({
    defaultValues: isEditMode ? createRequestFormDefault : createRequestFormDefaults,
    resolver: zodResolver(createRequestForm),
  });

  const {
    handleSubmit,
    getValues,
    setValue,
    reset,
    watch,
    formState: { dirtyFields },
  } = methods;

  // Per-field dirtiness, not formState.isDirty: that compares the whole form with its loaded values,
  // and the checklist slots written after a load keep it on for good (see utils/formDirty.ts)
  const isDirty = hasDirtyFields(dirtyFields);
  const { blocker, skipWarning } = useUnsavedChangesWarning(isDirty && !readOnly);

  // Reset the form when the page is opened for a new request (or another one), not whenever the
  // logged-in user's object changes: that is replaced during the session (a token refresh while the
  // pick below calls the API), and a reset then wiped what the maker had entered, the purpose
  // included, in the middle of a pick.
  const resetFor = useRef<string | null>(null);
  const defaultedFor = useRef<string | null>(null);
  useEffect(() => {
    if (isEditMode) return;
    const key = `${requestId ?? ''}|${location.key}`;
    const opened = resetFor.current !== key;
    resetFor.current = key;

    // Create mode: check for duplicate data from navigation state
    if (location.state?.duplicateData) {
      if (opened) reset(location.state.duplicateData);
      return;
    }
    if (opened) reset(createRequestFormDefaults);

    // Default the creator and requestor to the logged-in user once per opened request, as soon as
    // the user is known (it can arrive after the first run). Never again after that: a replaced
    // user object must not refill a requestor the maker deliberately cleared.
    if (currentUser && defaultedFor.current !== key) {
      defaultedFor.current = key;
      // What is defaulted here is the form's starting point, not an edit: it is written with reset
      // (which moves the defaults too). A plain setValue leaves the defaults behind, and isDirty,
      // which compares the values with them, then reads "changed" on a page nobody touched.
      const baseline: Partial<createRequestFormType> = {};
      if (!getValues('creator.userId')) {
        const userDto: UserDtoType = {
          userId: currentUser.username,
          username: currentUser.name,
        };
        baseline.creator = userDto;
      }
      // Default the requestor to the logged-in user — but only for bank users. The requestor
      // must be a valid bank officer (employeeId resolves against auth.Officers); an external
      // company user (companyId set) has no officer code, so we leave it blank and force an
      // explicit pick. Only the basic identity is known from the auth store; the org detail
      // (AO code, cost center, contact) is enriched by the effect below from GET /auth/requestors.
      if (!currentUser.companyId && !getValues('requestor.employeeId')) {
        const requestorDto: RequestorDtoType = {
          employeeId: currentUser.username,
          name: currentUser.name,
          email: currentUser.email ?? null,
          contactNo: null,
          aoCode: null,
          costCenterCode: null,
          costCenterDescription: null,
          department: currentUser.department ?? null,
        };
        baseline.requestor = requestorDto;
      }
      if (Object.keys(baseline).length > 0) reset({ ...getValues(), ...baseline });
    }
  }, [isEditMode, requestId, currentUser, reset, getValues, location.key, location.state]);

  // Resolve the logged-in user's full requestor detail (AO code, cost center, contact) so the
  // defaulted requestor card shows the same fields a manual pick would. Create mode only.
  const { data: selfRequestorResults } = useSearchRequestors(
    !isEditMode && currentUser && !currentUser.companyId ? currentUser.username : '',
  );

  useEffect(() => {
    if (isEditMode || !currentUser || currentUser.companyId || !selfRequestorResults) return;
    // Match case-insensitively — username and the resolved employeeId can differ in casing.
    const selfId = currentUser.username.toLowerCase();
    const match = selfRequestorResults.find(r => r.employeeId.toLowerCase() === selfId);
    if (!match) return;
    // Only enrich while the requestor is still the defaulted current user — never overwrite an
    // explicit pick the user made from the search modal.
    if (getValues('requestor.employeeId')?.toLowerCase() !== selfId) return;
    const requestorDto: RequestorDtoType = {
      employeeId: match.employeeId,
      name: match.name,
      email: match.email,
      contactNo: match.contactNo,
      aoCode: match.aoCode,
      costCenterCode: match.costCenterCode,
      costCenterDescription: match.costCenterDescription,
      department: match.department,
    };
    // Still part of the starting point (see the defaulting above), so it moves the defaults too.
    // ponytail: anything typed in the instant before this lookup answers also becomes the baseline;
    // reset's keepDirtyValues mixes values into the defaults, so it is not used here.
    reset({ ...getValues(), requestor: requestorDto });
  }, [isEditMode, currentUser, selfRequestorResults, getValues, reset]);

  // Update form when data is fetched (edit mode only)
  // Note: Comments are managed separately by RequestComments via useGetComments API
  useEffect(() => {
    if (isEditMode && requestData) {
      const formValues: createRequestFormType = {
        ...mapRequestResponseToForm(requestData),
        meta: { isSubmitted },
      };
      // An editable table always shows a row to type in, also for a draft saved with none (blank
      // rows are never sent). Part of the reset values, so the form stays pristine.
      if (!readOnly) {
        if (!formValues.customers.length) formValues.customers = [emptyRowFor(CUSTOMER_COLUMNS)];
        if (!formValues.properties.length) formValues.properties = [emptyRowFor(PROPERTY_COLUMNS)];
      }
      reset(formValues);
    }
  }, [isEditMode, requestData, reset, readOnly, isSubmitted]);

  // Mutations
  const { mutate: createRequest, isPending: isCreating } = useCreateRequest();
  const { mutate: updateRequest, isPending: isUpdating } = useUpdateRequest();
  const { mutate: submitRequest, isPending: isSubmitting } = useSubmitRequest();
  const { mutate: createDraftRequest, isPending: isCreatingDraft } = useCreateDraftRequest();
  const { mutate: updateDraftRequest, isPending: isUpdatingDraft } = useUpdateDraftRequest();

  const deleteRequest = useDeleteRequest();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isPending =
    isCreating ||
    isUpdating ||
    isSubmitting ||
    isCreatingDraft ||
    isUpdatingDraft ||
    deleteRequest.isPending;

  // Track which save action is in progress (for loading state on the correct button)
  const [saveAction, setSaveAction] = useState<'draft' | 'save' | 'submit' | null>(null);

  // Comments of a request that is not saved yet. Kept here, not in the drawer, so they survive the
  // drawer closing and go out with the create / create-draft / submit-create call.
  const [pendingComments, setPendingComments] = useState<LocalComment[]>([]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const closeComments = useCallback(() => setIsCommentsOpen(false), []);
  const { data: apiComments } = useGetComments(requestId);
  const commentCount = isEditMode ? (apiComments?.comments?.length ?? 0) : pendingComments.length;

  // Lets a failed Save / Submit open the missing-fields popover (see MissingFieldsProvider).
  const missingFieldsRef = useRef<MissingFieldsHandle>(null);
  const showMissingFields = () => missingFieldsRef.current?.show();

  // Upload session management
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  /**
   * Get or create an upload session for document uploads.
   * This function ensures only one session is created per page load,
   * even if called multiple times concurrently.
   */
  const getOrCreateSession = useCallback(async (): Promise<string> => {
    if (uploadSessionIdRef.current) {
      return uploadSessionIdRef.current;
    }

    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    sessionPromiseRef.current = createUploadSession()
      .then(response => {
        uploadSessionIdRef.current = response.sessionId;
        return response.sessionId;
      })
      .catch(error => {
        sessionPromiseRef.current = null;
        throw error;
      });

    return sessionPromiseRef.current;
  }, []);

  const handleDelete = () => {
    if (!requestId) return;
    deleteRequest.mutate(requestId, {
      onSuccess: () => {
        toast.success(t('toasts.requestDeleted'));
        skipWarning();
        navigate('/requests');
      },
      onError: (error: any) => {
        toast.error(error.apiError?.detail || t('toasts.requestDeleteFailed'));
        setIsDeleteDialogOpen(false);
      },
    });
  };

  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);

  // ── Copy-from-previous-appraisal ──────────────────────────────────────────
  // True from the moment a pick starts loading the appraisal's files until it has been applied. The
  // selector (search and X), the banner X and the card's retry are locked meanwhile, so picks and
  // clears never overlap. A count, not a flag: with two loads running, the first to finish must not
  // unlock while the other is still going.
  const queryClient = useQueryClient();
  const [isPicking, setIsPicking] = useState(false);
  const runningLoads = useRef(0);

  // Some upload is still in flight: its file is not on the server yet, so moving or dropping rows
  // now could lose it (see isRequestUploadBusy for what counts).
  const isBlockedByUploads = useCallback(
    () => blockedByRequestUploads(getValues, t('carryForward.toasts.waitForUploads')),
    [getValues, t],
  );

  // Loads the appraisal's files alone (adding them to a request that already follows it), locking
  // the selector while it does. 'failed' has shown its error toast; 'blocked' means an upload is
  // running or started meanwhile, and nothing should change. A pick does not come through here: its
  // files arrive with the appraisal in the one read the selector made.
  const loadForPick = useCallback(
    async (
      appraisalId: string,
    ): Promise<
      { status: 'ok'; list: PriorAppraisalDocuments } | { status: 'failed' } | { status: 'blocked' }
    > => {
      if (isBlockedByUploads()) return { status: 'blocked' };
      runningLoads.current++;
      setIsPicking(true);
      try {
        const list = await loadPriorAppraisalDocuments(queryClient, appraisalId);
        // An upload may have started while the list loaded.
        return isBlockedByUploads() ? { status: 'blocked' } : { status: 'ok', list };
      } catch {
        toast.error(t('carryForward.toasts.loadFailed'));
        return { status: 'failed' };
      } finally {
        runningLoads.current--;
        setIsPicking(runningLoads.current > 0);
      }
    },
    [isBlockedByUploads, queryClient, t],
  );

  // The request-level checklist slots (required and optional types with no file yet) are made by
  // useRequestLevelRequiredDocuments. Whenever the pick, a clear or "add the defaults" rewrites the
  // documents here, the slots are put in the same write from the checklist already loaded, so the
  // list never goes without them while the hook catches up.
  const withChecklistSlots = useCallback(
    (documents: UploadedDocument[], purpose: string | undefined) => {
      const checklist = queryClient.getQueryData<GetRequiredDocumentsResponse>(
        requiredDocumentsKey({ purpose }),
      );
      return checklist ? mergeChecklistSlots(documents, checklist.documents).docs : documents;
    },
    [queryClient],
  );

  // Writes documents back without a reset, for a saved draft (and for clearing the reference).
  const writeDocuments = useCallback(
    (documents: UploadedDocument[], titles: { documents: UploadedDocument[] }[]) => {
      setValue('documents', documents, { shouldDirty: true });
      titles.forEach((title, i) =>
        setValue(`titles.${i}.documents`, title.documents, { shouldDirty: true }),
      );
    },
    [setValue],
  );

  // Rows stamped PREV are the files taken from the previous appraisal, so a change of reference
  // drops exactly those and keeps the maker's own uploads. The NEW appraisal's files came with it
  // in the selector's one read (`documents`); the ones with a document to download are carried.
  const applyPrevPick = useCallback(
    async (template: PriorAppraisal) => {
      const { appraisalNumber, appraisalValue, request } = template;
      // An upload may have started while the appraisal loaded.
      if (isBlockedByUploads()) return;
      const carried = carriableDocuments(template.documents);
      // The document card reads its used / unused list from the same data: no second read, and not
      // a copy cached before this pick.
      queryClient.setQueryData(priorAppraisalKeys.documents(template.id), {
        appraisalNumber: appraisalNumber ?? null,
        documents: carried,
      });
      const current = getValues();

      const valueText =
        // No value (null or 0) is left out of the toast rather than shown as "value: 0"
        appraisalValue
          ? t('toasts.copyValueSuffix', { n: appraisalValue.toLocaleString('th-TH') })
          : '';

      if (isEditMode || !request) {
        // A saved draft keeps its data; only the reference and the carried files change. So does a
        // request being created from an appraisal whose request part is missing: nothing to copy.
        const reference = priorReference(template);
        (Object.keys(reference) as (keyof typeof reference)[]).forEach(key =>
          setValue(`detail.${key}`, reference[key] ?? null, { shouldDirty: true }),
        );

        const dropped = dropCarried(current.documents ?? [], current.titles ?? []);
        const merged = applyCarryForward(dropped.documents, dropped.titles, carried);
        writeDocuments(withChecklistSlots(merged.documents, current.purpose), merged.titles);
        if (!request) {
          toast.error(t('toasts.noRequestData'), { duration: 6000 });
          return;
        }
        // A saved draft keeps its data, so it is not "copied": say which appraisal it now follows.
        toast.success(
          t('carryForward.toasts.changedAppraisal', {
            number: appraisalNumber,
            value: valueText,
          }),
          { duration: 6000 },
        );
        return;
      }

      const partial = mapPriorAppraisalToForm({ ...template, request });
      const rehomed = rehomeOwnFiles(current.titles, partial.titles);
      const titles = partial.titles.map((title: object, i: number) => ({
        ...title,
        documents: rehomed.titleDocuments[i],
      }));
      const documents = [
        ...dropCarried(current.documents ?? [], []).documents,
        ...rehomed.requestDocuments,
      ];
      const merged = applyCarryForward(documents, titles, carried);

      // Merge: copy everything except appointment and fee, which must be preserved
      reset(
        {
          ...current,
          ...partial,
          // The copy replaces these tables; an empty one still gets the row to type in
          customers: partial.customers.length ? partial.customers : [emptyRowFor(CUSTOMER_COLUMNS)],
          properties: partial.properties.length
            ? partial.properties
            : [emptyRowFor(PROPERTY_COLUMNS)],
          documents: withChecklistSlots(merged.documents, current.purpose),
          titles: merged.titles,
          detail: {
            ...current.detail,
            ...(partial.detail ?? {}),
            // Hard-preserve these two sections regardless of what the template contains
            appointment: current.detail.appointment,
            fee: current.detail.fee,
          },
        },
        // The copy is the maker's unsaved work: stay dirty against the defaults so leaving warns
        { keepDefaultValues: true },
      );

      toast.success(
        t('toasts.copiedFromAppraisal', { number: appraisalNumber, value: valueText }),
        { duration: 6000 },
      );
    },
    [
      getValues,
      setValue,
      reset,
      isEditMode,
      isBlockedByUploads,
      writeDocuments,
      withChecklistSlots,
      queryClient,
      t,
    ],
  );

  // The round a new Construction Inspection would be is display-only: it is asked for, and shown,
  // only while a prior is set and the purpose is a construction-inspection one, whatever order those
  // came in (a pick, a purpose chosen afterwards, a draft or duplicate that arrives with both). The
  // query key carries the prior, so a late answer for an appraisal picked before is never shown.
  const purposeNow = useWatch({ control: methods.control, name: 'purpose' });
  const prevIdNow = useWatch({ control: methods.control, name: 'detail.prevAppraisalId' });
  // Only while the request can still be edited: the next number counts this request's own appraisal
  // once it is submitted, and a request does not store a round, so there is none to show then.
  const roundApplies = !readOnly && !isSubmitted;
  const showRound = roundApplies && !!prevIdNow && CI_PURPOSES.includes(purposeNow ?? '');
  const { data: nextRound } = useNextInspectionNumber(prevIdNow, showRound);
  // Handed to the prior-appraisal strip through AppraisalCopyProvider, not written into the form: a
  // display-only value in form state is lost on every reset (a save's refetch) and counts as a change.
  const inspectionRound = showRound ? (nextRound ?? null) : null;

  // The form already references this appraisal but holds none of its files (a duplicated request, a
  // draft from before files were carried): add its default files, without re-copying anything.
  const applyCarryOnly = useCallback(
    async (appraisalId: string) => {
      const loaded = await loadForPick(appraisalId);
      if (loaded.status !== 'ok') return;
      // The reference may have changed while the list loaded: these files are not its any more
      if (getValues('detail.prevAppraisalId') !== appraisalId) return;
      const current = getValues();
      const merged = applyCarryForward(
        current.documents ?? [],
        current.titles ?? [],
        loaded.list.documents,
      );
      writeDocuments(withChecklistSlots(merged.documents, current.purpose), merged.titles);
    },
    [getValues, loadForPick, writeDocuments, withChecklistSlots],
  );

  // The document card's retry after a failed load of the list (a reopened draft): it only reloads
  // the list, so files the maker removed are not added again. No pick is running, so nothing is
  // locked or blocked.
  const retryCarryForward = useCallback(async () => {
    const id = getValues('detail.prevAppraisalId');
    if (!id) return;
    try {
      await loadPriorAppraisalDocuments(queryClient, id);
    } catch {
      toast.error(t('carryForward.toasts.loadFailed'));
    }
  }, [getValues, queryClient, t]);
  // A stable function, so the document card (memoised) does not render with every page render
  const onRetryCarryForward = useCallback(
    () => runGuarded(retryCarryForward, t('common:status.error')),
    [retryCarryForward, t],
  );

  // Changing or clearing an existing previous appraisal removes what was taken from it, so ask first.
  const [pendingPick, setPendingPick] = useState<{
    template: PriorAppraisal;
    oldNumber: string;
    ownCount: number;
  } | null>(null);
  const [pendingClear, setPendingClear] = useState<{
    oldNumber: string;
    carriedCount: number;
    ownCount: number;
  } | null>(null);

  const [pendingReadd, setPendingReadd] = useState<{ appraisalId: string; number: string } | null>(
    null,
  );

  const handlePrevSelect = useCallback(
    async (template: PriorAppraisal) => {
      const target = template.id;
      const formId = getValues('detail.prevAppraisalId');
      const current = getValues();

      if (target === formId) {
        // Already the reference. Nothing to do, unless none of its files are in the form.
        if (countCarriedFiles(current.documents, current.titles) > 0) {
          toast(t('carryForward.toasts.sameAppraisal'));
        } else {
          // Adding the files again is not undone by anything the maker did, so ask first.
          setPendingReadd({
            appraisalId: target,
            number: template.appraisalNumber ?? '',
          });
        }
        return;
      }

      if (isBlockedByUploads()) return;
      if (!formId) {
        await applyPrevPick(template);
        return;
      }
      setPendingPick({
        template,
        oldNumber: current.detail.prevAppraisalReportNo ?? '',
        ownCount: countOwnFiles(current.documents, current.titles),
      });
    },
    [getValues, applyPrevPick, isBlockedByUploads, t],
  );

  // Clear only the prevAppraisal* metadata fields — do NOT wipe copied data
  const clearPrevReference = useCallback(() => {
    setValue('detail.prevAppraisalId', null, { shouldDirty: true });
    setValue('detail.prevAppraisalReportNo', null, { shouldDirty: true });
    setValue('detail.prevAppraisalValue', null, { shouldDirty: true });
    setValue('detail.prevAppraisalDate', null, { shouldDirty: true });
  }, [setValue]);

  // Without the reference nothing marks a carried file for the maker, so clearing takes the rows
  // stamped PREV out too, the same as a change of reference does.
  const performPrevClear = useCallback(() => {
    if (isBlockedByUploads()) return;
    const current = getValues();
    const dropped = dropCarried(current.documents ?? [], current.titles ?? []);
    writeDocuments(withChecklistSlots(dropped.documents, current.purpose), dropped.titles);
    clearPrevReference();
  }, [getValues, writeDocuments, withChecklistSlots, clearPrevReference, isBlockedByUploads]);

  const handlePrevClear = useCallback(() => {
    if (isBlockedByUploads()) return;
    const current = getValues();
    const carriedCount = countCarriedFiles(current.documents, current.titles);
    if (carriedCount === 0) {
      clearPrevReference();
      return;
    }
    setPendingClear({
      oldNumber: current.detail.prevAppraisalReportNo ?? '',
      carriedCount,
      ownCount: countOwnFiles(current.documents, current.titles),
    });
  }, [getValues, clearPrevReference, isBlockedByUploads]);

  // ── Changing the purpose drops the prior appraisal ─────────────────────────
  // The prior is chosen for a purpose (and some purposes take none), so a new purpose starts without
  // one. Only the maker's own change counts: RHF reports it as type 'change'; setValue, reset (a
  // load, a duplicate, a copy from a prior) carry no type, so they only move the baseline below.
  const committedPurpose = useRef<string>(getValues('purpose') ?? '');
  const [pendingPurposeChange, setPendingPurposeChange] = useState<{
    from: string;
    to: string;
    oldNumber: string;
    carriedCount: number;
    /** `detail` as it was when the purpose changed */
    detail: Record<string, unknown>;
  } | null>(null);

  // Puts the purpose back, in place (no reset: the tables must not remount under an upload), with the
  // `detail` values the new purpose changed on the way (a field it switches off keeps its off value
  // otherwise). Each is written per field, so a field back at its loaded value is no longer a change.
  const putPurposeBack = useCallback(
    (detail: Record<string, unknown>, from: string) => {
      setValue('purpose', from, { shouldDirty: true });
      const walk = (snapshot: Record<string, unknown>, path: string) =>
        Object.entries(snapshot).forEach(([key, value]) => {
          const at = `${path}.${key}`;
          if (value && typeof value === 'object' && !Array.isArray(value))
            walk(value as Record<string, unknown>, at);
          else if (!Object.is(getValues(at), value)) setValue(at, value, { shouldDirty: true });
        });
      walk(detail, 'detail');
    },
    [setValue, getValues],
  );

  useEffect(() => {
    // A submitted request keeps its purpose and prior (the appraisal is built from them): they are
    // read-only there, and nothing here may clear them
    if (isSubmitted) return;
    // Whatever was written before this subscribed (the reset on open) is the baseline
    committedPurpose.current = getValues('purpose') ?? '';
    const subscription = watch((values, { name, type }) => {
      const now: string = values.purpose ?? '';
      if (!(name === 'purpose' && type === 'change')) {
        committedPurpose.current = now;
        return;
      }
      const from = committedPurpose.current;
      if (now === from) return;
      const current = getValues();
      if (!current.detail?.prevAppraisalId) {
        committedPurpose.current = now;
        return;
      }
      // The writes below go out of this subscriber (a microtask later): setValue from inside RHF's
      // own notification of the change can leave the components watching the prior stale.
      if (isBlockedByUploads()) {
        const detail = structuredClone(current.detail);
        queueMicrotask(() => putPurposeBack(detail, from));
        return;
      }
      const carriedCount = countCarriedFiles(current.documents, current.titles);
      if (carriedCount === 0) {
        committedPurpose.current = now;
        queueMicrotask(() => {
          clearPrevReference();
          toast(t('page.purposeChange.cleared'));
        });
        return;
      }
      // Ask first; the new purpose stays in the field meanwhile and is put back on Cancel
      // Values are updated in place by later writes, so keep a copy for Cancel
      setPendingPurposeChange({
        from,
        to: now,
        oldNumber: current.detail.prevAppraisalReportNo ?? '',
        carriedCount,
        detail: structuredClone(current.detail),
      });
    });
    return () => subscription.unsubscribe();
  }, [isSubmitted, watch, getValues, putPurposeBack, isBlockedByUploads, clearPrevReference, t]);

  const handleConfirmDuplicate = () => {
    const currentData = getValues();
    // Copy request information only — attached documents stay independent (not copied)
    const duplicateData = {
      ...currentData,
      documents: [],
      // The copy is a new request: its titles keep none of the old ids (a save could take them for
      // stored ones), and no comments come along. Customer and property rows carry no ids.
      comments: [],
      // a new request is not submitted, whatever the one it is copied from is
      meta: { isSubmitted: false },
      titles: currentData.titles.map((title: createRequestFormType['titles'][number]) => ({
        ...withoutForeignIds(title),
        documents: [],
      })),
    };
    navigate('/requests/new', { state: { duplicateData } });
    setIsDuplicateDialogOpen(false);
  };
  const handleDuplicate = () => {
    setIsDuplicateDialogOpen(true);
  };

  const onSubmit: SubmitHandler<createRequestFormType> = data => {
    // A file still uploading is not on the server: saving now would send its row without it
    if (isBlockedByUploads()) return;
    setSaveAction('save');

    if (isEditMode && requestId) {
      // Update existing request
      updateRequest(
        {
          id: requestId,
          request: {
            ...buildRequestPayload(data),
          } as any,
        },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.requestUpdated'));
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.requestUpdateFailed'));
            setSaveAction(null);
          },
        },
      );
    } else {
      // Create a new request - include pending comments from local state
      // Don't send id/requestId - backend will assign them
      const commentsForApi = pendingComments.map(c => ({
        comment: c.comment,
        commentedBy: c.commentedBy,
        commentedByName: c.commentedByName,
        commentedAt: c.commentedAt,
        lastModifiedAt: c.lastModifiedAt ?? null,
      }));

      createRequest(
        {
          ...buildRequestPayload(data),
          sessionId: uploadSessionIdRef.current,
          comments: commentsForApi,
        } as CreateRequestRequestType,
        {
          onSuccess: response => {
            toast.success(t('toasts.requestCreated'));
            setSaveAction(null);
            if (response.id) {
              skipWarning();
              navigate(`/requests/${response.id}`);
            }
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.requestCreateFailed'));
            setSaveAction(null);
          },
        },
      );
    }
  };

  const handleSaveDraft = () => {
    if (isBlockedByUploads()) return;
    setSaveAction('draft');
    const data = getValues();

    if (isEditMode && requestId) {
      // Update existing request as draft
      updateDraftRequest(
        {
          id: requestId,
          request: {
            ...buildRequestPayload(data),
          } as any,
        },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.draftSaved'));
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.draftSaveFailed'));
            setSaveAction(null);
          },
        },
      );
    } else {
      // Create new request as draft - include pending comments from local state
      const commentsForApi = pendingComments.map(c => ({
        comment: c.comment,
        commentedBy: c.commentedBy,
        commentedByName: c.commentedByName,
        commentedAt: c.commentedAt,
        lastModifiedAt: c.lastModifiedAt ?? null,
      }));

      createDraftRequest(
        {
          ...buildRequestPayload(data),
          sessionId: uploadSessionIdRef.current,
          comments: commentsForApi,
        } as CreateDraftRequestRequestType,
        {
          onSuccess: response => {
            toast.success(t('toasts.draftSaved'));
            setSaveAction(null);
            if (response.id) {
              skipWarning();
              navigate(`/requests/${response.id}`);
            }
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.draftSaveFailed'));
            setSaveAction(null);
          },
        },
      );
    }
  };

  const doSubmit = useCallback(
    (id: string) => {
      submitRequest(id, {
        onSuccess: () => {
          toast.success(t('toasts.requestSubmitted'));
          setSaveAction(null);
          skipWarning();
          navigate('/requests');
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || t('toasts.requestSubmitFailed'));
          setSaveAction(null);
        },
      });
    },
    [submitRequest, skipWarning, navigate],
  );

  // The form is valid and the maker pressed Submit: hold the data until they confirm the dialog.
  const [pendingSubmit, setPendingSubmit] = useState<{
    data: createRequestFormType;
    counts: { customers: number; properties: number; titles: number; files: number };
  } | null>(null);

  /**
   * Handle submit request flow:
   * 1. Validate; an invalid form opens the missing-fields popover instead of going on
   * 2. Ask the maker to confirm (submitting locks the request until it is sent back)
   * 3. Save the request, then submit -- backend validates document completeness and returns error if missing
   */
  const handleSubmitRequest = () => {
    if (isBlockedByUploads()) return;
    handleSubmit(
      data =>
        setPendingSubmit({
          data,
          counts: submitCounts(data),
        }),
      showMissingFields,
    )();
  };

  const confirmSubmit = () => {
    if (!pendingSubmit) return;
    // An upload may have started while the dialog was open
    if (isBlockedByUploads()) {
      setPendingSubmit(null);
      return;
    }
    const { data } = pendingSubmit;
    setPendingSubmit(null);
    setSaveAction('submit');

    if (isEditMode && requestId) {
      // Update existing request first, then check and submit
      updateRequest(
        {
          id: requestId,
          request: {
            ...buildRequestPayload(data),
          } as any,
        },
        {
          onSuccess: () => {
            doSubmit(requestId);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.requestSaveFailed'));
            setSaveAction(null);
          },
        },
      );
    } else {
      // Create new request first, then check and submit
      const commentsForApi = pendingComments.map(c => ({
        comment: c.comment,
        commentedBy: c.commentedBy,
        commentedByName: c.commentedByName,
        commentedAt: c.commentedAt,
        lastModifiedAt: c.lastModifiedAt ?? null,
      }));

      createRequest(
        {
          ...buildRequestPayload(data),
          sessionId: uploadSessionIdRef.current,
          comments: commentsForApi,
        } as CreateRequestRequestType,
        {
          onSuccess: response => {
            if (response.id) {
              doSubmit(response.id);
            } else {
              toast.error(t('toasts.requestCreateFailed'));
              setSaveAction(null);
            }
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.requestSaveFailed'));
            setSaveAction(null);
          },
        },
      );
    }
  };

  // Loading state (edit mode only)
  if (isLoading) {
    return <RequestPageSkeleton />;
  }

  // Error state (edit mode only)
  if (isEditMode && isError) {
    const is404 = isAxiosError(error) && error.response?.status === 404;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Icon
          style="solid"
          name={is404 ? 'file-circle-question' : 'triangle-exclamation'}
          className="size-16 text-red-500"
        />
        <h2 className="text-xl font-semibold text-gray-900">
          {is404 ? t('page.requestNotFound') : t('page.failedToLoad')}
        </h2>
        <p className="text-gray-500">
          {is404 ? t('page.requestNotFoundDesc') : (error as Error)?.message || 'Unknown error'}
        </p>
        <Button onClick={() => navigate('/requests')}>
          <Icon style="solid" name="arrow-left" className="size-4 mr-2" />
          {t('page.backToListing')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Main Content Area */}
      <FormProvider methods={methods} schema={createRequestForm} showErrorAlert={false}>
        <MissingFieldsProvider schema={createRequestForm} handleRef={missingFieldsRef}>
          <RequiredDocumentsInitializer />
          <form
            onSubmit={e => {
              handleSubmit(onSubmit, showMissingFields)(e);
            }}
            className="flex-1 min-h-0 flex relative"
          >
            {/* Scrollable Form Content */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div
                id="form-scroll-container"
                className="flex-1 min-h-0 overflow-y-auto scroll-smooth"
              >
                <div className="flex flex-col gap-4 pb-6">
                  <RequestHeaderStrip
                    requestNumber={isEditMode ? requestData?.requestNumber : null}
                    status={isEditMode ? requestData?.status : undefined}
                    requestedAt={requestData?.requestedAt}
                    locked={readOnly || isSubmitted}
                    commentCount={commentCount}
                    onOpenComments={() => setIsCommentsOpen(true)}
                  />
                  <RequestSectionNav />

                  <div className="flex flex-col gap-6">
                    <Section id="s1" anchor className="scroll-mt-14">
                      <FormCard
                        title={t('page.cards.requestInformation.title')}
                        subtitle={t('page.cards.requestInformation.subtitle')}
                        icon="clipboard-list"
                        iconColor="blue"
                      >
                        <div className="flex flex-col gap-6">
                          <CustomersForm />
                          {/* Before submit the prior-appraisal strip gets the pick / clear handlers (and the
                              inspection round) from AppraisalCopyProvider: a full copy when
                              creating, reference + carried files when reopening a draft. Once
                              submitted, `submitted` locks the purpose and the prior (display-only);
                              that lock comes from the flag, not from the provider. */}
                          {isSubmitted ? (
                            <RequestForm submitted />
                          ) : (
                            <AppraisalCopyProvider
                              onCopySelect={handlePrevSelect}
                              onClear={handlePrevClear}
                              disabled={isPicking}
                              round={inspectionRound}
                            >
                              <RequestForm />
                            </AppraisalCopyProvider>
                          )}
                        </div>
                      </FormCard>
                    </Section>

                    <Section id="s2" anchor className="scroll-mt-14">
                      <FormCard
                        title={t('page.cards.propertiesAndLocation.title')}
                        subtitle={t('page.cards.propertiesAndLocation.subtitle')}
                        icon="map-location-dot"
                        iconColor="amber"
                      >
                        <div className="flex flex-col gap-6">
                          <PropertiesForm />
                          <AddressForm />
                        </div>
                      </FormCard>
                    </Section>

                    <Section id="s5" anchor className="scroll-mt-14">
                      <FormCard
                        title={t('page.cards.appointmentAndFee.title')}
                        subtitle={t('page.cards.appointmentAndFee.subtitle')}
                        icon="calendar-days"
                        iconColor="emerald"
                      >
                        <AppointmentAndFeeForm />
                      </FormCard>
                    </Section>

                    <Section id="title-document-info" anchor className="scroll-mt-14">
                      <TitleInformationForm
                        getOrCreateSession={getOrCreateSession}
                        requestId={requestId}
                        showCarryForward={!isSubmitted && !readOnly}
                      />
                    </Section>

                    <Section
                      id="attach-document"
                      anchor
                      className="flex flex-col gap-6 scroll-mt-14"
                    >
                      <AttachDocumentForm
                        getOrCreateSession={getOrCreateSession}
                        requestId={requestId}
                        showCarryForward={!isSubmitted && !readOnly}
                        carryBusy={isPicking}
                        onRetryCarryForward={onRetryCarryForward}
                      />
                    </Section>
                  </div>
                </div>
              </div>

              {/* Sticky Action buttons - hidden in readOnly mode */}
              {!readOnly && (
                <ActionBar>
                  <ActionBar.Left>
                    {!isRouteBackFollowup && (
                      <>
                        <CancelButton fallbackPath={`${basePath}/requests`} />
                        {!isSubmitted && (
                          <MoreActionsMenu
                            onDuplicate={handleDuplicate}
                            onDelete={() => setIsDeleteDialogOpen(true)}
                            disabled={!isEditMode || isPending}
                          />
                        )}
                      </>
                    )}
                    {/* Dropped on narrow screens, where it would wrap the bar over several lines */}
                    <div className="hidden whitespace-nowrap md:block">
                      <ActionBar.UnsavedIndicator show={isDirty} />
                    </div>
                  </ActionBar.Left>
                  <ActionBar.Right>
                    <MissingFieldsChip />
                    <UploadBusyGate>
                      {busy => (
                        <>
                          {!isSubmitted && (
                            <Button
                              variant="ghost"
                              type="button"
                              className="whitespace-nowrap"
                              title={
                                busy
                                  ? t('page.actions.waitForUploads')
                                  : t('page.actions.saveDraftHint')
                              }
                              onClick={handleSaveDraft}
                              isLoading={isPending && saveAction === 'draft'}
                              disabled={isPending || isPicking || busy}
                            >
                              {t('actions.saveDraft')}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            type="submit"
                            className="whitespace-nowrap"
                            title={
                              busy ? t('page.actions.waitForUploads') : t('page.actions.saveHint')
                            }
                            isLoading={isPending && saveAction === 'save'}
                            disabled={isPending || isPicking || busy}
                          >
                            <Icon style="regular" name="floppy-disk" className="size-4! mr-2" />
                            {t('actions.save')}
                          </Button>
                          {!isRouteBackFollowup && !isSubmitted && (
                            <Button
                              type="button"
                              className="whitespace-nowrap"
                              title={
                                busy
                                  ? t('page.actions.waitForUploads')
                                  : t('page.actions.submitHint')
                              }
                              onClick={handleSubmitRequest}
                              isLoading={isPending && saveAction === 'submit'}
                              disabled={isPending || isPicking || busy}
                            >
                              <Icon style="solid" name="paper-plane" className="size-4! mr-2" />
                              {t('actions.submit')}
                            </Button>
                          )}
                        </>
                      )}
                    </UploadBusyGate>
                  </ActionBar.Right>
                </ActionBar>
              )}
            </div>

            <UnsavedChangesDialog blocker={blocker} />
            <ConfirmDialog
              isOpen={isDeleteDialogOpen}
              onClose={() => setIsDeleteDialogOpen(false)}
              onConfirm={handleDelete}
              title={t('confirm.deleteRequestTitle')}
              message={t('confirm.deleteRequestMessage')}
              confirmText={t('common:actions.delete')}
              variant="danger"
              isLoading={deleteRequest.isPending}
            />
          </form>

          {/* Outside the <form>, so nothing in the drawer can submit it */}
          <CommentsDrawer isOpen={isCommentsOpen} onClose={closeComments}>
            <RequestComments
              requestId={requestId}
              localComments={pendingComments}
              onLocalCommentsChange={setPendingComments}
            />
          </CommentsDrawer>
          <SubmitConfirmDialog
            counts={pendingSubmit?.counts ?? null}
            onClose={() => setPendingSubmit(null)}
            onConfirm={confirmSubmit}
          />
        </MissingFieldsProvider>
      </FormProvider>

      <ConfirmDialog
        isOpen={pendingPick !== null}
        onClose={() => setPendingPick(null)}
        onConfirm={() => {
          if (pendingPick) {
            const { template } = pendingPick;
            runGuarded(() => applyPrevPick(template), t('common:status.error'));
          }
          setPendingPick(null);
        }}
        title={t('carryForward.repick.title', {
          number: pendingPick?.template.appraisalNumber ?? '',
        })}
        message={t(
          isEditMode ? 'carryForward.repick.messageDraft' : 'carryForward.repick.messageCreate',
          { old: pendingPick?.oldNumber ?? '', n: pendingPick?.ownCount ?? 0 },
        )}
        confirmText={t('carryForward.repick.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="warning"
      />

      <ConfirmDialog
        isOpen={pendingClear !== null}
        onClose={() => setPendingClear(null)}
        onConfirm={() => {
          if (pendingClear) runGuarded(performPrevClear, t('common:status.error'));
          setPendingClear(null);
        }}
        title={t('carryForward.clear.title')}
        message={t('carryForward.clear.message', {
          old: pendingClear?.oldNumber ?? '',
          n: pendingClear?.carriedCount ?? 0,
          own: pendingClear?.ownCount ?? 0,
        })}
        confirmText={t('carryForward.clear.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="warning"
      />

      <ConfirmDialog
        isOpen={pendingPurposeChange !== null}
        onClose={() => {
          if (pendingPurposeChange)
            putPurposeBack(pendingPurposeChange.detail, pendingPurposeChange.from);
          setPendingPurposeChange(null);
        }}
        onConfirm={() => {
          if (pendingPurposeChange) {
            // Purpose and prior go together: with an upload running (performPrevClear would refuse)
            // the old purpose stays with the old prior
            if (isBlockedByUploads()) {
              putPurposeBack(pendingPurposeChange.detail, pendingPurposeChange.from);
            } else {
              committedPurpose.current = pendingPurposeChange.to;
              runGuarded(performPrevClear, t('common:status.error'));
            }
          }
          setPendingPurposeChange(null);
        }}
        title={t('page.purposeChange.title')}
        message={t('page.purposeChange.message', {
          old: pendingPurposeChange?.oldNumber ?? '',
          n: pendingPurposeChange?.carriedCount ?? 0,
        })}
        confirmText={t('page.purposeChange.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="warning"
      />

      <ConfirmDialog
        isOpen={pendingReadd !== null}
        onClose={() => setPendingReadd(null)}
        onConfirm={() => {
          if (pendingReadd) {
            const { appraisalId } = pendingReadd;
            runGuarded(() => applyCarryOnly(appraisalId), t('common:status.error'));
          }
          setPendingReadd(null);
        }}
        title={t('carryForward.readd.title')}
        message={t('carryForward.readd.message', { number: pendingReadd?.number ?? '' })}
        confirmText={t('carryForward.readd.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="warning"
      />

      <ConfirmDialog
        isOpen={isDuplicateDialogOpen}
        onClose={() => setIsDuplicateDialogOpen(false)}
        onConfirm={handleConfirmDuplicate}
        title={t('confirm.copyRequestTitle')}
        message={t('confirm.copyRequestMessage')}
        confirmText={t('common:actions.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="info"
      />
    </div>
  );
}

export default RequestPage;
