import type { UseFormReset } from 'react-hook-form';
import type {
  DirectComparisonCalculationFormType,
  DirectComparisonType,
} from '../schemas/directComparisonForm';
import type {
  CalculationType,
  ComparativeFactorType,
  FactorDataType,
  LinkedComparableType,
  MarketComparableDetailType,
} from '../schemas';
import { readFactorValue, toNum, yearDiffFromToday } from '../domain/readFactorValue';
import { convertLandTitlesToLandArea } from '../domain/convertLandTitlesToLandArea';

interface RestoreDirectComparisonFromSavedDataProps {
  methodId: string;
  property: Record<string, unknown>;
  comparativeSurveys: MarketComparableDetailType[];
  allFactors?: FactorDataType[];
  linkedComparables?: LinkedComparableType[];
  savedComparativeFactors: ComparativeFactorType[];
  savedCalculations?: CalculationType[];
  reset: UseFormReset<DirectComparisonType>;
}

export function restoreDirectComparisonFromSavedData({
  methodId,
  property,
  comparativeSurveys,
  allFactors,
  linkedComparables,
  savedComparativeFactors,
  savedCalculations,
  reset,
}: RestoreDirectComparisonFromSavedDataProps) {
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

  // Restore comparativeFactors — preserve existing record id
  const comparativeFactors = [...savedComparativeFactors]
    .sort((a, b) => a.displaySequence - b.displaySequence)
    .map(cf => ({
      id: cf.id,
      factorId: cf.factorId,
      factorCode: cf.factorCode ?? factorCodeMap.get(cf.factorId) ?? '',
    }));

  // Scoring factors: use saved comparativeFactors that are selected for scoring
  const scoringFactors = [...savedComparativeFactors]
    .filter(cf => cf.isSelectedForScoring)
    .sort((a, b) => a.displaySequence - b.displaySequence);

  // Build qualitatives from scoring factors
  const directComparisonQualitatives = scoringFactors.map(cf => ({
    factorId: cf.factorId,
    factorCode: cf.factorCode ?? factorCodeMap.get(cf.factorId) ?? '',
    qualitatives: comparativeSurveys.map(survey => ({
      marketId: survey.id,
      qualitativeLevel: 'E',
    })),
  }));

  // Build adjustment factors from scoring factors
  const directComparisonAdjustmentFactors = scoringFactors.map(cf => ({
    factorId: cf.factorId,
    factorCode: cf.factorCode ?? factorCodeMap.get(cf.factorId) ?? '',
    surveys: [] as { marketId: string; adjustPercent: number; adjustAmount: number }[],
  }));

  // Build savedCalculations lookup by marketComparableId
  const savedCalcMap = new Map<string, CalculationType>();
  for (const sc of savedCalculations ?? []) {
    if (sc.marketComparableId) savedCalcMap.set(sc.marketComparableId, sc);
  }

  // Build calculations from survey data, overlaying saved values when available
  const directComparisonCalculations = comparativeSurveys.map(survey => {
    const surveyMap = new Map<string, unknown>();
    for (const s of survey.factorData ?? []) {
      if (s.factorCode) {
        surveyMap.set(s.factorCode, readFactorValue({ dataType: s.dataType as string, value: s.value as string, fieldDecimal: s.fieldDecimal as number }));
      }
    }

    const saved = savedCalcMap.get(survey.id ?? '');

    return {
      marketId: survey.id,
      offeringPrice: saved?.offeringPrice ?? survey.offerPrice ?? 0,
      offeringPriceMeasurementUnit: saved?.offeringPriceUnit ?? (surveyMap.get('20') as string) ?? '',
      offeringPriceAdjustmentPct: saved?.adjustOfferPricePct ?? survey.offerPriceAdjustmentPercent ?? 0,
      offeringPriceAdjustmentAmt: survey.offerPriceAdjustmentAmount ?? 0,
      sellingPrice: saved?.sellingPrice ?? survey.salePrice ?? 0,
      sellingPriceMeasurementUnit: (surveyMap.get('20') as string) ?? '',
      sellingDate: survey.saleDate ?? '',
      sellingPriceAdjustmentYear: saved?.adjustedPeriodPct ?? toNum(surveyMap.get('23'), 3),
      numberOfYears: saved?.buySellYear ?? yearDiffFromToday(survey.saleDate),
      adjustedValue: saved?.totalAdjustedValue ?? 0,
      factorDiffPct: saved?.totalFactorDiffPct ?? 0,
      factorDiffAmt: 0,
      totalAdjustValue: 0,
    };
  }) as DirectComparisonCalculationFormType[];

  reset(
    {
      methodId,
      collateralType: undefined,
      pricingTemplateCode: undefined,
      comparativeSurveys: comparativeSurveys.map((s, i) => ({
        linkId: linkIdMap.get(s.id!) ?? null,
        marketId: s.id,
        displaySeq: i + 1,
      })),
      comparativeFactors,
      directComparisonQualitatives,
      directComparisonCalculations,
      directComparisonAdjustmentFactors,
      directComparisonFinalValue: {
        finalValue: 0,
        finalValueRounded: 0,
      },
      directComparisonAppraisalPrice: {
        landArea: property.titles
          ? convertLandTitlesToLandArea({ titles: property.titles })
          : undefined,
        usableArea: (property.usableArea as number) ?? undefined,
        appraisalPrice: 0,
        appraisalPriceRounded: 0,
      },
    },
    { keepDirty: false, keepDirtyValues: false, keepTouched: false },
  );
}
