export interface ComparativeFactors {
  id?: string;
  factorId: string;
  factorCode: string;
}

export interface ComparativeSurveys {
  linkId?: string;
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
  numberOfYears?: number;
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
  remark?: string;
}

export interface SaleAdjustmentGridAppraisalPrice {
  includeLandArea?: boolean;
  landArea?: number;
  usableArea?: number;
  appraisalPrice: number;
  appraisalPriceRounded: number;
}

export interface SaleAdjustmentGrid {
  methodId: string;
  collateralType: string;
  pricingTemplateCode: string;
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
}
