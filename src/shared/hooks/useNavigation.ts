import { useMemo } from 'react';
import { useUserStore } from '@shared/store';
import { getNavigationByRole, type NavItem, type WorkflowActivity } from '@shared/config/navigation';

/**
 * Hook to get navigation items filtered by the current user's role
 * @returns Filtered navigation items based on user's role
 */
export function useNavigation(): NavItem[] {
  const user = useUserStore(state => state.user);
  const role = user?.role ?? 'viewer';

  return useMemo(() => getNavigationByRole(role), [role]);
}

/**
 * Hook to get the current user's role
 * @returns Current user's workflow activity role
 */
export function useCurrentRole(): WorkflowActivity {
  const user = useUserStore(state => state.user);
  return user?.role ?? 'viewer';
}

/**
 * Hook to check if the current user has a specific role
 * @param role - Role to check
 * @returns True if user has the specified role
 */
export function useHasRole(role: WorkflowActivity): boolean {
  const currentRole = useCurrentRole();
  return currentRole === role;
}

/**
 * Hook to check if the current user has any of the specified roles
 * @param roles - Roles to check
 * @returns True if user has any of the specified roles
 */
export function useHasAnyRole(roles: WorkflowActivity[]): boolean {
  const currentRole = useCurrentRole();
  return roles.includes(currentRole);
}

/**
 * Hook to check if a user can access a specific route
 * @param allowedRoles - Roles allowed to access the route
 * @param deniedRoles - Roles explicitly denied access
 * @returns True if user can access the route
 */
export function useCanAccess(
  allowedRoles?: WorkflowActivity[],
  deniedRoles?: WorkflowActivity[],
): boolean {
  const currentRole = useCurrentRole();

  // Check if explicitly denied
  if (deniedRoles?.includes(currentRole)) {
    return false;
  }

  // If no allowedRoles specified, allow all
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  // Check if role is in allowedRoles
  return allowedRoles.includes(currentRole);
}
