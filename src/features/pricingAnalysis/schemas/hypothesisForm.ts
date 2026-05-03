import { z } from 'zod';

// ─── Cost item row schema (shared by both variants) ───────────────────────────

export const HypothesisCostCategoryEnum = z.enum([
  'CostOfBuilding',
  'ProjectDevCost',
  'ProjectCost',
  'GovernmentTax',
  'HardCost',
  'SoftCost',
  'CondoGovTax',
]);

/**
 * Mirrors CostItemKind enum from BE (CostItems/CostItemKind.cs).
 * Used to identify seeded rows for server-side calc; 'Other' is the default for ad-hoc rows.
 */
export const HypothesisCostItemKindEnum = z.enum([
  'PublicUtilityConstruction',
  'LandFilling',
  'AllocationPermitFee',
  'LandTitleDeedDivisionFee',
  'ProfessionalFee',
  'AdminFee',
  'SellingAdvertising',
  'TransferFee',
  'SpecificBusinessTax',
  'CondoBuildingConstruction',
  'Furniture',
  'ExternalUtilities',
  'CondoTitleDeedFee',
  'EIA',
  'CondoRegistrationFee',
  'Other',
  'BuildingConstruction',
]);

export type HypothesisCostItemKindValue = z.infer<typeof HypothesisCostItemKindEnum>;

// ─── Depreciation period sub-row ─────────────────────────────────────────────

export const HypothesisDepreciationPeriodSchema = z
  .object({
    atYear: z.number().int().min(0),
    toYear: z.number().int().min(0),
    depreciationPerYear: z.number().min(0).max(100),
  })
  .refine(p => p.toYear >= p.atYear, { message: 'toYear must be >= atYear', path: ['toYear'] });

export type HypothesisDepreciationPeriodFormRow = z.infer<typeof HypothesisDepreciationPeriodSchema>;

export const HypothesisCostItemSchema = z.object({
  /** Undefined for newly added rows (server assigns id on save) */
  id: z.string().uuid().optional().nullable(),
  category: HypothesisCostCategoryEnum,
  /**
   * Stable semantic key. Seeded rows get their kind from the server; ad-hoc rows must set 'Other' explicitly.
   * Server ignores kind on UPDATE (uses id match). Kind is required on INSERT.
   * Note: no `.default('Other')` here — Zod's input/output divergence with defaults breaks Resolver alignment with useForm. Factories set 'Other' explicitly.
   */
  kind: HypothesisCostItemKindEnum,
  description: z.string().min(1, 'Description is required'),
  displaySequence: z.number().int().nonnegative(),
  amount: z.number().nonnegative(),
  rateAmount: z.number().optional().nullable(),
  quantity: z.number().optional().nullable(),
  ratePercent: z.number().optional().nullable(),
  modelName: z.string().optional().nullable(),
  /** FSD field B01: Building area (Sq.M). CostOfBuilding only. Non-negative. */
  area: z.number().nonnegative().optional().nullable(),
  /** FSD field B02: Price per square metre before depreciation (Baht/Sq.M). CostOfBuilding only. Non-negative. */
  pricePerSqM: z.number().nonnegative().optional().nullable(),
  /** FSD field B04: Building age in years. CostOfBuilding only. Non-negative integer. */
  year: z.number().int().nonnegative().optional().nullable(),
  /** FSD field B05: Annual depreciation rate (%). CostOfBuilding only. 0–100. */
  annualDepreciationPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD fields B03/B06/B07/B08: Server-computed values returned from preview/save. Read-only on FE. */
  priceBeforeDepreciation: z.number().optional().nullable(),
  totalDepreciationPercent: z.number().optional().nullable(),
  depreciationAmount: z.number().optional().nullable(),
  valueAfterDepreciation: z.number().optional().nullable(),
  /** FSD: row is part of the Building (true) or Non-Building/Building Area Detail (false). CostOfBuilding only. */
  isBuilding: z.boolean(),
  /** Depreciation calc mode. 'Gross' uses B04×B05; 'Period' uses periods sum. CostOfBuilding only. */
  depreciationMethod: z.enum(['Gross', 'Period']),
  /** Period sub-rows. Empty array unless method is Period. */
  depreciationPeriods: z.array(HypothesisDepreciationPeriodSchema),
});

export type HypothesisCostItemFormRow = z.infer<typeof HypothesisCostItemSchema>;

// ─── Land & Building summary (user inputs only) ───────────────────────────────

export const LandBuildingSummaryFormSchema = z.object({
  /** FSD field C01: Total land area (Sq.Wa). */
  totalArea: z.number().nonnegative().optional().nullable(),
  /** FSD field C02: Selling area as N% of total area. */
  sellingAreaPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field C10: Public utility area as N% of total area. */
  publicUtilityAreaPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field C16: Estimated sales units per month. */
  estSalesPeriod: z.number().int().positive().optional().nullable(),
  /** FSD field C27: Public utility construction cost (Baht/SqWa). */
  publicUtilityRatePerSqWa: z.number().nonnegative().optional().nullable(),
  /** FSD field C31: Land filling cost (Baht/SqWa). */
  landFillingRatePerSqWa: z.number().nonnegative().optional().nullable(),
  /** FSD field C35: Contingency allowance (% of project dev costs). Default 3%. */
  contingencyPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field C40: Estimated construction units per month. */
  estConstructionPeriod: z.number().int().positive().optional().nullable(),
  /** FSD field C44: Allocation permit fee (Baht). */
  allocationPermitFee: z.number().nonnegative().optional().nullable(),
  /** FSD field C46: Land title deed division fee per plot (Baht). */
  landTitleFeePerPlot: z.number().nonnegative().optional().nullable(),
  /** FSD field C50: Professional service fees (Baht/Month). */
  professionalFeePerMonth: z.number().nonnegative().optional().nullable(),
  /** FSD field C54: Project admin cost (Baht/Month). */
  adminCostPerMonth: z.number().nonnegative().optional().nullable(),
  /** FSD field C58: Selling/Adv expenses (N% of revenue). */
  sellingAdvPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field C61: Contingency (% of project costs). Default 3%. */
  projectContingencyPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field C66: Transfer fee (N% of revenue). */
  transferFeePercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field C69: Specific business tax (N% of revenue). */
  specificBizTaxPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field C74: Risk premium (N% of revenue). */
  riskPremiumPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field C78: Discount rate (%). 0 means no discounting. */
  discountRate: z.number().min(0).max(100).optional().nullable(),
  remark: z.string().optional().nullable(),
});

export type LandBuildingSummaryFormValues = z.infer<typeof LandBuildingSummaryFormSchema>;

// ─── Land & Building full form ────────────────────────────────────────────────

export const LandBuildingFormSchema = z.object({
  summary: LandBuildingSummaryFormSchema,
  /** Cost items for CostOfBuilding category (per model) */
  costOfBuildingItems: z.array(HypothesisCostItemSchema),
  /** Other cost items: ProjectDevCost, ProjectCost, GovernmentTax */
  otherCostItems: z.array(HypothesisCostItemSchema),
  remark: z.string().optional().nullable(),
});

export type LandBuildingFormValues = z.infer<typeof LandBuildingFormSchema>;

export const landBuildingFormDefaults: LandBuildingFormValues = {
  summary: {
    totalArea: null,
    sellingAreaPercent: null,
    publicUtilityAreaPercent: null,
    estSalesPeriod: null,
    publicUtilityRatePerSqWa: null,
    landFillingRatePerSqWa: null,
    contingencyPercent: 3,
    estConstructionPeriod: null,
    allocationPermitFee: null,
    landTitleFeePerPlot: null,
    professionalFeePerMonth: null,
    adminCostPerMonth: null,
    // FSD soft defaults: selling/adv 3%, transfer 1%, business tax 3.30%, risk 30%.
    sellingAdvPercent: 3,
    projectContingencyPercent: 3,
    transferFeePercent: 1,
    specificBizTaxPercent: 3.3,
    riskPremiumPercent: 30,
    discountRate: null,
    remark: null,
  },
  costOfBuildingItems: [],
  otherCostItems: [],
  remark: null,
};

// ─── Condominium summary (user inputs only) ───────────────────────────────────

export const CondominiumSummaryFormSchema = z.object({
  /** FSD field E01: Area according to title deed (Sq.Wa). */
  areaTitleDeed: z.number().nonnegative().optional().nullable(),
  /** FSD field E03: Floor Area Ratio (FAR). */
  far: z.number().nonnegative().optional().nullable(),
  /** FSD field E05: Total building area (SqM). */
  totalBuildingArea: z.number().nonnegative().optional().nullable(),
  /** FSD field E14: Estimated project sales duration (months). */
  estSalesDurationMonths: z.number().int().positive().optional().nullable(),
  /** FSD field E15: Condo building construction cost (Baht/SqM). */
  condoBuildingCostPerSqM: z.number().nonnegative().optional().nullable(),
  /** FSD field E18: Set average room size (units) — overrides upload count when set. */
  setAvgRoomSizeUnits: z.number().int().nonnegative().optional().nullable(),
  /** FSD field E20: Furniture/Kitchen/AC per unit (Baht/unit). */
  furniturePerUnit: z.number().nonnegative().optional().nullable(),
  /** FSD field E23: External utilities (Baht). */
  externalUtilities: z.number().nonnegative().optional().nullable(),
  /** FSD field E25: Contingency (% of building + dev costs). Default 3%. */
  hardCostContingencyPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field E28: Estimated project construction period (months). */
  estConstructionPeriodMonths: z.number().int().positive().optional().nullable(),
  /** FSD field E29: Professional service fees (Baht/Month). */
  professionalFeePerMonth: z.number().nonnegative().optional().nullable(),
  /** FSD field E32: Project admin cost (Baht/Month). */
  adminCostPerMonth: z.number().nonnegative().optional().nullable(),
  /** FSD field E35: Selling/Adv expenses (N% of project income). */
  sellingAdvPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field E37: Condo title deed issuance fee (Baht). */
  titleDeedFee: z.number().nonnegative().optional().nullable(),
  /** FSD field E39: EIA report cost (Baht). */
  eiaCost: z.number().nonnegative().optional().nullable(),
  /** FSD field E41: Condo registration permit fee (Baht). */
  condoRegistrationFee: z.number().nonnegative().optional().nullable(),
  /** FSD field E43: Other expenses (N% of project cost expenses). */
  otherExpensesPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field E46: Transfer fee (N% of project income). Default 1%. */
  transferFeePercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field E48: Specific business tax (N% of project income). */
  specificBizTaxPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field E51: Risk and expected profit (N% of project income). */
  riskProfitPercent: z.number().min(0).max(100).optional().nullable(),
  /** FSD field E55: Discount rate (%). 0 = no discounting. */
  discountRate: z.number().min(0).max(100).optional().nullable(),
  remark: z.string().optional().nullable(),
});

export type CondominiumSummaryFormValues = z.infer<typeof CondominiumSummaryFormSchema>;

// ─── Condominium full form ─────────────────────────────────────────────────────

export const CondominiumFormSchema = z.object({
  summary: CondominiumSummaryFormSchema,
  remark: z.string().optional().nullable(),
});

export type CondominiumFormValues = z.infer<typeof CondominiumFormSchema>;

export const condominiumFormDefaults: CondominiumFormValues = {
  summary: {
    areaTitleDeed: null,
    far: null,
    totalBuildingArea: null,
    estSalesDurationMonths: null,
    condoBuildingCostPerSqM: null,
    setAvgRoomSizeUnits: null,
    furniturePerUnit: null,
    externalUtilities: null,
    hardCostContingencyPercent: 3,
    estConstructionPeriodMonths: null,
    professionalFeePerMonth: null,
    adminCostPerMonth: null,
    // FSD soft defaults: selling/adv 3%, other-exp 3%, transfer 1%, biz tax 3.30%, risk 30%.
    sellingAdvPercent: 3,
    titleDeedFee: null,
    eiaCost: null,
    condoRegistrationFee: null,
    otherExpensesPercent: 3,
    transferFeePercent: 1,
    specificBizTaxPercent: 3.3,
    riskProfitPercent: 30,
    discountRate: null,
    remark: null,
  },
  remark: null,
};
