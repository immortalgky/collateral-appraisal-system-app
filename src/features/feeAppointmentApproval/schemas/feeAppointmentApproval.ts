import { z } from 'zod';
import type { TFunction } from 'i18next';

export const makeResolveSchema = (t: TFunction<'feeAppointmentApproval'>) =>
  z
    .object({
      appointmentDecision: z.enum(['approve', 'reject']).optional(),
      appointmentReason: z.string().optional(),
      feeDecision: z.enum(['approve', 'reject']).optional(),
      feeReason: z.string().optional(),
    })
    .superRefine((val, ctx) => {
      if (val.appointmentDecision === 'reject' && !val.appointmentReason?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['appointmentReason'],
          message: t('validation.reasonRequired'),
        });
      }
      if (val.feeDecision === 'reject' && !val.feeReason?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['feeReason'],
          message: t('validation.reasonRequired'),
        });
      }
    });

export type ResolveFormValues = z.infer<ReturnType<typeof makeResolveSchema>>;
