import { z } from 'zod';

const YearlyValue = z.object({
  year: z.number(),
  value: z.number(),
});

const DCFMethodForm = z.object({
  id: z.string().nullable().optional(),
  methodType: z.string(),
});

const DCFAssumptionForm = z.object({
  id: z.string().nullable().optional(),
  assumptionType: z.string(),
  assumptionName: z.string(),
  displaySeq: z.number(),
  identifier: z.string(),
  totalAssumptionValues: z.array(YearlyValue), // update form to follow the same pattern
  method: DCFMethodForm,
});

const DCFCategoryForm = z.object({
  id: z.string().nullable().optional(),
  categoryType: z.string(),
  categoryName: z.string(),
  displaySeq: z.number(),
  identifier: z.string(),
  totalCategoryValues: z.array(YearlyValue),
  assumptions: z.array(DCFAssumptionForm),
});

const DCFSectionForm = z.object({
  id: z.string().nullable().optional(),
  sectionType: z.string(), // income, expense, dcf_final, direct_final
  sectionName: z.string(),
  displaySeq: z.number(),
  identifier: z.string(),
  totalSectionValues: z.array(YearlyValue),
  categories: z.array(DCFCategoryForm),
});

export const DCFForm = z.object({
  id: z.string().nullable().optional(),
  templateCode: z.string(),
  totalNumberOfYears: z.number(),
  totalNumberOfDayInYear: z.number(),
  capitalizeRate: z.number(),
  discountedRate: z.number(),
  sections: z.array(DCFSectionForm),
  finalValue: z.number(),
  finalValueRounded: z.number(),
});

export type YearlyValueFormType = z.infer<typeof YearlyValue>;
export type DCFMethodFormType = z.infer<typeof DCFMethodForm>;
export type DCFAssumptionFormType = z.infer<typeof DCFAssumptionForm>;
export type DCFCategoryFormType = z.infer<typeof DCFCategoryForm>;
export type DCFSectionFormType = z.infer<typeof DCFSectionForm>;
export type DCFFormType = z.infer<typeof DCFForm>;
