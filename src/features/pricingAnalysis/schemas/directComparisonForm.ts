import { z } from 'zod';
const requireMsg = (fieldName: string, msg: string = 'is required.') => ({
  required_error: `${fieldName} ${msg}`,
  invalid_type_error: `${fieldName} ${msg}`,
});

const ComparativeFactors = z
  .object({
    factorCode: z.string(requireMsg('Factor code')),
  })
  .passthrough();

const DirectComparisonQualitativeSurvey = z
  .object({
    qualitativeLevel: z.string(requireMsg('Qualitative level')),
  })
  .passthrough();

const DirectComparisonQualitative = z.object({
  factorCode: z.string(requireMsg('Factor code')),
  qualitatives: z.array(DirectComparisonQualitativeSurvey),
});

const DirectComparisonFinalValue = z
  .object({
    finalValueRounded: z.number(requireMsg('Final value (rounded)')),
  })
  .passthrough();

const DirectComparisonAdjustmentPct = z
  .object({
    adjustPercent: z.number(requireMsg('Adjusted score pct')),
  })
  .passthrough();

const DirectComparisonAdjustmentFactor = z
  .object({
    surveys: z.array(DirectComparisonAdjustmentPct),
  })
  .passthrough();

const DirectComparisonAppraisalPrice = z
  .object({
    appraisalPriceRounded: z.number(requireMsg('Appraisal price (rounded)')),
  })
  .passthrough();

export const DirectComparisonDto = z
  .object({
    collateralType: z.string(requireMsg('Collateral type')),
    pricingTemplateCode: z.string(requireMsg('Template')),
    comparativeFactors: z.array(ComparativeFactors),
    /** Qualitative section */
    directComparisonQualitatives: z.array(DirectComparisonQualitative),
    /** Adjustment Factors (adjust percentage) section */
    directComparisonAdjustmentFactors: z.array(DirectComparisonAdjustmentFactor),
    /** Final value section */
    directComparisonFinalValue: DirectComparisonFinalValue,
    /** Apprisal price section */
    directComparisonAppraisalPrice: DirectComparisonAppraisalPrice,
  })
  .passthrough();

export type DirectComparisonQualitativeSurveyFormType = z.infer<
  typeof DirectComparisonQualitativeSurvey
>;
export type ComparativeFactorsFormType = z.infer<typeof ComparativeFactors>;
export type DirectComparisonQualitativeFormType = z.infer<typeof DirectComparisonQualitative>;
export type DirectComparisonType = z.infer<typeof DirectComparisonDto>;
