import { useMemo } from 'react';
import { useAuthStore } from '@features/auth/store';

/**
 * The Pool channels (without the `pool-` the hub adds) the user's tasks arrive on: each of their
 * groups, and each group with each of their teams, as the backend assigns a Pool task to either
 * `<group>` or `<group>:Team_<teamId>`. A user with no team row is in the team of their company (the
 * backend falls back to the company id), so an external user's company id stands in for the team id.
 */
export function usePoolGroups(): string[] {
  const groups = useAuthStore(s => s.user?.groups);
  const teams = useAuthStore(s => s.user?.teams);
  const companyId = useAuthStore(s => s.user?.companyId);
  return useMemo(() => {
    const teamIds = teams?.length ? teams : companyId ? [companyId] : [];
    return (groups ?? []).flatMap(g => [g, ...teamIds.map(t => `${g}:Team_${t}`)]);
  }, [groups, teams, companyId]);
}
