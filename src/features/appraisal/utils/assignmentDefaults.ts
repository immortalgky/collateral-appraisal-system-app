import {
  ASSIGNMENT_METHODS,
  ASSIGNMENT_TYPES,
  FOLLOWUP_STAFF_METHODS,
  type AssignmentFormType,
} from '../schemas/administration';
import { pickActiveQuotation } from '@/features/quotation/utils/pickActiveQuotation';
import type { AssignmentDefaultsResponse } from '../types/administration';

/** The form fields an Appraisal Type can pre-select; a field the API did not send validly is absent. */
export type AssignmentDefaults = Partial<
  Pick<AssignmentFormType, 'assignmentType' | 'assignmentMethod' | 'followupStaffMethod'>
>;

type AssignmentTypeValue = AssignmentFormType['assignmentType'];
type AssignmentMethodValue = AssignmentFormType['assignmentMethod'];

/** Lowercased value if it is one of the allowed form values, else undefined. */
const pick = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined => {
  const lower = typeof value === 'string' ? value.toLowerCase() : undefined;
  return allowed.find(a => a === lower);
};

/** The API sends the stored spelling (External, RoundRobin); the form uses lowercase. */
export const toFormDefaults = (response: AssignmentDefaultsResponse): AssignmentDefaults => ({
  assignmentType: pick(response.assignmentType, ASSIGNMENT_TYPES),
  assignmentMethod: pick(response.assignmentMethod, ASSIGNMENT_METHODS),
  followupStaffMethod: pick(response.internalFollowupAssignmentMethod, FOLLOWUP_STAFF_METHODS),
});

/** Quotation is External-only. */
const isMethodValidForType = (type: AssignmentTypeValue, method: AssignmentMethodValue): boolean =>
  method !== 'quotation' || type === 'external';

interface ResolveFormDefaultsInput {
  base: AssignmentFormType;
  defaults?: AssignmentDefaults;
  canAssignCompanyInSystem: boolean;
  isInternalDisabled: boolean;
  /** An existing quotation, or a failed read of the case data, means the Appraisal Type defaults do not apply. */
  skipTypeDefaults: boolean;
}

/**
 * Static defaults, overlaid with the Appraisal Type defaults, corrected to what this case allows.
 * The configured method only holds while the type stays as configured; if the type had to move,
 * the method is Manual.
 */
export const resolveFormDefaults = ({
  base,
  defaults,
  canAssignCompanyInSystem,
  isInternalDisabled,
  skipTypeDefaults,
}: ResolveFormDefaultsInput): AssignmentFormType => {
  const applied = skipTypeDefaults ? undefined : defaults;
  const configuredType = applied?.assignmentType ?? base.assignmentType;
  let assignmentType = configuredType;
  let assignmentMethod = applied?.assignmentMethod ?? base.assignmentMethod;

  if (assignmentType === 'internal' && isInternalDisabled) assignmentType = 'external';
  if (assignmentType === 'external' && !canAssignCompanyInSystem)
    assignmentType = 'external-offline';
  if (assignmentType !== configuredType || !isMethodValidForType(assignmentType, assignmentMethod))
    assignmentMethod = 'manual';

  return {
    ...base,
    assignmentType,
    assignmentMethod,
    followupStaffMethod: applied?.followupStaffMethod ?? base.followupStaffMethod,
  };
};

/**
 * Same corrections as the page's live effects, applied to values about to be written by a reset
 * (which would otherwise overwrite them): a saved 'external' while in-system assignment is off
 * becomes 'external-offline' + Manual, and a saved 'internal' over the facility limit is cleared.
 * Nothing is corrected on a read-only page (an assignment that was made, or the history view): it
 * shows the values as stored.
 */
export const correctSavedSelection = (
  values: AssignmentFormType,
  {
    canAssignCompanyInSystem,
    isInternalDisabled,
    isReadOnly,
  }: Pick<ResolveFormDefaultsInput, 'canAssignCompanyInSystem' | 'isInternalDisabled'> & {
    isReadOnly: boolean;
  },
): AssignmentFormType => {
  if (isReadOnly) return values;
  if (!canAssignCompanyInSystem && values.assignmentType === 'external')
    return { ...values, assignmentType: 'external-offline', assignmentMethod: 'manual' };
  if (isInternalDisabled && values.assignmentType === 'internal')
    return {
      ...values,
      assignmentType: '' as AssignmentFormType['assignmentType'],
      selectedStaff: null,
      staffId: null,
    };
  return values;
};

/**
 * Whether the inputs the seed depends on have settled. The assignment and the kill-switch config are
 * always awaited, so a saved row waits for the config too. A fresh row also waits for the defaults,
 * quotations and request (`isFetchingInputs`). A saved row does not wait for those, but does not seed
 * from a row that is being refetched (right after a draft save it is the old one).
 */
export const isReadyToSeed = ({
  hasSavedSelection,
  isFetchingAssignment,
  isFetchingConfig,
  isFetchingInputs,
}: {
  hasSavedSelection: boolean;
  isFetchingAssignment: boolean;
  isFetchingConfig: boolean;
  isFetchingInputs: boolean;
}): boolean =>
  !isFetchingAssignment && !isFetchingConfig && (hasSavedSelection || !isFetchingInputs);

/**
 * Whether the page's seeding reset should run now. A fresh row (no saved selection) is seeded once
 * per appraisal, when every input is idle, and never again: a later refetch or a draft save (which
 * clears isDirty while the cached row is still unsaved) must not wipe the admin's choices. A saved
 * row is re-seeded while not dirty as its staff/company data loads. A different appraisal is seeded
 * even if the form is dirty. `isReady` is the caller's "inputs settled" check for the row kind.
 */
export const shouldSeed = ({
  seededAppraisalId,
  appraisalId,
  hasSavedSelection,
  isDirty,
  isReady,
}: {
  seededAppraisalId?: string;
  appraisalId?: string;
  hasSavedSelection: boolean;
  isDirty: boolean;
  isReady: boolean;
}): boolean => {
  if (!appraisalId || !isReady) return false;
  if (seededAppraisalId !== appraisalId) return true;
  return hasSavedSelection && !isDirty;
};

/**
 * Whether the page should still show its loading screen instead of the form. With an appraisalId
 * that is until this appraisal has been seeded (a fresh row would show the baseline, a saved row on
 * a route change could show another appraisal's cached selections). Without one nothing can be
 * seeded (see shouldSeed), so it only waits for the assignment and config to load.
 */
export const isAwaitingSeed = ({
  appraisalId,
  seededAppraisalId,
  isLoadingAssignment,
  isLoadingConfig,
}: {
  appraisalId?: string;
  seededAppraisalId?: string;
  isLoadingAssignment: boolean;
  isLoadingConfig: boolean;
}): boolean =>
  !appraisalId ? isLoadingAssignment || isLoadingConfig : seededAppraisalId !== appraisalId;

/**
 * Whether the Appraisal Type defaults must be left out and the form opened on the baseline: the
 * page has an active quotation (pickActiveQuotation: an open one, else the latest Finalized, whose
 * winner stays visible), or the quotations or the request (facility limit, also a missing request
 * id) could not be read at all. Cancelled or legacy 'Closed' quotations do not block. A failed
 * background refetch with good cached data still counts as read.
 */
export const shouldSkipTypeDefaults = ({
  quotations,
  isQuotationsError,
  hasRequestData,
  isRequestError,
  requestId,
}: {
  quotations?: { id: string; status: string; requestDate: string; selectedAt?: string | null }[];
  isQuotationsError: boolean;
  hasRequestData: boolean;
  isRequestError: boolean;
  requestId?: string;
}): boolean =>
  !!(quotations && pickActiveQuotation(quotations)) ||
  (isQuotationsError && !quotations) ||
  (isRequestError && !hasRequestData) ||
  !requestId;
