import type { SaveComparativeAnalysisRequestType } from '../schemas';
import type { WQS } from '../types/wqs';

interface MapWQSFormToSubmitSchemaProps {
  WQSForm: WQS;
  comparativeAnalysisTemplateId?: string | null;
}

export function mapWQSFormToSubmitSchema({
  WQSForm,
  comparativeAnalysisTemplateId,
}: MapWQSFormToSubmitSchemaProps): SaveComparativeAnalysisRequestType {
  // Build set of factorIds used for scoring (WQSScores)
  const scoringFactorIds = new Set((WQSForm.WQSScores ?? []).map(s => s.factorId).filter(Boolean));

  const fv = WQSForm.WQSFinalValue;

  // The Adjust Final Value UI now binds the user-rounded total to `appraisalPrice`
  // in all cases (unit 01/02, unit 03 machinery, with/without building cost).
  // `landValue` is only meaningful when hasBuildingCost = true (separate Land Price input).
  const hasBuildingCost = !!fv?.hasBuildingCost;
  const userRoundedAppraisalPrice = fv?.appraisalPrice ?? null;
  const landValueToSend = hasBuildingCost ? (fv?.landValue ?? null) : null;

  return {
    comparativeAnalysisTemplateId: comparativeAnalysisTemplateId ?? null,
    appraisalValue: userRoundedAppraisalPrice,
    finalValueAdjusted: (fv?.finalValueAdjusted as number | undefined) ?? null,
    hasBuildingCost: fv?.hasBuildingCost ?? null,
    buildingCost: fv?.buildingCost ?? null,
    appraisalPrice: userRoundedAppraisalPrice,
    includeLandArea: fv?.includeLandArea ?? null,
    landArea: fv?.landArea ?? null,
    landValue: landValueToSend,
    comparativeFactors: (WQSForm.comparativeFactors ?? []).map((cf, index) => ({
      id: cf.id || null,
      factorId: cf.factorId || '',
      displaySequence: index,
      isSelectedForScoring: scoringFactorIds.has(cf.factorId ?? ''),
      remarks: null,
    })),

    factorScores: WQSForm.WQSScores.flatMap((score, index) => {
      const entries: SaveComparativeAnalysisRequestType['factorScores'] = [];
      const fid = score.factorId || '';

      // One entry per survey for this factor
      for (const survey of score.surveys ?? []) {
        entries.push({
          id: survey.id || null,
          factorId: fid,
          marketComparableId: survey.marketId || null,
          factorWeight: score.weight ?? 0,
          displaySequence: index,
          score: survey.surveyScore,
          intensity: score.intensity ?? null,
          value: null,
          adjustmentPct: null,
          remarks: null,
          adjustmentAmt: null,
          comparisonResult: null,
        });
      }

      // Collateral (subject property) score entry — no marketComparableId
      entries.push({
        id: score.collateralScoreId || null,
        factorId: fid,
        marketComparableId: null,
        factorWeight: score.weight ?? 0,
        displaySequence: index,
        score: score.collateral ?? 0,
        intensity: score.intensity ?? null,
        value: null,
        adjustmentPct: null,
        remarks: null,
        adjustmentAmt: null,
        comparisonResult: null,
      });

      return entries;
    }),

    calculations: (WQSForm.WQSCalculations ?? []).map(calc => {
      const hasOfferingPrice = calc.offeringPrice != null && calc.offeringPrice !== 0;
      return {
        marketComparableId: calc.marketId ?? '',
        offeringPrice: hasOfferingPrice ? (calc.offeringPrice ?? null) : null,
        offeringPriceUnit: calc.offeringPriceMeasurementUnit ?? null,
        adjustOfferPricePct: hasOfferingPrice ? (calc.offeringPriceAdjustmentPct ?? null) : null,
        adjustOfferPriceAmt: hasOfferingPrice ? (calc.offeringPriceAdjustmentAmt ?? null) : null,
        sellingPrice: hasOfferingPrice ? null : (calc.sellingPrice ?? null),
        sellingPriceUnit: null,
        buySellYear:
          !hasOfferingPrice && calc.numberOfYears != null ? Math.trunc(calc.numberOfYears) : null,
        buySellMonth: null,
        adjustedPeriodPct: !hasOfferingPrice ? (calc.sellingPriceAdjustmentYear ?? null) : null,
        cumulativeAdjPeriod: !hasOfferingPrice ? (calc.totalAdjustedSellingPrice ?? null) : null,
        landAreaDeficient: null,
        landAreaDeficientUnit: null,
        landPrice: null,
        landValueAdjustment: null,
        usableAreaDeficient: null,
        usableAreaDeficientUnit: null,
        usableAreaPrice: null,
        buildingValueAdjustment: null,
        totalFactorDiffPct: null,
        totalFactorDiffAmt: null,
        totalAdjustedValue: calc.adjustedValue ?? null,
        weight: null,
        weightedAdjustedValue: null,
      };
    }),
  };
}
