export const saleGridFieldPath = {
  /** comparative factor section */
  comparativeFactors: (arg: { row: number }) => `comparativeFactors.${arg.row}.factorCode`,

  /** qualitative section */
  qualitativeFactorCode: (arg: { row: number }) =>
    `saleAdjustmentGridQualitatives.${arg.row}.factorCode`,
  qualitativeLevel: (arg: { row: number; column: number }) =>
    `saleAdjustmentGridQualitatives.${arg.row}.qualitatives.${arg.column}.qualitativeLevel` as const,
  qualitativeMarketId: (arg: { row: number; column: number }) =>
    `saleAdjustmentGridQualitatives.${arg.row}.qualitatives.${arg.column}.marketId` as const,

  /** calculation section */
  calculationOfferingPrice: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.offeringPrice`,
  calculationOfferingPriceAdjustmentPct: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.offeringPriceAdjustmentPct`,
  calculationOfferingPriceAdjustmentAmt: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.offeringPriceAdjustmentAmt`,
  calculationNumberOfYears: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.numberOfYears`,
  calculationAdjustmentYear: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.sellingPriceAdjustmentYear`,
  calculationAdjustedValue: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.adjustedValue`,

  /** second revision */
  calculationLandAreaDiff: (arg: { column: number }) =>
    `saleAdjustmentGridCalculations.${arg.column}.landAreaOfDeficient`,
  calculationLandPrice: () => 'landPrice',
  // land price
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
    `saleAdjustmentGridAdjustmentFactors.${arg.row}.factorCode` as const,
  adjustmentFactorAdjustAmount: (arg: { row: number; column: number }) =>
    `saleAdjustmentGridAdjustmentFactors.${arg.row}.surveys.${arg.column}.adjustAmount`,
  adjustmentFactorAdjustPercent: (arg: { row: number; column: number }) =>
    `saleAdjustmentGridAdjustmentFactors.${arg.row}.surveys.${arg.column}.adjustPercent`,

  /** Final value section */
  finalValue: () => 'saleAdjustmentGridFinalValue.finalValue',
  finalValueRounded: () => 'saleAdjustmentGridFinalValue.finalValueRounded',
};
