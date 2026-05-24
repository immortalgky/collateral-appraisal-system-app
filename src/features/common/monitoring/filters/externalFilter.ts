import { z } from 'zod';
import type { PendingExternalFilter } from '../api/types';

export const externalFilterSchema = z.object({
  search: z.string().optional(),
  customerName: z.string().optional(),
  appraisalCompany: z.string().optional(),
  purpose: z.string().optional(),
  taskType: z.string().optional(),
  propertyType: z.string().optional(),
});

export type ExternalFilterValues = z.infer<typeof externalFilterSchema>;

export const defaultExternalFilter: PendingExternalFilter = {
  page: 0,
  pageSize: 25,
};
