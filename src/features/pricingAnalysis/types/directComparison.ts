export interface ComparativeFactors {
  id?: string;
  factorId: string;
  factorCode: string;
}

export interface ComparativeSurveys {
  linkId?: string | null;
  marketId: string;
  displaySeq: number;
}

export interface DirectComparisonQualitativeSurvey {
  marketId: string;
  qualitativeLevel: string;
}
export interface DirectComparisonQualitative {
  factorId: string;
  factorCode: string;
  qualitatives: DirectComparisonQualitativeSurvey[];
}

export interface DirectComparisonCalculation {
  marketId: string;
  offeringPrice?: number;
  offeringPriceMeasurementUnit?: string;
  offeringPriceAdjustmentPct?: number;
  offeringPriceAdjustmentAmt?: number;
  sellingPrice?: number;
  sellingPriceMeasurementUnit?: string;
  // sellingDate: z.date(), TODO
  sellingPriceAdjustmentYear?: number;
  numberOfYears?: number | null;
  adjustedValue: number;

  // 2nd revision
  landAreaOfDeficient?: number;
  landAreaOfDeficientMeasureUnit?: number;
  landPrice?: number;
  landPriceMeasureUnit?: number;
  landValueIncreaseDecrease?: number;
  usableAreaOfDeficient?: number;
  usableAreaOfDeficientMeasureUnit?: number;
  usableAreaPrice?: number;
  usableAreaPriceMeasureUnit?: number;
  buildingValueIncreaseDecrease?: number;
  totalSecondRevision?: number;

  // adjusted value
  factorDiffPct: number;
  factorDiffAmt: number;
  totalAdjustValue: number;
}

export interface DirectComparisonFinalValue {
  finalValue: number;
  finalValueRounded: number;
}

export interface DirectComparisonAdjustmentPct {
  marketId: string;
  adjustPercent: number;
  adjustAmount: number;
}

export interface DirectComparisonAdjustmentFactor {
  factorId: string;
  factorCode: string;
  surveys: DirectComparisonAdjustmentPct[];
  remark?: string | null;
}

export interface DirectComparisonAppraisalPrice {
  includeLandArea?: boolean;
  landArea?: number;
  usableArea?: number;
  appraisalPrice: number;
  appraisalPriceRounded: number;
  priceDifferentiate?: number;
  landValue?: number;
  hasBuildingValue?: boolean;
  totalBuildingCost?: number;
  appraisalPriceIncludeBuildingCost?: number;
  appraisalPriceIncludeBuildingCostRounded?: number;
  priceIncludeBuildingCostDifferentiate?: number;
}

export interface DirectComparison {
  methodId: string;
  collateralType: string;
  // null after the collateral type changes, until a template is picked again.
  pricingTemplateCode: string | null;
  comparativeSurveys: ComparativeSurveys[];
  comparativeFactors: ComparativeFactors[];
  /** Qualitative section */
  directComparisonQualitatives: DirectComparisonQualitative[];
  /** Calculation section */
  directComparisonCalculations: DirectComparisonCalculation[];
  /** Adjustment Factors (adjust percentage) section */
  directComparisonAdjustmentFactors: DirectComparisonAdjustmentFactor[];
  /** Final value section */
  directComparisonFinalValue: DirectComparisonFinalValue;
  /** Apprisal price section */
  directComparisonAppraisalPrice: DirectComparisonAppraisalPrice;
  /** Set when the analysis is generated, which marks the form as having unsaved changes. */
  generateAt?: string;
}
