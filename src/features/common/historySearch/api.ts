import axios from '@shared/api/axiosInstance';
import type {
  HistorySearchQuery,
  HistorySearchResult,
  CollateralEngagementsQuery,
  CollateralEngagementSearchItemDto,
  PaginatedResult,
  CollateralEngagementDetailDto,
  CollateralMasterDetailDto,
} from './types';

/**
 * POST /history-search
 *
 * Returns geo-filtered collateral pins (green, internal-only) and
 * market comparable pins (blue, filtered by company for external users).
 * The server enforces visibility — this call just passes the query through.
 */
export async function postHistorySearch(query: HistorySearchQuery): Promise<HistorySearchResult> {
  const { data } = await axios.post<HistorySearchResult>('/history-search', query);
  return data;
}

/**
 * GET /collateral-engagements/search
 *
 * Level-2 drill-down: fetches per-appraisal-report rows for a single
 * CollateralMaster. Triggered when the user clicks a green pin or its
 * list row in the Level-1 results.
 */
export async function getCollateralEngagements(
  params: CollateralEngagementsQuery,
): Promise<PaginatedResult<CollateralEngagementSearchItemDto>> {
  const { data } = await axios.get<PaginatedResult<CollateralEngagementSearchItemDto>>(
    '/collateral-engagements/search',
    {
      params: {
        collateralMasterId: params.collateralMasterId,
        ...(params.pageNumber != null ? { pageNumber: params.pageNumber } : {}),
        ...(params.pageSize != null ? { pageSize: params.pageSize } : {}),
      },
    },
  );
  return data;
}

/**
 * GET /collateral-masters/{id}/engagements/{engagementId}/detail
 *
 * Level-3 detail: fetches the rich identity + grouped properties for one
 * engagement round of a CollateralMaster.
 */
export async function getCollateralEngagementDetail(
  collateralMasterId: string,
  engagementId: string,
): Promise<CollateralEngagementDetailDto> {
  const { data } = await axios.get<CollateralEngagementDetailDto>(
    `/collateral-masters/${collateralMasterId}/engagements/${engagementId}/detail`,
  );
  return data;
}

/**
 * GET /collateral-masters/{id}
 *
 * Master-level detail: fetches the type-specific identity fields for a
 * CollateralMaster. Round-independent — keyed only on collateralMasterId.
 */
export async function getCollateralMasterById(
  collateralMasterId: string,
): Promise<CollateralMasterDetailDto> {
  const { data } = await axios.get<CollateralMasterDetailDto>(
    `/collateral-masters/${collateralMasterId}`,
  );
  return data;
}
