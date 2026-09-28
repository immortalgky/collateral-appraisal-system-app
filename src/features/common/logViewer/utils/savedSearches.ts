import { isPresetHours } from './range';

export interface SavedLogSearch {
  id: string;
  label: string;
  q: string;
  /** Range hours preset to restore, e.g. 24 or 168 — custom ranges are not saved. */
  hours: number;
}

const STORAGE_KEY = 'cas-log-viewer-saved-searches';

/** localStorage is user-editable JSON, not something the app itself fully controls — a shape
 * that doesn't match (or an `hours` that isn't one of the actual presets) is dropped rather than
 * handed to the rest of the page as if it were trustworthy. */
function isValidSavedSearch(value: unknown): value is SavedLogSearch {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    typeof v.q === 'string' &&
    typeof v.hours === 'number' &&
    isPresetHours(v.hours)
  );
}

/** Every access is wrapped — localStorage can throw (private mode, disabled site data) and this
 * is a per-viewer convenience, never something the page depends on to function. */
export function loadSavedSearches(): SavedLogSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidSavedSearch) : [];
  } catch {
    return [];
  }
}

function persist(searches: SavedLogSearch[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // Best-effort — nothing to fall back to.
  }
}

export function addSavedSearch(label: string, q: string, hours: number): SavedLogSearch[] {
  const next = [...loadSavedSearches(), { id: crypto.randomUUID(), label, q, hours }];
  persist(next);
  return next;
}

export function removeSavedSearch(id: string): SavedLogSearch[] {
  const next = loadSavedSearches().filter(s => s.id !== id);
  persist(next);
  return next;
}
