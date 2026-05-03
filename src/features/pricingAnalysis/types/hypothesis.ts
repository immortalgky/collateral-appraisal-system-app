// DTOs aligned with the BE contracts extracted from:
//   Modules/Appraisal/Appraisal/Application/Features/PricingAnalysis/[Hypothesis]
//   Modules/Appraisal/Appraisal/Domain/Appraisals/Hypothesis

// ─── Enums ────────────────────────────────────────────────────────────────────

export type HypothesisVariant = 'LandBuilding' | 'Condominium';

export type HypothesisCostCategory =
  | 'CostOfBuilding'   // L&B only — requires modelName
  | 'ProjectDevCost'   // L&B only
  | 'ProjectCost'      // L&B only
  | 'GovernmentTax'    // L&B only
  | 'HardCost'         // Condo only
  | 'SoftCost'         // Condo only
  | 'CondoGovTax';     // Condo only

/**
 * Stable semantic key for a cost item row.
 * Mirrors CostItemKind enum from CostItems/CostItemKind.cs (integer values kept as comments).
 * Kind is immutable after creation on the server; FE must preserve it on round-trips.
 */
export type HypothesisCostItemKind =
  // L&B — ProjectDevCost (1..2)
  | 'PublicUtilityConstruction'   // 1
  | 'LandFilling'                 // 2
  // L&B — ProjectCost (10..14)
  | 'AllocationPermitFee'         // 10
  | 'LandTitleDeedDivisionFee'    // 11
  | 'ProfessionalFee'             // 12
  | 'AdminFee'                    // 13
  | 'SellingAdvertising'          // 14
  // L&B — GovernmentTax (20..21)
  | 'TransferFee'                 // 20
  | 'SpecificBusinessTax'         // 21
  // Condo — HardCost (30..32)
  | 'CondoBuildingConstruction'   // 30
  | 'Furniture'                   // 31
  | 'ExternalUtilities'           // 32
  // Condo — SoftCost (40..42)
  | 'CondoTitleDeedFee'           // 40
  | 'EIA'                         // 41
  | 'CondoRegistrationFee'        // 42
  // Ad-hoc / CostOfBuilding
  | 'Other'                       // 99
  | 'BuildingConstruction';       // 100

// ─── Generate ─────────────────────────────────────────────────────────────────

export interface GenerateHypothesisAnalysisRequest {
  variant: HypothesisVariant;
}

export interface GenerateHypothesisAnalysisResult {
  hypothesisAnalysisId: string;
  methodId: string;
  variant: HypothesisVariant;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadHypothesisUnitDetailsResult {
  uploadId: string;
  rowCount: number;
  isActive: boolean;
}

// ─── Cost Items ───────────────────────────────────────────────────────────────

export interface HypothesisCostItemInput {
  id?: string | null;
  category: HypothesisCostCategory;
  /** Stable semantic key. Required on INSERT (new rows). Ignored on UPDATE by server. */
  kind: HypothesisCostItemKind;
  description: string;
  displaySequence: number;
  amount: number;
  rateAmount?: number | null;
  quantity?: number | null;
  ratePercent?: number | null;
  modelName?: string | null;
  /** FSD field B01: Building area (Sq.M). CostOfBuilding only. */
  area?: number | null;
  /** FSD field B02: Price per square metre before depreciation. CostOfBuilding only. */
  pricePerSqM?: number | null;
  /** FSD field B04: Building age (years). CostOfBuilding only. Integer. */
  year?: number | null;
  /** FSD field B05: Annual depreciation rate (%). CostOfBuilding only. */
  annualDepreciationPercent?: number | null;
  /** FSD: row is part of the Building (true) or Non-Building/Building Area Detail (false). CostOfBuilding only. */
  isBuilding: boolean;
  /** Depreciation calc mode. 'Gross' uses B04×B05; 'Period' uses periods sum. CostOfBuilding only. */
  depreciationMethod: 'Gross' | 'Period';
  /** Server full-replaces this collection on save; no ids needed in the request. */
  depreciationPeriods: { atYear: number; toYear: number; depreciationPerYear: number }[];
}

// ─── Depreciation period ──────────────────────────────────────────────────────

export interface HypothesisDepreciationPeriodDto {
  id: string;
  sequence: number;
  atYear: number;
  toYear: number;
  depreciationPerYear: number;
}

export interface CostItemDto {
  id: string;
  category: HypothesisCostCategory;
  kind: HypothesisCostItemKind;
  description: string;
  displaySequence: number;
  amount: number;
  rateAmount?: number | null;
  quantity?: number | null;
  ratePercent?: number | null;
  categoryRatio?: number | null;
  modelName?: string | null;
  /** FSD field B01: Building area (Sq.M). Input (CostOfBuilding only). */
  area?: number | null;
  /** FSD field B02: Price per square metre before depreciation (Baht/Sq.M). Input. */
  pricePerSqM?: number | null;
  /** FSD field B03: Price before depreciation (Baht). Computed: area × pricePerSqM. */
  priceBeforeDepreciation?: number | null;
  /** FSD field B04: Building age (years). Input — integer. */
  year?: number | null;
  /** FSD field B05: Annual depreciation rate (%). Input. */
  annualDepreciationPercent?: number | null;
  /** FSD field B06: Total depreciation percentage (%). Computed. */
  totalDepreciationPercent?: number | null;
  /** FSD field B07: Depreciation amount (Baht). Computed: priceBeforeDepreciation × totalDepreciationPercent / 100. */
  depreciationAmount?: number | null;
  /** FSD field B08: Value after depreciation (Baht). Computed: priceBeforeDepreciation − depreciationAmount. */
  valueAfterDepreciation?: number | null;
  /** FSD: row is part of the Building (true) or Non-Building/Building Area Detail (false). */
  isBuilding: boolean;
  /** Depreciation calc mode. 'Gross' uses B04×B05; 'Period' uses periods sum. */
  depreciationMethod: 'Gross' | 'Period';
  /** Period rows. Empty unless depreciationMethod === 'Period' and the user added periods. */
  depreciationPeriods: HypothesisDepreciationPeriodDto[];
}

// ─── Summary Inputs (user-editable fields only — server computes the rest) ────

export interface LandBuildingSummaryInput {
  /** FSD field C01: Total land area (Sq.Wa). */
  totalArea?: number | null;
  /** FSD field C02: Selling area as N% of total area. */
  sellingAreaPercent?: number | null;
  /** FSD field C10: Public utility area as N% of total area. */
  publicUtilityAreaPercent?: number | null;
  /** FSD field C16: Estimated sales units per month. */
  estSalesPeriod?: number | null;
  /** FSD field C27: Public utility construction cost (Baht/SqWa). */
  publicUtilityRatePerSqWa?: number | null;
  /** FSD field C31: Land filling cost (Baht/SqWa). */
  landFillingRatePerSqWa?: number | null;
  /** FSD field C35: Contingency allowance (% of project dev costs). Default 3%. */
  contingencyPercent?: number | null;
  /** FSD field C40: Estimated construction units per month. */
  estConstructionPeriod?: number | null;
  /** FSD field C44: Allocation permit fee (Baht). */
  allocationPermitFee?: number | null;
  /** FSD field C46: Land title deed division fee per plot (Baht). */
  landTitleFeePerPlot?: number | null;
  /** FSD field C50: Professional service fees (Baht/Month). */
  professionalFeePerMonth?: number | null;
  /** FSD field C54: Project admin cost (Baht/Month). */
  adminCostPerMonth?: number | null;
  /** FSD field C58: Selling/Adv expenses (N% of revenue). */
  sellingAdvPercent?: number | null;
  /** FSD field C61: Contingency (% of project costs). Default 3%. */
  projectContingencyPercent?: number | null;
  /** FSD field C66: Transfer fee (N% of revenue). */
  transferFeePercent?: number | null;
  /** FSD field C69: Specific business tax (N% of revenue). */
  specificBizTaxPercent?: number | null;
  /** FSD field C74: Risk premium (N% of revenue). */
  riskPremiumPercent?: number | null;
  /** FSD field C78: Discount rate (%). 0 means no discounting. */
  discountRate?: number | null;
  remark?: string | null;
}

export interface CondominiumSummaryInput {
  /** FSD field E01: Area according to title deed (Sq.Wa). */
  areaTitleDeed?: number | null;
  /** FSD field E03: Floor Area Ratio (FAR). */
  far?: number | null;
  /** FSD field E05: Total building area (SqM). */
  totalBuildingArea?: number | null;
  /** FSD field E14: Estimated project sales duration (months). */
  estSalesDurationMonths?: number | null;
  /** FSD field E15: Condo building construction cost (Baht/SqM). */
  condoBuildingCostPerSqM?: number | null;
  /** FSD field E18: Set average room size (units) — overrides upload count. */
  setAvgRoomSizeUnits?: number | null;
  /** FSD field E20: Furniture/Kitchen/AC per unit (Baht/unit). */
  furniturePerUnit?: number | null;
  /** FSD field E23: External utilities (Baht). */
  externalUtilities?: number | null;
  /** FSD field E25: Contingency (% of building + dev costs). Default 3%. */
  hardCostContingencyPercent?: number | null;
  /** FSD field E28: Estimated project construction period (months). */
  estConstructionPeriodMonths?: number | null;
  /** FSD field E29: Professional service fees (Baht/Month). */
  professionalFeePerMonth?: number | null;
  /** FSD field E32: Project admin cost (Baht/Month). */
  adminCostPerMonth?: number | null;
  /** FSD field E35: Selling/Adv expenses (N% of project income). */
  sellingAdvPercent?: number | null;
  /** FSD field E37: Condo title deed issuance fee (Baht). */
  titleDeedFee?: number | null;
  /** FSD field E39: EIA report cost (Baht). */
  eiaCost?: number | null;
  /** FSD field E41: Condo registration permit fee (Baht). */
  condoRegistrationFee?: number | null;
  /** FSD field E43: Other expenses (N% of project cost expenses). */
  otherExpensesPercent?: number | null;
  /** FSD field E46: Transfer fee (N% of project income). Default 1%. */
  transferFeePercent?: number | null;
  /** FSD field E48: Specific business tax (N% of project income). */
  specificBizTaxPercent?: number | null;
  /** FSD field E51: Risk and expected profit (N% of project income). */
  riskProfitPercent?: number | null;
  /** FSD field E55: Discount rate (%). 0 = no discounting. */
  discountRate?: number | null;
  remark?: string | null;
}

// ─── Full Summary DTOs (server response — includes all computed fields) ────────

export interface LandBuildingSummaryDto {
  // Land area
  /** FSD field C01: Total land area (Sq.Wa). */
  totalArea?: number | null;
  /** FSD field C02: Selling area as N% of total area. */
  sellingAreaPercent?: number | null;
  /** FSD field C03: Selling area (Sq.Wa). Computed. */
  sellingArea?: number | null;
  /** FSD field C10: Public utility area as N% of total area. */
  publicUtilityAreaPercent?: number | null;
  /** FSD field C10A: Public utility area (Sq.Wa). Computed: C10 × C01. */
  publicUtilityArea?: number | null;
  // Revenue
  /** FSD field C15: Total project revenue (Baht). Computed. */
  totalRevenue?: number | null;
  // Sales period
  /** FSD field C16: Estimated sales units per month. */
  estSalesPeriod?: number | null;
  /** FSD field C17: Total units. Computed. */
  totalUnits?: number | null;
  /** FSD field C18: Estimated duration in months. Computed: C17 / C16. */
  estimatedDurationMonths?: number | null;
  // Project dev costs
  /** FSD field C27: Public utility construction cost (Baht/SqWa). */
  publicUtilityRatePerSqWa?: number | null;
  /** FSD field C28: Public utility area (SqWa). Computed: C01. */
  publicUtilityAreaForCost?: number | null;
  /** FSD field C29: Public utility cost (Baht). Computed: C27 × C28. */
  publicUtilityCost?: number | null;
  /** FSD field C30: Public utility cost ratio (%). Computed. */
  publicUtilityCostRatio?: number | null;
  /** FSD field C31: Land filling cost (Baht/SqWa). */
  landFillingRatePerSqWa?: number | null;
  /** FSD field C32: Land filling area (SqWa). Computed: C01. */
  landFillingArea?: number | null;
  /** FSD field C33: Land filling cost (Baht). Computed: C31 × C32. */
  landFillingCost?: number | null;
  /** FSD field C34: Land filling cost ratio (%). Computed. */
  landFillingCostRatio?: number | null;
  /** FSD field C35: Contingency allowance (% of project dev costs). Default 3%. */
  contingencyPercent?: number | null;
  /** FSD field C36: Contingency allowance (Baht). Computed. */
  contingencyAmount?: number | null;
  /** FSD field C37: Contingency ratio (%). Computed. */
  contingencyRatio?: number | null;
  /** FSD field C38: Total project dev cost (Baht). Computed. */
  totalProjectDevCost?: number | null;
  /** FSD field C39: Total dev cost ratio (%). Computed as 100%. */
  totalDevCostRatio?: number | null;
  // Construction period
  /** FSD field C40: Estimated construction units per month. */
  estConstructionPeriod?: number | null;
  /** FSD field C41: Total units (= C17). */
  totalUnitsForConstruction?: number | null;
  /** FSD field C42: Estimated duration (months). Computed: C41 / C40. */
  estimatedConstructionDurationMonths?: number | null;
  // Project costs
  /** FSD field C44: Allocation permit fee (Baht). */
  allocationPermitFee?: number | null;
  /** FSD field C45: Allocation permit fee ratio (%). Computed. */
  allocationPermitFeeRatio?: number | null;
  /** FSD field C46: Land title deed division fee per plot (Baht). */
  landTitleFeePerPlot?: number | null;
  /** FSD field C47: Total plots. */
  totalPlots?: number | null;
  /** FSD field C48: Land title deed division fee total (Baht). Computed. */
  landTitleFeeTotal?: number | null;
  /** FSD field C49: Land title deed fee ratio (%). Computed. */
  landTitleFeeRatio?: number | null;
  /** FSD field C50: Professional service fees (Baht/Month). */
  professionalFeePerMonth?: number | null;
  /** FSD field C51: Professional fee months. */
  professionalFeeMonths?: number | null;
  /** FSD field C52: Professional fee total (Baht). Computed. */
  professionalFeeTotal?: number | null;
  /** FSD field C53: Professional fee ratio (%). Computed. */
  professionalFeeRatio?: number | null;
  /** FSD field C54: Project admin cost (Baht/Month). */
  adminCostPerMonth?: number | null;
  /** FSD field C55: Admin cost months. */
  adminCostMonths?: number | null;
  /** FSD field C56: Admin cost total (Baht). Computed. */
  adminCostTotal?: number | null;
  /** FSD field C57: Admin cost ratio (%). Computed. */
  adminCostRatio?: number | null;
  /** FSD field C58: Selling/Adv expenses (N% of revenue). */
  sellingAdvPercent?: number | null;
  /** FSD field C59: Selling/Adv total (Baht). Computed. */
  sellingAdvTotal?: number | null;
  /** FSD field C60: Selling/Adv ratio (%). Computed. */
  sellingAdvRatio?: number | null;
  /** FSD field C61: Contingency (% of project costs). Default 3%. */
  projectContingencyPercent?: number | null;
  /** FSD field C62: Contingency (Baht). Computed. */
  projectContingencyAmount?: number | null;
  /** FSD field C63: Contingency ratio (%). Computed. */
  projectContingencyRatio?: number | null;
  /** FSD field C64: Total project cost (Baht). Computed. */
  totalProjectCost?: number | null;
  /** FSD field C65: Total project cost ratio (%). Computed: 100%. */
  totalProjectCostRatio?: number | null;
  // Government taxes
  /** FSD field C66: Transfer fee (N% of revenue). */
  transferFeePercent?: number | null;
  /** FSD field C67: Transfer fee (Baht). Computed. */
  transferFeeAmount?: number | null;
  /** FSD field C68: Transfer fee govt ratio (%). Computed. */
  transferFeeRatio?: number | null;
  /** FSD field C69: Specific business tax (N% of revenue). */
  specificBizTaxPercent?: number | null;
  /** FSD field C70: Specific business tax (Baht). Computed. */
  specificBizTaxAmount?: number | null;
  /** FSD field C71: Specific biz tax ratio (%). Computed. */
  specificBizTaxRatio?: number | null;
  /** FSD field C72: Total govt taxes (Baht). Computed. */
  totalGovTax?: number | null;
  /** FSD field C73: Total govt tax ratio (%). Computed: 100%. */
  totalGovTaxRatio?: number | null;
  // Risk premium
  /** FSD field C74: Risk premium (N% of revenue). */
  riskPremiumPercent?: number | null;
  /** FSD field C75: Risk premium (Baht). Computed. */
  riskPremiumAmount?: number | null;
  // Inclusion total
  /** FSD field C76: Total development costs incl all. Computed. */
  totalDevCostsAndExpenses?: number | null;
  // Final value
  /** FSD field C77: Current property value. Computed. */
  currentPropertyValue?: number | null;
  /** FSD field C78: Discount rate (%). 0 means no discounting. */
  discountRate?: number | null;
  /** FSD field C79: Discount rate factor. Computed: 1 / (1 + C78/100)^(C18/12). */
  discountRateFactor?: number | null;
  /** FSD field C80: Final property value (Baht). Computed: C77 × C79. */
  finalPropertyValue?: number | null;
  /** FSD field C81: Total asset value rounded to nearest 10,000. */
  totalAssetValueRounded?: number | null;
  /** FSD field C82: Total asset value per Sq.Wa, rounded to nearest 100. */
  totalAssetValuePerSqWa?: number | null;
  remark?: string | null;
}

export interface CondominiumSummaryDto {
  // Land area
  /** FSD field E01: Area according to title deed (Sq.Wa). */
  areaTitleDeed?: number | null;
  /** FSD field E02: Area in Square Meters. Computed: E01 × 4. */
  areaSqM?: number | null;
  /** FSD field E03: Floor Area Ratio (FAR). */
  far?: number | null;
  /** FSD field E04: Construction area per city plan (SqM). Computed. */
  constructionAreaCityPlan?: number | null;
  /** FSD field E05: Total building area (SqM). */
  totalBuildingArea?: number | null;
  /** FSD field E06: Common area % (100% - E08). Computed. */
  commonAreaPercent?: number | null;
  /** FSD field E07: Common area (SqM). Computed: E05 - E09. */
  commonArea?: number | null;
  /** FSD field E08: Indoor sales area % of total building area. Computed. */
  indoorSalesAreaPercent?: number | null;
  /** FSD field E09: Indoor sales area (SqM). From unit detail upload (D02 total). */
  indoorSalesArea?: number | null;
  // Revenue
  /** FSD field E10: Project sales area (SqM). = E09. */
  projectSalesArea?: number | null;
  /** FSD field E11: Average price per SqM. Computed: E12/E10. */
  averagePricePerSqM?: number | null;
  /** FSD field E12: Total project selling price (Baht). From unit detail upload. */
  totalProjectSellingPrice?: number | null;
  /** FSD field E13: Total project revenue (GDV) (Baht). = E12. */
  totalRevenue?: number | null;
  // Sales duration
  /** FSD field E14: Estimated project sales duration (months). */
  estSalesDurationMonths?: number | null;
  // Hard cost
  /** FSD field E15: Condo building construction cost (Baht/SqM). */
  condoBuildingCostPerSqM?: number | null;
  /** FSD field E16: Total building area (SqM). = E05. */
  buildingArea?: number | null;
  /** FSD field E17: Condo building construction cost (Baht). Computed. */
  condoBuildingCostTotal?: number | null;
  /** FSD field E18: Set average room size (units). = D03. */
  setAvgRoomSizeUnits?: number | null;
  /** FSD field E19: Average indoor sales area per unit (SqM). Computed. */
  avgIndoorSalesAreaPerUnit?: number | null;
  /** FSD field E20: Furniture/Kitchen/AC per unit (Baht/unit). */
  furniturePerUnit?: number | null;
  /** FSD field E21: Quantity of units. = D03. */
  furnitureQuantity?: number | null;
  /** FSD field E22: Furniture total (Baht). Computed. */
  furnitureTotal?: number | null;
  /** FSD field E23: External utilities (Baht). */
  externalUtilities?: number | null;
  /** FSD field E24: External utilities total (Baht). = E23. */
  externalUtilitiesTotal?: number | null;
  /** FSD field E25: Contingency (% of building + dev costs). Default 3%. */
  hardCostContingencyPercent?: number | null;
  /** FSD field E26: Contingency (Baht). Computed. */
  hardCostContingencyAmount?: number | null;
  /** FSD field E27: Total hard cost (Baht). Computed. */
  totalHardCost?: number | null;
  // Construction period
  /** FSD field E28: Estimated project construction period (months). */
  estConstructionPeriodMonths?: number | null;
  // Soft cost
  /** FSD field E29: Professional service fees (Baht/Month). */
  professionalFeePerMonth?: number | null;
  /** FSD field E30: Professional fee months. = E28. */
  professionalFeeMonths?: number | null;
  /** FSD field E31: Professional fee total (Baht). Computed. */
  professionalFeeTotal?: number | null;
  /** FSD field E32: Project admin cost (Baht/Month). */
  adminCostPerMonth?: number | null;
  /** FSD field E33: Admin cost months. = E14. */
  adminCostMonths?: number | null;
  /** FSD field E34: Admin cost total (Baht). Computed. */
  adminCostTotal?: number | null;
  /** FSD field E35: Selling/Adv expenses (N% of project income). */
  sellingAdvPercent?: number | null;
  /** FSD field E36: Selling/Adv total (Baht). Computed. */
  sellingAdvTotal?: number | null;
  /** FSD field E37: Condo title deed issuance fee (Baht). */
  titleDeedFee?: number | null;
  /** FSD field E38: Condo title deed fee total (Baht). = E37. */
  titleDeedFeeTotal?: number | null;
  /** FSD field E39: EIA report cost (Baht). */
  eiaCost?: number | null;
  /** FSD field E40: EIA report cost total (Baht). = E39. */
  eiaCostTotal?: number | null;
  /** FSD field E41: Condo registration permit fee (Baht). */
  condoRegistrationFee?: number | null;
  /** FSD field E42: Condo registration fee total (Baht). = E41. */
  condoRegistrationFeeTotal?: number | null;
  /** FSD field E43: Other expenses (N% of project cost expenses). */
  otherExpensesPercent?: number | null;
  /** FSD field E44: Other expenses total (Baht). Computed. */
  otherExpensesTotal?: number | null;
  /** FSD field E45: Total soft cost (Baht). Computed. */
  totalSoftCost?: number | null;
  // Government taxes
  /** FSD field E46: Transfer fee (N% of project income). Default 1%. */
  transferFeePercent?: number | null;
  /** FSD field E47: Transfer fee total (Baht). Computed. */
  transferFeeTotal?: number | null;
  /** FSD field E48: Specific business tax (N% of project income). */
  specificBizTaxPercent?: number | null;
  /** FSD field E49: Specific business tax total (Baht). Computed. */
  specificBizTaxTotal?: number | null;
  /** FSD field E50: Total govt taxes (Baht). Computed. */
  totalGovTax?: number | null;
  // Risk profit
  /** FSD field E51: Risk and expected profit (N% of project income). */
  riskProfitPercent?: number | null;
  /** FSD field E52: Risk and expected profit total (Baht). Computed. */
  riskProfitTotal?: number | null;
  // Total dev costs
  /** FSD field E53: Total dev costs (Baht). Computed. */
  totalDevCosts?: number | null;
  // Final value
  /** FSD field E54: Remaining value (Baht). Computed. */
  totalRemainingValue?: number | null;
  /** FSD field E55: Discount rate (%). 0 = no discounting. */
  discountRate?: number | null;
  /** FSD field E56: Discount rate factor. Computed. */
  discountRateFactor?: number | null;
  /** FSD field E57: Final remaining value (Baht). Computed: E54 × E56. */
  finalRemainingValue?: number | null;
  /** FSD field E58: Total asset value rounded to nearest 10,000. */
  totalAssetValueRounded?: number | null;
  /** FSD field E59: Total asset value per SqM, rounded to nearest 100. */
  totalAssetValuePerSqM?: number | null;
  remark?: string | null;
}

// ─── Unit Row DTOs ─────────────────────────────────────────────────────────────

export interface LandBuildingUnitRowDto {
  sequenceNumber: number;
  planNo?: string | null;
  houseNo?: string | null;
  modelName?: string | null;
  location?: string | null;
  floorNo?: number | null;
  landAreaSqWa?: number | null;
  usableAreaSqM?: number | null;
  sellingPrice?: number | null;
  remark1?: string | null;
  remark2?: string | null;
}

export interface CondominiumUnitRowDto {
  sequenceNumber: number;
  floorNo?: number | null;
  building?: string | null;
  aptNo?: string | null;
  apartment?: string | null;
  modelType?: string | null;
  usableAreaSqM?: number | null;
  sellingPrice?: number | null;
  remark1?: string | null;
  remark2?: string | null;
}

// ─── Upload History ────────────────────────────────────────────────────────────

export interface UploadHistoryDto {
  id: string;
  fileName: string;
  uploadedAt: string;
  isActive: boolean;
  rowCount: number;
}

// ─── Model Aggregate (L&B per-model snapshot from preview) ────────────────────

export interface LandBuildingModelAggregate {
  modelName: string;
  unitCount: number;
  avgLandAreaSqWa: number;
  totalLandAreaSqWa: number;
  totalSellingPrice: number;
  totalValueAfterDepreciation: number;
  totalValueAfterDepreciationAllUnits: number;
  devCostRatioPercent: number;
  /** FSD field B09: Total building area across all rows (Sq.M). */
  totalBuildingAreaSqM: number;
  /** FSD field B10: Sum of price-before-depreciation across all rows (Baht). */
  totalPriceBeforeDepreciation: number;
  /** FSD field B11: Sum of value-after-depreciation across all rows (Baht). */
  totalBuildingValueAfterDepreciation: number;
}

// ─── GET response ─────────────────────────────────────────────────────────────

export interface GetHypothesisAnalysisResult {
  hypothesisAnalysisId?: string | null;
  variant?: HypothesisVariant | null;
  landBuildingSummary?: LandBuildingSummaryDto | null;
  condominiumSummary?: CondominiumSummaryDto | null;
  uploads: UploadHistoryDto[];
  landBuildingRows: LandBuildingUnitRowDto[];
  condominiumRows: CondominiumUnitRowDto[];
  costItems: CostItemDto[];
  remark?: string | null;
  /**
   * FSD C01 — Total land area in Sq.Wa derived from the property group's land titles.
   * Null when the analysis is for a ProjectModel or the group has no titled land.
   */
  totalLandAreaFromTitles?: number | null;
}

// ─── Save request / response ───────────────────────────────────────────────────

export interface SaveHypothesisAnalysisRequest {
  landBuildingSummary?: LandBuildingSummaryInput | null;
  condominiumSummary?: CondominiumSummaryInput | null;
  costItems: HypothesisCostItemInput[];
  remark?: string | null;
}

export interface SaveHypothesisAnalysisResult {
  hypothesisAnalysisId: string;
  variant: HypothesisVariant;
  landBuildingSummary?: LandBuildingSummaryDto | null;
  condominiumSummary?: CondominiumSummaryDto | null;
  /** FSD C01 — system-derived from property group's land titles. Null for project-model analyses. */
  totalLandAreaFromTitles?: number | null;
}

// ─── Preview request / response ───────────────────────────────────────────────

export interface PreviewHypothesisAnalysisRequest {
  landBuildingSummary?: LandBuildingSummaryInput | null;
  condominiumSummary?: CondominiumSummaryInput | null;
  costItems: HypothesisCostItemInput[];
}

export interface PreviewHypothesisAnalysisResult {
  variant: HypothesisVariant;
  landBuildingSummary?: LandBuildingSummaryDto | null;
  models?: Record<string, LandBuildingModelAggregate> | null;
  condominiumSummary?: CondominiumSummaryDto | null;
  costItems?: CostItemDto[] | null;
  /** FSD C01 — system-derived from property group's land titles. Null for project-model analyses. */
  totalLandAreaFromTitles?: number | null;
}
