import type { UseFormReset } from 'react-hook-form';
import type {
  SaleAdjustmentGridCalculationFormType,
  SaleAdjustmentGridType,
} from '../../../schemas/saleAdjustmentGridForm';
import type {
  FactorDataType,
  MarketComparableDetailType,
  TemplateCalculationFactorType,
  TemplateComparativeFactorType,
  TemplateDetailType,
} from '../../../schemas/v1';
import { readFactorValue } from '../../../domain/readFactorValue';

interface SetSaleAdjustmentGridInitialValueProps {
  collateralType: string;
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  template?: TemplateDetailType;
  comparativeSurveys: MarketComparableDetailType[];
  reset: UseFormReset<SaleAdjustmentGridType>;
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
        collateralType: undefined,
        pricingTemplateCode: undefined,
        comparativeSurveys: [
          ...(comparativeSurveys ?? []).map((survey: MarketComparableDetailType, columnIndex) => ({
            marketId: survey.id,
            displaySeq: columnIndex + 1,
          })),
        ],
        comparativeFactors: [],

        saleAdjustmentGridQualitatives: [],

        saleAdjustmentGridCalculations: [
          ...((comparativeSurveys ?? []).map((survey: MarketComparableDetailType) => {
            const surveyMap = new Map(
              (survey?.factorData ?? []).map((factor: FactorDataType) => [
                survey.id,
                readFactorValue({
                  dataType: factor.dataType,
                  fieldDecimal: factor.fieldDecimal,
                  value: factor.value,
                }),
              ]),
            );
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
              adjustedValue: 0,

              // adjusted value
              factorDiffPct: 0,
              factorDiffAmt: 0,
              totalAdjustValue: 0,

              // adjust weight
              weight: 0,
              weightedAdjustValue: 0,
            };
          }) as SaleAdjustmentGridCalculationFormType[]),
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
      collateralType: collateralType,
      pricingTemplateCode: template.templateCode,
      comparativeSurveys: [
        ...(comparativeSurveys ?? []).map((survey: MarketComparableDetailType, columnIndex) => ({
          marketId: survey.id,
          displaySeq: columnIndex + 1,
        })),
      ],
      comparativeFactors: (template.comparativeFactors ?? []).map(
        (compFact: TemplateComparativeFactorType) => ({
          factorCode: compFact.factorCode,
        }),
      ),

      saleAdjustmentGridQualitatives: (template.calculationFactors ?? []).map(
        (calcFact: TemplateCalculationFactorType) => ({
          factorCode: calcFact.factorCode,
          qualitatives: (comparativeSurveys ?? []).map(() => ({
            qualitativeLevel: 'E',
          })),
        }),
      ),

      saleAdjustmentGridCalculations: [
        ...(comparativeSurveys ?? []).map((survey: MarketComparableDetailType) => {
          const surveyMap = new Map(
            (survey.factorData ?? []).map(s => [
              s.id,
              readFactorValue({
                dataType: s.dataType,
                fieldDecimal: s.fieldDecimal,
                value: s.value,
              }),
            ]),
          );
          return {
            marketId: survey.id,
            offeringPrice: surveyMap.get('17') ?? 0,
            offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
            offeringPriceAdjustmentPct: surveyMap.get('18') ?? 5,
            offeringPriceAdjustmentAmt: surveyMap.get('19') ?? 0,
            sellingPrice: surveyMap.get('21') ?? 0,
            sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
            sellingDate: surveyMap.get('22') ?? '',
            sellingPriceAdjustmentYear: surveyMap.get('23') ?? 3,
            numberOfYears: 10, // TODO: convert selling date to number of year
            adjustedValue: 0,

            // adjusted value
            factorDiffPct: 0,
            factorDiffAmt: 0,
            totalAdjustValue: 0,

            // adjust weight
            weight: 0,
            weightedAdjustValue: 0,
          };
        }),
      ] as SaleAdjustmentGridCalculationFormType[],
      saleAdjustmentGridAdjustmentFactors: [],
      saleAdjustmentGridFinalValue: {
        finalValue: 0,
        finalValueRounded: 0,
      },
    },
    { keepDirty: false, keepDirtyValues: false, keepTouched: false },
  );
}
