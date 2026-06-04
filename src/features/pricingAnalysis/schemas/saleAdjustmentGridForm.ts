import { z } from 'zod';
import type { TFunction } from 'i18next';

// Static type-inference export (uses key-passthrough function — never an object)
const _t = ((key: string) => key) as unknown as TFunction<'pricingAnalysis'>;

const ComparativeFactors = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      factorCode: z.string({
        required_error: t('validation.factorCodeRequired'),
        invalid_type_error: t('validation.factorCodeRequired'),
      }),
    })
    .passthrough();

const SaleAdjustmentGridQualitativeSurvey = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      qualitativeLevel: z.string({
        required_error: t('validation.qualitativeLevelRequired'),
        invalid_type_error: t('validation.qualitativeLevelRequired'),
      }),
    })
    .passthrough();

const SaleAdjustmentGridQualitative = (t: TFunction<'pricingAnalysis'>) =>
  z.object({
    factorCode: z.string({
      required_error: t('validation.factorCodeRequired'),
      invalid_type_error: t('validation.factorCodeRequired'),
    }),
    qualitatives: z.array(SaleAdjustmentGridQualitativeSurvey(t)),
  });

const SaleAdjustmentGridCalculation = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      weight: z.number({
        required_error: t('validation.weightRequired'),
        invalid_type_error: t('validation.weightRequired'),
      }),
    })
    .passthrough();

const SaleAdjustmentGridFinalValue = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      finalValueRounded: z.number({
        required_error: t('validation.finalValueRoundedRequired'),
        invalid_type_error: t('validation.finalValueRoundedRequired'),
      }),
    })
    .passthrough();

const SaleAdjustmentGridAdjustmentPct = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      adjustPercent: z.number({
        required_error: t('validation.adjustPercentRequired'),
        invalid_type_error: t('validation.adjustPercentRequired'),
      }),
    })
    .passthrough();

const SaleAdjustmentGridAdjustmentFactor = (t: TFunction<'pricingAnalysis'>) =>
  z.object({
    surveys: z.array(SaleAdjustmentGridAdjustmentPct(t)),
  });

const SaleAdjustmentGridAppraisalPrice = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      appraisalPriceRounded: z.number({
        required_error: t('validation.appraisalPriceRoundedRequired'),
        invalid_type_error: t('validation.appraisalPriceRoundedRequired'),
      }),
    })
    .passthrough();

export const makeSaleAdjustmentGridDto = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      collateralType: z.string({
        required_error: t('validation.collateralTypeRequired'),
        invalid_type_error: t('validation.collateralTypeRequired'),
      }),
      pricingTemplateCode: z.string({
        required_error: t('validation.templateRequired'),
        invalid_type_error: t('validation.templateRequired'),
      }),
      comparativeFactors: z.array(ComparativeFactors(t)),
      /** Qualitative section */
      saleAdjustmentGridQualitatives: z.array(SaleAdjustmentGridQualitative(t)),
      /** Calculation section */
      saleAdjustmentGridCalculations: z.array(SaleAdjustmentGridCalculation(t)),
      /** Adjustment Factors (adjust percentage) section */
      saleAdjustmentGridAdjustmentFactors: z.array(SaleAdjustmentGridAdjustmentFactor(t)),
      /** Final value section */
      saleAdjustmentGridFinalValue: SaleAdjustmentGridFinalValue(t),
      /** Apprisal price section */
      saleAdjustmentGridAppraisalPrice: SaleAdjustmentGridAppraisalPrice(t),
    })
    .passthrough();

// Static schema for type inference only — no runtime messages
export const SaleAdjustmentGridDto = makeSaleAdjustmentGridDto(_t);

export type SaleAdjustmentGridCalculationFormType = z.infer<
  ReturnType<typeof SaleAdjustmentGridCalculation>
>;
export type SaleAdjustmentGridQualitativeSurveyFormType = z.infer<
  ReturnType<typeof SaleAdjustmentGridQualitativeSurvey>
>;
export type ComparativeFactorsFormType = z.infer<ReturnType<typeof ComparativeFactors>>;
export type SaleAdjustmentGridQualitativeFormType = z.infer<
  ReturnType<typeof SaleAdjustmentGridQualitative>
>;
export type SaleAdjustmentGridType = z.infer<typeof SaleAdjustmentGridDto>;
