export const wqsFieldPath = {
  /** comparative factor section */
  comparativeFactors: () => `comparativeFactors`,
  comparativeFactorsFactorCode: (arg: { row: number }) =>
    `comparativeFactors.${arg.row}.factorCode`,

  /** WQS scoring section */
  scoringFactors: () => `WQSScores`,
  scoringFactor: (arg: { column: number }) => `WQSScores.${arg.column}`,
  scoringFactorCode: (arg: { row: number }) => `WQSScores.${arg.row}.factorCode`,

  scoringFactorWeight: (arg: { row: number }) => `WQSScores.${arg.row}.weight`,
  scoringFactorIntensity: (arg: { row: number }) => `WQSScores.${arg.row}.intensity`,
  scoringFactorWeightedIntensity: (arg: { row: number }) =>
    `WQSScores.${arg.row}.weightedIntensity`,
  scoringFactorCollateralScore: (arg: { row: number }) => `WQSScores.${arg.row}.collateral`,
  scoringFactorCollateralWeightedScore: (arg: { row: number }) =>
    `WQSScores.${arg.row}.collateralWeightedScore`,

  scoringFactorSurveys: (arg: { row: number }) => `WQSScores.${arg.row}.surveys`,
  scoringFactorSurveySurveyScore: (arg: { row: number; column: number }) =>
    `WQSScores.${arg.row}.surveys.${arg.column}.surveyScore`,
  scoringFactorSurveyWeightedSurveyScore: (arg: { row: number; column: number }) =>
    `WQSScores.${arg.row}.surveys.${arg.column}.weightedSurveyScore`,
  scoringFactorSurveyMarketId: (arg: { row: number; column: number }) =>
    `WQSScores.${arg.row}.surveys.${arg.column}.marketId`,

  /** total score */
  totalWeight: () => `WQSTotalScores.totalWeight`,
  totalIntensity: () => `WQSTotalScores.totalIntensity`,
  totalWeightedIntensity: () => `WQSTotalScores.totalWeightedIntensity`,
  totalMarketId: (arg: { column: number }) => `WQSTotalScore.surveys.${arg.column}.marketId`,
  totalSurveyScore: (arg: { column: number }) => `WQSTotalScores.surveys.${arg.column}.totalScore`,
  totalWeightedSurveyScore: (arg: { column: number }) =>
    `WQSTotalScores.surveys.${arg.column}.totalWeightedScore`,
  totalCollateralScore: () => `WQSTotalScores.totalCollateralScore`,
  totalWeightedCollateralScore: () => `WQSTotalScores.totalWeightedCollateralScore`,

  /** calculation section */
  calculations: () => `WQSCalculations`,
  calculation: (arg: { column: number }) => `WQSCalculations.${arg.column}`,
  calculationOfferingPrice: (arg: { column: number }) =>
    `WQSCalculations.${arg.column}.offeringPrice`,
  calculationOfferingPriceAdjustmentPct: (arg: { column: number }) =>
    `WQSCalculations.${arg.column}.offeringPriceAdjustmentPct`,
  calculationOfferingPriceAdjustmentAmt: (arg: { column: number }) =>
    `WQSCalculations.${arg.column}.offeringPriceAdjustmentAmt`,
  calculationSellingPrice: (arg: { column: number }) =>
    `WQSCalculations.${arg.column}.sellingPrice`,
  calculationNumberOfYears: (arg: { column: number }) =>
    `WQSCalculations.${arg.column}.numberOfYears`,
  calculationAdjustmentYear: (arg: { column: number }) =>
    `WQSCalculations.${arg.column}.sellingPriceAdjustmentYear`,
  calculationTotalAdjustedSellingPrice: (arg: { column: number }) =>
    `WQSCalculations.${arg.column}.totalAdjustedSellingPrice`,
  calculationAdjustedValue: (arg: { column: number }) =>
    `WQSCalculations.${arg.column}.adjustedValue`,

  /** final value section */
  finalValueFinalValue: () => `WQSFinalValue.finalValue`,
  finalValueFinalValueRounded: () => `WQSFinalValue.finalValueRounded`,
  finalValueCoefficientOfDecision: () => `WQSFinalValue.coefficientOfDecision`,
  finalValueStandardError: () => `WQSFinalValue.standardError`,
  finalValueIntersectionPoint: () => `WQSFinalValue.intersectionPoint`,
  finalValuSlope: () => `WQSFinalValue.slope`,
  finalValueLowestEstimate: () => `WQSFinalValue.lowestEstimate`,
  finalValueHighestEstimate: () => `WQSFinalValue.highestEstimate`,
  finalValueHasBuildingCost: () => `WQSFinalValue.hasBuildingCost`,
  finalValueIncludeLandArea: () => `WQSFinalValue.includeLandArea`,
  finalValueLandArea: () => `WQSFinalValue.landArea`,
  finalValueUsableArea: () => `WQSFinalValue.usableArea`,
  finalValueAppraisalPrice: () => `WQSFinalValue.appraisalPrice`,
  finalValueAppraisalPriceRounded: () => `WQSFinalValue.appraisalPriceRounded`,
};
