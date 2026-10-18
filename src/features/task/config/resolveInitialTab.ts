export type ActiveTab = 'personal' | 'pool';

const isTab = (v: string | null | undefined): v is ActiveTab => v === 'personal' || v === 'pool';

const taskTabStorageKey = (userId: string) => `task-tab:${userId}`;

export function readStoredTab(userId: string | undefined): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(taskTabStorageKey(userId));
  } catch {
    return null;
  }
}

export function writeStoredTab(userId: string | undefined, tab: ActiveTab) {
  if (!userId) return;
  try {
    localStorage.setItem(taskTabStorageKey(userId), tab);
  } catch {
    // storage unavailable: the tab just won't be remembered
  }
}

// URL tab > personal-tab filter params (dashboard drill-downs) > stored tab > personal.
export function resolveInitialTab(
  searchParams: URLSearchParams,
  stored: string | null,
  filterKeys: readonly string[],
): ActiveTab {
  const fromUrl = searchParams.get('tab');
  if (isTab(fromUrl)) return fromUrl;
  if (searchParams.get('search') || filterKeys.some(k => searchParams.get(k))) return 'personal';
  return isTab(stored) ? stored : 'personal';
}
