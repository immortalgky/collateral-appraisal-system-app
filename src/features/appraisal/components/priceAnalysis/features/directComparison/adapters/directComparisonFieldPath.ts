export const directComparisonPath = {
  /** comparative surveys */
  comparativeSurveys: () => `comparativeSurveys`,

  /** comparative factor section */
  comparativeFactors: () => `comparativeFactors`,
  comparativeFactorsFactorCode: (arg: { row: number }) =>
    `comparativeFactors.${arg.row}.factorCode`,

  /** qualitative section */
  qualitatives: () => `directComparisonQualitatives`,
  qualitativeFactorCode: (arg: { row: number }) =>
    `directComparisonQualitatives.${arg.row}.factorCode`,
  qualitativeLevel: (arg: { row: number; column: number }) =>
    `directComparisonQualitatives.${arg.row}.qualitatives.${arg.column}.qualitativeLevel` as const,
  qualitativeMarketId: (arg: { row: number; column: number }) =>
    `directComparisonQualitatives.${arg.row}.qualitatives.${arg.column}.marketId` as const,

  /** calculation section */
  calculations: () => `directComparisonCalculations`,
  calculation: (arg: { column: number }) => `directComparisonCalculations.${arg.column}`,
  calculationOfferingPrice: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.offeringPrice`,
  calculationOfferingPriceAdjustmentPct: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.offeringPriceAdjustmentPct`,
  calculationOfferingPriceAdjustmentAmt: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.offeringPriceAdjustmentAmt`,
  calculationSellingPrice: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.sellingPrice`,
  calculationNumberOfYears: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.numberOfYears`,
  calculationAdjustmentYear: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.sellingPriceAdjustmentYear`,
  calculationTotalAdjustedSellingPrice: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.totalAdjustedSellingPrice`,
  calculationAdjustedValue: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.adjustedValue`,

  /** second revision */
  calculationLandAreaDiff: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.landAreaOfDeficient`,
  // land price
  calculationLandPrice: () => 'landPrice',
  calculationLandValueIncreaseDecrease: (
    arg: { column: number }, // TODO: change to proper name
  ) => `directComparisonCalculations.${arg.column}.landValueIncreaseDecrease`,
  calculationUsableAreaDiff: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.usableAreaOfDeficient`,
  // building area price
  calculationUsableAreaPrice: () => 'usableAreaPrice',
  calculationBuildingValueIncreaseDecrease: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.buildingValueIncreaseDecrease`,
  calculationTotalSecondRevision: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.totalSecondRevision`,

  calculationSumFactorPct: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.factorDiffPct`,
  calculationSumFactorAmt: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.factorDiffAmt`,
  calculationTotalAdjustValue: (arg: { column: number }) =>
    `directComparisonCalculations.${arg.column}.totalAdjustValue`,

  /** adjust factors section */
  adjustmentFactors: () => 'directComparisonAdjustmentFactors',
  adjustmentFactorMarketId: (arg: { row: number; column: number }) =>
    `directComparisonAdjustmentFactors.${arg.row}.surveys.${arg.column}.marketId`,
  adjustmentFactorsFactorCode: (arg: { row: number }) =>
    `directComparisonAdjustmentFactors.${arg.row}.factorCode` as const,
  adjustmentFactorAdjustAmount: (arg: { row: number; column: number }) =>
    `directComparisonAdjustmentFactors.${arg.row}.surveys.${arg.column}.adjustAmount`,
  adjustmentFactorAdjustPercent: (arg: { row: number; column: number }) =>
    `directComparisonAdjustmentFactors.${arg.row}.surveys.${arg.column}.adjustPercent`,
  adjustmentFactorsRemark: (arg: { row: number }) =>
    `directComparisonAdjustmentFactors.${arg.row}.remark` as const,

  /** Final value section */
  finalValue: () => 'directComparisonFinalValue.finalValue',
  finalValueRounded: () => 'directComparisonFinalValue.finalValueRounded',

  /** Appraisal price */
  appraisalPrice: () => 'directComparisonAppraisalPrice.appraisalPrice',
  appraisalPriceRounded: () => 'directComparisonAppraisalPrice.appraisalPriceRounded',
};
