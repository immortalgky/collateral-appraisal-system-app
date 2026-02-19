import type { WQSFormType } from '../features/wqs/schemas/wqsForm';
import type { ComparativeFactorInputType, SaveComparativeAnalysisRequestType } from '../schemas/v1';

interface mapWQSFormToSubmitSchemaProps {
  WQSForm: WQSFormType;
}
export function mapWQSFormToSubmitSchema({
  WQSForm,
}: mapWQSFormToSubmitSchemaProps): SaveComparativeAnalysisRequestType {
  return {
    comparativeFactors: [
      ...WQSForm.comparativeFactors.map((compFact, index: number) => ({
        factorId: compFact.factorCode,
        displaySequence: index,
        isSelectedForScoring: !!WQSForm.WQSScores.find(
          record => record.factorCode === compFact.factorCode,
        ),
      })),
    ],
    factorScores: [
      ...WQSForm.WQSScores.map((score, index) => {
        return score.surveys?.map(survey => {
          return {
            factorId: score.factorCode,
            marketComparableId: survey.marketId,
            factorWeight: score.weight,
            displaySequence: index,
            score: survey.surveyScore,
          };
        });
      }),
    ],
    calculations: [
      ...WQSForm.WQSCalculations.map((calc, index) => {
        return {
          marketComparableId: calc.marketId,
          offeringPrice: calc.offeringPrice,
          offeringPriceUnit: calc.offeringPriceMeasurementUnit,
          adjustOfferPricePct: calc.offeringPriceAdjustmentPct,
          sellingPrice: calc.sellingPrice,
          buySellYear: 5,
          buySellMonth: 5,
          adjustedPeriodPct: calc.sellingPriceAdjustmentYear,
          cumulativeAdjPeriod: calc.totalAdjustedSellingPrice,
          totalAdjustedValue: calc.adjustedValue,
        };
      }),
    ],
  };
}
