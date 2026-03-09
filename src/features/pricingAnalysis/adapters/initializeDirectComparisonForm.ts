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
import { readFactorValue, toNum, yearDiffFromToday } from '@features/pricingAnalysis/domain/readFactorValue.ts';
import { convertLandTitlesToLandArea } from '../domain/convertLandTitlesToLandArea';

interface SetDirectComparisonInitialValueProps {
  collateralType: string;
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  template?: TemplateDetailType;
  comparativeSurveys: MarketComparableDetailType[];
  allFactors?: FactorDataType[];
  reset: UseFormReset<DirectComparisonType>;
}
export function initializeDirectComparisonForm({
  collateralType,
  methodId,
  methodType,
  property,
  template,
  comparativeSurveys,
  allFactors,
  reset,
}: SetDirectComparisonInitialValueProps) {
  if (!collateralType || !methodId || !methodType || !property || !comparativeSurveys || !reset)
    return;

  const factorIdMap = new Map<string, string>();
  for (const f of allFactors ?? []) {
    const fid = f.factorId ?? f.id;
    if (f.factorCode && fid) factorIdMap.set(f.factorCode, fid);
  }

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
                factor.factorCode,
                readFactorValue({
                  dataType: factor.dataType,
                  fieldDecimal: factor.fieldDecimal,
                  value: factor.value,
                }),
              ]),
            );
            return {
              marketId: survey.id,
              offeringPrice: survey.offerPrice ?? 0,
              offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
              offeringPriceAdjustmentPct: survey.offerPriceAdjustmentPercent ?? 0,
              offeringPriceAdjustmentAmt: survey.offerPriceAdjustmentAmount ?? 0,
              sellingPrice: survey.salePrice ?? 0,
              sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
              sellingDate: survey.saleDate ?? '',
              sellingPriceAdjustmentYear: toNum(surveyMap.get('23'), 3),
              numberOfYears: yearDiffFromToday(survey.saleDate),
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
          priceDifferentiate: 0,
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
          factorId: factorIdMap.get(compFact.factorCode) ?? '',
          factorCode: compFact.factorCode,
        }),
      ),

      directComparisonQualitatives: (template.calculationFactors ?? []).map(
        (calcFact: TemplateCalculationFactorType) => ({
          factorId: factorIdMap.get(calcFact.factorCode) ?? '',
          factorCode: calcFact.factorCode,
          qualitatives: (comparativeSurveys ?? []).map((survey: MarketComparableDetailType) => ({
            marketId: survey.id,
            qualitativeLevel: 'E',
          })),
        }),
      ),

      directComparisonCalculations: [
        ...(comparativeSurveys ?? []).map(survey => {
          const surveyMap = new Map(
            (survey.factorData ?? []).map(s => [
              s.factorCode,
              readFactorValue({
                dataType: s.dataType,
                fieldDecimal: s.fieldDecimal,
                value: s.value,
              }),
            ]),
          );
          return {
            marketId: survey.id,
            offeringPrice: survey.offerPrice ?? 0,
            offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
            offeringPriceAdjustmentPct: survey.offerPriceAdjustmentPercent ?? 0,
            offeringPriceAdjustmentAmt: survey.offerPriceAdjustmentAmount ?? 0,
            sellingPrice: survey.salePrice ?? 0,
            sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
            sellingDate: survey.saleDate ?? '',
            sellingPriceAdjustmentYear: toNum(surveyMap.get('23'), 3),
            numberOfYears: yearDiffFromToday(survey.saleDate),

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
            factorId: factorIdMap.get(calcFact.factorCode) ?? '',
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
        priceDifferentiate: 0,
      },
    },
    { keepDirty: false, keepDirtyValues: false, keepTouched: false },
  );
}
