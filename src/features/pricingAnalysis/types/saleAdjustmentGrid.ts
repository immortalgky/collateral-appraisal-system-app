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

export interface SaleAdjustmentGridQualitativeSurvey {
  marketId: string;
  qualitativeLevel: string;
}
export interface SaleAdjustmentGridQualitative {
  factorId: string;
  factorCode: string;
  qualitatives: SaleAdjustmentGridQualitativeSurvey[];
}

export interface SaleAdjustmentGridCalculation {
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

  // adjust weight
  weight: number;
  weightedAdjustValue: number;
}

export interface SaleAdjustmentGridFinalValue {
  finalValue: number;
  finalValueRounded: number;
}

export interface SaleAdjustmentGridAdjustmentPct {
  marketId: string;
  adjustPercent: number;
  adjustAmount: number;
}

export interface SaleAdjustmentGridAdjustmentFactor {
  factorId: string;
  factorCode: string;
  surveys: SaleAdjustmentGridAdjustmentPct[];
  remark?: string | null;
}

export interface SaleAdjustmentGridAppraisalPrice {
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

export interface SaleAdjustmentGrid {
  methodId: string;
  collateralType?: string;
  // undefined until initialize/restore finds the template; null after the collateral type changes.
  pricingTemplateCode?: string | null;
  comparativeSurveys: ComparativeSurveys[];
  comparativeFactors: ComparativeFactors[];
  /** Qualitative section */
  saleAdjustmentGridQualitatives: SaleAdjustmentGridQualitative[];
  /** Calculation section */
  saleAdjustmentGridCalculations: SaleAdjustmentGridCalculation[];
  /** Adjustment Factors (adjust percentage) section */
  saleAdjustmentGridAdjustmentFactors: SaleAdjustmentGridAdjustmentFactor[];
  /** Final value section */
  saleAdjustmentGridFinalValue: SaleAdjustmentGridFinalValue;
  /** Apprisal price section */
  saleAdjustmentGridAppraisalPrice: SaleAdjustmentGridAppraisalPrice;
  /**
   * Written by the panel on Generate only to mark the form as having unsaved changes. A key the
   * defaults never hold, so the write always differs from them.
   */
  generatedAt?: string;
}
