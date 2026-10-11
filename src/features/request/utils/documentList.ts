import type { UploadedDocument } from '../types/document';

/**
 * Pure helpers for the Request page document list: one row per document type, its files as chips.
 *
 * The form still holds one row per file plus one empty "slot" row per checklist type that has no
 * file. The list groups those back into types, and these functions decide what is shown.
 */

/** `source` of a file that was added because an appraiser asked for more documents. */
export const FOLLOWUP_SOURCE = 'FOLLOWUP';

/** Green = has a file, amber = required and missing, gray = optional and empty. */
export type RowStatus = 'ok' | 'miss' | 'empty';

export interface TypeRow {
  /** '' for a row that has no type. */
  documentType: string;
  /** The checklist's display name, when one of the rows carries it. */
  displayName: string | null;
  required: boolean;
  /** Rows that hold a file, in form order. */
  files: UploadedDocument[];
  /** The empty row an upload can fill, if the type has one. */
  slot: UploadedDocument | null;
  status: RowStatus;
}

/** Groups a section's rows by type, keeping the order in which each type first appears. */
export const groupByType = (docs: UploadedDocument[]): TypeRow[] => {
  const byType = new Map<string, UploadedDocument[]>();
  for (const doc of docs) {
    const key = doc.documentType ?? '';
    const rows = byType.get(key);
    if (rows) rows.push(doc);
    else byType.set(key, [doc]);
  }
  return [...byType].map(([documentType, rows]) => {
    const files = rows.filter(d => d.fileName);
    // Every row of a required type carries the flag, so any one of them says so.
    const required = rows.some(d => d.isRequired);
    return {
      documentType,
      displayName: rows.find(d => d.displayName)?.displayName ?? null,
      required,
      files,
      slot: rows.find(d => !d.fileName && !d.isUploading) ?? null,
      status: files.length > 0 ? 'ok' : required ? 'miss' : 'empty',
    };
  });
};

/** An empty, optional row of a type, for a type the list always offers even when no row holds it. */
export const emptyTypeRow = (documentType: string): TypeRow => ({
  documentType,
  displayName: null,
  required: false,
  files: [],
  slot: null,
  status: 'empty',
});

/** The rows, with a row of this type added at the end if none has one. */
export const withTypeRow = (rows: TypeRow[], documentType: string): TypeRow[] =>
  rows.some(row => row.documentType === documentType)
    ? rows
    : [...rows, emptyTypeRow(documentType)];

export type DocFilter = 'all' | 'miss' | 'followup';

export interface ListQuery {
  query: string;
  filter: DocFilter;
}

/** Old rows carry the source in varying case ("FOLLOWUP", "FollowUp"), so it is compared without case. */
export const isFollowUp = (doc: UploadedDocument) => doc.source?.toUpperCase() === FOLLOWUP_SOURCE;

/**
 * What a section shows. `shown` get rows; `hidden` are the empty optional types, which always
 * collapse into one line of "+ type" chips; a search brings the ones it matches back as rows. A
 * required type that is still missing is never hidden.
 */
export const filterRows = (
  rows: TypeRow[],
  { query, filter }: ListQuery,
  typeName: (row: TypeRow) => string,
): { shown: TypeRow[]; hidden: TypeRow[] } => {
  const q = query.trim().toLowerCase();
  const matches = (row: TypeRow) =>
    !q ||
    typeName(row).toLowerCase().includes(q) ||
    row.documentType.toLowerCase().includes(q) ||
    row.files.some(f => f.fileName?.toLowerCase().includes(q));
  const passes = (row: TypeRow) =>
    filter === 'all'
      ? true
      : filter === 'miss'
        ? row.status === 'miss'
        : row.files.some(isFollowUp);

  const visible = rows.filter(r => matches(r) && passes(r));
  const isShown = (row: TypeRow) => row.files.length > 0 || row.required || !!q;
  return { shown: visible.filter(isShown), hidden: visible.filter(r => !isShown(r)) };
};

/**
 * `filterRows`' result with the rows of this type always shown as a full row, never folded into
 * the "+ type" line of empty types. A search or filter that leaves it out still leaves it out.
 */
export const alwaysShowType = (
  rows: TypeRow[],
  split: { shown: TypeRow[]; hidden: TypeRow[] },
  documentType: string,
): { shown: TypeRow[]; hidden: TypeRow[] } => ({
  shown: rows.filter(
    row =>
      split.shown.includes(row) ||
      (row.documentType === documentType && split.hidden.includes(row)),
  ),
  hidden: split.hidden.filter(row => row.documentType !== documentType),
});

export interface SectionStats {
  types: number;
  filled: number;
  required: number;
  requiredDone: number;
}

export const sectionStats = (rows: TypeRow[]): SectionStats => {
  const required = rows.filter(r => r.required);
  return {
    types: rows.length,
    filled: rows.filter(r => r.files.length > 0).length,
    required: required.length,
    requiredDone: required.filter(r => r.files.length > 0).length,
  };
};

export interface Kpis {
  required: number;
  requiredDone: number;
  files: number;
  followUps: number;
}

/** The card header's numbers, over every section. Required counts types, not files. */
export const kpis = (sections: TypeRow[][]): Kpis => {
  const rows = sections.flat();
  const stats = sectionStats(rows);
  const files = rows.flatMap(r => r.files);
  return {
    required: stats.required,
    requiredDone: stats.requiredDone,
    files: files.length,
    followUps: files.filter(isFollowUp).length,
  };
};

export type FileKind = 'pdf' | 'img' | 'file';

export const fileKind = (fileName: string | null | undefined): FileKind => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext && ['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return 'img';
  return 'file';
};

/** How many chips a row shows before the rest fold into "+N". */
export const CHIP_LIMIT = 4;
export const CHIPS_WHEN_FOLDED = 3;

export const visibleFiles = (files: UploadedDocument[], expanded: boolean): UploadedDocument[] =>
  !expanded && files.length > CHIP_LIMIT ? files.slice(0, CHIPS_WHEN_FOLDED) : files;

/** Stable identity of a file row within its list (see the Request card's own copy in DocumentUploader). */
export const documentKey = (doc: UploadedDocument): string =>
  doc.rowId ?? doc.id ?? doc.documentId ?? doc.documentType ?? '';
