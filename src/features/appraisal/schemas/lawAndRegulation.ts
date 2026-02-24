import { z } from 'zod';

export const createLawAndRegulationForm = z.object({
  headerCode: z.string().min(1, 'Header is required'),
  remark: z.string().max(4000).nullable(),
});

export type CreateLawAndRegulationFormType = z.infer<typeof createLawAndRegulationForm>;

export const createLawAndRegulationFormDefault: CreateLawAndRegulationFormType = {
  headerCode: '',
  remark: null,
};
