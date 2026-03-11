const STORAGE_KEY = 'recent-searches';
const MAX_ITEMS = 10;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term: string): void {
  const trimmed = term.trim();
  if (!trimmed) return;

  const current = getRecentSearches();
  const filtered = current.filter(item => item !== trimmed);
  const updated = [trimmed, ...filtered].slice(0, MAX_ITEMS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently ignore
  }
}
