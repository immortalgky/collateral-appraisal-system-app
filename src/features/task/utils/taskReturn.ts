import { useAuthStore } from '@features/auth/store';

// The last task-list URL (tab + search + filters) this user used in this browser tab. Task
// pages leave through it so finishing a task returns to the list it came from. Per user, so a
// later login in the same tab never sees it. Read-only and never cleared, so a blocked
// navigation does not lose it. The list page that writes it is never mounted alongside the
// task pages and breadcrumb that read it, so a read at render time is current.
const keyFor = (userId: string) => `task-list-url:${userId}`;

// Returns whether the url was stored (false without a user or when storage is unavailable).
export function saveTaskListUrl(url: string): boolean {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return false;
  try {
    sessionStorage.setItem(keyFor(userId), url);
    return true;
  } catch {
    // storage unavailable: exits fall back to the default target
    return false;
  }
}

export function taskListUrl(fallback = '/tasks'): string {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return fallback;
  try {
    return sessionStorage.getItem(keyFor(userId)) || fallback;
  } catch {
    return fallback;
  }
}
