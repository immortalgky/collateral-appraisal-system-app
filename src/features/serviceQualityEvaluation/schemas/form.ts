import { z } from 'zod';
import { vmsg } from '@/shared/components/form/validationMessage';

const ratingSchema = z.number().int().min(1).max(5).nullable().optional();
const remarkSchema = z
  .string()
  .max(500, vmsg('maxLength', { max: 500 }))
  .nullable()
  .optional();

export const evaluationSchema = z.object({
  criteria1Rating: ratingSchema,
  criteria2Rating: ratingSchema,
  // Internal display flags — populated by the auto-detect effect, never user-edited.
  // Marked .optional() so RHF can hold them as undefined without tripping Zod.
  criteria2IsAutoDetected: z.boolean().optional(),
  criteria2DetectedDays: z.number().nullable().optional(),
  criteria2AutoLocked: z.boolean().optional(),
  criteria3Rating: ratingSchema,
  criteria4Rating: ratingSchema,
  criteria5Rating: ratingSchema,
  criteria1Remark: remarkSchema,
  criteria2Remark: remarkSchema,
  criteria3Remark: remarkSchema,
  criteria4Remark: remarkSchema,
  criteria5Remark: remarkSchema,
  additionalComments: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  evaluationStatus: z.enum(['Pending', 'Completed']).optional(),
});

export type EvaluationFormValues = z.infer<typeof evaluationSchema>;

export const defaultEvaluationValues: EvaluationFormValues = {
  criteria1Rating: null,
  criteria2Rating: null,
  criteria2IsAutoDetected: false,
  criteria2DetectedDays: null,
  criteria2AutoLocked: false,
  criteria3Rating: null,
  criteria4Rating: null,
  criteria5Rating: null,
  criteria1Remark: null,
  criteria2Remark: null,
  criteria3Remark: null,
  criteria4Remark: null,
  criteria5Remark: null,
  additionalComments: null,
  note: null,
  evaluationStatus: 'Pending',
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
