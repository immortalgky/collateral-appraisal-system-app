import type { WQSFormType } from '../schemas/wqsForm';
import type { FactorScoreType, SaveComparativeAnalysisRequestType } from '../schemas/v1';

interface mapWQSFormToSubmitSchemaProps {
  WQSForm: WQSFormType;
}
export function mapWQSFormToSubmitSchema({
  WQSForm,
}: mapWQSFormToSubmitSchemaProps): SaveComparativeAnalysisRequestType {
  return {
    comparativeFactors: [
      ...WQSForm.comparativeFactors.map((compFact, index: number) => ({
        factorId: `7B9F433E-F36B-1410-8382-00F1875B700${index}`, // compFact.factorCode
        displaySequence: index,
        isSelectedForScoring: !!WQSForm.WQSScores.find(
          record => record.factorCode === compFact.factorCode,
        ),
      })),
    ],
    factorScores: [
      ...(WQSForm.WQSScores.map((score, index) => {
        return [
          ...(score.surveys ?? []).map(survey => {
            return {
              factorId: `7B9F433E-F36B-1410-8382-00F1875B700${index}`, // score.factorCode
              factorName: 'xxxxx',
              marketComparableId: survey.marketId,
              factorWeight: score.weight,
              displaySequence: index,
              score: survey.surveyScore,
            };
          }),
          {
            factorId: `7B9F433E-F36B-1410-8382-00F1875B700${index}`,
            factorName: 'xxxxx',
            factorWeight: score.weight,
            displaySequence: index,
            score: score.collateral,
          },
        ];
      }).flat(1) as FactorScoreType[]),
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
