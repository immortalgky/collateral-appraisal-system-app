export type LandGrowthRateType = 'Frequency' | 'Period';

export interface LandGrowthPeriod {
  id?: string;
  fromYear: number;
  toYear: number;
  growthRatePercent: number;
}

export interface LeaseholdAnalysis {
  id: string;
  pricingMethodId: string;
  landValuePerSqWa: number;
  landGrowthRateType: LandGrowthRateType;
  landGrowthRatePercent: number;
  landGrowthIntervalYears: number;
  constructionCostIndex: number;
  initialBuildingValue: number;
  depreciationRate: number;
  depreciationIntervalYears: number;
  buildingCalcStartYear: number;
  discountRate: number;
  totalIncomeOverLeaseTerm: number;
  valueAtLeaseExpiry: number;
  finalValue: number;
  finalValueRounded: number;
  isPartialUsage: boolean;
  partialRai: number | null;
  partialNgan: number | null;
  partialWa: number | null;
  partialLandArea: number | null;
  pricePerSqWa: number | null;
  partialLandPrice: number | null;
  estimateNetPrice: number | null;
  estimatePriceRounded: number | null;
  landGrowthPeriods: LandGrowthPeriod[];
  calculationDetails: LeaseholdCalculationDetail[];
}

export interface LeaseholdCalculationDetail {
  year: number;
  landValue: number;
  landGrowthPercent: number;
  buildingValue: number;
  depreciationAmount: number;
  depreciationPercent: number;
  buildingAfterDepreciation: number;
  totalLandAndBuilding: number;
  rentalIncome: number;
  pvFactor: number;
  netCurrentRentalIncome: number;
}

export interface GetLeaseholdAnalysisResponse {
  analysis: LeaseholdAnalysis | null;
  remark: string | null;
}

export interface SaveLeaseholdAnalysisRequest {
  landValuePerSqWa: number;
  landGrowthRateType: LandGrowthRateType;
  landGrowthRatePercent: number;
  landGrowthIntervalYears: number;
  constructionCostIndex: number;
  initialBuildingValue: number;
  depreciationRate: number;
  depreciationIntervalYears: number;
  buildingCalcStartYear: number;
  discountRate: number;
  landGrowthPeriods: Omit<LandGrowthPeriod, 'id'>[];
  isPartialUsage: boolean;
  partialRai: number | null;
  partialNgan: number | null;
  partialWa: number | null;
  pricePerSqWa: number | null;
  estimatePriceRounded?: number | null;
  remark?: string | null;
}

export interface SaveLeaseholdAnalysisResponse {
  pricingAnalysisId: string;
  methodId: string;
  totalIncomeOverLeaseTerm: number;
  valueAtLeaseExpiry: number;
  finalValue: number;
  finalValueRounded: number;
}
