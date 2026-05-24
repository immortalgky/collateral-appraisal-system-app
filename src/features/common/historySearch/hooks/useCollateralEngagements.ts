import { useQuery } from '@tanstack/react-query';
import { getCollateralEngagements } from '../api';
import type { CollateralEngagementSearchItemDto, PaginatedResult } from '../types';
import { historySearchKeys } from './queryKeys';

const PAGE_SIZE = 20;

/**
 * Fetches Level-2 engagement rows for a single CollateralMaster.
 *
 * Uses `useQuery` (not a mutation) because the drill-down target is driven
 * by collateralMasterId in component state, making it a natural derived
 * query rather than an imperative trigger. `enabled` guards against firing
 * before the user selects a pin.
 */
export function useCollateralEngagements(
  collateralMasterId: string | null,
  page = 0,
): {
  data: PaginatedResult<CollateralEngagementSearchItemDto> | undefined;
  isPending: boolean;
  isError: boolean;
} {
  const query = useQuery({
    queryKey: historySearchKeys.collateralEngagements(
      collateralMasterId ?? '',
      page,
      PAGE_SIZE,
    ),
    enabled: Boolean(collateralMasterId),
    queryFn: () =>
      getCollateralEngagements({
        collateralMasterId: collateralMasterId!,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      }),
  });

  return {
    data: query.data,
    isPending: query.isPending,
    isError: query.isError,
  };
}
