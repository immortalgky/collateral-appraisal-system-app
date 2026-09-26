export interface WQSCalculation {
  marketId: string;
  offeringPrice?: number;
  offeringPriceMeasurementUnit?: string;
  offeringPriceAdjustmentPct?: number;
  offeringPriceAdjustmentAmt?: number;
  sellingPrice?: number;
  sellingPriceMeasurementUnit?: string;
  // sellingDate: Date;
  sellingPriceAdjustmentYear?: number;
  totalAdjustedSellingPrice?: number;
  numberOfYears?: number | null;
  adjustedValue?: number;
}

/** select surveys section */
export interface ComparativeFactor {
  id?: string;
  // ComparativeFactorTable adds a row as { factorId: '', factorCode: null } until a factor is picked.
  factorId?: string | null;
  factorCode?: string | null;
  collateralValue?: string | number | null;
}

export interface ComparativeSurveys {
  linkId?: string | null;
  marketId: string;
  displaySeq: number;
}

/** WQS scoring section */
export interface WQSSurveyScore {
  id?: string;
  marketId: string;
  surveyScore: number | null; // null when the user clears the cell
  weightedSurveyScore: number;
}

export interface WQSScore {
  factorId?: string;
  factorCode?: string | null; // null on a row just added, until a factor is picked
  weight?: number;
  intensity?: number;
  weightedIntensity: number;
  surveys: WQSSurveyScore[];
  collateral: number;
  collateralWeightedScore: number;
  collateralScoreId?: string | null;
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
  finalValueAdjusted?: number;
  coefficientOfDecision: number;
  standardError: number;
  intersectionPoint: number;
  slope: number;
  lowestEstimate: number;
  highestEstimate: number;
  hasBuildingValue?: boolean;
  includeLandArea?: boolean;
  landArea?: number;
  usableArea?: number;
  // stored fields (backend persists these)
  landValue?: number; // user-edited land price
  buildingValue?: number; // user-edited building value
  appraisalPrice?: number; // user-edited final total (hasBuildingCost only)
}

export interface WQS {
  methodId: string; // remove if select template is mandatory
  collateralType?: string; // remove if select template is mandatory
  // undefined until initialize/restore finds the template, '' when generated without one, null after
  // the collateral type changes.
  pricingTemplateCode?: string | null;
  comparativeSurveys: ComparativeSurveys[];
  comparativeFactors: ComparativeFactor[];
  WQSScores: WQSScore[];
  WQSTotalScores: WQSTotalScore;
  WQSCalculations: WQSCalculation[];
  WQSFinalValue: WQSFinalValue;

  generateAt: string;
  /**
   * Written by the panel on Generate only to mark the form as having unsaved changes. Not generateAt:
   * the initializer has just put that in the defaults, and the same millisecond would leave it clean.
   */
  generatedAt?: string;
}
