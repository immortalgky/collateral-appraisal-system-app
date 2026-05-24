/**
 * Query key factory for History Search feature.
 * Centralized to avoid inline string arrays scattered across hooks.
 */
export const historySearchKeys = {
  /** Level-2 engagement list for a specific collateral master. */
  collateralEngagements: (collateralMasterId: string, page: number, pageSize: number) =>
    ['collateral-engagements-search', collateralMasterId, page, pageSize] as const,

  /** Level-3 detail for one specific engagement round. */
  collateralEngagementDetail: (collateralMasterId: string, engagementId: string) =>
    ['collateral-engagement-detail', collateralMasterId, engagementId] as const,

  /** Master-level identity detail (round-independent). */
  collateralMasterDetail: (collateralMasterId: string) =>
    ['collateral-master-detail', collateralMasterId] as const,
};
