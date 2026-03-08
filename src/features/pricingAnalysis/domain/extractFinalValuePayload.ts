import type { SetFinalValueRequestType } from '../schemas';

/**
 * Extract final value payload from any method's form values.
 * Looks for common final value fields across WQS, SAG, and DC forms.
 */
export function extractFinalValuePayload(
  formValues: Record<string, any>,
): SetFinalValueRequestType | null {
  // Each method stores final value fields under different keys
  const finalValueSection =
    formValues.WQSFinalValue ??
    formValues.saleAdjustmentGridAppraisalPrice ??
    formValues.directComparisonAppraisalPrice;

  if (!finalValueSection) return null;

  const appraisalPrice = finalValueSection.appraisalPrice ?? finalValueSection.appraisalValue ?? null;
  const appraisalPriceRounded = finalValueSection.appraisalPriceRounded ?? null;

  if (appraisalPriceRounded == null && appraisalPrice == null) return null;

  return {
    finalValue: appraisalPrice,
    finalValueRounded: appraisalPriceRounded,
    appraisalPrice: appraisalPrice,
    appraisalPriceRounded: appraisalPriceRounded,
    priceDifferentiate: finalValueSection.priceDifferentiate ?? null,
    includeLandArea: finalValueSection.includeLandArea ?? null,
    landArea: finalValueSection.landArea ?? null,
    hasBuildingCost: finalValueSection.hasBuildingCost ?? null,
    buildingCost: finalValueSection.buildingCost ?? null,
  } as SetFinalValueRequestType;
}
