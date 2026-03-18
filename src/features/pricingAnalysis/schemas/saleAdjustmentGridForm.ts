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

const SaleAdjustmentGridQualitativeSurvey = z
  .object({
    qualitativeLevel: z.string(requireMsg('Qualitative level')),
  })
  .passthrough();

const SaleAdjustmentGridQualitative = z.object({
  factorCode: z.string(requireMsg('Factor Code')),
  qualitatives: z.array(SaleAdjustmentGridQualitativeSurvey),
});

const SaleAdjustmentGridCalculation = z
  .object({
    weight: z.number(requireMsg('Weight')),
  })
  .passthrough();

const SaleAdjustmentGridFinalValue = z
  .object({
    finalValueRounded: z.number(requireMsg('Final value (rounded)')),
  })
  .passthrough();

const SaleAdjustmentGridAdjustmentPct = z
  .object({
    adjustPercent: z.number(requireMsg('Adjusted score pct')),
  })
  .passthrough();

const SaleAdjustmentGridAdjustmentFactor = z.object({
  surveys: z.array(SaleAdjustmentGridAdjustmentPct),
});

const SaleAdjustmentGridAppraisalPrice = z
  .object({
    appraisalPriceRounded: z.number(requireMsg('Appraisal price (rounded)')),
  })
  .passthrough();

export const SaleAdjustmentGridDto = z
  .object({
    collateralType: z.string(requireMsg('Collateral type')),
    pricingTemplateCode: z.string(requireMsg('Template')),
    comparativeFactors: z.array(ComparativeFactors),
    /** Qualitative section */
    saleAdjustmentGridQualitatives: z.array(SaleAdjustmentGridQualitative),
    /** Calculation section */
    saleAdjustmentGridCalculations: z.array(SaleAdjustmentGridCalculation),
    /** Adjustment Factors (adjust percentage) section */
    saleAdjustmentGridAdjustmentFactors: z.array(SaleAdjustmentGridAdjustmentFactor),
    /** Final value section */
    saleAdjustmentGridFinalValue: SaleAdjustmentGridFinalValue,
    /** Apprisal price section */
    saleAdjustmentGridAppraisalPrice: SaleAdjustmentGridAppraisalPrice,
  })
  .passthrough();

export type SaleAdjustmentGridCalculationFormType = z.infer<typeof SaleAdjustmentGridCalculation>;
export type SaleAdjustmentGridQualitativeSurveyFormType = z.infer<
  typeof SaleAdjustmentGridQualitativeSurvey
>;
export type ComparativeFactorsFormType = z.infer<typeof ComparativeFactors>;
export type SaleAdjustmentGridQualitativeFormType = z.infer<typeof SaleAdjustmentGridQualitative>;
export type SaleAdjustmentGridType = z.infer<typeof SaleAdjustmentGridDto>;
