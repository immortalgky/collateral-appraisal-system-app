import { z } from 'zod';
import type { PendingEvaluationFilter } from '../api/types';

export const evaluationFilterSchema = z.object({
  search: z.string().optional(),
  customerName: z.string().optional(),
  appraisalCompany: z.string().optional(),
  pic: z.string().optional(),
});

export type EvaluationFilterValues = z.infer<typeof evaluationFilterSchema>;

export const defaultEvaluationFilter: PendingEvaluationFilter = {
  page: 0,
  pageSize: 25,
};
