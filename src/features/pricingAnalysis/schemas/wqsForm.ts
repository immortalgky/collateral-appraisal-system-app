import { z } from 'zod';
import type { TFunction } from 'i18next';

// Static type-inference export (uses key-passthrough function — never an object)
const _t = ((key: string) => key) as unknown as TFunction<'pricingAnalysis'>;

/** select surveys section */
const ComparativeFactor = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      factorCode: z.string({
        required_error: t('validation.factorCodeRequired'),
        invalid_type_error: t('validation.factorCodeRequired'),
      }),
    })
    .passthrough();

/** WQS scoring section */
const WQSSurveyScore = z
  .object({
    surveyScore: z.number().nullable(),
  })
  .passthrough();

const WQSScore = (t: TFunction<'pricingAnalysis'>) =>
  z.object({
    factorCode: z.string({
      required_error: t('validation.factorCodeRequired'),
      invalid_type_error: t('validation.factorCodeRequired'),
    }),
    weight: z.number({
      required_error: t('validation.weightRequired'),
      invalid_type_error: t('validation.weightRequired'),
    }),
    intensity: z.number({
      required_error: t('validation.intensityRequired'),
      invalid_type_error: t('validation.intensityRequired'),
    }),
    surveys: z.array(WQSSurveyScore).superRefine((items, ctx) => {
      for (const [i, item] of items.entries()) {
        if (item.surveyScore == null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('validation.surveyScoreRequired', { n: i + 1 }),
            path: [i, 'surveyScore'],
          });
        }
      }
    }),
    collateral: z.number({
      required_error: t('validation.collateralScoreRequired'),
      invalid_type_error: t('validation.collateralScoreRequired'),
    }),
  });

/** Adjust final price section */
const WQSFinalValue = (t: TFunction<'pricingAnalysis'>) =>
  z
    .object({
      finalValueRounded: z.number({
        required_error: t('validation.finalValueRoundedRequired'),
        invalid_type_error: t('validation.finalValueRoundedRequired'),
      }),
      landValue: z
        .number({
          required_error: t('validation.landValueRequired'),
          invalid_type_error: t('validation.landValueRequired'),
        })
        .optional(),
      buildingValue: z.number().optional(),
      appraisalPrice: z.number().optional(),
    })
    .passthrough();

export const makeWQSDto = (t: TFunction<'pricingAnalysis'>) =>
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
      comparativeFactors: z.array(ComparativeFactor(t)),
      WQSScores: z.array(WQSScore(t)),
      WQSFinalValue: WQSFinalValue(t),

      generateAt: z.string(),
    })
    .passthrough();

// Static schema for type inference only — no runtime messages
export const WQSDto = makeWQSDto(_t);

export type WQSSurveyScoreFormType = z.infer<typeof WQSSurveyScore>;
export type WQSScoreFormType = z.infer<ReturnType<typeof WQSScore>>;
export type WQSFinalValueFormType = z.infer<ReturnType<typeof WQSFinalValue>>;

export type ComparativeFactorFormType = z.infer<ReturnType<typeof ComparativeFactor>>;
export type WQSFormType = z.infer<typeof WQSDto>;
