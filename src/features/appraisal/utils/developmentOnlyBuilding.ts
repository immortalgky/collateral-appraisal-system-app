import type { ConditionFn } from '@/shared/components/form';

/**
 * Whether a building is ส่วนพัฒนา only: at least one depreciation row, and every row flagged
 * non-building (`isBuilding === false`). Same rule as the backend's `DevelopmentOnlyBuilding`
 * — no rows yet is NOT development-only, and an unset flag counts as a building row.
 */
export const isDevelopmentOnlyBuilding = (rows: unknown): boolean =>
  Array.isArray(rows) &&
  rows.length > 0 &&
  rows.every(row => (row as { isBuilding?: boolean | null } | null)?.isBuilding === false);

/** `requiredWhen` for a building field that development-only buildings do not need. */
export const requiredUnlessDevelopmentOnly: ConditionFn = Object.assign(
  (values: Record<string, unknown>) => !isDevelopmentOnlyBuilding(values.depreciationDetails),
  { deps: ['depreciationDetails'] },
);
