import type { ParseKeys } from 'i18next';

// The sink only persists Information and above (restrictedToMinimumLevel: Information),
// so Verbose/Debug are intentionally omitted — they can never match a stored row.
export type LogLevel = 'Information' | 'Warning' | 'Error' | 'Fatal';

/** The literal key union for the 'logAdmin' namespace — for typing a translation key that's built
 * at runtime (a lookup table keyed by a non-string value, or a dynamic
 * `guide.sections.${id}.title` path) without reaching for `any`. Uses i18next's own `ParseKeys`
 * rather than `Parameters<TFunction<'logAdmin'>>[0]` — `t`'s real signature takes a generic
 * rest-args tuple (inferred per call site), so `Parameters<>` on it resolves to an overly-wide union
 * that a plain key string doesn't satisfy; `ParseKeys` is the same key set i18next itself uses to
 * build that inference from. Keys built this way are trusted to exist in the locale JSON — a
 * wrong one falls back to i18next's normal missing-key behavior at runtime, same as always. */
export type LogAdminKey = ParseKeys<'logAdmin'>;

export const LOG_LEVELS: LogLevel[] = ['Information', 'Warning', 'Error', 'Fatal'];

export interface LogListItem {
  id: number;
  timeStamp: string;
  level: LogLevel;
  message: string | null;
  exception: string | null;
  correlationId: string | null;
  entityId: string | null;
  appraisalId: string | null;
  requestId: string | null;
  workflowInstanceId: string | null;
  collateralId: string | null;
  documentId: string | null;
  machineName: string | null;
  userName: string | null;
  sourceContext: string | null;
  requestPath: string | null;
}

export interface LogDetail extends LogListItem {
  messageTemplate: string | null;
  /** Raw JSON string — parsed lazily by the Properties tab. */
  properties: string | null;
}

export interface LogSearchResult {
  items: LogListItem[];
  hasMore: boolean;
}

export interface LogSummaryBucket {
  start: string;
  information: number;
  warning: number;
  error: number;
}

export interface LogTopProblem {
  template: string;
  level: LogLevel;
  count: number;
  lastSeen: string;
  sampleMessage: string;
  sourceContext: string | null;
  /** Errors are grouped by template + exception type — present once the BE started sending it. */
  exceptionType?: string;
}

export interface LogSummary {
  levelCounts: {
    information: number;
    warning: number;
    error: number;
    fatal: number;
  };
  bucketSeconds: number;
  buckets: LogSummaryBucket[];
  topProblems: LogTopProblem[];
}

export const logLevelBadgeClass: Record<LogLevel, string> = {
  Information: 'bg-blue-50 text-blue-700',
  Warning: 'bg-amber-50 text-amber-700',
  Error: 'bg-red-50 text-red-700',
  Fatal: 'bg-red-100 text-red-800',
};

/** Bar colours for the histogram — mirrors the approved mock's --info-bar/--warn-bar/--err-bar. */
export const logLevelBarColor: Record<'information' | 'warning' | 'error', string> = {
  information: '#93c5fd',
  warning: '#f59e0b',
  error: '#ef4444',
};

export const logLevelDotColor: Record<LogLevel, string> = {
  Information: '#93c5fd',
  Warning: '#f59e0b',
  Error: '#ef4444',
  Fatal: '#7f1d1d',
};

/** True for one of the 4 levels the sink actually persists. Real data isn't as clean as the
 * `LogLevel` type claims — an old row, a Debug/Verbose that slipped through, or a missing value —
 * so every level-keyed lookup goes through this rather than indexing the map directly. */
export function isKnownLevel(level: string | null | undefined): level is LogLevel {
  return !!level && (LOG_LEVELS as string[]).includes(level);
}

/** Looks a level up in a `Record<LogLevel, T>`, falling back to a neutral value for anything
 * that isn't one of the 4 known levels instead of rendering `undefined`. */
export function levelLookup<T>(
  map: Record<LogLevel, T>,
  level: string | null | undefined,
  fallback: T,
): T {
  return isKnownLevel(level) ? map[level] : fallback;
}

/** The one neutral badge/dot style for an unknown level — defined once so LogTable,
 * LogDetailDrawer, and TopProblemsPanel all fall back to the exact same look. */
export const NEUTRAL_BADGE_CLASS = 'bg-gray-50 text-gray-600';
export const NEUTRAL_DOT_COLOR = '#9ca3af';
