// Mirror of Appraisal.Contracts.Appraisals.Dto.Income + Parameter.Contracts.PricingTemplates
// PascalCase → camelCase via System.Text.Json defaults

// ── Pricing Template DTOs ─────────────────────────────────────────────────────

export interface PricingTemplateSummaryDto {
  id: string;
  code: string;
  name: string;
  templateType: string;
  description: string | null;
  isActive: boolean;
  displaySeq: number;
}

export interface PricingTemplateAssumptionDto {
  id: string;
  assumptionType: string;
  assumptionName: string;
  identifier: string;
  displaySeq: number;
  methodTypeCode: string;
  methodDetailJson: string;
}

export interface PricingTemplateCategoryDto {
  id: string;
  categoryType: string;
  categoryName: string;
  identifier: string;
  displaySeq: number;
  assumptions: PricingTemplateAssumptionDto[];
}

export interface PricingTemplateSectionDto {
  id: string;
  sectionType: string;
  sectionName: string;
  identifier: string;
  displaySeq: number;
  categories: PricingTemplateCategoryDto[];
}

export interface PricingTemplateDto {
  id: string;
  code: string;
  name: string;
  templateType: string;
  description: string | null;
  totalNumberOfYears: number;
  totalNumberOfDayInYear: number;
  capitalizeRate: number;
  discountedRate: number;
  isActive: boolean;
  displaySeq: number;
  sections: PricingTemplateSectionDto[];
}

// ── Income Analysis DTOs ──────────────────────────────────────────────────────

export interface IncomeMethodDto {
  methodTypeCode: string;
  detail: unknown;
  totalMethodValues: number[];
}

export interface IncomeAssumptionDto {
  id: string;
  assumptionType: string;
  assumptionName: string;
  identifier: string;
  displaySeq: number;
  totalAssumptionValues: number[];
  method: IncomeMethodDto;
}

export interface IncomeCategoryDto {
  id: string;
  categoryType: string;
  categoryName: string;
  identifier: string;
  displaySeq: number;
  totalCategoryValues: number[];
  assumptions: IncomeAssumptionDto[];
}

export interface IncomeSectionDto {
  id: string;
  sectionType: string;
  sectionName: string;
  identifier: string;
  displaySeq: number;
  totalSectionValues: number[];
  categories: IncomeCategoryDto[];
}

export interface IncomeSummaryDto {
  contractRentalFee: number[];
  grossRevenue: number[];
  grossRevenueProportional: number[];
  terminalRevenue: number[];
  totalNet: number[];
  discount: number[];
  presentValue: number[];
}

export interface HighestBestUsedDto {
  areaRai: number | null;
  areaNgan: number | null;
  areaWa: number | null;
  pricePerSqWa: number | null;
}

export interface IncomeAnalysisDto {
  id: string;
  pricingAnalysisMethodId: string;
  templateCode: string;
  templateName: string;
  totalNumberOfYears: number;
  totalNumberOfDayInYear: number;
  capitalizeRate: number;
  discountedRate: number;
  finalValue: number | null;
  finalValueRounded: number | null;
  finalValueAdjust: number | null;
  isHighestBestUsed: boolean;
  highestBestUsed: HighestBestUsedDto;
  appraisalPriceRounded: number | null;
  sections: IncomeSectionDto[];
  summary: IncomeSummaryDto;
}

// ── Save Request DTOs ─────────────────────────────────────────────────────────

export interface IncomeAssumptionInput {
  assumptionType: string;
  assumptionName: string;
  identifier: string;
  displaySeq: number;
  methodTypeCode: string;
  detail: unknown;
  clientId?: string;
}

export interface IncomeCategoryInput {
  categoryType: string;
  categoryName: string;
  identifier: string;
  displaySeq: number;
  assumptions: IncomeAssumptionInput[];
  clientId?: string;
}

export interface IncomeSectionInput {
  sectionType: string;
  sectionName: string;
  identifier: string;
  displaySeq: number;
  categories: IncomeCategoryInput[];
  clientId?: string;
}

export interface HighestBestUsedInput {
  areaRai: number | null;
  areaNgan: number | null;
  areaWa: number | null;
  pricePerSqWa: number | null;
}

export interface SaveIncomeAnalysisRequest {
  appraisalId: string;
  propertyId: string;
  templateCode: string;
  templateName: string;
  totalNumberOfYears: number;
  totalNumberOfDayInYear: number;
  capitalizeRate: number;
  discountedRate: number;
  sections: IncomeSectionInput[];
  finalValueAdjust?: number | null;
  isHighestBestUsed?: boolean;
  highestBestUsed?: HighestBestUsedInput | null;
  appraisalPriceRounded?: number | null;
}
