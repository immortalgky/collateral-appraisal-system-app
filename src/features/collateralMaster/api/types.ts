// ─── Enums ────────────────────────────────────────────────────────────────────

// Raw codes as returned by the backend (Collateral.Contracts/CollateralTypes.cs).
export type CollateralType =
  | 'L'
  | 'LB'
  | 'U'
  | 'LSL'
  | 'LSB'
  | 'LS'
  | 'LSU'
  | 'MAC'
  | 'PRJ'
  | 'UNK';

export type BackfillStatus = 'Processed' | 'SkippedMissingKey' | 'Error';

// ─── Type-specific detail DTOs ────────────────────────────────────────────────
// Mirror Collateral/Application/Features/CollateralMasters/Lookup/LookupCollateralMasterResult.cs,
// which both the lookup and the get-by-id responses use.

export interface AliasTitleDto {
  titleType: string;
  titleNumber: string;
  surveyNumber?: string | null;
}

export interface LandDetailDto {
  // Identity (dedup key: province + district + subDistrict + titleNumber); the geography is geocodes
  landOfficeCode: string;
  province: string;
  district: string;
  subDistrict: string;
  titleType: string;
  titleNumber: string;
  surveyNumber?: string | null;
  landParcelNumber?: string | null;
  // Address
  street?: string | null;
  village?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Last-known context
  landShapeType?: string | null;
  landZoneType?: string | null;
  urbanPlanningType?: string | null;
  accessRoadWidth?: number | null;
  roadFrontage?: number | null;
  landArea?: number | null;
  // Construction tracking
  isUnderConstructionAtLastAppraisal: boolean;
  overallConstructionProgressPercent?: number | null;
  // Appraisal summary
  lastAppraisalId?: string | null;
  lastAppraisalNumber?: string | null;
  lastAppraisedDate?: string | null;
  appraisalValue?: number | null;
  /** Other titles of the same multi-title group; empty for a single title */
  aliasTitles: AliasTitleDto[];
}

export interface CondoDetailDto {
  landOfficeCode?: string | null;
  // Identity
  condoRegistrationNumber: string;
  buildingNumber: string;
  floorNumber: string;
  roomNumber: string;
  // Identity-extra
  condoName?: string | null;
  province?: string | null;
  district?: string | null;
  subDistrict?: string | null;
  // Last-known
  usableArea?: number | null;
  locationType?: string | null;
  buildingAge?: number | null;
  constructionYear?: number | null;
  modelName?: string | null;
  // Appraisal summary
  lastAppraisalId?: string | null;
  lastAppraisalNumber?: string | null;
  lastAppraisedDate?: string | null;
  appraisalValue?: number | null;
}

export interface LeaseholdDetailDto {
  // Identity
  leaseRegistrationNo: string;
  underlyingMasterId: string;
  lessor: string;
  lessee: string;
  leaseTermStart: string;
  // Last-known
  leaseTermEnd?: string | null;
  leaseTermMonths?: number | null;
  // Appraisal summary
  lastAppraisalId?: string | null;
  lastAppraisalNumber?: string | null;
  lastAppraisedDate?: string | null;
}

export interface MachineDetailDto {
  // Identity (tier 1: registration number; tier 2: serial + brand + model + manufacturer)
  machineRegistrationNo?: string | null;
  serialNo?: string | null;
  brand?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  // Appraisal summary
  lastAppraisalId?: string | null;
  lastAppraisalNumber?: string | null;
  lastAppraisedDate?: string | null;
}

// ─── Engagement ───────────────────────────────────────────────────────────────

export interface CollateralEngagementSummaryDto {
  id: string;
  collateralMasterId: string;
  appraisalId: string;
  appraisalNumber: string;
  requestId: string;
  requestNumber: string;
  propertyId: string;
  appraisalType: string;
  appraisalDate: string;
  appraisedValue?: number | null;
  appraiserUserId?: string | null;
  appraisalCompanyId?: string | null;
  appraisalCompanyName?: string | null;
  appraisalCompanyNameLocal?: string | null;
  createdOn: string;
}

export interface CollateralEngagementSnapshotDto extends CollateralEngagementSummaryDto {
  snapshot: unknown; // Parsed JSON blob — shape varies by type
}

// ─── Master & lookup ──────────────────────────────────────────────────────────

/** Only the detail matching the collateral type is filled; the others are null. */
interface CollateralDetails {
  landDetail?: LandDetailDto | null;
  condoDetail?: CondoDetailDto | null;
  leaseholdDetail?: LeaseholdDetailDto | null;
  machineDetail?: MachineDetailDto | null;
}

// GET /collateral-masters/{id}: GetCollateralMasterByIdResult
export interface CollateralMasterDto extends CollateralDetails {
  id: string;
  collateralType: CollateralType;
  ownerName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  engagementCount: number;
  lastAppraisedDate?: string | null;
  lastAppraisedValue?: number | null;
  /** The backend does not send this today; the delete/restore UI reads it */
  isDeleted?: boolean;
}

/** GET /appraisals/in-progress-by-collateral: an appraisal not yet finished on the looked-up key. */
export interface InProgressAppraisalDto {
  appraisalId: string;
  /** Null until a number is assigned */
  appraisalNumber: string | null;
  /** Submitted, Pending, Assigned, InProgress or UnderReview: only open ones come back */
  status: string;
}

export interface LastEngagementSummaryDto {
  appraisalId: string;
  appraisalNumber: string;
  appraisalType: string;
  appraisalDate: string;
  appraisalCompanyId?: string | null;
  appraisalCompanyName?: string | null;
}

// GET /collateral-masters/lookup: LookupCollateralMasterResult. Flat, not wrapped in `master`.
export interface CollateralLookupResult extends CollateralDetails {
  id: string;
  collateralType: CollateralType;
  ownerName?: string | null;
  createdAt: string;
  engagementCount: number;
  lastAppraisedDate?: string | null;
  lastAppraisedValue?: number | null;
  /** IDs of all companies that have engaged this collateral */
  priorAppraisalCompanyIds: string[];
  lastEngagement?: LastEngagementSummaryDto | null;
}

// ─── Catalog (paginated list) ─────────────────────────────────────────────────

// GET /collateral-masters: CollateralCatalogItemDto. Per-type columns keep the view's `Land_` /
// `Condo_` prefixes and are null for other types. Province, district and subDistrict are geocodes.
export interface CollateralCatalogItem {
  id: string;
  collateralType: CollateralType;
  ownerName?: string | null;
  createdAt: string;
  engagementCount: number;
  lastAppraisedDate?: string | null;
  lastAppraisedValue?: number | null;
  land_Province?: string | null;
  land_District?: string | null;
  land_SubDistrict?: string | null;
  land_TitleNumber?: string | null;
  isUnderConstructionAtLastAppraisal?: boolean | null;
  overallConstructionProgressPercent?: number | null;
  condo_Province?: string | null;
  condo_CondoName?: string | null;
  condo_Latitude?: number | null;
  condo_Longitude?: number | null;
  land_Latitude?: number | null;
  land_Longitude?: number | null;
  /** The backend does not send this today */
  isDeleted?: boolean;
}

export interface CollateralCatalogPage {
  items: CollateralCatalogItem[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

// ─── Lookup params (per type) ─────────────────────────────────────────────────

// Lookup params use the backend's query-string names and type codes
// (Collateral/Application/Features/CollateralMasters/Lookup). Province, district and subDistrict are
// geocodes, not names.
export interface LandLookupParams {
  type: 'L' | 'LB';
  province?: string;
  district?: string;
  subDistrict?: string;
  titleNumber?: string;
}

export interface CondoLookupParams {
  type: 'U';
  province?: string;
  district?: string;
  subDistrict?: string;
  condoRegistrationNumber?: string;
  building?: string;
  floor?: string;
  unit?: string;
}

export interface LeaseholdLookupParams {
  type: 'LSL' | 'LSB' | 'LS' | 'LSU';
  contractNo?: string;
  underlyingMasterId?: string;
  lessor?: string;
  lessee?: string;
  leaseTermStart?: string;
}

export interface MachineLookupParams {
  type: 'MAC';
  machineRegistrationNo?: string;
  serialNo?: string;
  brand?: string;
  model?: string;
  manufacturer?: string;
}

export type CollateralLookupParams =
  | LandLookupParams
  | CondoLookupParams
  | LeaseholdLookupParams
  | MachineLookupParams;

// ─── Catalog filter params ────────────────────────────────────────────────────

export interface CollateralCatalogParams {
  type?: CollateralType;
  province?: string;
  owner?: string;
  isUnderConstruction?: boolean;
  minAppraisals?: number;
  lastAppraisedFrom?: string;
  lastAppraisedTo?: string;
  page?: number;
  pageSize?: number;
}

// ─── Admin op request bodies ──────────────────────────────────────────────────

export interface EditCollateralMasterBody {
  reason: string;
  ownerName?: string | null;
  landDetail?: Partial<LandDetailDto> | null;
  condoDetail?: Partial<CondoDetailDto> | null;
  leaseholdDetail?: Partial<LeaseholdDetailDto> | null;
  machineDetail?: Partial<MachineDetailDto> | null;
}

export interface SoftDeleteBody {
  reason: string;
}

export interface RestoreBody {
  reason: string;
}

// ─── Backfill report ──────────────────────────────────────────────────────────

export interface BackfillReportItem {
  id: string;
  appraisalId: string;
  status: BackfillStatus;
  message?: string | null;
  runAt: string;
}

export interface BackfillReportPage {
  items: BackfillReportItem[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

// ─── Host Collateral ID backfill (AS400) ──────────────────────────────────────

export interface HostCollateralIdBackfillResponse {
  jobId?: string;
  startedAt?: string;
}

// ─── Construction inspection work details (Appraisal-side prefill) ────────────

export interface ConstructionWorkDetailDto {
  workDetailId: string;
  constructionWorkGroupId?: string | null;
  groupCode?: string | null;
  constructionWorkItemId?: string | null;
  itemCode?: string | null;
  workItemName: string;
  displayOrder: number;
  proportionPct: number;
  previousProgressPct: number;
  currentProgressPct: number;
  currentProportionPct?: number | null;
  constructionValue?: number | null;
  previousPropertyValue?: number | null;
  currentPropertyValue?: number | null;
}

export interface ConstructionInspectionWorkDetailsDto {
  inspectionId: string;
  isFullDetail: boolean;
  totalValue?: number | null;
  overallCurrentProgressPercent?: number | null;
  remark?: string | null;
  // Full-detail mode
  workDetails?: ConstructionWorkDetailDto[] | null;
  // Summary mode
  summaryCurrentProgressPct?: number | null;
  summaryPreviousProgressPct?: number | null;
  summaryCurrentValue?: number | null;
  summaryPreviousValue?: number | null;
}
