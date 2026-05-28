// ─── Request types ────────────────────────────────────────────────────────────

export type HistorySearchPeriod = 'Past3y' | 'Past2y' | 'Past1y' | 'Current';

export interface PaginationRequest {
  pageNumber: number;
  pageSize: number;
}

export interface HistorySearchQuery {
  /** Centre point — optional (FSD §2.6.7). Omit all three for an attribute-only search. */
  centerLat?: number;
  centerLon?: number;
  radiusKm?: number;
  period: HistorySearchPeriod;
  // Green-only filters (AppraisalPin pins). Ignored for MC.
  appraisalReportNo?: string;
  titleDeedNo?: string;
  /** Collateral-type codes (L/LB/U/LSL/LSB/LS/MAC). The single "Leasehold" choice expands to 3 codes. */
  collateralTypes?: string[];
  customerName?: string;
  landAreaFromSqWa?: number;
  landAreaToSqWa?: number;
  /** Multi-select building type codes from the "BuildingType" parameter group. */
  buildingTypeCodes?: string[];
  /** Address filters applied to green (appraisal) pins. */
  subDistrict?: string;
  district?: string;
  province?: string;
  // Both-pin filters.
  valueFrom?: number;
  valueTo?: number;
  /** ISO date (YYYY-MM-DD). When set, overrides `period`. */
  dateFrom?: string;
  /** ISO date (YYYY-MM-DD). When set, overrides `period`. */
  dateTo?: string;
  pagination: PaginationRequest;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export interface AppraisalPinDto {
  appraisalId: string;
  appraisalNumber: string | null;
  lat: number;
  lon: number;
  /** Collateral type code of the representative property (L, LB, U, …). */
  propertyType: string | null;
  /** Building type of the representative property; null for non-building collaterals. */
  buildingType: string | null;
  appraisedValue: number | null;
  appraisedDate: string | null;
  /** Null when the search had no centre point. */
  distanceKm: number | null;
  province: string | null;
  district: string | null;
  subDistrict: string | null;
  customerName: string | null;
}

export interface MarketComparablePinDto {
  marketComparableId: string;
  lat: number;
  lon: number;
  propertyType: string;
  surveyName: string;
  infoDateTime: string | null;
  offerPrice: number | null;
  salePrice: number | null;
  /** Null when the search had no centre point. */
  distanceKm: number | null;
  /** Appraisal report no. of the most recent appraisal this comparable was used in. */
  appraisalNumber: string | null;
  /** Customer name of that same most-recent linked appraisal; null if not linked. */
  customerName: string | null;
  /** Appraisal (appointment) date of that linked appraisal; used as the row's "Appraisal Date". */
  appraisalDate: string | null;
}

export type AnyPin = AppraisalPinDto | MarketComparablePinDto;

export interface PaginatedResult<T> {
  items: T[];
  /** Total matching rows across all pages (server-side count). BE serializes as `count`. */
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface HistorySearchResult {
  appraisals: PaginatedResult<AppraisalPinDto>;
  marketComparables: PaginatedResult<MarketComparablePinDto>;
}

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isAppraisalPin(pin: AnyPin): pin is AppraisalPinDto {
  return 'appraisalId' in pin;
}

export function isMarketComparablePin(pin: AnyPin): pin is MarketComparablePinDto {
  return 'marketComparableId' in pin;
}

// ─── Form state ───────────────────────────────────────────────────────────────

export interface HistorySearchFormValues {
  centerLat: string;
  centerLon: string;
  radiusKm: string;
  period: HistorySearchPeriod;
  // Green-only filters (form holds strings; coerce on submit).
  appraisalReportNo: string;
  titleDeedNo: string;
  collateralType: string;
  customerName: string;
  landAreaFromSqWa: string;
  landAreaToSqWa: string;
  /** Multi-select: array of building type codes from "BuildingType" parameter group. */
  buildingTypeCodes: string[];
  /** Address filters — codes, set by the province → district → sub-district cascade. */
  subDistrict: string;
  district: string;
  province: string;
  /** Display-only names auto-filled by the autocomplete (not sent to the backend). */
  subDistrictName?: string;
  districtName?: string;
  provinceName?: string;
  postcode?: string;
  // Both-pin filters.
  valueFrom: string;
  valueTo: string;
  dateFrom: string;
  dateTo: string;
}

/**
 * Toggle state for each pin layer. Only the first two are wired to backend
 * data today; the other three are listed in the filter panel as placeholders
 * for future work (per FSD §2.6.7 pin taxonomy).
 */
export interface PinFilterState {
  showCollateral: boolean;            // Appraisal (existing in system)
  showMarketComparables: boolean;     // Market Comparable (existing in system)
  showCollateralAppraising: boolean;  // Collateral currently being appraised
  showMcAppraising: boolean;          // Market Comparable currently being appraised
  showSupportingData: boolean;        // Supporting Data (Standalone import)
}
