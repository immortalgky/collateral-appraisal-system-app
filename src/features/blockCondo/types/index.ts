// ─── CondoProject ────────────────────────────────────────────────

export interface CondoProject {
  id: string;
  appraisalId: string;
  projectName?: string;
  projectDescription?: string;
  developer?: string;
  projectSaleLaunchDate?: string;
  landAreaRai?: number;
  landAreaNgan?: number;
  landAreaWa?: number;
  unitForSaleCount?: number;
  numberOfPhase?: number;
  landOffice?: string;
  projectType?: string;
  builtOnTitleDeedNumber?: string;
  latitude?: number;
  longitude?: number;
  subDistrict?: string;
  district?: string;
  province?: string;
  postcode?: string;
  locationNumber?: string;
  road?: string;
  soi?: string;
  utilities?: string[];
  utilitiesOther?: string;
  facilities?: string[];
  facilitiesOther?: string;
  remark?: string;
}

// ─── CondoModel ──────────────────────────────────────────────────

export interface CondoModelAreaDetail {
  id?: string;
  areaDescription?: string;
  areaSize?: number;
}

export interface CondoModel {
  id: string;
  appraisalId: string;
  modelName?: string;
  modelDescription?: string;
  buildingNumber?: string;
  startingPriceMin?: number;
  startingPriceMax?: number;
  hasMezzanine?: boolean;
  usableAreaMin?: number;
  usableAreaMax?: number;
  standardUsableArea?: number;
  fireInsuranceCondition?: string;
  roomLayoutType?: string;
  roomLayoutTypeOther?: string;
  groundFloorMaterialType?: string;
  groundFloorMaterialTypeOther?: string;
  upperFloorMaterialType?: string;
  upperFloorMaterialTypeOther?: string;
  bathroomFloorMaterialType?: string;
  bathroomFloorMaterialTypeOther?: string;
  imageDocumentIds?: string[];
  remark?: string;
  areaDetails?: CondoModelAreaDetail[];
}

// ─── CondoTower ──────────────────────────────────────────────────

export interface CondoTower {
  id: string;
  appraisalId: string;
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
  imageDocumentIds?: string[];
}

// ─── CondoUnit ───────────────────────────────────────────────────

export interface CondoUnit {
  id: string;
  sequenceNumber: number;
  floor?: number;
  towerName?: string;
  condoRegistrationNumber?: string;
  roomNumber?: string;
  modelType?: string;
  usableArea?: number;
  sellingPrice?: number;
}

// ─── CondoUnitUpload ─────────────────────────────────────────────

export interface CondoUnitUpload {
  id: string;
  fileName: string;
  uploadedAt: string;
  isUsed: boolean;
  documentId?: string;
}

// ─── CondoUnitPrice ──────────────────────────────────────────────

export interface CondoUnitPrice {
  id: string;
  condoUnitId: string;
  isCorner: boolean;
  isEdge: boolean;
  isPoolView: boolean;
  isSouth: boolean;
  isOther: boolean;
  adjustPriceLocation?: number;
  standardPrice?: number;
  priceIncrementPerFloor?: number;
  totalAppraisalValue?: number;
  totalAppraisalValueRounded?: number;
  forceSellingPrice?: number;
  coverageAmount?: number;
}

// ─── CondoModelAssumption ────────────────────────────────────────

export interface CondoModelAssumption {
  condoModelId: string;
  modelType?: string;
  modelDescription?: string;
  usableAreaFrom?: number;
  usableAreaTo?: number;
  standardPrice?: number;
  coverageAmount?: number;
  fireInsuranceCondition?: string;
}

// ─── CondoPricingAssumption ──────────────────────────────────────

export interface CondoPricingAssumption {
  id: string;
  appraisalId: string;
  locationMethod?: string;
  cornerAdjustment?: number;
  edgeAdjustment?: number;
  poolViewAdjustment?: number;
  southAdjustment?: number;
  otherAdjustment?: number;
  floorIncrementEveryXFloor?: number;
  floorIncrementAmount?: number;
  forceSalePercentage?: number;
  modelAssumptions?: CondoModelAssumption[];
}

// ─── Unit Listing Summary ────────────────────────────────────────

export interface UnitListingSummary {
  towers: string[];
  models: string[];
  totalUnits: number;
}
