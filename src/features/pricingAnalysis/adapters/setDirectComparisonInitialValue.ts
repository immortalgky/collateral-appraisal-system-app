import type { UseFormReset } from 'react-hook-form';
import type {
  FactorDataType,
  MarketComparableDetailType,
  TemplateCalculationFactorType,
  TemplateComparativeFactorType,
  TemplateDetailType,
} from '@features/pricingAnalysis/schemas';
import type {
  DirectComparisonCalculationFormType,
  DirectComparisonType,
} from '@features/pricingAnalysis/schemas/directComparisonForm';
import { readFactorValue } from '@features/pricingAnalysis/domain/readFactorValue.ts';
import { convertLandTitlesToLandArea } from '../domain/convertLandTitlesToLandArea';

interface SetDirectComparisonInitialValueProps {
  collateralType: string;
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  template?: TemplateDetailType;
  comparativeSurveys: MarketComparableDetailType[];
  reset: UseFormReset<DirectComparisonType>;
}
export function setDirectComparisonInitialValue({
  collateralType,
  methodId,
  methodType,
  property,
  template,
  comparativeSurveys,
  reset,
}: SetDirectComparisonInitialValueProps) {
  if (!collateralType || !methodId || !methodType || !property || !comparativeSurveys || !reset)
    return;

  if (!template) {
    reset(
      {
        methodId: methodId,
        collateralType: undefined,
        pricingTemplateCode: undefined,
        comparativeSurveys: [
          ...comparativeSurveys.map((survey, columnIndex) => ({
            marketId: survey.id,
            displaySeq: columnIndex + 1,
          })),
        ],
        comparativeFactors: [],

        directComparisonQualitatives: [],

        directComparisonCalculations: [
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
              offeringPrice: surveyMap.get('25') ?? 0,
              offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
              offeringPriceAdjustmentPct: surveyMap.get('18') ?? 5,
              offeringPriceAdjustmentAmt: surveyMap.get('19') ?? null,
              sellingPrice: surveyMap.get('47') ?? 0,
              sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
              // sellingDate: surveyMap.get('22') ?? '',
              sellingPriceAdjustmentYear: surveyMap.get('23') ?? 3,
              numberOfYears: 10, // TODO: convert selling date to number of year
              adjustedValue: 0,

              // adjusted value
              factorDiffPct: 0,
              factorDiffAmt: 0,
              totalAdjustValue: 0,
            };
          }) as DirectComparisonCalculationFormType[]),
        ],
        directComparisonAdjustmentFactors: [],
        directComparisonFinalValue: {
          finalValue: 0,
          finalValueRounded: 0,
        },
        directComparisonAppraisalPrice: {
          landArea: property.titles
            ? convertLandTitlesToLandArea({ titles: property.titles })
            : undefined,
          usableArea: property.usableArea ?? undefined,
          appraisalPrice: 0,
          appraisalPriceRounded: 0,
        },
      },
      { keepDirty: false, keepDirtyValues: false, keepTouched: false },
    );
    return;
  }

  reset(
    {
      methodId: methodId, // method Id which generate when enable in methods selection screen
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
          factorId: compFact.id,
          factorCode: compFact.factorCode,
        }),
      ),

      directComparisonQualitatives: (template.calculationFactors ?? []).map(
        (calcFact: TemplateCalculationFactorType) => ({
          factorId: calcFact.id,
          factorCode: calcFact.factorCode,
          qualitatives: (comparativeSurveys ?? []).map(() => ({
            qualitativeLevel: 'E',
          })),
        }),
      ),

      directComparisonCalculations: [
        ...(comparativeSurveys ?? []).map(survey => {
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
            offeringPrice: surveyMap.get('25') ?? 0,
            offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
            offeringPriceAdjustmentPct: surveyMap.get('18') ?? 5,
            offeringPriceAdjustmentAmt: surveyMap.get('19') ?? null,
            sellingPrice: surveyMap.get('47') ?? 0,
            sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
            sellingDate: surveyMap.get('22') ?? '',
            sellingPriceAdjustmentYear: surveyMap.get('23') ?? 3,
            numberOfYears: 10, // TODO: convert selling date to number of year

            adjustedValue: 0,

            // adjusted value
            factorDiffPct: 0,
            factorDiffAmt: 0,
            totalAdjustValue: 0,
          };
        }),
      ] as DirectComparisonCalculationFormType[],
      directComparisonAdjustmentFactors: (template.calculationFactors ?? []).map(
        (calcFact: TemplateCalculationFactorType) => {
          return {
            factorId: calcFact.id,
            factorCode: calcFact.factorCode,
            surveys: [],
          };
        },
      ),
      directComparisonFinalValue: {
        finalValue: 0,
        finalValueRounded: 0,
      },
      directComparisonAppraisalPrice: {
        landArea: property.titles
          ? convertLandTitlesToLandArea({ titles: property.titles })
          : undefined,
        usableArea: property.usableArea ?? undefined,
        appraisalPrice: 0,
        appraisalPriceRounded: 0,
      },
    },
    { keepDirty: false, keepDirtyValues: false, keepTouched: false },
  );
}
