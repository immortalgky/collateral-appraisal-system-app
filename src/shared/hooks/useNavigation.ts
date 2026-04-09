import { useMemo } from 'react';
import { useAuthStore } from '@features/auth/store';
import { getNavigationByRoles, type NavItem, type UserRole } from '@shared/config/navigation';

/**
 * Default role set used when no user is present.
 * In dev, this mirrors the default dev user so menus render; in production,
 * ProtectedRoute redirects unauthenticated users before this fallback is hit.
 */
const DEFAULT_ROLES: UserRole[] = [];

/**
 * Hook to get navigation items filtered by the current user's role set
 * @returns Filtered navigation items based on the user's roles
 */
export function useNavigation(): NavItem[] {
  const user = useAuthStore(state => state.user);
  const roles = user?.roles ?? DEFAULT_ROLES;
  return useMemo(() => getNavigationByRoles(roles), [roles]);
}

/**
 * Hook to get the current user's roles
 * @returns Current user's roles (a user may hold multiple roles)
 */
export function useCurrentRoles(): UserRole[] {
  const user = useAuthStore(state => state.user);
  return user?.roles ?? DEFAULT_ROLES;
}

/**
 * Hook to check if the current user has a specific role
 * @param role - Role to check
 * @returns True if the user has the specified role
 */
export function useHasRole(role: UserRole): boolean {
  const currentRoles = useCurrentRoles();
  return currentRoles.includes(role);
}

/**
 * Hook to check if the current user has any of the specified roles
 * @param roles - Roles to check
 * @returns True if the user has any of the specified roles
 */
export function useHasAnyRole(roles: UserRole[]): boolean {
  const currentRoles = useCurrentRoles();
  return roles.some(r => currentRoles.includes(r));
}

/**
 * Hook to check if a user can access a specific route
 * @param allowedRoles - Roles allowed to access the route
 * @param deniedRoles - Roles explicitly denied access
 * @returns True if the user can access the route
 */
export function useCanAccess(allowedRoles?: UserRole[], deniedRoles?: UserRole[]): boolean {
  const currentRoles = useCurrentRoles();

  // Check if any of the user's roles is explicitly denied
  if (deniedRoles && deniedRoles.some(r => currentRoles.includes(r))) {
    return false;
  }

  // If no allowedRoles specified, allow all
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  // Grant access if any of the user's roles is in allowedRoles
  return allowedRoles.some(r => currentRoles.includes(r));
}
