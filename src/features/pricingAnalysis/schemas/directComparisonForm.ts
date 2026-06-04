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

const DirectComparisonQualitativeSurvey = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      qualitativeLevel: z.string({
        required_error: t('validation.qualitativeLevelRequired'),
        invalid_type_error: t('validation.qualitativeLevelRequired'),
      }),
    })
    .passthrough();

const DirectComparisonQualitative = (t: TFunction<'pricingAnalysis'>) =>
  z.object({
    factorCode: z.string({
      required_error: t('validation.factorCodeRequired'),
      invalid_type_error: t('validation.factorCodeRequired'),
    }),
    qualitatives: z.array(DirectComparisonQualitativeSurvey(t)),
  });

const DirectComparisonFinalValue = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      finalValueRounded: z.number({
        required_error: t('validation.finalValueRoundedRequired'),
        invalid_type_error: t('validation.finalValueRoundedRequired'),
      }),
    })
    .passthrough();

const DirectComparisonAdjustmentPct = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      adjustPercent: z.number({
        required_error: t('validation.adjustPercentRequired'),
        invalid_type_error: t('validation.adjustPercentRequired'),
      }),
    })
    .passthrough();

const DirectComparisonAdjustmentFactor = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      surveys: z.array(DirectComparisonAdjustmentPct(t)),
    })
    .passthrough();

const DirectComparisonAppraisalPrice = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      appraisalPriceRounded: z.number({
        required_error: t('validation.appraisalPriceRoundedRequired'),
        invalid_type_error: t('validation.appraisalPriceRoundedRequired'),
      }),
    })
    .passthrough();

export const makeDirectComparisonDto = (t: TFunction<'pricingAnalysis'>) =>
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
      directComparisonQualitatives: z.array(DirectComparisonQualitative(t)),
      /** Adjustment Factors (adjust percentage) section */
      directComparisonAdjustmentFactors: z.array(DirectComparisonAdjustmentFactor(t)),
      /** Final value section */
      directComparisonFinalValue: DirectComparisonFinalValue(t),
      /** Apprisal price section */
      directComparisonAppraisalPrice: DirectComparisonAppraisalPrice(t),
    })
    .passthrough();

// Static schema for type inference only — no runtime messages
export const DirectComparisonDto = makeDirectComparisonDto(_t);

export type DirectComparisonQualitativeSurveyFormType = z.infer<
  ReturnType<typeof DirectComparisonQualitativeSurvey>
>;
export type ComparativeFactorsFormType = z.infer<ReturnType<typeof ComparativeFactors>>;
export type DirectComparisonQualitativeFormType = z.infer<
  ReturnType<typeof DirectComparisonQualitative>
>;
export type DirectComparisonType = z.infer<typeof DirectComparisonDto>;
