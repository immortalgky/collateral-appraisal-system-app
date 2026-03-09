import type { UseFormReset } from 'react-hook-form';
import type { WQSCalculationType, WQSFormType } from '../schemas/wqsForm';
import type {
  CalculationType,
  ComparativeFactorType,
  FactorDataType,
  FactorScoreType,
  LinkedComparableType,
  MarketComparableDetailType,
} from '../schemas';
import { convertLandTitlesToLandArea } from '../domain/convertLandTitlesToLandArea';
import { readFactorValue, toNum, yearDiffFromToday } from '../domain/readFactorValue';

interface RestoreWQSFromSavedDataProps {
  methodId: string;
  property: Record<string, unknown>;
  comparativeSurveys: MarketComparableDetailType[];
  allFactors?: FactorDataType[];
  linkedComparables?: LinkedComparableType[];
  savedComparativeFactors: ComparativeFactorType[];
  savedFactorScores: FactorScoreType[];
  savedCalculations?: CalculationType[];
  reset: UseFormReset<WQSFormType>;
}

export function restoreWQSFromSavedData({
  methodId,
  property,
  comparativeSurveys,
  allFactors,
  linkedComparables,
  savedComparativeFactors,
  savedFactorScores,
  savedCalculations,
  reset,
}: RestoreWQSFromSavedDataProps) {
  // Build factorId → factorCode map from allFactors
  const factorCodeMap = new Map<string, string>();
  for (const f of allFactors ?? []) {
    const fid = f.factorId ?? f.id;
    if (f.factorCode && fid) factorCodeMap.set(fid, f.factorCode);
  }

  // Build marketComparableId → linkId map
  const linkIdMap = new Map<string, string>();
  for (const lc of linkedComparables ?? []) {
    linkIdMap.set(lc.marketComparableId, lc.linkId);
  }

  // Restore comparativeFactors — ALL factors for the top table
  const comparativeFactors = [...savedComparativeFactors]
    .sort((a, b) => a.displaySequence - b.displaySequence)
    .map(cf => ({
      id: cf.id,
      factorId: cf.factorId,
      factorCode: cf.factorCode ?? factorCodeMap.get(cf.factorId) ?? '',
    }));

  // Group factorScores by factorId
  const scoresByFactor = new Map<string, FactorScoreType[]>();
  for (const fs of savedFactorScores) {
    const list = scoresByFactor.get(fs.factorId) ?? [];
    list.push(fs);
    scoresByFactor.set(fs.factorId, list);
  }

  // Get unique factors from scores, maintaining displaySequence order
  const factorEntries = [...scoresByFactor.entries()].sort((a, b) => {
    const aSeq = a[1][0]?.displaySequence ?? 0;
    const bSeq = b[1][0]?.displaySequence ?? 0;
    return aSeq - bSeq;
  });

  // Build WQSScores — preserve existing record ids
  const WQSScores = factorEntries.map(([factorId, scores]) => {
    const surveyScores = scores.filter(s => !!s.marketComparableId);
    const collateralEntry = scores.find(s => !s.marketComparableId);
    const firstScore = scores[0];

    return {
      factorId,
      factorCode: factorCodeMap.get(factorId) ?? '',
      weight: firstScore?.factorWeight ?? 0,
      intensity: firstScore?.intensity ?? 0,
      surveys: surveyScores.map(s => ({
        id: s.id,
        marketId: s.marketComparableId ?? '',
        surveyScore: s.score ?? 0,
        weightedSurveyScore: 0,
      })),
      collateral: collateralEntry?.score ?? 0,
      collateralScoreId: collateralEntry?.id ?? null,
    };
  });

  // Build savedCalculations lookup by marketComparableId
  const savedCalcMap = new Map<string, CalculationType>();
  for (const sc of savedCalculations ?? []) {
    if (sc.marketComparableId) savedCalcMap.set(sc.marketComparableId, sc);
  }

  // Build calculations from survey data, overlaying saved values when available
  const WQSCalculations: WQSCalculationType[] = comparativeSurveys.map(survey => {
    const surveyMap = new Map<string, unknown>();
    for (const s of survey.factorData ?? []) {
      if (s.factorCode) {
        surveyMap.set(s.factorCode, readFactorValue({ dataType: s.dataType as string, value: s.value as string, fieldDecimal: s.fieldDecimal as number }));
      }
    }

    const saved = savedCalcMap.get(survey.id ?? '');

    return {
      marketId: survey.id ?? '',
      offeringPrice: saved?.offeringPrice ?? survey.offerPrice ?? 0,
      offeringPriceMeasurementUnit: saved?.offeringPriceUnit ?? (surveyMap.get('20') as string) ?? '',
      offeringPriceAdjustmentPct: saved?.adjustOfferPricePct ?? survey.offerPriceAdjustmentPercent ?? 0,
      offeringPriceAdjustmentAmt: saved?.adjustOfferPriceAmt ?? survey.offerPriceAdjustmentAmount ?? 0,
      sellingPrice: saved?.sellingPrice ?? survey.salePrice ?? 0,
      sellingPriceMeasurementUnit: (surveyMap.get('20') as string) ?? '',
      sellingPriceAdjustmentYear: saved?.adjustedPeriodPct ?? toNum(surveyMap.get('23'), 3),
      numberOfYears: saved?.buySellYear ?? yearDiffFromToday(survey.saleDate),
      totalAdjustedSellingPrice: saved?.cumulativeAdjPeriod ?? 0,
      adjustedValue: saved?.totalAdjustedValue ?? 0,
    } as WQSCalculationType;
  });

  const totalScoreSurveys = comparativeSurveys.map(s => ({
    marketId: s.id ?? '',
    totalScore: 0,
    totalWeightedScore: 0,
  }));

  reset(
    {
      methodId,
      collateralType: undefined,
      pricingTemplateCode: undefined,
      comparativeSurveys: comparativeSurveys.map((s, i) => ({
        linkId: linkIdMap.get(s.id!) ?? null,
        marketId: s.id ?? '',
        displaySeq: i + 1,
      })),
      comparativeFactors,
      WQSScores,
      WQSTotalScores: {
        totalWeight: 0,
        totalIntensity: 0,
        totalWeightedIntensity: 0,
        surveys: totalScoreSurveys,
        totalCollateralScore: 0,
        totalWeightedCollateralScore: 0,
      },
      WQSCalculations,
      WQSFinalValue: {
        landArea: property.titles
          ? convertLandTitlesToLandArea({ titles: property.titles })
          : undefined,
        usableArea: (property?.usableArea as number) ?? undefined,
        finalValue: 0,
        finalValueRounded: 0,
        coefficientOfDecision: 0,
        standardError: 0,
        intersectionPoint: 0,
        slope: 0,
        lowestEstimate: 0,
        highestEstimate: 0,
        appraisalPriceRounded: 0,
        priceDifferentiate: 0,
      },
      generateAt: new Date().toISOString(),
    },
    { keepDirty: false, keepDirtyValues: false, keepTouched: false },
  );
}
