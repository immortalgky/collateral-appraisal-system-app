import type { AssignmentStrategy } from '../api/taskAssignmentConfig';

const SAME_ASSIGNEE: AssignmentStrategy = 'same_assignee_as_activity';

const isSameAssignee = (token: string) => token.toLowerCase() === SAME_ASSIGNEE;

/**
 * Is the strategy in effect for one list? The override list wins. An empty one defers to the
 * definition's, unless a specific assignee is set (the engine then uses ['Manual']).
 * null = unknown (override empty and the definition is not loaded).
 */
export const listUsesSameAssignee = (
  override: string[],
  specificAssignee: string,
  baseline?: string[],
): boolean | null => {
  if (override.length) return override.some(isSameAssignee);
  if (specificAssignee.trim()) return false;
  return baseline ? baseline.some(isSameAssignee) : null;
};

/** true = in effect, false = known unused, null = unknown. The follow-up step always counts as in effect. */
export const combineUsage = (
  lists: (boolean | null)[],
  isFollowupSelection: boolean,
): boolean | null =>
  isFollowupSelection || lists.includes(true) ? true : lists.includes(null) ? null : false;

/** Set (value) or remove ('') `sameAssigneeAsActivity`, keeping other keys; an empty bag becomes null. */
export const withSameAssignee = (bag: Record<string, unknown> | null, value: string) => {
  const next = { ...bag };
  if (value) next.sameAssigneeAsActivity = value;
  else delete next.sameAssigneeAsActivity;
  return Object.keys(next).length ? next : null;
};

/** Known unused -> drop the source; unknown or in effect -> keep it (trimmed when it is text). */
export const additionalConfigurationForSave = (
  bag: Record<string, unknown> | null,
  used: boolean | null,
  source: string,
) => {
  if (used === false) return withSameAssignee(bag, '');
  return typeof bag?.sameAssigneeAsActivity === 'string' ? withSameAssignee(bag, source) : bag;
};
