import type { CollateralCatalogParams, CollateralLookupParams } from './types';

/**
 * Query key factory for all collateral master queries.
 * Centralizes key construction so keys are consistent and easy to invalidate.
 */
export const collateralMasterKeys = {
  all: ['collateral-masters'] as const,

  // Lookup (debounced autocomplete by type + dedup params)
  lookup: (params: CollateralLookupParams) =>
    [...collateralMasterKeys.all, 'lookup', params] as const,

  // Catalog (admin paginated list)
  catalogs: () => [...collateralMasterKeys.all, 'catalog'] as const,
  catalog: (params: CollateralCatalogParams) =>
    [...collateralMasterKeys.catalogs(), params] as const,

  // Single master detail
  details: () => [...collateralMasterKeys.all, 'detail'] as const,
  detail: (id: string) => [...collateralMasterKeys.details(), id] as const,

  // Engagement history for a master
  engagements: (masterId: string) =>
    [...collateralMasterKeys.detail(masterId), 'engagements'] as const,
  engagement: (masterId: string, engagementId: string) =>
    [...collateralMasterKeys.engagements(masterId), engagementId] as const,

  // Backfill report
  backfillReports: () => [...collateralMasterKeys.all, 'backfill-report'] as const,
  backfillReport: (params: Record<string, unknown>) =>
    [...collateralMasterKeys.backfillReports(), params] as const,

  // Construction inspection work details (Appraisal-side)
  inspectionWorkDetails: (inspectionId: string) =>
    ['construction-inspections', inspectionId, 'work-details'] as const,
};
