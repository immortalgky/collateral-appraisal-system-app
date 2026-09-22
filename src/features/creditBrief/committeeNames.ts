import type { TFunction } from 'i18next';

/**
 * What to call the body that approves a price.
 *
 * The system stores only a committee CODE (`Appraisals.ApprovedByCommittee`, and
 * `PendingTasks.CommitteeCode` while the work is in flight) — there is no stored "level" and no
 * localised name anywhere in the schema; `workflow.Committees` holds English labels
 * ("Sub Committee", "Committee") and `appraisal.CommitteeThresholds` is dead. So the mapping from
 * code to body lives here, and the wording itself lives in `appraisal.json`.
 *
 * The `full` name is what the bank calls the body; `short` is what fits in a 240px rail. Show the
 * short one and hang the full one off a tooltip — the committee name is roughly four times the
 * width of the column, so rendering it in place only produces an ellipsis that tells the reader
 * nothing.
 */
export interface CommitteeName {
  short: string;
  full: string;
}

/**
 * Level 1 sits with the sub-committee; levels 2 and 3 both sit with the full committee and differ
 * only by whether a sitting is held, which the meeting title already says.
 */
const CODE_TO_BODY: Record<string, 'sub' | 'full'> = {
  SUB_COMMITTEE: 'sub',
  COMMITTEE: 'full',
  COMMITTEE_WITH_MEETING: 'full',
  COMMITTEE_GROUP_2: 'full',
};

/** Null for an unknown or absent code — the caller falls back to the meeting title. */
export const committeeName = (
  t: TFunction<'appraisal'>,
  code: string | null | undefined,
): CommitteeName | null => {
  const body = code ? CODE_TO_BODY[code] : undefined;
  if (!body) return null;
  return {
    short: t(`activityTracking.brief.committee.${body}`),
    full: t(`activityTracking.brief.committee.${body === 'sub' ? 'subFull' : 'fullFull'}`),
  };
};
