export type ActiveTab = 'personal' | 'pool';

const isTab = (v: string | null | undefined): v is ActiveTab => v === 'personal' || v === 'pool';

/** The URL param that carries the Task Type filter of each tab (a plain `activityId` would send the router to the activity page). */
export const TAB_ACTIVITY_PARAM = { personal: 'myActivityId', pool: 'poolActivityId' } as const;

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

// URL tab > a tab's own Task Type param > personal-tab filter params (dashboard drill-downs) >
// stored tab > personal.
export function resolveInitialTab(
  searchParams: URLSearchParams,
  stored: string | null,
  filterKeys: readonly string[],
): ActiveTab {
  const fromUrl = searchParams.get('tab');
  if (isTab(fromUrl)) return fromUrl;
  // A link with only one tab's Task Type belongs to that tab; with both, it is no clue
  const mine = !!searchParams.get(TAB_ACTIVITY_PARAM.personal);
  const pool = !!searchParams.get(TAB_ACTIVITY_PARAM.pool);
  if (mine !== pool) return mine ? 'personal' : 'pool';
  if (searchParams.get('search') || filterKeys.some(k => searchParams.get(k))) return 'personal';
  return isTab(stored) ? stored : 'personal';
}
