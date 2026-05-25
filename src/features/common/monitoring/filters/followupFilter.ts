import { z } from 'zod';
import type { PendingFollowupFilter } from '../api/types';

export const followupFilterSchema = z.object({
  search: z.string().optional(),
  customerName: z.string().optional(),
  routeBackType: z.string().optional(),
  appraisalCompany: z.string().optional(),
});

export type FollowupFilterValues = z.infer<typeof followupFilterSchema>;

export const defaultFollowupFilter: PendingFollowupFilter = {
  page: 0,
  pageSize: 25,
};
