import type {
  AppraisalDocumentFile,
  AppraisalDocumentType,
} from '@/features/appraisal/types/appraisalDocuments';

/** The auto-generated summary lands under either code, depending on the appraisal. */
export const SUMMARY_TYPE_CODES = ['D042', 'D043'];

/** `field` the backend writes on the history row for a summary regeneration. */
export const SUMMARY_HISTORY_FIELD = 'AppraisalSummary';

/** `field` for a notification to the source system; its `to` is the system's name. */
export const EXTERNAL_NOTIFICATION_FIELD = 'ExternalNotification';

/** Written instead when a regeneration deliberately did NOT notify an appraisal that has a source system. */
export const EXTERNAL_NOTIFICATION_SKIPPED_FIELD = 'ExternalNotificationSkipped';

/** History fields that record an action (regenerate, notify) rather than a from→to value change. */
export const isActionField = (field: string) =>
  field === SUMMARY_HISTORY_FIELD ||
  field === EXTERNAL_NOTIFICATION_FIELD ||
  field === EXTERNAL_NOTIFICATION_SKIPPED_FIELD;

export const POLL_INTERVAL_MS = 5_000;
export const POLL_TIMEOUT_MS = 60_000;

const summaryFiles = (types: AppraisalDocumentType[] | undefined): AppraisalDocumentFile[] =>
  (types ?? []).filter(ty => SUMMARY_TYPE_CODES.includes(ty.code)).flatMap(ty => ty.files);

/** Ids of every D042/D043 file — the poll's baseline. */
export const summaryFileIds = (types: AppraisalDocumentType[] | undefined): string[] =>
  summaryFiles(types).map(f => f.id);

/**
 * Whether a summary file not in the baseline has appeared. Compared by id, not count: deleting the
 * old summary while the job runs would otherwise cancel out the new one and read as a timeout.
 */
export const hasNewSummaryFile = (
  baselineIds: readonly string[],
  types: AppraisalDocumentType[] | undefined,
) => summaryFiles(types).some(f => !baselineIds.includes(f.id));

/** Newest D042/D043 file by upload time, or null when none has been attached yet. */
export const latestSummaryFile = (
  types: AppraisalDocumentType[] | undefined,
): AppraisalDocumentFile | null =>
  summaryFiles(types).reduce<AppraisalDocumentFile | null>(
    (latest, f) => (!latest || (f.uploadedAt ?? '') > (latest.uploadedAt ?? '') ? f : latest),
    null,
  );

// startedAt lives in state so an effect restart (e.g. a language switch) keeps the original deadline.
export type Regeneration = {
  baselineIds: string[];
  startedAt: number;
  /** Whether the request told the source system to collect again — worded in the done toast. */
  notifyExternal: boolean;
  status: 'polling' | 'timeout';
};

export type PollOutcome = 'done' | 'timeout' | 'waiting';

/**
 * Whether regeneration polling should stop. A new file wins over the deadline: a file that
 * lands on the very last tick is a success, not a timeout.
 */
export const pollOutcome = (hasNewFile: boolean, elapsedMs: number): PollOutcome => {
  if (hasNewFile) return 'done';
  return elapsedMs >= POLL_TIMEOUT_MS ? 'timeout' : 'waiting';
};

/**
 * Label for one change on a document history row. `field` is a document type code, or the
 * literal `AppraisalSummary` for a regeneration, `ExternalNotification` for a notification to the
 * source system, or `ExternalNotificationSkipped` when a regeneration chose not to notify it;
 * anything unrecognised is shown as-is.
 */
export const historyFieldLabel = (
  field: string,
  typeNames: ReadonlyMap<string, string>,
  labels: { summary: string; notified: string; notNotified: string },
) => {
  if (field === SUMMARY_HISTORY_FIELD) return labels.summary;
  if (field === EXTERNAL_NOTIFICATION_FIELD) return labels.notified;
  if (field === EXTERNAL_NOTIFICATION_SKIPPED_FIELD) return labels.notNotified;
  return typeNames.get(field) ?? field;
};
