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
  // Green-only filters (CollateralMaster pins). Ignored for MC.
  appraisalReportNo?: string;
  titleDeedNo?: string;
  /** Collateral-type codes (L/LB/U/LSL/LSB/LS/MAC). The single "Leasehold" choice expands to 3 codes. */
  collateralTypes?: string[];
  customerName?: string;
  landAreaFromSqWa?: number;
  landAreaToSqWa?: number;
  /** Multi-select building type codes from the "BuildingType" parameter group. */
  buildingTypeCodes?: string[];
  /** Address filters applied to green (collateral) pins. */
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

// ─── Level-2: Collateral Engagement search ───────────────────────────────────

export interface CollateralEngagementsQuery {
  collateralMasterId: string;
  pageNumber?: number;
  pageSize?: number;
}

/** One row in the Level-2 per-appraisal listing. */
export interface CollateralEngagementSearchItemDto {
  id: string;
  collateralMasterId: string;
  appraisalId: string;
  appraisalNumber: string | null;
  requestNumber: string | null;
  appraisalType: string | null;
  appraisalDate: string | null;
  appraisalCompanyName: string | null;
  appraisedCollateralType: string | null;
  landAreaInSqWa: number | null;
  appraisalValue: number | null;
  collateralType: string | null;
  ownerName: string | null;
  /** CSV of building type codes, e.g. "01,02" */
  buildingTypeCodes: string | null;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export interface CollateralPinDto {
  collateralMasterId: string;
  lat: number;
  lon: number;
  collateralType: string;
  propertyType: string | null;
  engagementCount: number;
  lastAppraisedDate: string | null;
  lastAppraisedValue: number | null;
  /** Null when the search had no centre point. */
  distanceKm: number | null;
  province: string | null;
  district: string | null;
  subDistrict: string | null;
  /** Most recent appraisal report number for this collateral. */
  lastAppraisalNumber: string | null;
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
}

export type AnyPin = CollateralPinDto | MarketComparablePinDto;

export interface PaginatedResult<T> {
  items: T[];
  /** Total matching rows across all pages (server-side count). BE serializes as `count`. */
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface HistorySearchResult {
  collateral: PaginatedResult<CollateralPinDto>;
  marketComparables: PaginatedResult<MarketComparablePinDto>;
}

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isCollateralPin(pin: AnyPin): pin is CollateralPinDto {
  return 'collateralMasterId' in pin;
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
  /** Address text filters. */
  subDistrict: string;
  district: string;
  province: string;
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
  showCollateral: boolean;            // Collateral (existing in system)
  showMarketComparables: boolean;     // Market Comparable (existing in system)
  showCollateralAppraising: boolean;  // Collateral currently being appraised
  showMcAppraising: boolean;          // Market Comparable currently being appraised
  showSupportingData: boolean;        // Supporting Data (Standalone import)
}

// ─── Collateral Detail (Level-3 drill-down) ───────────────────────────────────

export interface RoundMetaDto {
  engagementId: string;
  appraisalId: string;
  appraisalNumber: string | null;
  appraisalDate: string | null;
  appraisalType: string | null;
  appraisalValue: number | null;
}

export interface CollateralIdentityDto {
  collateralType: string | null;
  buildingTypeCode: string | null;
  projectOrVillageName: string | null;
  /** Address components — codes; the FE resolves names. */
  street: string | null;
  subDistrict: string | null;
  district: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  landAreaInSqWa: number | null;
  buildingOrUsableArea: number | null;
  modelName: string | null;
}

export interface PropertySummaryDto {
  propertyId: string;
  name: string | null;
  collateralType: string | null;
  area: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PropertyGroupDto {
  groupNumber: number;
  properties: PropertySummaryDto[];
}

export interface CollateralEngagementDetailDto {
  meta: RoundMetaDto;
  collateralIdentity: CollateralIdentityDto;
  groups: PropertyGroupDto[];
}

// ─── Collateral Master detail (GET /collateral-masters/{id}) ─────────────────

export interface AliasTitleDto {
  titleType: string;
  titleNumber: string;
  surveyNumber: string | null;
}

export interface LandDetailDto {
  landOfficeCode: string | null;
  province: string | null;
  district: string | null;
  subDistrict: string | null;
  titleType: string | null;
  titleNumber: string | null;
  surveyNumber: string | null;
  landParcelNumber: string | null;
  street: string | null;
  village: string | null;
  latitude: number | null;
  longitude: number | null;
  landShapeType: string | null;
  landZoneType: string | null;
  urbanPlanningType: string | null;
  accessRoadWidth: number | null;
  roadFrontage: number | null;
  landArea: number | null;
  unitPrice: number | null;
  buildingCost: number | null;
  appraisalValue: number | null;
  aliasTitles: AliasTitleDto[];
}

export interface CondoDetailDto {
  landOfficeCode: string | null;
  condoRegistrationNumber: string | null;
  buildingNumber: string | null;
  floorNumber: string | null;
  roomNumber: string | null;
  titleNumber: string | null;
  titleType: string | null;
  condoName: string | null;
  province: string | null;
  usableArea: number | null;
  locationType: string | null;
  buildingAge: number | null;
  constructionYear: number | null;
  modelName: string | null;
  unitPrice: number | null;
  buildingCost: number | null;
  appraisalValue: number | null;
}

export interface LeaseholdDetailDto {
  leaseRegistrationNo: string | null;
  underlyingMasterId: string | null;
  lessor: string | null;
  lessee: string | null;
  leaseTermStart: string | null;
  leaseTermEnd: string | null;
  leaseTermMonths: number | null;
}

export interface MachineDetailDto {
  machineRegistrationNo: string | null;
  serialNo: string | null;
  brand: string | null;
  model: string | null;
  manufacturer: string | null;
}

export interface UnderlyingMasterSummaryDto {
  id: string;
  collateralType: string | null;
  ownerName: string | null;
  province: string | null;
  titleNumber: string | null;
}

export interface CollateralMasterDetailDto {
  id: string;
  collateralType: string;
  ownerName: string | null;
  lastAppraisedDate: string | null;
  lastAppraisedValue: number | null;
  landDetail: LandDetailDto | null;
  condoDetail: CondoDetailDto | null;
  leaseholdDetail: LeaseholdDetailDto | null;
  machineDetail: MachineDetailDto | null;
  underlyingMaster: UnderlyingMasterSummaryDto | null;
}
