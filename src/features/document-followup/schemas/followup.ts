import { z } from 'zod';

// --- Raise Followup ---

export const lineItemInputSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  notes: z.string().min(1, 'Notes are required'),
});

export const raiseFollowupSchema = z.object({
  lineItems: z
    .array(lineItemInputSchema)
    .min(1, 'At least one document request is required'),
});

export type RaiseFollowupFormValues = z.infer<typeof raiseFollowupSchema>;

// --- Cancel Followup / Cancel Line Item ---

export const cancelWithReasonSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export type CancelWithReasonFormValues = z.infer<typeof cancelWithReasonSchema>;

// --- Decline Line Item ---

export const declineLineItemSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});

export type DeclineLineItemFormValues = z.infer<typeof declineLineItemSchema>;
