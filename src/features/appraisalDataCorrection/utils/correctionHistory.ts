import type { PropertyCorrectionDtoType } from '@shared/schemas/v1';
import { formatDate } from '@/shared/utils/dateUtils';
import { labelForTable, labelOrHumanized } from '../configs/fieldLabels';
import {
  EXTERNAL_NOTIFICATION_FIELD,
  EXTERNAL_NOTIFICATION_SKIPPED_FIELD,
  SUMMARY_HISTORY_FIELD,
} from './documentCorrection';

/** Selection value for the documents entry; property ids are GUIDs, so it cannot collide. */
export const DOCUMENTS_PANE = 'documents';

export type HistoryFilter = 'all' | 'property' | 'documents';

type Row = Pick<PropertyCorrectionDtoType, 'appraisalPropertyId' | 'changedAt'>;

/** Rail entry a history row belongs to. A null property id marks a document row. */
export const targetOf = (row: Row) => row.appraisalPropertyId ?? DOCUMENTS_PANE;

/** History rows per rail entry, keyed by property id or DOCUMENTS_PANE. */
export const countByTarget = (rows: Row[]) => {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(targetOf(row), (counts.get(targetOf(row)) ?? 0) + 1);
  return counts;
};

/** Newest row overall, or the newest for one rail entry. Does not rely on the API's ordering. */
export const latestOf = <T extends Row>(rows: T[], target?: string): T | undefined =>
  rows.reduce<T | undefined>((latest, row) => {
    if (target !== undefined && targetOf(row) !== target) return latest;
    return !latest || Date.parse(row.changedAt) > Date.parse(latest.changedAt) ? row : latest;
  }, undefined);

export const filterByKind = <T extends Row>(rows: T[], filter: HistoryFilter) =>
  filter === 'all'
    ? rows
    : rows.filter(row => (targetOf(row) === DOCUMENTS_PANE) === (filter === 'documents'));

/** Newest first, split at local midnight. `day` is a local yyyy-MM-dd key, not a display label. */
export const groupByDay = <T extends Row>(rows: T[]): { day: string; items: T[] }[] => {
  const groups: { day: string; items: T[] }[] = [];
  const newestFirst = [...rows].sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt));
  for (const row of newestFirst) {
    const day = formatDate(row.changedAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(row);
    else groups.push({ day, items: [row] });
  }
  return groups;
};

export type HistoryEntryKind =
  | 'property'
  | 'regenerate'
  | 'notify'
  | 'attach'
  | 'replace'
  | 'delete';

type KindRow = Pick<PropertyCorrectionDtoType, 'appraisalPropertyId' | 'changes'>;

/**
 * What one history row records, for its coloured label. Document rows carry no action field, so it is
 * read from the change shape: nothing → file is an attach, file → nothing a delete, otherwise a replace.
 */
export const entryKind = (row: KindRow): HistoryEntryKind => {
  if (row.appraisalPropertyId != null) return 'property';
  const fields = row.changes.map(c => c.field);
  if (fields.includes(SUMMARY_HISTORY_FIELD)) return 'regenerate';
  if (
    fields.length > 0 &&
    fields.every(
      f => f === EXTERNAL_NOTIFICATION_FIELD || f === EXTERNAL_NOTIFICATION_SKIPPED_FIELD,
    )
  )
    return 'notify';
  if (row.changes.every(c => c.from == null)) return 'attach';
  if (row.changes.every(c => c.to == null)) return 'delete';
  return 'replace';
};

const DOPA_PREFIX = 'Dopa';

/** The form's own label for one PascalCase segment, or a humanized fallback — never a blank. */
const segmentLabel = (segment: string) =>
  labelOrHumanized(segment.charAt(0).toLowerCase() + segment.slice(1));

interface PathSegment {
  name: string;
  /** What sat in the brackets: a row position (`2`) or a business key (`#1234`). */
  index?: string;
}

/**
 * Splits an audit path into its segments. A bracket may hold anything but `]`, dots included —
 * a business key such as a title number can contain them.
 */
const parsePath = (path: string): PathSegment[] =>
  Array.from(path.matchAll(/([^.[\]]+)(?:\[([^\]]*)\])?/g), m => ({ name: m[1], index: m[2] }));

/**
 * How a row is named: `#1234` for a business key, `#3` for the third row (positions in the audit
 * path already count from 1). Undefined for the id the earlier audit rows recorded
 * (`Title[5f1c…]`), which says nothing to a reader.
 */
const rowName = (index: string) => {
  if (index.startsWith('#')) return index;
  return /^\d+$/.test(index) ? `#${Number(index)}` : undefined;
};

/** A field segment's label. DOPA fields share their title-address twin's, so they get a suffix. */
const fieldLabel = (segment: string) =>
  segment.startsWith(DOPA_PREFIX) && segment.length > DOPA_PREFIX.length
    ? `${segmentLabel(segment.slice(DOPA_PREFIX.length))} (DOPA)`
    : segmentLabel(segment);

/**
 * Human label for a property-correction field path from the backend's audit diff:
 *
 * - `Land.LandOffice` → the edit form's label for the last segment ("Land Office"); the leading
 *   detail name is dropped.
 * - `Land.Titles[#1234].Rai` → "Land titles #1234 · Rai": each table on the way is named, then the
 *   column. A row added or removed has no column: `Land.Deductions[2]` → "Land area
 *   deductions #2" (positions count from 1).
 * - `Land.Title[5f1c].TitleNumber` — rows written before rows were keyed by title number carry the
 *   row's id, which is dropped, leaving the column.
 */
export const propertyFieldLabel = (path: string) => {
  const segments = parsePath(path);
  const last = segments[segments.length - 1];
  if (!last) return path;

  const parts: string[] = [];
  segments.forEach((segment, i) => {
    const row = segment.index === undefined ? undefined : rowName(segment.index);
    if (row) parts.push(`${labelForTable(segment.name)} ${row}`);
    if (i === segments.length - 1 && segment.index === undefined) {
      parts.push(fieldLabel(segment.name));
    }
  });
  return parts.length > 0 ? parts.join(' · ') : fieldLabel(last.name);
};
