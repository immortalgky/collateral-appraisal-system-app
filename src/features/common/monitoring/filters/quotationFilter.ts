import { z } from 'zod';
import type { PendingQuotationFilter } from '../api/types';

export const quotationFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  cutOffTimeFrom: z.string().optional(),
  cutOffTimeTo: z.string().optional(),
  appraisalCompanyName: z.string().optional(),
  customerName: z.string().optional(),
});

export type QuotationFilterValues = z.infer<typeof quotationFilterSchema>;

export const defaultQuotationFilter: PendingQuotationFilter = {
  page: 0,
  pageSize: 25,
};
