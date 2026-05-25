import { useQuery } from '@tanstack/react-query';
import { getCollateralEngagementDetail } from '../api';
import type { CollateralEngagementDetailDto } from '../types';
import { historySearchKeys } from './queryKeys';

/**
 * Fetches the Level-3 detail for a single engagement round.
 *
 * Both `collateralMasterId` and `engagementId` must be non-empty for the
 * query to fire. Changing either value triggers a new fetch automatically,
 * which powers the round-selector dropdown in CollateralDetailDrawer.
 */
export function useCollateralEngagementDetail(
  collateralMasterId: string | null,
  engagementId: string | null,
): {
  data: CollateralEngagementDetailDto | undefined;
  isPending: boolean;
  isError: boolean;
} {
  const query = useQuery({
    queryKey: historySearchKeys.collateralEngagementDetail(
      collateralMasterId ?? '',
      engagementId ?? '',
    ),
    enabled: Boolean(collateralMasterId) && Boolean(engagementId),
    queryFn: () =>
      getCollateralEngagementDetail(collateralMasterId!, engagementId!),
  });

  return {
    data: query.data,
    isPending: query.isPending,
    isError: query.isError,
  };
}
