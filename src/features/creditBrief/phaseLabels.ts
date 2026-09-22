import type { TFunction } from 'i18next';

/**
 * Workflow phase groups, in the words a credit officer uses.
 *
 * The labels live in `appraisal.json` under `activityTracking.brief.phases` — keyed by the
 * `group` values GetAppraisalWorkflowProgress returns. This is a function rather than a constant
 * map so the text follows the user's language; the group name is the fallback, which is what the
 * rail used to print raw when a group had no entry.
 */
export const phaseLabel = (
  t: TFunction<'appraisal'>,
  group: string | null | undefined,
): string | null =>
  group ? t(`activityTracking.brief.phases.${group}`, { defaultValue: group }) : null;
