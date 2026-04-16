import { useAuthStore } from '@features/auth/store';

/**
 * Returns true when the authenticated user holds the given permission string.
 *
 * Reads from the Zustand auth store with a granular selector so the component
 * only re-renders when the `permissions` array identity changes (i.e., on
 * login/logout or a fresh `/auth/me` response).
 *
 * Usage:
 *   const canAdmin = useHasPermission('MEETING_ADMIN');
 */
export function useHasPermission(permission: string): boolean {
  return useAuthStore(s => s.user?.permissions?.includes(permission) ?? false);
}
