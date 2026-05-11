import { z } from 'zod';

const ratingSchema = z.number().int().min(1).max(4);

export const evaluationSchema = z.object({
  criteria1Rating: ratingSchema,
  criteria1Description: z.string().nullable().optional(),
  criteria2Rating: ratingSchema,
  criteria2IsAutoDetected: z.boolean(),
  criteria2DetectedDays: z.number().nullable().optional(),
  criteria2Description: z.string().nullable().optional(),
  criteria3Rating: ratingSchema,
  criteria3Description: z.string().nullable().optional(),
  criteria4Rating: ratingSchema,
  criteria4Description: z.string().nullable().optional(),
  criteria5Rating: ratingSchema,
  criteria5Description: z.string().nullable().optional(),
  additionalComments: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  evaluationStatus: z.enum(['Draft', 'Completed']),
});

export type EvaluationFormValues = z.infer<typeof evaluationSchema>;

export const defaultEvaluationValues: EvaluationFormValues = {
  criteria1Rating: 1,
  criteria1Description: null,
  criteria2Rating: 1,
  criteria2IsAutoDetected: false,
  criteria2DetectedDays: null,
  criteria2Description: null,
  criteria3Rating: 1,
  criteria3Description: null,
  criteria4Rating: 1,
  criteria4Description: null,
  criteria5Rating: 1,
  criteria5Description: null,
  additionalComments: null,
  note: null,
  evaluationStatus: 'Draft',
};

/** Criteria weights — fixed per spec */
export const CRITERIA_WEIGHTS = [0.4, 0.3, 0.1, 0.1, 0.1] as const;

/** Label for each criterion */
export const CRITERIA_LABELS = [
  'Report book quality',
  'Delivery time',
  'Preparing company personnel',
  'Response time to problem',
  'Coordination & responsibility',
] as const;
