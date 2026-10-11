import type { UploadedDocument } from '../types/document';
import { documentKey } from './documentList';

/**
 * Which of the picked files can be uploaded. The picker's `accept` only filters the dialog (the user
 * can pick "All files"), and the size is only refused once the upload starts, so a multi-file pick
 * is checked up front: the usable files go on, and one message names the rest.
 */
export const UPLOAD_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const UPLOAD_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

export type SkipReason = 'size' | 'type';

export const splitUploadable = (
  files: File[],
  maxBytes: number,
): { valid: File[]; skipped: { file: File; reason: SkipReason }[] } => {
  const valid: File[] = [];
  const skipped: { file: File; reason: SkipReason }[] = [];
  for (const file of files) {
    const extension = `.${file.name.split('.').pop() ?? ''}`.toLowerCase();
    if (file.size > maxBytes) skipped.push({ file, reason: 'size' });
    else if (!UPLOAD_TYPES.includes(file.type) && !UPLOAD_EXTENSIONS.includes(extension))
      skipped.push({ file, reason: 'type' });
    else valid.push(file);
  }
  return { valid, skipped };
};

/** How many files of one pick go up at a time. */
export const UPLOAD_CONCURRENCY = 3;

/** Runs the tasks with at most `limit` in flight, in order; a task that fails does not stop the rest. */
export const runLimited = async <T>(
  tasks: (() => Promise<T>)[],
  limit = UPLOAD_CONCURRENCY,
): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const at = next++;
      results[at] = await tasks[at]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
};

/**
 * Where an in-flight row (an upload, a generated letter) goes in its list, and how it comes back out.
 * One place for both, so they cannot drift: `slot` is the empty row it was started from, kept only if it
 * is still empty and still there. The row's key is then the slot's own; otherwise it is a fresh one,
 * because a key already in the list may belong to another upload that filled the slot meanwhile, and
 * this row's success or rollback must never touch that one.
 */
export interface InFlight {
  /** The empty slot the row takes the place of; null when it is added as a row of its own. */
  slot: UploadedDocument | null;
  key: string;
}

export const startInFlight = (
  docs: UploadedDocument[],
  slot: UploadedDocument | null,
): InFlight => {
  const stillEmpty =
    slot && docs.some(doc => documentKey(doc) === documentKey(slot) && !doc.fileName);
  return stillEmpty
    ? { slot, key: slot.rowId ?? slot.id ?? crypto.randomUUID() }
    : { slot: null, key: crypto.randomUUID() };
};

/** The row goes over its slot, or is appended. */
export const placeInFlight = (
  docs: UploadedDocument[],
  flight: InFlight,
  row: UploadedDocument,
): UploadedDocument[] => {
  if (!flight.slot) return [...docs, row];
  const at = docs.findIndex(doc => documentKey(doc) === documentKey(flight.slot!) && !doc.fileName);
  return at < 0 ? [...docs, row] : docs.map((doc, i) => (i === at ? row : doc));
};

/** The slot comes back, or the row added for it goes. */
export const revertInFlight = (docs: UploadedDocument[], flight: InFlight): UploadedDocument[] =>
  flight.slot
    ? docs.map(doc => (doc.rowId === flight.key ? flight.slot! : doc))
    : docs.filter(doc => doc.rowId !== flight.key);
