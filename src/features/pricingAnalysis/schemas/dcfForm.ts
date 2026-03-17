import { z } from 'zod';

const YearlyValue = z.object({
  year: z.number(),
  value: z.number(),
});

const DCFMethod = z.object({
  id: z.string(),
  methodType: z.string(),
});

const DCFAssumption = z.object({
  id: z.string(),
  assumptionType: z.string(),
  assumptionName: z.string(),
  displaySeq: z.number(),
  identifier: z.string(),
  totalAssumptionValues: z.array(YearlyValue),
  method: DCFMethod,
});

const DCFCategory = z.object({
  id: z.string(),
  categoryType: z.string(),
  categoryName: z.string(),
  displaySeq: z.number(),
  identifier: z.string(),
  totalCategoryValues: z.array(YearlyValue),
  assumptions: z.array(DCFAssumption),
});

const DCFSection = z.object({
  id: z.string(),
  sectionType: z.string(), // income, expense, dcf_final, direct_final
  sectionName: z.string(),
  displaySeq: z.number(),
  identifier: z.string(),
  totalSectionValues: z.array(YearlyValue),
  categories: z.array(DCFCategory),
});

export const DCF = z.object({
  id: z.string(),
  templateCode: z.string(),
  totalNumberOfYears: z.number(),
  totalNumberOfDayInYear: z.number(),
  capitalizeRate: z.number(),
  discountedRate: z.number(),
  sections: z.array(DCFSection),
  finalValue: z.number(),
  finalValueRounded: z.number(),
});

export type YearlyValueFormType = z.infer<typeof YearlyValue>;
export type DCFMethodFormType = z.infer<typeof DCFMethod>;
export type DCFAssumptionFormType = z.infer<typeof DCFAssumption>;
export type DCFCategoryFormType = z.infer<typeof DCFCategory>;
export type DCFSectionFormType = z.infer<typeof DCFSection>;
export type DCFFormType = z.infer<typeof DCF>;
