import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';

interface RoleProtectedRouteProps {
  /** Roles allowed to access the wrapped routes. Match on any. */
  allowedRoles: string[];
  /** Optional permission code; if the user has this permission, access is granted regardless of role. */
  requiredPermission?: string;
  /** Where to send rejected users. Defaults to '/'. */
  fallbackPath?: string;
}

/**
 * Route-level role guard. Place as an `element` on a parent route to gate all
 * child routes behind a role/permission check. Complements `ProtectedRoute`
 * (which only checks authentication) and replaces per-page `Navigate` guards.
 */
const RoleProtectedRoute = ({
  allowedRoles,
  requiredPermission,
  fallbackPath = '/',
}: RoleProtectedRouteProps) => {
  const user = useAuthStore(s => s.user);
  const hasAccess = (() => {
    if (!user) return false;
    if (requiredPermission && user.permissions?.includes(requiredPermission)) return true;
    return user.roles?.some(role => allowedRoles.includes(role)) ?? false;
  })();
  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
};

export default RoleProtectedRoute;
