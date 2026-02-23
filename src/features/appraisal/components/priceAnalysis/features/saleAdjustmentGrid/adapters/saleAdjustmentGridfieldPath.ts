export const saleGridFieldPath = {
  /** comparative survey section */
  comparativeSurveys: () => `comparativeSurveys`,

  /** comparative factor section */
  comparativeFactors: () => `comparativeFactors`,
  comparativeFactorsFactorCode: (arg: { row: number }) =>
    `comparativeFactors.${arg.row}.factorCode`,

  /** qualitative section */
  qualitatives: () => `saleAdjustmentGridQualitatives`,
  qualitativeFactorCode: (arg: { row: number }) =>
    `saleAdjustmentGridQualitatives.${arg.row}.factorCode`,
  qualitativeLevel: (arg: { row: number; column: number }) =>
    `saleAdjustmentGridQualitatives.${arg.row}.qualitatives.${arg.column}.qualitativeLevel` as const,
  qualitativeMarketId: (arg: { row: number; column: number }) =>
    `saleAdjustmentGridQualitatives.${arg.row}.qualitatives.${arg.column}.marketId` as const,

  /** calculation section */
  calculations: () => `saleAdjustmentGridCalculations`,
  calculation: (arg: { column: number }) => `saleAdjustmentGridCalculations.${arg.column}`,
  calculationOfferingPrice: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.offeringPrice`,
  calculationOfferingPriceAdjustmentPct: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.offeringPriceAdjustmentPct`,
  calculationOfferingPriceAdjustmentAmt: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.offeringPriceAdjustmentAmt`,
  calculationSellingPrice: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.sellingPrice`,
  calculationNumberOfYears: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.numberOfYears`,
  calculationAdjustmentYear: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.sellingPriceAdjustmentYear`,
  calculationTotalAdjustedSellingPrice: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.totalAdjustedSellingPrice`,
  calculationAdjustedValue: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.adjustedValue`,

  /** second revision */
  calculationLandAreaDiff: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.landAreaOfDeficient`,
  // land price
  calculationLandPrice: () => 'landPrice',
  calculationLandValueIncreaseDecrease: (
    arg: { column: number }, // TODO: change to proper name
  ) => `saleAdjustmentGridCalculations.${arg.column}.landValueIncreaseDecrease`,
  calculationUsableAreaDiff: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.usableAreaOfDeficient`,
  // building area price
  calculationUsableAreaPrice: () => 'usableAreaPrice',
  calculationBuildingValueIncreaseDecrease: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.buildingValueIncreaseDecrease`,
  calculationTotalSecondRevision: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.totalSecondRevision`,

  calculationSumFactorPct: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.factorDiffPct`,
  calculationSumFactorAmt: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.factorDiffAmt`,

  calculationTotalAdjustValue: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.totalAdjustValue`,

  calculationWeight: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.weight`,
  calculationWeightAdjustValue: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.weightedAdjustValue`,

  /** adjust factors section */
  adjustmentFactors: () => 'saleAdjustmentGridAdjustmentFactors',
  adjustmentFactorMarketId: (arg: { row: number; column: number }) =>
    `saleAdjustmentGridAdjustmentFactors.${arg.row}.surveys.${arg.column}.marketId`,
  adjustmentFactorsFactorCode: (arg: { row: number }) =>
    `saleAdjustmentGridAdjustmentFactors.${arg.row}.factorCode`,
  adjustmentFactorAdjustAmount: (arg: { row: number; column: number }) =>
    `saleAdjustmentGridAdjustmentFactors.${arg.row}.surveys.${arg.column}.adjustAmount`,
  adjustmentFactorAdjustPercent: (arg: { row: number; column: number }) =>
    `saleAdjustmentGridAdjustmentFactors.${arg.row}.surveys.${arg.column}.adjustPercent`,
  adjustmentFactorsRemark: (arg: { row: number }) =>
    `saleAdjustmentGridAdjustmentFactors.${arg.row}.remark`,

  /** Final value section */
  finalValue: () => 'saleAdjustmentGridFinalValue.finalValue',
  finalValueRounded: () => 'saleAdjustmentGridFinalValue.finalValueRounded',

  /** Appraisal price */
  appraisalPrice: () => 'saleAdjustmentGridAppraisalPrice.appraisalPrice',
  appraisalPriceRounded: () => 'saleAdjustmentGridAppraisalPrice.appraisalPriceRounded',
};
