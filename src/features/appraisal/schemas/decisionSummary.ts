import { z } from 'zod';

/**
 * Form schema for the editable fields of the Decision Summary page.
 * Mirrors SaveDecisionSummaryRequest from the API.
 */
export const decisionSummaryFormSchema = z.object({
  isPriceVerified: z.boolean().nullable(),
  conditionType: z.string().nullable(),
  condition: z.string().nullable(),
  remarkType: z.string().nullable(),
  remark: z.string().nullable(),
  externalAppraiserOpinionType: z.string().nullable(),
  externalAppraiserOpinion: z.string().nullable(),
  committeeOpinionType: z.string().nullable(),
  committeeOpinion: z.string().nullable(),
  internalAppraiserOpinionType: z.string().nullable(),
  internalAppraiserOpinion: z.string().nullable(),
  totalAppraisalPriceReview: z.number().nullable(),
  additionalAssumptions: z.string().nullable(),
});

export type DecisionSummaryFormType = z.infer<typeof decisionSummaryFormSchema>;

export const decisionSummaryFormDefaults: DecisionSummaryFormType = {
  isPriceVerified: true,
  conditionType: null,
  condition: null,
  remarkType: null,
  remark: null,
  externalAppraiserOpinionType: null,
  externalAppraiserOpinion: null,
  committeeOpinionType: null,
  committeeOpinion: null,
  internalAppraiserOpinionType: null,
  internalAppraiserOpinion: null,
  totalAppraisalPriceReview: null,
  additionalAssumptions: null,
};
