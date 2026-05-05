// ─── Enums ────────────────────────────────────────────────────────────────────

export type CollateralType = 'Land' | 'Condo' | 'Leasehold' | 'Machine';

export type TitleDeedType = 'Chanote' | 'NorSor3' | 'NorSor3Kor' | 'SorKor1';

export type BackfillStatus = 'Processed' | 'SkippedMissingKey' | 'Error';

// ─── Type-specific detail DTOs ────────────────────────────────────────────────

export interface LandDetailDto {
  collateralMasterId: string;
  // Identity (dedup key)
  landOfficeCode: string;
  province: string;
  amphur: string;
  tambon: string;
  titleDeedType: TitleDeedType;
  titleDeedNo: string;
  surveyOrParcelNo?: string | null;
  // Address
  street?: string | null;
  village?: string | null;
  postalCode?: string | null;
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
  lastConstructionInspectionId?: string | null;
  // Appraisal summary
  lastAppraisalId?: string | null;
  lastAppraisalNumber?: string | null;
  lastAppraisedDate?: string | null;
  lastAppraisedValue?: number | null;
  lastTotalAppraisedValue?: number | null;
}

export interface CondoDetailDto {
  collateralMasterId: string;
  // Identity (dedup key)
  landOfficeCode: string;
  condoRegistrationNumber: string;
  buildingNumber: string;
  floorNumber: string;
  unitNumber: string;
  titleNumber: string;
  titleType: string;
  // Identity-extra
  condoName?: string | null;
  province?: string | null;
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
  lastAppraisedValue?: number | null;
}

export interface LeaseholdDetailDto {
  collateralMasterId: string;
  // Identity (dedup key)
  leaseRegistrationNo: string;
  underlyingMasterId: string;
  lessor: string;
  lessee: string;
  leaseTermStart: string;
  // Last-known
  leaseTermEnd?: string | null;
  leaseTermMonths?: number | null;
  annualRent?: number | null;
  leasePurpose?: string | null;
  // Appraisal summary
  lastAppraisalId?: string | null;
  lastAppraisalNumber?: string | null;
  lastAppraisedDate?: string | null;
  lastAppraisedValue?: number | null;
}

export interface MachineDetailDto {
  collateralMasterId: string;
  // Identity (dedup key — tier 1)
  machineRegistrationNo?: string | null;
  // Identity (dedup key — tier 2, used when tier 1 missing)
  serialNo?: string | null;
  brand?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  // Identity-extra & last-known
  engineNo?: string | null;
  chassisNo?: string | null;
  yearOfManufacture?: number | null;
  machineCondition?: string | null;
  machineAge?: number | null;
  // Appraisal summary
  lastAppraisalId?: string | null;
  lastAppraisalNumber?: string | null;
  lastAppraisedDate?: string | null;
  lastAppraisedValue?: number | null;
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
  createdOn: string;
}

export interface CollateralEngagementSnapshotDto extends CollateralEngagementSummaryDto {
  snapshot: unknown; // Parsed JSON blob — shape varies by type
}

// ─── Master ───────────────────────────────────────────────────────────────────

export interface CollateralMasterDto {
  id: string;
  collateralType: CollateralType;
  ownerName?: string | null;
  isDeleted: boolean;
  createdOn: string;
  createdBy?: string | null;
  updatedOn?: string | null;
  updatedBy?: string | null;
  // Populated by detail join
  landDetail?: LandDetailDto | null;
  condoDetail?: CondoDetailDto | null;
  leaseholdDetail?: LeaseholdDetailDto | null;
  machineDetail?: MachineDetailDto | null;
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

export interface CollateralLookupResult {
  master: CollateralMasterDto;
  lastEngagement?: CollateralEngagementSummaryDto | null;
  /** IDs of all companies that have engaged this collateral — used for appeal exclusion */
  priorAppraisalCompanyIds: string[];
}

// ─── Catalog (paginated list) ─────────────────────────────────────────────────

export interface CollateralCatalogItem {
  id: string;
  collateralType: CollateralType;
  ownerName?: string | null;
  isDeleted: boolean;
  // Denormalized from detail + view
  dedupKeySnippet: string;
  province?: string | null;
  engagementCount: number;
  lastAppraisedDate?: string | null;
  lastAppraisedValue?: number | null;
  isUnderConstructionAtLastAppraisal?: boolean | null;
  lastAppraisalNumber?: string | null;
}

export interface CollateralCatalogPage {
  items: CollateralCatalogItem[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

// ─── Lookup params (per type) ─────────────────────────────────────────────────

export interface LandLookupParams {
  type: 'Land';
  landOfficeCode?: string;
  province?: string;
  amphur?: string;
  tambon?: string;
  titleDeedType?: string;
  titleDeedNo?: string;
  surveyOrParcelNo?: string;
}

export interface CondoLookupParams {
  type: 'Condo';
  landOfficeCode?: string;
  condoRegistrationNumber?: string;
  building?: string;
  floor?: string;
  unit?: string;
  titleNumber?: string;
  titleType?: string;
}

export interface LeaseholdLookupParams {
  type: 'Leasehold';
  contractNo?: string;
  underlyingMasterId?: string;
  lessor?: string;
  lessee?: string;
  leaseTermStart?: string;
}

export interface MachineLookupParams {
  type: 'Machine';
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
