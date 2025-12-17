import { z } from 'zod';

export const buildingDepreciation = z.object({
  atYear: z.number(),
  toYear: z.number(),
  depreciationPerYear: z.number(),
  totalDepreciationPerYear: z.number(),
  priceAfterDepreciation: z.number(),
});

export const buildingDetailDto = z.object({
  seq: z.number(),
  detail: z.string().nullable(),
  isBuilding: z.boolean(),
  area: z.number(),
  pricePerSqMeterBeforeDepreciation: z.number(),
  totalPriceBeforeDepreciation: z.number(),
  year: z.coerce.number(),
  depreciationPercentPerYear: z.number(),
  totalDepreciationPercent: z.number(),
  method: z.string(),
  pricePerSqMeterAfterDepreciation: z.number(),
  totalPriceAfterDepreciation: z.number(),
  buildingDepreciations: z.array(buildingDepreciation).optional(),
});

export const buildingDetailSchema = z.object({
  buildings: z.array(buildingDetailDto).optional(),
});

export const rowSchema = z.object({
  atYear: z.number().min(0, 'Must be ≥ 0'),
  toYear: z.number().min(0, 'Must be ≥ 0'),
  deprePerYear: z.number().min(0, 'Must be ≥ 0').max(100, 'Must be <= 100'),
  totalDepre: z.number(),
  price: z.number(),
});

export const formSchema = z.object({
  totalPrice: z.coerce.number(),
  rows: z.array(rowSchema).min(1, 'At least one row'),
});

export type FormValues = z.infer<typeof formSchema>;
export type RowValues = z.infer<typeof rowSchema>;
export type BuildingDetailFormValue = z.infer<typeof buildingDetailSchema>;
