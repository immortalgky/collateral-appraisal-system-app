import type { AppraisalComparableDtoType } from '@/shared/schemas/v1';

/** A market comparable as the Markets tab lists it: the link row plus the comparable's facts. */
export type Comparable = AppraisalComparableDtoType;

/** Past this, a comparable is flagged as old. One place, so changing the policy is one line. */
export const STALE_AFTER_DAYS = 365;

/**
 * Stored price units predate the MeasurementUnits master: most comparables on dev hold names
 * ('PerSqWa', 'PerSqm', 'PerUnit') where the master keys on codes ('01'–'06'). Map the names onto
 * the codes so both kinds read the same; anything else passes through untouched.
 */
const UNIT_NAME_TO_CODE: Record<string, string> = { PerSqWa: '01', PerSqm: '02', PerUnit: '03' };

export const normalizePriceUnit = (unit: string | null | undefined): string | null =>
  unit ? (UNIT_NAME_TO_CODE[unit] ?? unit) : null;

/** MeasurementUnits codes the Markets tab has its own wording for (`markets.units.*`). */
export const PRICE_UNIT_CODES = ['01', '02', '03', '04', '05', '06'] as const;
export type PriceUnitCode = (typeof PRICE_UNIT_CODES)[number];
export const isPriceUnitCode = (v: string | null | undefined): v is PriceUnitCode =>
  !!v && (PRICE_UNIT_CODES as readonly string[]).includes(v);

/**
 * Distance rings for the map: three round radii ending at the first one that reaches the
 * farthest comparable, so every comparable sits inside the outer ring. Fixed 1/2/3 km rings
 * would dwarf a set that all sits within 100 m and cut off one that reaches 8 km.
 */
const RING_STEPS_KM = [0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 20, 50];

export function ringRadiiKm(farthestKm: number | null): number[] {
  if (farthestKm == null) return [1, 2, 3];
  const found = RING_STEPS_KM.findIndex(step => step >= farthestKm);
  const outer = found === -1 ? RING_STEPS_KM.length - 1 : found;
  return RING_STEPS_KM.slice(Math.max(0, outer - 2), outer + 1);
}

export interface LatLon {
  lat: number;
  lon: number;
}

/** (0, 0) is what an untouched coordinate saves, not a place off the coast of Africa. */
export const hasCoords = (lat?: number | null, lon?: number | null): boolean =>
  lat != null && lon != null && !(Number(lat) === 0 && Number(lon) === 0);

export const comparablePoint = (c: Comparable): LatLon | null =>
  hasCoords(c.comparableLatitude, c.comparableLongitude)
    ? { lat: Number(c.comparableLatitude), lon: Number(c.comparableLongitude) }
    : null;

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Distance to the nearest property in the appraisal. An appraisal can hold several parcels, and
 * "how far is this comparable" means from whichever of them it sits beside.
 */
export function nearestKm(point: LatLon | null, subjects: LatLon[]): number | null {
  if (!point || subjects.length === 0) return null;
  return Math.min(...subjects.map(s => distanceKm(point, s)));
}

/** The price a comparable is compared on. A closed sale says more than an asking price. */
export function unitPriceOf(
  c: Comparable,
): { value: number; unit: string | null; isSale: boolean } | null {
  if (c.comparableSalePrice != null) {
    return {
      value: c.comparableSalePrice,
      unit: normalizePriceUnit(c.comparableSalePriceUnit ?? c.comparableOfferPriceUnit),
      isSale: true,
    };
  }
  if (c.comparableOfferPrice != null) {
    return {
      value: c.comparableOfferPrice,
      unit: normalizePriceUnit(c.comparableOfferPriceUnit),
      isSale: false,
    };
  }
  return null;
}

export function daysSince(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  return Number.isNaN(at) ? null : Math.max(0, Math.floor((now.getTime() - at) / 86_400_000));
}

/** Factor 52 is stored as a JSON array of PlotLocation codes, e.g. `["01","03"]`. */
export function parsePlotLocation(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((x): x is string => typeof x === 'string' && x !== '')
      : [];
  } catch {
    return [];
  }
}

/** Pricing methods of this appraisal that use the comparable, e.g. `['WQS']`. */
export const usedInMethods = (c: Comparable): string[] =>
  c.usedInMethods ? c.usedInMethods.split(',').filter(Boolean) : [];

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const thumbnailUrl = (documentId: string | null | undefined): string | undefined =>
  documentId ? `${API_BASE_URL}/documents/${documentId}/download?download=false&size=large` : undefined;
