export type GrowthRateType = 'Frequency' | 'Period';

export interface ProfitRentGrowthPeriod {
  id?: string;
  fromYear: number;
  toYear: number;
  growthRatePercent: number;
}

export interface ProfitRentCalculationDetail {
  year: number;
  numberOfMonths: number;
  marketRentalFeePerSqWa: number;
  marketRentalFeeGrowthPercent: number;
  marketRentalFeePerMonth: number;
  marketRentalFeePerYear: number;
  contractRentalFeePerYear: number;
  returnsFromLease: number;
  pvFactor: number;
  presentValue: number;
}

export interface ProfitRentAnalysis {
  id: string;
  pricingMethodId: string;
  marketRentalFeePerSqWa: number;
  growthRateType: GrowthRateType;
  growthRatePercent: number;
  growthIntervalYears: number;
  discountRate: number;
  includeBuildingCost: boolean;
  totalMarketRentalFee: number;
  totalContractRentalFee: number;
  totalReturnsFromLease: number;
  totalPresentValue: number;
  finalValueRounded: number;
  estimatePriceRounded: number | null;
  totalBuildingCost: number | null;
  appraisalPriceWithBuilding: number | null;
  appraisalPriceWithBuildingRounded: number | null;
  growthPeriods: ProfitRentGrowthPeriod[];
  calculationDetails: ProfitRentCalculationDetail[];
}

export interface GetProfitRentAnalysisResponse {
  analysis: ProfitRentAnalysis | null;
  remark: string | null;
}

export interface SaveProfitRentAnalysisRequest {
  marketRentalFeePerSqWa: number;
  growthRateType: GrowthRateType;
  growthRatePercent: number;
  growthIntervalYears: number;
  discountRate: number;
  includeBuildingCost: boolean;
  growthPeriods?: Omit<ProfitRentGrowthPeriod, 'id'>[];
  remark?: string | null;
  estimatePriceRounded?: number | null;
  appraisalPriceWithBuildingRounded?: number | null;
}

export interface SaveProfitRentAnalysisResponse {
  pricingAnalysisId: string;
  methodId: string;
  totalMarketRentalFee: number;
  totalContractRentalFee: number;
  totalReturnsFromLease: number;
  totalPresentValue: number;
  finalValueRounded: number;
  totalBuildingCost: number | null;
  appraisalPriceWithBuilding: number | null;
  appraisalPriceWithBuildingRounded: number | null;
}
