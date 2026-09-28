import type { User } from '@/features/auth/types';

/**
 * Shared role/permission predicate — mirrors RoleProtectedRoute's route guard
 * so page-level checks (e.g. whether to render a link) stay in sync with the
 * actual route access rule instead of re-deriving a role-only subset of it.
 */
export const hasRoleOrPermission = (
  user: User | null | undefined,
  allowedRoles: readonly string[],
  requiredPermission?: string,
): boolean => {
  if (!user) return false;
  if (requiredPermission && user.permissions?.includes(requiredPermission)) return true;
  return user.roles?.some(role => allowedRoles.includes(role)) ?? false;
};
