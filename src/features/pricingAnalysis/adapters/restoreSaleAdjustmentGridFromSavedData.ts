import type { UseFormReset } from 'react-hook-form';
import type {
  SaleAdjustmentGridCalculationFormType,
  SaleAdjustmentGridType,
} from '../schemas/saleAdjustmentGridForm';
import type {
  CalculationType,
  ComparativeFactorType,
  FactorDataType,
  FactorScoreType,
  LinkedComparableType,
  MarketComparableDetailType,
} from '../schemas';
import { readFactorValue, toNum, yearDiffFromToday } from '../domain/readFactorValue';
import { convertLandTitlesToLandArea } from '../domain/convertLandTitlesToLandArea';

interface RestoreSaleAdjustmentGridFromSavedDataProps {
  methodId: string;
  property: Record<string, unknown>;
  comparativeSurveys: MarketComparableDetailType[];
  allFactors?: FactorDataType[];
  linkedComparables?: LinkedComparableType[];
  savedComparativeFactors: ComparativeFactorType[];
  savedFactorScores?: FactorScoreType[];
  savedCalculations?: CalculationType[];
  reset: UseFormReset<SaleAdjustmentGridType>;
}

export function restoreSaleAdjustmentGridFromSavedData({
  methodId,
  property,
  comparativeSurveys,
  allFactors,
  linkedComparables,
  savedComparativeFactors,
  savedFactorScores,
  savedCalculations,
  reset,
}: RestoreSaleAdjustmentGridFromSavedDataProps) {
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
  const allComparativeFactors = [...savedComparativeFactors].sort(
    (a, b) => a.displaySequence - b.displaySequence,
  );

  const comparativeFactors = allComparativeFactors.map(cf => ({
    id: cf.id,
    factorId: cf.factorId,
    factorCode: cf.factorCode ?? factorCodeMap.get(cf.factorId) ?? '',
  }));

  // Scoring factors: only isSelectedForScoring for calculation section
  const scoringFactors = allComparativeFactors.filter(cf => cf.isSelectedForScoring);

  // Build factor score lookups: factorId → marketComparableId → FactorScoreType
  const scoreMap = new Map<string, Map<string, FactorScoreType>>();
  // Also track remarks per factor (take from any score entry that has one)
  const scoreRemarkMap = new Map<string, string | null>();
  for (const fs of savedFactorScores ?? []) {
    if (!fs.factorId) continue;
    if (!scoreMap.has(fs.factorId)) scoreMap.set(fs.factorId, new Map());
    if (fs.marketComparableId) {
      scoreMap.get(fs.factorId)!.set(fs.marketComparableId, fs);
    }
    if (fs.remarks != null && !scoreRemarkMap.has(fs.factorId)) {
      scoreRemarkMap.set(fs.factorId, fs.remarks);
    }
  }

  // Build qualitatives from scoring factors + saved comparisonResult
  const saleAdjustmentGridQualitatives = scoringFactors.map(cf => ({
    factorId: cf.factorId,
    factorCode: cf.factorCode ?? factorCodeMap.get(cf.factorId) ?? '',
    qualitatives: comparativeSurveys.map(survey => {
      const saved = scoreMap.get(cf.factorId)?.get(survey.id ?? '');
      return {
        marketId: survey.id,
        qualitativeLevel: saved?.comparisonResult ?? 'E',
      };
    }),
  }));

  // Build adjustment factors from scoring factors + saved adjustmentPct/adjustmentAmt
  const saleAdjustmentGridAdjustmentFactors = scoringFactors.map(cf => ({
    factorId: cf.factorId,
    factorCode: cf.factorCode ?? factorCodeMap.get(cf.factorId) ?? '',
    remark: scoreRemarkMap.get(cf.factorId) ?? null,
    surveys: comparativeSurveys.map(survey => {
      const saved = scoreMap.get(cf.factorId)?.get(survey.id ?? '');
      return {
        marketId: survey.id,
        adjustPercent: saved?.adjustmentPct ?? 0,
        adjustAmount: saved?.adjustmentAmt ?? 0,
      };
    }),
  }));

  // Build savedCalculations lookup by marketComparableId
  const savedCalcMap = new Map<string, CalculationType>();
  for (const sc of savedCalculations ?? []) {
    if (sc.marketComparableId) savedCalcMap.set(sc.marketComparableId, sc);
  }

  // Build calculations from survey data, overlaying saved values when available
  const saleAdjustmentGridCalculations = comparativeSurveys.map(survey => {
    const surveyMap = new Map<string, unknown>();
    for (const s of survey.factorData ?? []) {
      if (s.factorCode) {
        surveyMap.set(
          s.factorCode,
          readFactorValue({
            dataType: s.dataType as string,
            value: s.value as string,
            fieldDecimal: s.fieldDecimal as number,
          }),
        );
      }
    }

    const saved = savedCalcMap.get(survey.id ?? '');

    return {
      marketId: survey.id,
      offeringPrice: saved?.offeringPrice ?? survey.offerPrice ?? 0,
      offeringPriceMeasurementUnit:
        saved?.offeringPriceUnit ?? (surveyMap.get('20') as string) ?? '',
      offeringPriceAdjustmentPct:
        saved?.adjustOfferPricePct ?? survey.offerPriceAdjustmentPercent ?? 0,
      offeringPriceAdjustmentAmt:
        saved?.adjustOfferPriceAmt ?? survey.offerPriceAdjustmentAmount ?? 0,
      sellingPrice: saved?.sellingPrice ?? survey.salePrice ?? 0,
      sellingPriceMeasurementUnit: (surveyMap.get('20') as string) ?? '',
      sellingDate: survey.saleDate ?? '',
      sellingPriceAdjustmentYear: saved?.adjustedPeriodPct ?? toNum(surveyMap.get('23'), 3),
      numberOfYears: saved?.buySellYear ?? yearDiffFromToday(survey.saleDate),
      adjustedValue: saved?.totalAdjustedValue ?? 0,
      landAreaOfDeficient: saved?.landAreaDeficient ?? null,
      landPrice: saved?.landPrice ?? null,
      landValueIncreaseDecrease: saved?.landValueAdjustment ?? null,
      usableAreaOfDeficient: saved?.usableAreaDeficient ?? null,
      usableAreaPrice: saved?.usableAreaPrice ?? null,
      buildingValueIncreaseDecrease: saved?.buildingValueAdjustment ?? null,
      factorDiffPct: saved?.totalFactorDiffPct ?? 0,
      factorDiffAmt: saved?.totalFactorDiffAmt ?? 0,
      totalAdjustValue: 0,
      weight: saved?.weight ?? 0,
      weightedAdjustValue: saved?.weightedAdjustedValue ?? 0,
    };
  }) as SaleAdjustmentGridCalculationFormType[];

  // Extract top-level landPrice / usableAreaPrice from the first saved calculation that has them
  const firstSavedCalc = [...(savedCalculations ?? [])].find(sc => sc.marketComparableId);
  const topLevelLandPrice = firstSavedCalc?.landPrice ?? null;
  const topLevelUsableAreaPrice = firstSavedCalc?.usableAreaPrice ?? null;

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
      saleAdjustmentGridQualitatives,
      saleAdjustmentGridCalculations,
      saleAdjustmentGridAdjustmentFactors,
      saleAdjustmentGridFinalValue: {
        finalValue: 0,
        finalValueRounded: 0,
      },
      saleAdjustmentGridAppraisalPrice: {
        landArea: property.totalLandAreaInSqWa ? Number(property.totalLandAreaInSqWa) : undefined,
        usableArea: property.totalBuildingArea
          ? Number(property.totalBuildingArea)
          : property.usableArea
            ? Number(property.usableArea)
            : undefined,
        appraisalPrice: 0,
        appraisalPriceRounded: 0,
        priceDifferentiate: 0,
      },
      // Top-level fields used by 2nd revision inputs & derived rules
      landPrice: topLevelLandPrice,
      usableAreaPrice: topLevelUsableAreaPrice,
    } as any,
    { keepDirty: false, keepDirtyValues: false, keepTouched: false },
  );
}
