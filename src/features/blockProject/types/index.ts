// ─── Project Discriminator ────────────────────────────────────────────────────

export type ProjectType = 'Condo' | 'LandAndBuilding';

// ─── Project ──────────────────────────────────────────────────────────────────

/**
 * Unified project entity covering both Condo and LandAndBuilding project types.
 * The projectType field acts as a discriminator.
 * Type-specific fields (builtOnTitleDeedNumber / licenseExpirationDate) are
 * always present but will be null for the non-matching project type.
 */
export interface Project {
  id: string;
  appraisalId: string;
  projectType: ProjectType;
  // Project Info
  projectName?: string;
  projectDescription?: string;
  developer?: string;
  projectSaleLaunchDate?: string;
  // Land Area
  landAreaRai?: number;
  landAreaNgan?: number;
  landAreaWa?: number;
  // Project Details
  unitForSaleCount?: number;
  numberOfPhase?: number;
  landOffice?: string;
  // Location
  latitude?: number;
  longitude?: number;
  subDistrict?: string;
  district?: string;
  province?: string;
  postcode?: string;
  locationNumber?: string;
  road?: string;
  soi?: string;
  // Utilities & Facilities
  utilities?: string[];
  utilitiesOther?: string;
  facilities?: string[];
  facilitiesOther?: string;
  // Other
  remark?: string;
  // Type-specific (null for opposing type)
  /** Condo only — null for LandAndBuilding */
  builtOnTitleDeedNumber?: string;
  /** LandAndBuilding only — null for Condo */
  licenseExpirationDate?: string;
}

// ─── ProjectTower (Condo only) ────────────────────────────────────────────────

export interface ProjectTower {
  id: string;
  /** FK to Project.id */
  projectId: string;
  towerName?: string;
  numberOfUnits?: number;
  numberOfFloors?: number;
  condoRegistrationNumber?: string;
  modelTypeIds?: string[];
  conditionType?: string;
  hasObligation?: boolean;
  obligationDetails?: string;
  documentValidationType?: string;
  isLocationCorrect?: boolean;
  distance?: number;
  roadWidth?: number;
  rightOfWay?: number;
  roadSurfaceType?: string;
  roadSurfaceTypeOther?: string;
  decorationType?: string;
  decorationTypeOther?: string;
  constructionYear?: number;
  totalNumberOfFloors?: number;
  buildingFormType?: string;
  constructionMaterialType?: string;
  groundFloorMaterialType?: string;
  groundFloorMaterialTypeOther?: string;
  upperFloorMaterialType?: string;
  upperFloorMaterialTypeOther?: string;
  bathroomFloorMaterialType?: string;
  bathroomFloorMaterialTypeOther?: string;
  roofType?: string[];
  roofTypeOther?: string;
  isExpropriated?: boolean;
  expropriationRemark?: string;
  isInExpropriationLine?: boolean;
  royalDecree?: string;
  isForestBoundary?: boolean;
  forestBoundaryRemark?: string;
  remark?: string;
  images?: Array<{
    id: string;
    galleryPhotoId: string;
    displaySequence: number;
    title?: string | null;
    description?: string | null;
    isThumbnail: boolean;
  }>;
}

// ─── ProjectModel ─────────────────────────────────────────────────────────────

export interface ProjectModelAreaDetail {
  id?: string;
  areaDescription?: string;
  areaSize?: number;
}

/** LandAndBuilding only */
export interface ProjectModelSurface {
  id?: string;
  fromFloorNumber?: number;
  toFloorNumber?: number;
  floorType?: string;
  floorStructureType?: string;
  floorStructureTypeOther?: string;
  floorSurfaceType?: string;
  floorSurfaceTypeOther?: string;
}

/** LandAndBuilding only */
export interface ProjectModelDepreciationPeriod {
  id?: string;
  atYear?: number;
  toYear?: number;
  depreciationPerYear?: number;
  totalDepreciationPct?: number;
  priceDepreciation?: number;
}

/** LandAndBuilding only */
export interface ProjectModelDepreciationDetail {
  id?: string;
  depreciationMethod?: string;
  areaDescription?: string;
  area?: number;
  year?: number;
  isBuilding?: boolean;
  pricePerSqMBeforeDepreciation?: number;
  priceBeforeDepreciation?: number;
  pricePerSqMAfterDepreciation?: number;
  priceAfterDepreciation?: number;
  depreciationYearPct?: number;
  totalDepreciationPct?: number;
  priceDepreciation?: number;
  periods?: ProjectModelDepreciationPeriod[];
}

/**
 * Superset model DTO for both Condo and LandAndBuilding.
 * Condo-specific: buildingNumber, startingPriceMin, startingPriceMax,
 *   roomLayoutType, roomLayoutTypeOther.
 * LB-specific: numberOfHouse, startingPrice, landAreaRai/Ngan/Wa,
 *   standardLandArea, buildingType, buildingTypeOther, numberOfFloors,
 *   decorationType, buildingMaterialType, buildingStyleType, isResidential,
 *   buildingAge, constructionYear, constructionStyleType, structureType,
 *   roofFrameType, roofType, ceilingType, interiorWallType, exteriorWallType,
 *   fenceType, constructionType, utilizationType, surfaces, depreciationDetails.
 */
export interface ProjectModel {
  id: string;
  projectId: string;
  // Common
  modelName?: string;
  modelDescription?: string;
  pricingAnalysisId?: string;
  pricingAnalysisStatus?: string;
  finalAppraisedValue?: number;
  hasMezzanine?: boolean;
  usableAreaMin?: number;
  usableAreaMax?: number;
  standardUsableArea?: number;
  fireInsuranceCondition?: string;
  groundFloorMaterialType?: string;
  groundFloorMaterialTypeOther?: string;
  upperFloorMaterialType?: string;
  upperFloorMaterialTypeOther?: string;
  bathroomFloorMaterialType?: string;
  bathroomFloorMaterialTypeOther?: string;
  images?: Array<{
    id: string;
    galleryPhotoId: string;
    displaySequence: number;
    title?: string | null;
    description?: string | null;
    isThumbnail: boolean;
  }>;
  remark?: string;
  areaDetails?: ProjectModelAreaDetail[];
  // Condo-only
  buildingNumber?: string;
  startingPriceMin?: number;
  startingPriceMax?: number;
  roomLayoutType?: string;
  roomLayoutTypeOther?: string;
  // LandAndBuilding-only
  numberOfHouse?: number;
  startingPrice?: number;
  landAreaRai?: number;
  landAreaNgan?: number;
  landAreaWa?: number;
  standardLandArea?: number;
  buildingType?: string;
  buildingTypeOther?: string;
  numberOfFloors?: number;
  decorationType?: string;
  decorationTypeOther?: string;
  isEncroachingOthers?: boolean;
  encroachingOthersRemark?: string;
  encroachingOthersArea?: number;
  buildingMaterialType?: string;
  buildingStyleType?: string;
  isResidential?: boolean;
  buildingAge?: number;
  constructionYear?: number;
  residentialRemark?: string;
  constructionStyleType?: string;
  constructionStyleRemark?: string;
  structureType?: string[];
  structureTypeOther?: string;
  roofFrameType?: string[];
  roofFrameTypeOther?: string;
  roofType?: string[];
  roofTypeOther?: string;
  ceilingType?: string[];
  ceilingTypeOther?: string;
  interiorWallType?: string[];
  interiorWallTypeOther?: string;
  exteriorWallType?: string[];
  exteriorWallTypeOther?: string;
  fenceType?: string[];
  fenceTypeOther?: string;
  constructionType?: string;
  constructionTypeOther?: string;
  utilizationType?: string;
  utilizationTypeOther?: string;
  // LandAndBuilding-only collections
  surfaces?: ProjectModelSurface[];
  depreciationDetails?: ProjectModelDepreciationDetail[];
}

// ─── ProjectUnit ──────────────────────────────────────────────────────────────

/**
 * Superset unit DTO for both Condo and LandAndBuilding.
 * Condo-side: floor, towerName, condoRegistrationNumber, roomNumber.
 * LB-side: plotNumber, houseNumber, numberOfFloors, landArea.
 */
export interface ProjectUnit {
  id: string;
  projectId: string;
  uploadBatchId: string;
  sequenceNumber: number;
  // Common
  modelType?: string;
  usableArea?: number;
  sellingPrice?: number;
  // Condo-only
  floor?: number;
  towerName?: string;
  condoRegistrationNumber?: string;
  roomNumber?: string;
  // LandAndBuilding-only
  plotNumber?: string;
  houseNumber?: string;
  numberOfFloors?: number;
  landArea?: number;
}

export interface ProjectUnitUpload {
  id: string;
  projectId: string;
  fileName: string;
  uploadedAt: string;
  isUsed: boolean;
  documentId?: string;
}

// ─── ProjectUnitPrice ─────────────────────────────────────────────────────────

/**
 * Superset unit-price DTO for both Condo and LandAndBuilding.
 * Condo-only flags: isPoolView, isSouth.
 * Condo-only calculated: priceIncrementPerFloor.
 * LB-only flags: isNearGarden.
 * LB-only calculated: landIncreaseDecreaseAmount.
 */
export interface ProjectUnitPrice {
  id?: string;
  projectUnitId: string;
  sequenceNumber: number;
  // Common unit fields (denormalized)
  modelType?: string;
  usableArea?: number;
  sellingPrice?: number;
  // Condo-only unit fields
  floor?: number;
  towerName?: string;
  condoRegistrationNumber?: string;
  roomNumber?: string;
  // LB-only unit fields
  plotNumber?: string;
  houseNumber?: string;
  numberOfFloors?: number;
  landArea?: number;
  // Common location flags
  isCorner: boolean;
  isEdge: boolean;
  isOther: boolean;
  // Condo-only flags
  isPoolView: boolean;
  isSouth: boolean;
  // LB-only flags
  isNearGarden: boolean;
  // Calculated values (common)
  adjustPriceLocation?: number;
  standardPrice?: number;
  totalAppraisalValue?: number;
  totalAppraisalValueRounded?: number;
  forceSellingPrice?: number;
  coverageAmount?: number;
  // Condo-only calculated
  priceIncrementPerFloor?: number;
  // LB-only calculated
  landIncreaseDecreaseAmount?: number;
}

/** Request shape for saving location flags on unit prices. */
export interface ProjectUnitPriceFlagData {
  projectUnitId: string;
  isCorner: boolean;
  isEdge: boolean;
  isOther: boolean;
  /** Condo-only — defaults to false for LandAndBuilding */
  isPoolView: boolean;
  /** Condo-only — defaults to false for LandAndBuilding */
  isSouth: boolean;
  /** LandAndBuilding-only — defaults to false for Condo */
  isNearGarden: boolean;
}

// ─── ProjectPricingAssumption ─────────────────────────────────────────────────

/** Per-model pricing assumption. StandardLandPrice is LandAndBuilding-only. */
export interface ProjectModelAssumption {
  projectModelId: string;
  modelType?: string;
  modelDescription?: string;
  usableAreaFrom?: number;
  usableAreaTo?: number;
  pricingAnalysisId?: string;
  pricingAnalysisStatus?: string;
  finalAppraisedValue?: number;
  /** LandAndBuilding-only */
  standardLandPrice?: number;
  coverageAmount?: number;
  fireInsuranceCondition?: string;
}

/**
 * Unified pricing assumption for both Condo and LandAndBuilding.
 * Condo-only: poolViewAdjustment, southAdjustment, floorIncrementEveryXFloor, floorIncrementAmount.
 * LB-only: nearGardenAdjustment, landIncreaseDecreaseRate.
 */
export interface ProjectPricingAssumption {
  id: string;
  projectId: string;
  projectType: string;
  locationMethod?: string;
  // Common adjustments
  cornerAdjustment?: number;
  edgeAdjustment?: number;
  otherAdjustment?: number;
  forceSalePercentage?: number;
  // Condo-only
  poolViewAdjustment?: number;
  southAdjustment?: number;
  floorIncrementEveryXFloor?: number;
  floorIncrementAmount?: number;
  // LandAndBuilding-only
  nearGardenAdjustment?: number;
  landIncreaseDecreaseRate?: number;
  // Per-model assumptions
  modelAssumptions: ProjectModelAssumption[];
}

// ─── ProjectLand (LandAndBuilding only) ──────────────────────────────────────

export interface ProjectLandTitle {
  id?: string;
  titleNumber: string;
  titleType: string;
  bookNumber?: string;
  pageNumber?: string;
  landParcelNumber?: string;
  surveyNumber?: string;
  mapSheetNumber?: string;
  rawang?: string;
  aerialMapName?: string;
  aerialMapNumber?: string;
  rai?: number;
  ngan?: number;
  squareWa?: number;
  boundaryMarkerType?: string;
  boundaryMarkerRemark?: string;
  documentValidationResultType?: string;
  isMissingFromSurvey?: boolean;
  governmentPricePerSqWa?: number;
  governmentPrice?: number;
  remark?: string;
}

/**
 * LandAndBuilding-only aggregate — project land details.
 * Mirrors GetProjectLandResult from the backend (FK is now projectId not appraisalId).
 */
export interface ProjectLand {
  id: string;
  projectId: string;
  propertyName?: string;
  landDescription?: string;
  latitude?: number;
  longitude?: number;
  subDistrict?: string;
  district?: string;
  province?: string;
  landOffice?: string;
  ownerName?: string;
  isOwnerVerified?: boolean;
  hasObligation?: boolean;
  obligationDetails?: string;
  isLandLocationVerified?: boolean;
  landCheckMethodType?: string;
  landCheckMethodTypeOther?: string;
  street?: string;
  soi?: string;
  distanceFromMainRoad?: number;
  village?: string;
  addressLocation?: string;
  landShapeType?: string;
  urbanPlanningType?: string;
  landZoneType?: string[];
  landZoneTypeOther?: string;
  plotLocationType?: string[];
  plotLocationTypeOther?: string;
  landFillType?: string;
  landFillTypeOther?: string;
  landFillPercent?: number;
  soilLevel?: number;
  accessRoadWidth?: number;
  rightOfWay?: number;
  roadFrontage?: number;
  numberOfSidesFacingRoad?: number;
  roadPassInFrontOfLand?: string;
  landAccessibilityType?: string;
  landAccessibilityRemark?: string;
  roadSurfaceType?: string;
  roadSurfaceTypeOther?: string;
  hasElectricity?: boolean;
  electricityDistance?: number;
  publicUtilityType?: string[];
  publicUtilityTypeOther?: string;
  landUseType?: string[];
  landUseTypeOther?: string;
  landEntranceExitType?: string[];
  landEntranceExitTypeOther?: string;
  transportationAccessType?: string[];
  transportationAccessTypeOther?: string;
  propertyAnticipationType?: string;
  propertyAnticipationTypeOther?: string;
  isExpropriated?: boolean;
  expropriationRemark?: string;
  isInExpropriationLine?: boolean;
  expropriationLineRemark?: string;
  royalDecree?: string;
  isEncroached?: boolean;
  encroachmentRemark?: string;
  encroachmentArea?: number;
  isLandlocked?: boolean;
  landlockedRemark?: string;
  isForestBoundary?: boolean;
  forestBoundaryRemark?: string;
  otherLegalLimitations?: string;
  evictionType?: string[];
  evictionTypeOther?: string;
  allocationType?: string;
  northAdjacentArea?: string;
  northBoundaryLength?: number;
  southAdjacentArea?: string;
  southBoundaryLength?: number;
  eastAdjacentArea?: string;
  eastBoundaryLength?: number;
  westAdjacentArea?: string;
  westBoundaryLength?: number;
  pondArea?: number;
  pondDepth?: number;
  hasBuilding?: boolean;
  hasBuildingOther?: string;
  remark?: string;
  totalLandAreaInSqWa: number;
  titles: ProjectLandTitle[];
}

// ─── Unit Listing Summary ─────────────────────────────────────────────────────

export interface UnitListingSummary {
  towers: string[];
  models: string[];
  totalUnits: number;
}
