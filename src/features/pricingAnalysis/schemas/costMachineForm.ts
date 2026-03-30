import { z } from 'zod';

const MachineryItemSchema = z.object({
  quantity: z.number().nullable(),
  machineName: z.string().nullable(),
  registrationNo: z.string().nullable(),
  manufacturer: z.string().nullable(),
  conditionUse: z.string().nullable(),
  yearOfManufacture: z.number().nullable(),
});

const MachineryRowSchema = z.object({
  machine: MachineryItemSchema,
  rcn: z.number().nullable(),
  lifeSpan: z.number().nullable(),
  conditionFactor: z.number().nullable(),
  physicalDeterioration: z.number().nullable(),
  functionalObsolescence: z.number().nullable(),
  economicObsolescence: z.number().nullable(),
  fmv: z.number().nullable(),
  marketDemand: z.enum(['Y', 'N']).nullable(),
  remark: z.string().nullable(),
});

export const CostMachineFormSchema = z.object({
  groupDescription: z.string().nullable(),
  remark: z.string().nullable(),
  machineryCosts: z.array(MachineryRowSchema),
});

export type CostMachineFormType = z.infer<typeof CostMachineFormSchema>;
export type MachineryRowFormType = z.infer<typeof MachineryRowSchema>;
export type MachineryItemType = z.infer<typeof MachineryItemSchema>;
