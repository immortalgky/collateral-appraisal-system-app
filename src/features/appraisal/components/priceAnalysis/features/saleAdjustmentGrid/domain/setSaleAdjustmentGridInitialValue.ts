import type { WQSTemplate } from '@features/appraisal/components/priceAnalysis/data/data.ts';
import type { UseFormReset } from 'react-hook-form';
import type { WQSRequestType } from '@features/appraisal/components/priceAnalysis/features/wqs/schemas/wqsForm.ts';

interface SetSaleAdjustmentGridInitialValueProps {
  collateralType: string;
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  template?: WQSTemplate;
  comparativeSurveys: Record<string, unknown>[];
  reset: UseFormReset<WQSRequestType>;
}
export function setSaleAdjustmentGridInitialValue({
  collateralType,
  methodId,
  methodType,
  property,
  template,
  comparativeSurveys,
  reset,
}: SetSaleAdjustmentGridInitialValueProps) {
  if (!collateralType || !methodId || !methodType || !property || !comparativeSurveys || !reset)
    return;

  if (!template) {
    reset(
      {
        methodId: 'SALEADJXXX', // method Id which generate when enable in methods selection screen
        collateralType: collateralTypeId,
        pricingTemplateCode: pricingTemplateCode,
        comparativeSurveys: [
          ...comparativeSurveys.map((survey, columnIndex) => ({
            marketId: survey.id,
            displaySeq: columnIndex + 1,
          })),
        ],
        comparativeFactors: [],

        saleAdjustmentGridQualitatives: [],

        saleAdjustmentGridCalculations: [
          ...comparativeSurveys.map(survey => {
            const surveyMap = new Map(survey.factors.map(s => [s.id, s.value]));
            return {
              marketId: survey.id,
              offeringPrice: surveyMap.get('17') ?? 0,
              offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
              offeringPriceAdjustmentPct: surveyMap.get('18') ?? 5,
              offeringPriceAdjustmentAmt: surveyMap.get('19') ?? null,
              sellingPrice: surveyMap.get('21') ?? 0,
              sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
              sellingDate: surveyMap.get('22') ?? '',
              sellingPriceAdjustmentYear: surveyMap.get('23') ?? 3,
              numberOfYears: 10, // TODO: convert selling date to number of year
            };
          }),
        ],
        saleAdjustmentGridAdjustmentFactors: [],
        saleAdjustmentGridFinalValue: {
          finalValue: 0,
          finalValueRounded: 0,
        },
      },
      { keepDirty: false, keepDirtyValues: false, keepTouched: false },
    );
    return;
  }

  reset(
    {
      methodId: 'SALEADJXXX', // method Id which generate when enable in methods selection screen
      collateralType: collateralTypeId,
      pricingTemplateCode: pricingTemplateCode,
      comparativeSurveys: [
        ...comparativeSurveys.map((survey, columnIndex) => ({
          marketId: survey.id,
          displaySeq: columnIndex + 1,
        })),
      ],
      comparativeFactors: template.comparativeFactors.map(compFact => ({
        factorCode: compFact.factorId,
      })),

      saleAdjustmentGridQualitatives: template.qualitativeFactors.map(q => ({
        factorCode: q.factorId,
        qualitatives: comparativeSurveys.map(s => ({ qualitativeLevel: 'E' })),
      })),

      saleAdjustmentGridCalculations: [
        ...comparativeSurveys.map(survey => {
          const surveyMap = new Map(survey.factors.map(s => [s.id, s.value]));
          return {
            marketId: survey.id,
            offeringPrice: surveyMap.get('17') ?? 0,
            offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
            offeringPriceAdjustmentPct: surveyMap.get('18') ?? 5,
            offeringPriceAdjustmentAmt: surveyMap.get('19') ?? null,
            sellingPrice: surveyMap.get('21') ?? 0,
            sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
            sellingDate: surveyMap.get('22') ?? '',
            sellingPriceAdjustmentYear: surveyMap.get('23') ?? 3,
            numberOfYears: 10, // TODO: convert selling date to number of year
          };
        }),
      ],
      saleAdjustmentGridAdjustmentFactors: [],
      saleAdjustmentGridFinalValue: {
        finalValue: 0,
        finalValueRounded: 0,
      },
    },
    { keepDirty: false, keepDirtyValues: false, keepTouched: false },
  );
}
