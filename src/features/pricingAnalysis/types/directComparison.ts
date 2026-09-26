export interface ComparativeFactors {
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

export interface DirectComparisonQualitativeSurvey {
  marketId: string;
  qualitativeLevel: string;
}
export interface DirectComparisonQualitative {
  // Unset or empty on a row just added, until a factor is picked.
  factorId?: string | null;
  factorCode?: string | null;
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
  sellingDate?: string;
  sellingPriceAdjustmentYear?: number;
  numberOfYears?: number | null;
  adjustedValue: number;

  // 2nd revision
  landAreaOfDeficient?: number | null;
  landAreaOfDeficientMeasureUnit?: number;
  landPrice?: number | null;
  landPriceMeasureUnit?: number;
  landValueIncreaseDecrease?: number | null;
  usableAreaOfDeficient?: number | null;
  usableAreaOfDeficientMeasureUnit?: number;
  usableAreaPrice?: number | null;
  usableAreaPriceMeasureUnit?: number;
  buildingValueIncreaseDecrease?: number | null;
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
  // Unset or empty on a row just added, until a factor is picked.
  factorId?: string | null;
  factorCode?: string | null;
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
  collateralType?: string;
  // undefined until initialize/restore finds the template; null after the collateral type changes.
  pricingTemplateCode?: string | null;
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
  /**
   * Written by the panel on Generate only to mark the form as having unsaved changes. Generate
   * resets from the initializer first, which does not set it.
   */
  generatedAt?: string;
}
