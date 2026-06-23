import { z } from 'zod';

const MachineryItemSchema = z.object({
  appraisalPropertyId: z.string(),
  quantity: z.number().nullable(),
  machineName: z.string().nullable(),
  registrationNumber: z.string().nullable(),
  manufacturer: z.string().nullable(),
  conditionUse: z.string().nullable(),
  yearOfManufacture: z.number().nullable(),
});

const MachineryRowSchema = z.object({
  id: z.string().nullable(),
  appraisalPropertyId: z.string(),
  machine: MachineryItemSchema,
  rcn: z
    .number({ required_error: 'RCN is required', invalid_type_error: 'RCN must be a number' })
    .min(0, 'RCN must be at least 0'),
  lifeSpan: z
    .number({
      required_error: 'Life span is required',
      invalid_type_error: 'Life span must be a number',
    })
    .min(0, 'Life span must be at least 0'),
  durationInUse: z.number(),
  residualLifeSpan: z.number(),
  conditionFactor: z
    .number({
      required_error: 'Condition factor is required',
      invalid_type_error: 'Condition factor must be a number',
    })
    .min(0, 'Condition factor must be at least 0')
    .max(1, 'Condition factor must be at most 1'),
  physicalDeterioration: z.number().nullable(),
  functionalObsolescence: z
    .number({
      required_error: 'Functional obsolescence is required',
      invalid_type_error: 'Functional obsolescence must be a number',
    })
    .min(0, 'Functional obsolescence must be at least 0')
    .max(1, 'Functional obsolescence must be at most 1'),
  economicObsolescence: z
    .number({
      required_error: 'Economic obsolescence is required',
      invalid_type_error: 'Economic obsolescence must be a number',
    })
    .min(0, 'Economic obsolescence must be at least 0')
    .max(1, 'Economic obsolescence must be at most 1'),
  fmv: z.number().nullable(),
  marketDemand: z.enum(['Y', 'N']).nullable(),
  notes: z.string().nullable(),
});

export const CostMachineFormSchema = z.object({
  remark: z.string().nullable(),
  machineryCosts: z.array(MachineryRowSchema),
});

export type CostMachineFormType = z.infer<typeof CostMachineFormSchema>;
export type MachineryRowFormType = z.infer<typeof MachineryRowSchema>;
export type MachineryItemType = z.infer<typeof MachineryItemSchema>;
