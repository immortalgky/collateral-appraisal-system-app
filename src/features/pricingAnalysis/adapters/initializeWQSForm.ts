import type { UseFormReset } from 'react-hook-form';
import type { WQSCalculationType, WQSFormType } from '../schemas/wqsForm';
import type { FactorDataType, MarketComparableDetailType, TemplateDetailType } from '../schemas';
import { convertLandTitlesToLandArea } from '../domain/convertLandTitlesToLandArea';
import { readFactorValue, toNum, yearDiffFromToday } from '../domain/readFactorValue';

interface setWQSInitialValueProps {
  collateralType: string;
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  template?: TemplateDetailType;
  comparativeSurveys: MarketComparableDetailType[];
  allFactors?: FactorDataType[];
  reset: UseFormReset<WQSFormType>;
}

function buildSurveyEntries(comparativeSurveys: MarketComparableDetailType[]) {
  return comparativeSurveys.map(s => ({
    marketId: s.id ?? '',
    surveyScore: 0,
    weightedSurveyScore: 0,
  }));
}

function buildCalculations(comparativeSurveys: MarketComparableDetailType[]): WQSCalculationType[] {
  return comparativeSurveys.map(survey => {
    const surveyMap = new Map(
      (survey.factorData ?? []).map((s: FactorDataType) => [
        s.factorCode,
        readFactorValue({ dataType: s.dataType, value: s.value, fieldDecimal: s.fieldDecimal }),
      ]),
    );
    return {
      marketId: survey.id ?? '',
      offeringPrice: survey.offerPrice ?? 0,
      offeringPriceMeasurementUnit: surveyMap.get('20') ?? '',
      offeringPriceAdjustmentPct: survey.offerPriceAdjustmentPercent ?? null,
      offeringPriceAdjustmentAmt: survey.offerPriceAdjustmentAmount ?? null,
      sellingPrice: survey.salePrice ?? 0,
      sellingPriceMeasurementUnit: surveyMap.get('20') ?? '',
      sellingPriceAdjustmentYear: toNum(surveyMap.get('23'), 3),
      numberOfYears: yearDiffFromToday(survey.saleDate),
      adjustedValue: 0,
    } as WQSCalculationType;
  });
}

function buildFinalValue(property: Record<string, unknown>) {
  return {
    landArea: property.titles
      ? convertLandTitlesToLandArea({ titles: property.titles })
      : undefined,
    usableArea: property?.usableArea ?? undefined,
    finalValue: 0,
    finalValueRounded: 0,
    coefficientOfDecision: 0,
    standardError: 0,
    intersectionPoint: 0,
    slope: 0,
    lowestEstimate: 0,
    highestEstimate: 0,
    appraisalPriceRounded: 0,
  };
}

export function initializeWQSForm({
  collateralType,
  methodId,
  methodType,
  property,
  template,
  comparativeSurveys,
  allFactors,
  reset,
}: setWQSInitialValueProps) {
  if (!collateralType || !methodId || !methodType || !property || !comparativeSurveys || !reset)
    return;

  const factorIdMap = new Map<string, string>();
  for (const f of allFactors ?? []) {
    const fid = f.factorId ?? f.id;
    if (f.factorCode && fid) factorIdMap.set(f.factorCode, fid);
  }

  const surveyEntries = buildSurveyEntries(comparativeSurveys);
  const calculations = buildCalculations(comparativeSurveys);
  const comparativeSurveyFields = comparativeSurveys.map((s, i) => ({
    marketId: s.id ?? '',
    displaySeq: i + 1,
  }));
  const totalScoreSurveys = comparativeSurveys.map(s => ({
    marketId: s.id ?? '',
    totalScore: 0,
    totalWeightedScore: 0,
  }));

  if (!template) {
    reset({
      methodId: methodId,
      collateralType: collateralType,
      pricingTemplateCode: '',
      comparativeSurveys: comparativeSurveyFields,
      comparativeFactors: [],
      WQSScores: [],
      WQSTotalScores: {
        totalWeight: 0,
        totalIntensity: 0,
        totalWeightedIntensity: 0,
        surveys: totalScoreSurveys,
        totalCollateralScore: 0,
        totalWeightedCollateralScore: 0,
      },
      WQSCalculations: calculations,
      WQSFinalValue: buildFinalValue(property),
      generateAt: new Date().toISOString(),
    });
    return;
  }

  reset({
    methodId: methodId,
    collateralType: collateralType,
    pricingTemplateCode: template.templateCode ?? '',
    comparativeSurveys: comparativeSurveyFields,
    comparativeFactors:
      template.comparativeFactors?.map(compFact => ({
        factorId: factorIdMap.get(compFact.factorCode) ?? '',
        factorCode: compFact.factorCode,
      })) ?? [],
    WQSScores: template.calculationFactors?.map(calFact => ({
      factorId: factorIdMap.get(calFact.factorCode) ?? '',
      factorCode: calFact.factorCode,
      weight: calFact.weight,
      intensity: calFact.intensity,
      surveys: surveyEntries,
      collateral: 0,
    })),
    WQSTotalScores: {
      totalWeight: 0,
      totalIntensity: 0,
      totalWeightedIntensity: 0,
      surveys: totalScoreSurveys,
      totalCollateralScore: 0,
      totalWeightedCollateralScore: 0,
    },
    WQSCalculations: calculations,
    WQSFinalValue: buildFinalValue(property),
    generateAt: new Date().toISOString(),
  });
}
