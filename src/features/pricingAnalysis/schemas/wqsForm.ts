import { z } from 'zod';

const requireMsg = (fieldName: string, msg: string = 'is required.') => ({
  required_error: `${fieldName} ${msg}`,
  invalid_type_error: `${fieldName} ${msg}`,
});

/** select surveys section */
const ComparativeFactor = z
  .object({
    factorCode: z.string(requireMsg('Factor code')),
  })
  .passthrough();

/** WQS scoring section */
const WQSSurveyScore = z
  .object({
    surveyScore: z.number().nullable(),
  })
  .passthrough();

const WQSScore = z.object({
  factorCode: z.string(requireMsg('Factor code')),
  weight: z.number(requireMsg('Weight')),
  intensity: z.number(requireMsg('Intensity')),
  surveys: z.array(WQSSurveyScore).superRefine((items, ctx) => {
    for (const [i, item] of items.entries()) {
      if (item.surveyScore == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Survey ${i + 1}'s score is required`, // 1-based index
          path: [i, 'surveyScore'], // target the correct field
        });
      }
    }
  }),
  collateral: z.number(requireMsg('Collateral score')),
});

/** Adjust final price section */
const WQSFinalValue = z
  .object({
    finalValueRounded: z.number(requireMsg('Final value (rounded)')),
    appraisalPriceRounded: z.number(requireMsg('Appraisal price (rounded)')),
  })
  .passthrough();

export const WQSDto = z
  .object({
    collateralType: z.string(requireMsg('Collateral type')),
    pricingTemplateCode: z.string(requireMsg('Template')),
    comparativeFactors: z.array(ComparativeFactor),
    WQSScores: z.array(WQSScore),
    WQSFinalValue: WQSFinalValue,

    generateAt: z.string(),
  })
  .passthrough();

export type WQSSurveyScoreFormType = z.infer<typeof WQSSurveyScore>;
export type WQSScoreFormType = z.infer<typeof WQSScore>;
export type WQSFinalValueFormType = z.infer<typeof WQSFinalValue>;

export type ComparativeFactorFormType = z.infer<typeof ComparativeFactor>;
export type WQSFormType = z.infer<typeof WQSDto>;
