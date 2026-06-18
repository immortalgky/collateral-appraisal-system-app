import type { SaveComparativeAnalysisRequestType } from '../schemas';
import type { DirectComparison } from '../types/directComparison';

interface MapDirectComparisonFormToSubmitSchemaProps {
  DirectComparisonForm: DirectComparison;
  comparativeAnalysisTemplateId?: string | null;
}

export function mapDirectComparisonFormToSubmitSchema({
  DirectComparisonForm,
  comparativeAnalysisTemplateId,
}: MapDirectComparisonFormToSubmitSchemaProps): SaveComparativeAnalysisRequestType {
  // Build set of factorIds used for scoring (qualitatives)
  const scoringFactorIds = new Set(
    (DirectComparisonForm.directComparisonQualitatives ?? []).map(q => q.factorId).filter(Boolean),
  );

  const fv = (DirectComparisonForm as any).directComparisonFinalValue;
  const ap = (DirectComparisonForm as any).directComparisonAppraisalPrice;
  const hasBuildingCost = !!ap?.hasBuildingCost;
  // With building cost: visible "Appraisal Price (rounded)" total lives in
  // appraisalPriceIncludeBuildingCostRounded, and "Land Price (rounded)" in appraisalPriceRounded.
  // Without: a single "Appraisal Price (rounded)" lives in appraisalPriceRounded.
  const userAppraisalPrice = hasBuildingCost
    ? (ap?.appraisalPriceIncludeBuildingCostRounded ?? null)
    : (ap?.appraisalPriceRounded ?? null);
  const landValueToSend = hasBuildingCost ? (ap?.appraisalPriceRounded ?? null) : null;

  return {
    comparativeAnalysisTemplateId: comparativeAnalysisTemplateId ?? null,
    appraisalValue: userAppraisalPrice,
    finalValueAdjusted: (fv?.finalValueAdjusted as number | undefined) ?? null,
    hasBuildingCost: ap?.hasBuildingCost ?? null,
    buildingCost: ap?.totalBuildingCost ?? null,
    appraisalPrice: userAppraisalPrice,
    includeLandArea: ap?.includeLandArea ?? null,
    landArea: ap?.landArea ?? null,
    landValue: landValueToSend,
    comparativeFactors: (DirectComparisonForm.comparativeFactors ?? []).map((cf, index) => ({
      id: cf.id || null,
      factorId: cf.factorId || '',
      displaySequence: index,
      isSelectedForScoring: scoringFactorIds.has(cf.factorId),
      remarks: null,
      collateralValue: (cf as any).collateralValue ?? null,
    })),

    factorScores: buildFactorScores(DirectComparisonForm),

    calculations: (DirectComparisonForm.directComparisonCalculations ?? []).map(calc => {
      const hasOfferingPrice = calc.offeringPrice != null && calc.offeringPrice !== 0;
      // landPrice / usableAreaPrice are stored as top-level form fields (shared across all surveys)
      const formAny = DirectComparisonForm as any;
      return {
        marketComparableId: calc.marketId ?? '',
        offeringPrice: hasOfferingPrice ? (calc.offeringPrice ?? null) : null,
        offeringPriceUnit: calc.offeringPriceMeasurementUnit ?? null,
        adjustOfferPricePct: hasOfferingPrice ? (calc.offeringPriceAdjustmentPct ?? null) : null,
        adjustOfferPriceAmt: hasOfferingPrice ? (calc.offeringPriceAdjustmentAmt ?? null) : null,
        sellingPrice: hasOfferingPrice ? null : (calc.sellingPrice ?? null),
        sellingPriceUnit: calc.sellingPriceMeasurementUnit ?? null,
        buySellYear:
          !hasOfferingPrice && calc.numberOfYears != null ? Math.trunc(calc.numberOfYears) : null,
        buySellMonth: null,
        adjustedPeriodPct: !hasOfferingPrice ? (calc.sellingPriceAdjustmentYear ?? null) : null,
        cumulativeAdjPeriod: null,
        landAreaDeficient: calc.landAreaOfDeficient ?? null,
        landAreaDeficientUnit: null,
        landPrice: formAny.landPrice ?? null,
        landValueAdjustment: calc.landValueIncreaseDecrease ?? null,
        usableAreaDeficient: calc.usableAreaOfDeficient ?? null,
        usableAreaDeficientUnit: null,
        usableAreaPrice: formAny.usableAreaPrice ?? null,
        buildingValueAdjustment: calc.buildingValueIncreaseDecrease ?? null,
        totalAdjustedValue: calc.adjustedValue ?? null,
        totalFactorDiffPct: calc.factorDiffPct ?? null,
        totalFactorDiffAmt: calc.factorDiffAmt ?? null,
        weight: null,
        weightedAdjustedValue: null,
      };
    }),
  };
}

function buildFactorScores(
  form: DirectComparison,
): SaveComparativeAnalysisRequestType['factorScores'] {
  const qualitatives = form.directComparisonQualitatives ?? [];
  const adjustmentFactors = form.directComparisonAdjustmentFactors ?? [];

  // Build a lookup: factorId → adjustment factor data
  const adjMap = new Map<string, (typeof adjustmentFactors)[number]>();
  for (const af of adjustmentFactors) {
    adjMap.set(af.factorId, af);
  }

  const entries: SaveComparativeAnalysisRequestType['factorScores'] = [];

  for (let rowIdx = 0; rowIdx < qualitatives.length; rowIdx++) {
    const qual = qualitatives[rowIdx];
    const adj = adjMap.get(qual.factorId);
    const fid = qual.factorId || '';

    for (const q of qual.qualitatives ?? []) {
      // Find matching adjustment survey for this market
      const adjSurvey = adj?.surveys?.find(s => s.marketId === q.marketId);

      entries.push({
        id: null,
        factorId: fid,
        marketComparableId: q.marketId || null,
        factorWeight: 0,
        displaySequence: rowIdx,
        value: null,
        score: null,
        intensity: null,
        comparisonResult: q.qualitativeLevel || null,
        adjustmentPct: adjSurvey?.adjustPercent ?? null,
        adjustmentAmt: adjSurvey?.adjustAmount ?? null,
        remarks: adj?.remark ?? null,
      });
    }
  }

  return entries;
}
