import { useQuery } from '@tanstack/react-query';
import { getCollateralMasterById } from '../api';
import type { CollateralMasterDetailDto } from '../types';
import { historySearchKeys } from './queryKeys';

/**
 * Fetches the master-level identity detail for a CollateralMaster.
 *
 * This is round-independent — the same data regardless of which engagement
 * round is selected in the drawer. Enabled only when collateralMasterId is
 * non-empty.
 */
export function useCollateralMasterDetail(collateralMasterId: string | null): {
  data: CollateralMasterDetailDto | undefined;
  isPending: boolean;
  isError: boolean;
} {
  const query = useQuery({
    queryKey: historySearchKeys.collateralMasterDetail(collateralMasterId ?? ''),
    enabled: Boolean(collateralMasterId),
    queryFn: () => getCollateralMasterById(collateralMasterId!),
  });

  return {
    data: query.data,
    isPending: query.isPending,
    isError: query.isError,
  };
}
