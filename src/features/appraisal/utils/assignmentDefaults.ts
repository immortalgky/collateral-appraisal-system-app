import type { AssignmentFormType } from '../schemas/administration';
import type { AssignmentDefaultsResponse } from '../types/administration';

/** The form fields an Appraisal Type can pre-select. */
export type AssignmentDefaults = Pick<
  AssignmentFormType,
  'assignmentType' | 'assignmentMethod' | 'followupStaffMethod'
>;

type AssignmentTypeValue = AssignmentDefaults['assignmentType'];
type AssignmentMethodValue = AssignmentDefaults['assignmentMethod'];

/** The API sends the stored spelling (External, RoundRobin); the form uses lowercase. */
export const toFormDefaults = (response: AssignmentDefaultsResponse): AssignmentDefaults => ({
  assignmentType: response.assignmentType.toLowerCase() as AssignmentTypeValue,
  assignmentMethod: response.assignmentMethod.toLowerCase() as AssignmentMethodValue,
  followupStaffMethod:
    response.internalFollowupAssignmentMethod.toLowerCase() as AssignmentDefaults['followupStaffMethod'],
});

/** Quotation is External-only. */
export const isMethodValidForType = (
  type: AssignmentTypeValue,
  method: AssignmentMethodValue,
): boolean => method !== 'quotation' || type === 'external';

/** Method after a type switch: the default method if valid for the new type, else Manual. */
export const methodForTypeSwitch = (
  newType: AssignmentTypeValue,
  defaults?: AssignmentDefaults,
): AssignmentMethodValue =>
  defaults && isMethodValidForType(newType, defaults.assignmentMethod)
    ? defaults.assignmentMethod
    : 'manual';

interface ResolveFormDefaultsInput {
  base: AssignmentFormType;
  defaults?: AssignmentDefaults;
  canAssignCompanyInSystem: boolean;
  isInternalDisabled: boolean;
}

/** Static defaults, overlaid with the Appraisal Type defaults, corrected to what this case allows. */
export const resolveFormDefaults = ({
  base,
  defaults,
  canAssignCompanyInSystem,
  isInternalDisabled,
}: ResolveFormDefaultsInput): AssignmentFormType => {
  let assignmentType = defaults?.assignmentType ?? base.assignmentType;
  let assignmentMethod = defaults?.assignmentMethod ?? base.assignmentMethod;

  if (assignmentType === 'internal' && isInternalDisabled) assignmentType = 'external';
  if (assignmentType === 'external' && !canAssignCompanyInSystem)
    assignmentType = 'external-offline';
  if (!isMethodValidForType(assignmentType, assignmentMethod)) assignmentMethod = 'manual';

  return {
    ...base,
    assignmentType,
    assignmentMethod,
    followupStaffMethod: defaults?.followupStaffMethod ?? base.followupStaffMethod,
  };
};
