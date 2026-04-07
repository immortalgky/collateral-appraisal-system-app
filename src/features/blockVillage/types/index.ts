// ─── VillageProject ───────────────────────────────────────────────

export interface VillageProjectAddress {
  houseNumber?: string;
  moo?: string;
  soi?: string;
  road?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
}

export interface VillageProject {
  id?: string;
  appraisalId: string;
  projectName?: string;
  projectCode?: string;
  developer?: string;
  projectType?: string;
  projectStatus?: string;
  totalUnits?: number;
  openingYear?: number;
  completionYear?: number;
  saleRate?: number;
  occupancyRate?: number;
  latitude?: number;
  longitude?: number;
  address?: VillageProjectAddress;
  utilities?: string[];
  facilities?: string[];
  remark?: string;
}

// ─── VillageProjectLand ───────────────────────────────────────────

export interface VillageProjectLandTitle {
  id?: string;
  titleNumber?: string;
  titleType?: string;
  areaRai?: number;
  areaNgan?: number;
  areaWa?: number;
}

export interface VillageProjectLand {
  id?: string;
  appraisalId?: string;
  landType?: string;
  totalArea?: number;
  totalAreaRai?: number;
  totalAreaNgan?: number;
  totalAreaWa?: number;
  province?: string;
  district?: string;
  subDistrict?: string;
  titles?: VillageProjectLandTitle[];
}

// ─── VillageModel ─────────────────────────────────────────────────

export interface VillageModelAreaDetail {
  id?: string;
  areaDescription?: string;
  areaSize?: number;
}

export interface VillageModelSurface {
  id?: string;
  fromFloorNumber?: number;
  toFloorNumber?: number;
  floorType?: string;
  floorStructureType?: string;
  floorStructureTypeOther?: string;
  floorSurfaceType?: string;
  floorSurfaceTypeOther?: string;
}

export interface VillageModelDepreciationPeriod {
  id?: string;
  atYear?: number;
  toYear?: number;
  depreciationPerYear?: number;
  totalDepreciationPct?: number;
  priceDepreciation?: number;
}

export interface VillageModelDepreciationDetail {
  id?: string;
  areaDescription?: string;
  area?: number;
  year?: number;
  isBuilding?: boolean;
  pricePerSqMBeforeDepreciation?: number;
  priceBeforeDepreciation?: number;
  pricePerSqMAfterDepreciation?: number;
  priceAfterDepreciation?: number;
  depreciationMethod?: string;
  depreciationYearPct?: number;
  totalDepreciationPct?: number;
  priceDepreciation?: number;
  periods?: VillageModelDepreciationPeriod[];
}

export interface VillageModel {
  id: string;
  appraisalId: string;
  // Model info
  modelName?: string;
  modelDescription?: string;
  numberOfHouse?: number;
  startingPrice?: number;
  usableAreaMin?: number;
  usableAreaMax?: number;
  standardUsableArea?: number;
  landAreaRai?: number;
  landAreaNgan?: number;
  landAreaWa?: number;
  standardLandArea?: number;
  fireInsuranceCondition?: string;
  imageDocumentIds?: string[];
  remark?: string;
  // Building detail
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
  // Owned collections
  areaDetails?: VillageModelAreaDetail[];
  surfaces?: VillageModelSurface[];
  depreciationDetails?: VillageModelDepreciationDetail[];
}

// ─── VillageUnit ──────────────────────────────────────────────────

export interface VillageUnit {
  id: string;
  appraisalId: string;
  uploadBatchId: string;
  sequenceNumber: number;
  plotNumber?: string;
  houseNumber?: string;
  modelName?: string;
  numberOfFloors?: number;
  landArea?: number;
  usableArea?: number;
  sellingPrice?: number;
}

export interface VillageUnitUpload {
  id: string;
  appraisalId: string;
  fileName?: string;
  documentId?: string;
  unitCount: number;
  uploadedAt: string;
  isActive: boolean;
}

// ─── VillagePricingAssumption ─────────────────────────────────────

export interface VillageModelAssumption {
  villageModelId: string;
  modelType?: string;
  modelDescription?: string;
  usableAreaFrom?: number;
  usableAreaTo?: number;
  standardLandPrice?: number;
  standardPrice?: number;
  coverageAmount?: number;
  fireInsuranceCondition?: string;
}

export interface VillagePricingAssumption {
  id?: string;
  appraisalId?: string;
  locationMethod?: string;
  cornerAdjustment?: number;
  edgeAdjustment?: number;
  nearGardenAdjustment?: number;
  otherAdjustment?: number;
  landIncreaseDecreaseRate?: number;
  forceSalePercentage?: number;
  modelAssumptions?: VillageModelAssumption[];
}

// ─── VillageUnitPrice ─────────────────────────────────────────────

export interface VillageUnitPrice {
  id: string;
  villageUnitId: string;
  sequenceNumber?: number;
  plotNumber?: string;
  houseNumber?: string;
  modelName?: string;
  numberOfFloors?: number;
  landArea?: number;
  usableArea?: number;
  sellingPrice?: number;
  isCorner: boolean;
  isEdge: boolean;
  isNearGarden: boolean;
  isOther: boolean;
  landIncreaseDecreaseAmount?: number;
  adjustPriceLocation?: number;
  standardPrice?: number;
  totalAppraisalValue?: number;
  totalAppraisalValueRounded?: number;
  forceSellingPrice?: number;
  coverageAmount?: number;
}

export interface VillageUnitPriceFlag {
  villageUnitId: string;
  isCorner: boolean;
  isEdge: boolean;
  isNearGarden: boolean;
  isOther: boolean;
}
