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
  const hasBuildingCost = !!ap?.hasBuildingValue;
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
    // Wire key renamed; the right-hand side still reads the form model, which keeps its own name.
    finalValueOverride: (fv?.finalValueAdjusted as number | undefined) ?? null,
    hasBuildingValue: ap?.hasBuildingValue ?? null,
    buildingValue: ap?.totalBuildingCost ?? null,
    indicatedValue: userAppraisalPrice,
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

  // The adjustment row for a qualitative row is the one at the same index, not the one with a
  // matching factorId: factorId is '' until a factor resolves (handleAddRow leaves it unset, and
  // initialize falls back to '' when factorIdMap misses), so keying on it made every such row
  // share one entry and save one row's percentages and remark against another's. The two arrays
  // are built and mutated as a pair -- see syncXxxFormSurveys for the same reasoning.

  const entries: SaveComparativeAnalysisRequestType['factorScores'] = [];

  for (let rowIdx = 0; rowIdx < qualitatives.length; rowIdx++) {
    const qual = qualitatives[rowIdx];
    const adj = adjustmentFactors[rowIdx];
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
