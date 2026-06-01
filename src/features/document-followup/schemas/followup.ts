import { z } from 'zod';
import type { TFunction } from 'i18next';

// --- Raise Followup ---

export const makeLineItemInputSchema = (t: TFunction<'documentFollowup'>) =>
  z.object({
    documentType: z.string().min(1, t('validation.documentTypeRequired')),
    notes: z.string().min(1, t('validation.notesRequired')),
  });

export const makeRaiseFollowupSchema = (t: TFunction<'documentFollowup'>) =>
  z.object({
    lineItems: z.array(makeLineItemInputSchema(t)).min(1, t('validation.atLeastOneItem')),
  });

// Static schema used where a TFunction is not available (type inference only)
export const lineItemInputSchema = z.object({
  documentType: z.string().min(1),
  notes: z.string().min(1),
});

export const raiseFollowupSchema = z.object({
  lineItems: z.array(lineItemInputSchema).min(1),
});

export type RaiseFollowupFormValues = z.infer<typeof raiseFollowupSchema>;

// --- Cancel Followup / Cancel Line Item ---

export const makeCancelWithReasonSchema = (t: TFunction<'documentFollowup'>) =>
  z.object({
    reason: z.string().min(1, t('validation.reasonRequired')),
  });

export const cancelWithReasonSchema = z.object({
  reason: z.string().min(1),
});

export type CancelWithReasonFormValues = z.infer<typeof cancelWithReasonSchema>;

// --- Decline Line Item ---

export const makeDeclineLineItemSchema = (t: TFunction<'documentFollowup'>) =>
  z.object({
    reason: z.string().min(1, t('validation.reasonRequired')),
  });

export const declineLineItemSchema = z.object({
  reason: z.string().min(1),
});

export type DeclineLineItemFormValues = z.infer<typeof declineLineItemSchema>;
