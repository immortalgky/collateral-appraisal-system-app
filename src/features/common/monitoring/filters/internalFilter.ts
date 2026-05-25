import { z } from 'zod';
import type { PendingInternalFilter } from '../api/types';

export const internalFilterSchema = z.object({
  search: z.string().optional(),
  customerName: z.string().optional(),
  pic: z.string().optional(),
  purpose: z.string().optional(),
  taskType: z.string().optional(),
  propertyType: z.string().optional(),
});

export type InternalFilterValues = z.infer<typeof internalFilterSchema>;

export const defaultInternalFilter: PendingInternalFilter = {
  page: 0,
  pageSize: 25,
};
