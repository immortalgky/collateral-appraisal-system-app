import { z } from 'zod';
import { vmsg } from '@/shared/components/form/validationMessage';

// Messages are tokens (translated where the error is shown), so one static schema serves every language.
const msg = (key: string) => vmsg(`appraisal:validation.${key}`);

/**
 * Fee item schema
 */
export const FeeItemSchema = z.object({
  id: z.string(),
  type: z.enum(['01', '02', '99']),
  description: z.string().min(1, msg('descriptionRequired')),
  amount: z.number().min(0, msg('amountNonNegative')),
});

/**
 * Payment record schema
 */
export const PaymentRecordSchema = z.object({
  id: z.string(),
  paymentDate: z.string().min(1, msg('paymentDateRequired')),
  amount: z.number().min(0, msg('amountNonNegative')),
});

/**
 * Appointment section schema
 */
export const AppointmentSchema = z.object({
  dateTime: z.string().nullable(),
  location: z.string().nullable(),
  contactPerson: z.string().nullable(),
  contactPhone: z.string().nullable(),
});

/**
 * Fee section schema
 */
export const FeeSchema = z.object({
  feeType: z.string().min(1, msg('feeTypeRequired')).nullable(),
  items: z.array(FeeItemSchema),
  bankAbsorbAmount: z.number().min(0, msg('bankAbsorbNonNegative')),
  constructionInspectionFee: z.number().min(0, msg('ciFeeNonNegative')).nullable(),
});

/**
 * Main form schema for Appointment & Fee page
 */
export const AppointmentAndFeeFormSchema = z.object({
  appointment: AppointmentSchema,
  fee: FeeSchema,
  payments: z.array(PaymentRecordSchema),
});

/**
 * Default values for the form
 */
export const appointmentAndFeeFormDefaults = {
  appointment: {
    dateTime: null,
    location: null,
  },
  fee: {
    feeType: null,
    items: [],
    bankAbsorbAmount: 0,
    constructionInspectionFee: null,
  },
  payments: [],
};

/**
 * Schema for reschedule modal
 */
export const RescheduleFormSchema = z.object({
  dateTime: z.string().min(1, msg('dateTimeRequired')),
  location: z.string().min(1, msg('locationRequired')),
  reason: z.string().optional(),
  contactPerson: z.string().min(1, msg('contactPersonRequired')),
  contactPhone: z.string().min(1, msg('contactPhoneRequired')),
});

/**
 * Schema for add fee modal
 */
export const AddFeeFormSchema = z.object({
  // Any code: an item being edited keeps the code it has (the server accepts an unchanged
  // legacy one), while a new item is always created as "Other" (99) by the modal.
  type: z.string().min(1),
  description: z.string().min(1, msg('descriptionRequired')),
  // The server rejects a fee item of 0 or less, so the form does too.
  amount: z.number().positive(msg('amountPositive')),
});

export type AddFeeFormData = z.infer<typeof AddFeeFormSchema>;

/**
 * Schema for add payment modal
 */
export const AddPaymentFormSchema = z.object({
  paymentDate: z.string().min(1, msg('paymentDateRequired')),
  amount: z.number().min(0.01, msg('amountPositive')),
});
