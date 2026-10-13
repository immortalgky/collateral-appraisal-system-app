import type { TFunction } from 'i18next';
import toast from 'react-hot-toast';
import { isUploadBusy } from '@/shared/api/uploadProgress';
import type { CarryForwardDocument } from '@/features/appraisal/api/priorAppraisal';
import type { RequestTitleDtoType } from '../schemas/form';
import { REQUEST_DOCUMENT_UPLOADS, type UploadedDocument } from '../types/document';
import {
  isMovableTitle,
  movableIdentity,
  normaliseLandTitleNumbers,
  titleFamily,
} from './titleList';

/**
 * Pure helpers for "documents carried over from the previous appraisal".
 *
 * A row is "carried" when its persisted `source` is PREV_SOURCE: it is stamped when the file is
 * added from the previous appraisal and kept through saves, moves and reopening a draft. A file
 * the previous appraisal's file list holds is "unused" when no carried row in the form stands for it, which
 * is derived, so Don't use / Delete / Replace can all be undone with "ใช้".
 */

/** `source` of a row whose file was taken from the previous appraisal. */
export const PREV_SOURCE = 'PREV';

/** `source` of a row the maker uploaded (also what the backend defaults a missing one to). */
export const OWN_SOURCE = 'REQUEST';

export interface CarryForwardTitle {
  id?: string | null;
  /** The collateral type code: '10' vehicle, '11' machine, '12' vessel, anything else is land etc. */
  collateralType?: string | null;
  titleNumber?: string | null;
  licensePlateNumber?: string | null;
  registrationNumber?: string | null;
  vesselRegistrationNumber?: string | null;
  vehicleRegistrationNumber?: string | null;
  registrationStatus?: boolean | null;
  hin?: string | null;
  documents?: UploadedDocument[];
}

/**
 * What the document card and the assignment dialog read of the form's titles: identity, collateral
 * type, the numbers that name a title, and its documents. Used as the `compute` of `useWatch`, which
 * re-renders only when this changes, so typing in a field the card never shows (owner, address,
 * area) does not rebuild every section.
 */
export const pickCarryForwardTitles = (titles: unknown): CarryForwardTitle[] =>
  ((titles as CarryForwardTitle[] | undefined) ?? []).map(title => ({
    id: title?.id,
    collateralType: title?.collateralType,
    titleNumber: title?.titleNumber,
    licensePlateNumber: title?.licensePlateNumber,
    registrationNumber: title?.registrationNumber,
    vesselRegistrationNumber: title?.vesselRegistrationNumber,
    vehicleRegistrationNumber: title?.vehicleRegistrationNumber,
    registrationStatus: title?.registrationStatus,
    hin: title?.hin,
    documents: title?.documents,
  }));

type WithDocuments<Ti> = Ti & { documents: UploadedDocument[] };

/**
 * A title's key: its collateral type and that type's own number (a licence plate for '10', a
 * registration number for '11', a vessel registration for '12', the title number otherwise),
 * trimmed and lower-cased. Null when either part is missing. The prior request's title Id is never
 * used: a copied title may or may not keep it, and the number is what the maker recognises.
 */
export const titleKey = (
  collateralType: string | null | undefined,
  number: string | null | undefined,
): string | null => {
  const type = collateralType?.trim().toLowerCase();
  // A condominium's number is a list of land titles; compared tidied, so a reformatted list matches.
  const no = (
    titleFamily(type) === 'condo'
      ? // text with no number in it still keys by itself
        normaliseLandTitleNumbers(number) || number?.trim()
      : number?.trim()
  )
    ?.trim()
    .toLowerCase();
  return type && no ? `${type}|${no}` : null;
};

/**
 * The number of a title's own kind: a movable's identity (plate, registration, hull) as the title
 * list reads it, otherwise the title number. One rule for the title list and for these keys.
 */
export const titleNumberOf = (title: CarryForwardTitle) =>
  isMovableTitle(title) ? movableIdentity(title as RequestTitleDtoType) : title.titleNumber;

/** The key of a title in the form. */
export const formTitleKey = (title: CarryForwardTitle | undefined): string | null =>
  title ? titleKey(title.collateralType, titleNumberOf(title)) : null;

/** Title key -> the indices of the titles that have it, worked out once for a list of titles. */
export type TitleKeyIndex = ReadonlyMap<string, readonly number[]>;

export const buildTitleKeyIndex = (titles: CarryForwardTitle[]): TitleKeyIndex => {
  const index = new Map<string, number[]>();
  titles.forEach((title, i) => {
    const key = formTitleKey(title);
    if (!key) return;
    const hits = index.get(key);
    if (hits) hits.push(i);
    else index.set(key, [i]);
  });
  return index;
};

/** The index of the only title with this key, else -1: a key two titles share proves nothing. */
const uniqueTitleIndexByKey = (index: TitleKeyIndex, key: string | null): number => {
  const hits = key ? index.get(key) : undefined;
  return hits?.length === 1 ? hits[0] : -1;
};

/**
 * The title in the form a title-level file belongs to: the only one with the entry's key
 * (collateral type + number). -1 when none or several have it; the maker then picks one.
 */
export const findTitleIndex = (
  titles: CarryForwardTitle[],
  doc: CarryForwardDocument,
  // Pass one when looking up many entries against the same titles
  index: TitleKeyIndex = buildTitleKeyIndex(titles),
): number =>
  doc.level === 'Title'
    ? uniqueTitleIndexByKey(index, titleKey(doc.collateralType, doc.titleNumber))
    : -1;

/**
 * The section the "Use" chooser starts on: request level, or the one title with its key. Null means
 * nothing is preselected and the maker picks one.
 */
export const restoreTarget = (
  titles: CarryForwardTitle[],
  entry: CarryForwardDocument,
): { entityType: 'request' | 'title'; entityIndex: number } | null => {
  if (entry.level !== 'Title') return { entityType: 'request', entityIndex: -1 };
  const idx = findTitleIndex(titles, entry);
  return idx >= 0 ? { entityType: 'title', entityIndex: idx } : null;
};

/**
 * Which title a title-level carried file came from, in words a maker knows it by: a land title as
 * "โฉนด 12345", a condominium as "ห้องชุด 12345", any other kind by its number, or a note that the
 * title had none. Null for a request-level file. The endpoint carries the collateral type and the
 * title number only (not the deed type or the unit), so the noun is the family's, not the deed's.
 */
export const carriedTitleRef = (
  t: TFunction<'request'>,
  doc: CarryForwardDocument,
): string | null => {
  if (doc.level !== 'Title') return null;
  const family = titleFamily(doc.collateralType);
  const raw = doc.titleNumber?.trim() ?? '';
  // A condominium's number is a list of land titles: shown tidied
  const n = family === 'condo' ? normaliseLandTitleNumbers(raw) || raw : raw;
  if (!n) return t('carryForward.titleRef.none');
  if (family === 'land' || family === 'landBuilding') return t('carryForward.titleRef.land', { n });
  if (family === 'condo') return t('carryForward.titleRef.condo', { n });
  return t('carryForward.titleRef.other', { n });
};

/** One endpoint entry. The same DocumentId can come back at request level and on a title. */
export const carryEntryKey = (doc: CarryForwardDocument) =>
  `${doc.documentId}|${doc.level}|${doc.titleId ?? ''}`;

/**
 * Each endpoint entry is matched to at most one row in the form: first to a row with its DocumentId
 * in its own section (request level, or the matched title), then, for entries still without one,
 * to any such row that is still free (a file the maker moved to another section). An entry with no
 * row is unused. One row never serves two entries, so a file that comes back at several levels is
 * not shown as used, or restorable, twice. The row's source does not matter here: a draft saved
 * before the PREV stamp holds the same copied files with another source, and they are still in use.
 */
export const deriveCarryForward = (
  carried: CarryForwardDocument[],
  documents: UploadedDocument[] | undefined,
  titles: CarryForwardTitle[] | undefined,
) => {
  const formTitles = titles ?? [];
  // section -1 = request level, otherwise the title's index
  const rows: { section: number; documentId: string }[] = [];
  const collect = (section: number, docs: UploadedDocument[] | undefined) => {
    for (const d of docs ?? []) if (d.documentId) rows.push({ section, documentId: d.documentId });
  };
  collect(-1, documents);
  formTitles.forEach((t, i) => collect(i, t?.documents));

  const titleIndex = buildTitleKeyIndex(formTitles);
  const taken = new Set<number>();
  const matched = new Set<CarryForwardDocument>();
  const take = (doc: CarryForwardDocument, fits: (r: { section: number }) => boolean) => {
    const at = rows.findIndex(
      (r, i) => !taken.has(i) && r.documentId === doc.documentId && fits(r),
    );
    if (at < 0) return;
    taken.add(at);
    matched.add(doc);
  };

  for (const doc of carried) {
    const section = doc.level === 'Title' ? findTitleIndex(formTitles, doc, titleIndex) : -1;
    if (doc.level !== 'Title' || section >= 0) take(doc, r => r.section === section);
  }
  for (const doc of carried) if (!matched.has(doc)) take(doc, () => true);

  const used: CarryForwardDocument[] = [];
  const unused: CarryForwardDocument[] = [];
  for (const doc of carried) (matched.has(doc) ? used : unused).push(doc);

  return { used, unused };
};

export const toFormDocument = (
  doc: CarryForwardDocument,
  titleId: string | null = null,
  // The maker may file it under another type than the suggested one
  documentType: string = doc.suggestedType,
): UploadedDocument => ({
  id: null,
  titleId,
  documentId: doc.documentId,
  // The type the file gets in this request (D036 for the summary report), not its own code
  documentType,
  fileName: doc.fileName,
  uploadedAt: doc.uploadedAt,
  prefix: doc.prefix,
  notes: doc.notes,
  filePath: doc.filePath,
  createdWorkstation: null,
  isRequired: false,
  uploadedBy: doc.uploadedBy,
  uploadedByName: doc.uploadedByName,
  source: PREV_SOURCE,
  // Several files of one type can coexist (a split summary report), so the row needs its own key.
  rowId: crypto.randomUUID(),
});

/**
 * A row the maker added (an upload, a generated letter): the one place its defaults are set, so every
 * path that adds one stamps the same `source` and gives it its own `rowId` (several files of one type
 * can coexist, and a draft save updates a row by that key).
 */
export const makeUploadedRow = (
  init: Partial<UploadedDocument> & Pick<UploadedDocument, 'documentType' | 'fileName'>,
): UploadedDocument => ({
  id: null,
  titleId: null,
  documentId: null,
  uploadedAt: new Date().toISOString(),
  prefix: null,
  notes: null,
  filePath: null,
  createdWorkstation: null,
  isRequired: false,
  uploadedBy: null,
  uploadedByName: null,
  source: OWN_SOURCE,
  rowId: crypto.randomUUID(),
  ...init,
});

/** Fill an empty slot of the same type (a required checklist row) before adding a new row. */
export const placeDocument = (
  docs: UploadedDocument[],
  doc: UploadedDocument,
): UploadedDocument[] => {
  const emptyIdx = docs.findIndex(
    d => d.documentType === doc.documentType && !d.fileName && !d.isUploading,
  );
  if (emptyIdx < 0) return [...docs, doc];
  const slot = docs[emptyIdx];
  // The slot keeps its persisted identity (id, rowId) so a draft save updates that row instead of
  // deleting it and inserting another, as Replace and upload-to-slot do.
  return docs.map((d, i) =>
    i === emptyIdx
      ? {
          ...doc,
          id: slot.id ?? doc.id,
          rowId: slot.rowId ?? doc.rowId,
          isRequired: slot.isRequired,
          displayName: slot.displayName ?? doc.displayName,
        }
      : d,
  );
};

/**
 * Add the carried files the maker should get by default; `defaultUse: false` waits in the unused
 * list. An entry is added when ITS section (request level, or the one title it matches) holds no
 * row with its DocumentId: the same identity `deriveCarryForward` uses for "in the form", whatever
 * the row's source (a draft saved before the PREV stamp holds the same copies). Rows added in this
 * pass count too, so a file the list repeats is added once per section.
 */
export const applyCarryForward = <Ti extends CarryForwardTitle>(
  documents: UploadedDocument[],
  titles: Ti[],
  carried: CarryForwardDocument[],
): { documents: UploadedDocument[]; titles: WithDocuments<Ti>[] } => {
  let nextDocuments = documents;
  const nextTitles = titles.map(t => ({ ...t, documents: [...(t.documents ?? [])] }));
  // Placing a file changes a title's documents, never its key
  const titleIndex = buildTitleKeyIndex(nextTitles);
  const idsIn = (docs: UploadedDocument[]) =>
    new Set(docs.flatMap(d => (d.documentId ? [d.documentId] : [])));
  const requestIds = idsIn(documents);
  const titleIds = nextTitles.map(t => idsIn(t.documents));

  for (const doc of carried) {
    if (!doc.defaultUse) continue;
    if (doc.level === 'Title') {
      const idx = findTitleIndex(nextTitles, doc, titleIndex);
      if (idx < 0 || titleIds[idx].has(doc.documentId)) continue;
      nextTitles[idx].documents = placeDocument(
        nextTitles[idx].documents,
        toFormDocument(doc, nextTitles[idx].id ?? null),
      );
      titleIds[idx].add(doc.documentId);
    } else {
      if (requestIds.has(doc.documentId)) continue;
      nextDocuments = placeDocument(nextDocuments, toFormDocument(doc));
      requestIds.add(doc.documentId);
    }
  }
  return { documents: nextDocuments, titles: nextTitles };
};

/** A row holding a file taken from the previous appraisal (an emptied slot is not one). */
export const isCarried = (doc: UploadedDocument) => doc.source === PREV_SOURCE && !!doc.fileName;

/** Some row is still uploading: its file is not on the server, so it must not be re-homed. */
export const hasUploadingRows = (
  documents: UploadedDocument[] | undefined,
  titles: CarryForwardTitle[] | undefined,
): boolean => countRows(documents, titles, d => !!d.isUploading) > 0;

/**
 * Some upload is still in flight for this request: a row marked uploading, or an upload or batch
 * started from the request's document card. Its file is not on the server yet and is written back
 * to its title or document by position, so nothing that moves, inserts or drops rows may run.
 * Uploads that belong to other screens are not this request's business.
 */
export const isRequestUploadBusy = (
  getValues: () => { documents?: UploadedDocument[]; titles?: CarryForwardTitle[] },
): boolean => {
  const current = getValues();
  return (
    hasUploadingRows(current.documents, current.titles) || isUploadBusy(REQUEST_DOCUMENT_UPLOADS)
  );
};

/** The guard every row-moving action starts with: true (after telling the user to wait) if busy. */
export const blockedByRequestUploads = (
  getValues: Parameters<typeof isRequestUploadBusy>[0],
  message: string,
): boolean => {
  if (!isRequestUploadBusy(getValues)) return false;
  toast(message, { id: 'request-wait-for-uploads' });
  return true;
};

/** The same "file removed" shape Delete leaves behind on a required row. */
export const clearFile = (doc: UploadedDocument): UploadedDocument => ({
  ...doc,
  source: null,
  // Whatever described the removed file must not be waiting on the slot for the next one
  notes: null,
  prefix: null,
  fileName: null,
  file: undefined,
  documentId: null,
  filePath: null,
  uploadedAt: new Date().toISOString(),
  uploadedBy: null,
  uploadedByName: null,
});

/**
 * Takes the files of the matching rows out. An optional row is removed. A required row becomes the
 * empty slot of its type, like Delete does, unless another row of that type still holds a file (a
 * split report) or an earlier removed row already became the slot: then it is removed too, so the
 * type shows one pending slot at most, and none while a file is still there.
 */
export const removeFiles = (
  docs: UploadedDocument[],
  matches: (doc: UploadedDocument) => boolean,
): UploadedDocument[] => {
  const holdsFile = new Set(docs.filter(d => !matches(d) && d.fileName).map(d => d.documentType));
  const slotted = new Set<string | null | undefined>();
  return docs.flatMap(d => {
    if (!matches(d)) return [d];
    if (!d.isRequired || holdsFile.has(d.documentType) || slotted.has(d.documentType)) return [];
    slotted.add(d.documentType);
    return [clearFile(d)];
  });
};

/** Take carried files out (see removeFiles). Own files stay. */
export const dropCarried = <Ti extends CarryForwardTitle>(
  documents: UploadedDocument[],
  titles: Ti[],
): { documents: UploadedDocument[]; titles: WithDocuments<Ti>[] } => ({
  documents: removeFiles(documents, isCarried),
  titles: titles.map(t => ({ ...t, documents: removeFiles(t.documents ?? [], isCarried) })),
});

const countRows = (
  documents: UploadedDocument[] | undefined,
  titles: CarryForwardTitle[] | undefined,
  matches: (doc: UploadedDocument) => boolean,
): number =>
  [...(documents ?? []), ...(titles ?? []).flatMap(t => t?.documents ?? [])].filter(matches).length;

const isOwnFile = (doc: UploadedDocument) => !!doc.fileName && !isCarried(doc);

/** Rows in the form whose file came from the previous appraisal. */
export const countCarriedFiles = (
  documents: UploadedDocument[] | undefined,
  titles: CarryForwardTitle[] | undefined,
): number => countRows(documents, titles, isCarried);

/** Files the maker uploaded themself, which a change of previous appraisal must not delete. */
export const countOwnFiles = (
  documents: UploadedDocument[] | undefined,
  titles: CarryForwardTitle[] | undefined,
): number => countRows(documents, titles, isOwnFile);

/**
 * The maker's own uploads on the old titles, for when the titles are replaced: each goes to the new
 * title with the same key (collateral type + number), or up to the request level when there is none.
 */
export const rehomeOwnFiles = (
  oldTitles: CarryForwardTitle[] | undefined,
  newTitles: CarryForwardTitle[],
): { titleDocuments: UploadedDocument[][]; requestDocuments: UploadedDocument[] } => {
  const titleDocuments: UploadedDocument[][] = newTitles.map(() => []);
  const requestDocuments: UploadedDocument[] = [];
  const newIndex = buildTitleKeyIndex(newTitles);

  for (const old of oldTitles ?? []) {
    for (const doc of old?.documents ?? []) {
      if (!isOwnFile(doc)) continue;
      const idx = uniqueTitleIndexByKey(newIndex, formTitleKey(old));
      if (idx >= 0)
        titleDocuments[idx].push({ ...doc, id: null, titleId: newTitles[idx].id ?? null });
      else requestDocuments.push({ ...doc, id: null, titleId: null, isRequired: false });
    }
  }
  return { titleDocuments, requestDocuments };
};
