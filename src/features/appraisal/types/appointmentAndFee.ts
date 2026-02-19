import type { z } from 'zod';
import type { AppointmentAndFeeFormSchema } from '../schemas/appointmentAndFee';

/**
 * Fee item in the fee breakdown table
 */
export interface FeeItem {
  id: string;
  type: '01' | '02' | '99';
  description: string;
  amount: number;
}

/**
 * Payment record for tracking payments
 */
export interface PaymentRecord {
  id: string;
  paymentDate: string;
  amount: number;
}

/**
 * Appointment data structure
 */
export interface AppointmentData {
  dateTime: string | null;
  location: string | null;
  appraiser?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}

/**
 * Fee data structure
 */
export interface FeeData {
  feeType: string | null;
  items: FeeItem[];
  bankAbsorbAmount: number;
  inspectionFee: number | null;
}

/**
 * Payment status type
 */
export type PaymentStatus = 'paid' | 'not_paid' | 'partial';

/**
 * Form type inferred from Zod schema
 */
export type AppointmentAndFeeFormType = z.infer<typeof AppointmentAndFeeFormSchema>;

/**
 * Fee type options
 */
export const FEE_TYPE_OPTIONS = [
  { value: 'pay_on_appraise_day', label: 'Pay on appraise day' },
  { value: 'pay_before_appraise', label: 'Pay before appraise' },
  { value: 'pay_after_appraise', label: 'Pay after appraise' },
  { value: 'customer_paid', label: 'Customer paid' },
] as const;

/**
 * Fee item type options
 */
export const FEE_ITEM_TYPE_OPTIONS = [
  { value: '01', label: 'Appraisal Fee' },
  { value: '02', label: 'Inspection Fee' },
  { value: '99', label: 'Other' },
] as const;

/**
 * VAT percentage
 */
export const VAT_PERCENTAGE = 7;
