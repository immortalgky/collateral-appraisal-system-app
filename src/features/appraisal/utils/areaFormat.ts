/**
 * Area formatting for property rows and group totals.
 *
 * Pulled out of useEnrichedPropertyGroups so the card can render the same rai-ngan-wa figure the
 * list does without re-deriving it, and so group totals can add up the raw numbers instead of
 * regex-parsing a display string that the same file had just produced.
 */

/**
 * Property types measured in square wa (land), as opposed to square metres (structures).
 *
 * Codes and legacy display names both, because callers hand over whichever they hold. The lease
 * codes belong here for the same reason their display names already did — a leased plot is still
 * measured off a title deed in rai-ngan-wa.
 */
export const LAND_TYPES = new Set([
  'L',
  'LB',
  'LSL',
  'LS',
  'Lands',
  'Land and building',
  'Lease Agreement Lands',
  'Lease Agreement Land and building',
]);

export type AreaUnit = 'wa' | 'sqm';

export const areaUnitFor = (propertyType: string | undefined): AreaUnit =>
  propertyType && LAND_TYPES.has(propertyType) ? 'wa' : 'sqm';

/** `630` → `"1-2-30.00"` — the rai-ngan-wa figure appraisers read off a title deed. */
export function toRaiNganWa(totalWa: number): string {
  const rai = Math.floor(totalWa / 400);
  const ngan = Math.floor((totalWa % 400) / 100);
  const wa = (totalWa % 100).toFixed(2);
  return `${rai}-${ngan}-${wa}`;
}

/** `630` → `"1-2-30.00 (630 Sq.Wa)"` */
export function formatWaToRaiNganWa(totalWa: number): string {
  return `${toRaiNganWa(totalWa)} (${totalWa} Sq.Wa)`;
}

export function formatArea(
  area: number | null | undefined,
  propertyType: string | undefined,
): string {
  if (area == null) return '-';
  if (areaUnitFor(propertyType) === 'wa') return formatWaToRaiNganWa(area);
  return `${area} Sq.M`;
}

/** Thousands separators, and no trailing `.00` on whole numbers. */
export const formatAreaNumber = (n: number): string =>
  n.toLocaleString('en-US', { maximumFractionDigits: 2 });
