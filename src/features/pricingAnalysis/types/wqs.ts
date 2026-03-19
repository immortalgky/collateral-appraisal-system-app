export interface WQSCalculation {
  marketId?: string;
  offeringPrice?: number;
  offeringPriceMeasurementUnit?: string;
  offeringPriceAdjustmentPct?: number;
  offeringPriceAdjustmentAmt?: number;
  sellingPrice?: number;
  sellingPriceMeasurementUnit?: string;
  // sellingDate: Date;
  sellingPriceAdjustmentYear?: number;
  totalAdjustedSellingPrice?: number;
  numberOfYears?: number;
  adjustedValue?: number;
}

/** select surveys section */
export interface ComparativeFactor {
  id?: string;
  factorId?: string;
  factorCode?: string;
}

export interface ComparativeSurveys {
  linkId?: string;
  marketId: string;
  displaySeq: number;
}

/** WQS scoring section */
export interface WQSSurveyScore {
  id?: string;
  marketId?: string;
  surveyScore: number;
  weightedSurveyScore: number;
}

export interface WQSScore {
  factorId: string;
  factorCode: string;
  weight: number;
  intensity: number;
  weightedIntensity: number;
  surveys: WQSSurveyScore[];
  collateral: number;
  collateralWeightedScore: number;
  collateralScoreId?: string;
}

export interface TotalSurveyScore {
  marketId: string;
  totalScore: number;
  totalWeightedScore: number;
}

export interface WQSTotalScore {
  totalWeight: number;
  totalIntensity: number;
  totalWeightedIntensity: number;
  surveys: TotalSurveyScore[];
  totalCollateralScore: number;
  totalWeightedCollateralScore: number;
}

/** Adjust final price section */
export interface WQSFinalValue {
  finalValue: number;
  finalValueRounded: number;
  coefficientOfDecision: number;
  standardError: number;
  intersectionPoint: number;
  slope: number;
  lowestEstimate: number;
  highestEstimate: number;
  hasBuildingCost: boolean;
  includeLandArea: boolean;
  landArea?: number;
  usableArea?: number;
  appraisalPrice: number;
  appraisalPriceRounded: number;
}

export interface WQS {
  methodId: string; // remove if select template is mandatory
  collateralType: string; // remove if select template is mandatory
  pricingTemplateCode: string;
  comparativeSurveys: ComparativeSurveys[];
  comparativeFactors: ComparativeFactor[];
  WQSScores: WQSScore[];
  WQSTotalScores: WQSTotalScore;
  WQSCalculations: WQSCalculation[];
  WQSFinalValue: WQSFinalValue;

  generateAt: string;
}
