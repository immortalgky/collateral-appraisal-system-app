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
  appraiserOpinionType: z.string().nullable(),
  appraiserOpinion: z.string().nullable(),
  committeeOpinionType: z.string().nullable(),
  committeeOpinion: z.string().nullable(),
  totalAppraisalPriceReview: z.number().nullable(),
  additionalAssumptions: z.string().nullable(),
});

export type DecisionSummaryFormType = z.infer<typeof decisionSummaryFormSchema>;

export const decisionSummaryFormDefaults: DecisionSummaryFormType = {
  isPriceVerified: null,
  conditionType: null,
  condition: null,
  remarkType: null,
  remark: null,
  appraiserOpinionType: null,
  appraiserOpinion: null,
  committeeOpinionType: null,
  committeeOpinion: null,
  totalAppraisalPriceReview: null,
  additionalAssumptions: null,
};
