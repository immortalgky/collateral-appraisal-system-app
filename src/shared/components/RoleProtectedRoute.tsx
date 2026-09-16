import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';

interface RoleProtectedRouteProps {
  /** Roles allowed to access the wrapped routes. Match on any. */
  allowedRoles: string[];
  /** Optional permission code; if the user has this permission, access is granted regardless of role. */
  requiredPermission?: string;
  /**
   * Narrows the guard to ONE audience instead of an allow-list: when set, only a user who holds
   * this permission (and not `requiredPermission`) is turned away; everyone else passes.
   *
   * For a route that was previously open to every logged-in user, this is the difference between
   * blocking the people you meant to block and blocking everyone you forgot to enumerate. The
   * appraisal workspace is the case in point — it is closed to credit, but `RequestChecker` holds
   * no appraisal permission at all and still reaches it by navigation from the pool task list.
   */
  deniedPermission?: string;
  /** Where to send rejected users. Defaults to '/'. */
  fallbackPath?: string;
  /**
   * Rendered instead of `<Outlet />` when the check passes.
   *
   * Lets the guard wrap a single element in place — `element: <RoleProtectedRoute ...><X/></RoleProtectedRoute>`
   * — as well as act as a layout route over `children`. Without this, wrapping an element
   * renders nothing at all, because Outlet has no child routes to fill it.
   */
  children?: ReactNode;
}

/**
 * Route-level role guard. Place as an `element` on a parent route to gate all
 * child routes behind a role/permission check. Complements `ProtectedRoute`
 * (which only checks authentication) and replaces per-page `Navigate` guards.
 */
const RoleProtectedRoute = ({
  allowedRoles,
  requiredPermission,
  deniedPermission,
  fallbackPath = '/',
  children,
}: RoleProtectedRouteProps) => {
  const user = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  /**
   * A user that has not loaded YET is not a user without access.
   *
   * The store has no persist and `/auth/me` is fetched after the app mounts, so `user` is null on
   * the first render of every cold load — a refresh, a bookmark, a link from a notification.
   * Treating that as "denied" bounced fully entitled people to the fallback before their
   * permissions had arrived.
   *
   * The wait is gated on `isAuthenticated`, and that distinction matters: `useCurrentUser`'s
   * onError calls `setUser(null)`, which the store turns into `isAuthenticated: false`, and the
   * query is `enabled: isAuthenticated` — so after a failed /auth/me it is disabled, `isLoading`
   * is false, and ProtectedRoute takes neither its spinner branch nor its /login branch (the
   * token is still in memory). Holding unconditionally there would leave a blank page forever.
   * Authenticated and still loading → wait. Not authenticated → fall through and redirect.
   */
  if (!user && isAuthenticated) return null;

  // Without `deniedPermission` this is an allow-list and everyone else is turned away, which is
  // the right shape for a route that was always gated. With it, the guard targets one audience.
  const isTargeted = deniedPermission
    ? (user?.permissions?.includes(deniedPermission) ?? false)
    : true;

  const hasAccess =
    !!user &&
    (!isTargeted ||
      (requiredPermission ? user.permissions?.includes(requiredPermission) : false) ||
      (user.roles?.some(role => allowedRoles.includes(role)) ?? false));

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children ?? <Outlet />}</>;
};

export default RoleProtectedRoute;
