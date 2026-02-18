import { z } from 'zod';

/**
 * Fee item schema
 */
export const FeeItemSchema = z.object({
  id: z.string(),
  type: z.enum(['01', '02', '99']),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
});

/**
 * Payment record schema
 */
export const PaymentRecordSchema = z.object({
  id: z.string(),
  paymentDate: z.string().min(1, 'Payment date is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
});

/**
 * Appointment section schema
 */
export const AppointmentSchema = z.object({
  dateTime: z.string().nullable(),
  location: z.string().nullable(),
});

/**
 * Fee section schema
 */
export const FeeSchema = z.object({
  feeType: z.string().min(1, 'Fee type is required').nullable(),
  items: z.array(FeeItemSchema),
  bankAbsorbAmount: z.number().min(0, 'Bank absorb amount must be non-negative'),
  inspectionFee: z.number().min(0, 'Inspection fee must be non-negative').nullable(),
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
    inspectionFee: null,
  },
  payments: [],
};

/**
 * Schema for reschedule modal
 */
export const RescheduleFormSchema = z.object({
  dateTime: z.string().min(1, 'Date and time is required'),
  location: z.string().min(1, 'Location is required'),
  reason: z.string().optional(),
});

/**
 * Schema for add fee modal
 */
export const AddFeeFormSchema = z.object({
  type: z.enum(['01', '02', '99']),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
});

/**
 * Schema for add payment modal
 */
export const AddPaymentFormSchema = z.object({
  paymentDate: z.string().min(1, 'Payment date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
});
