export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: string | null;
  dir: SortDir;
}

/** Toggle helper: asc → desc → cleared, cycling per column. */
export function nextSort(current: SortState, key: string): SortState {
  if (current.key !== key) return { key, dir: 'asc' };
  if (current.dir === 'asc') return { key, dir: 'desc' };
  return { key: null, dir: 'asc' };
}
