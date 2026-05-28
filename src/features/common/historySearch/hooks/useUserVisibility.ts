import { useAuthStore } from '@features/auth/store';

/**
 * Reads the auth store to determine if the current user belongs to an external
 * appraisal company. Mirrors the backend ICurrentUserService.IsExternal rule
 * (any user with a CompanyId / company_id JWT claim).
 *
 * External users:
 * - Cannot see the green (Collateral) pin layer
 * - Should not render any collateral results even if the server returns them
 *   (defense-in-depth — the backend already returns empty for external users)
 */
export function useUserVisibility(): { isExternal: boolean } {
  const companyId = useAuthStore(s => s.user?.companyId);
  return { isExternal: Boolean(companyId) };
}
