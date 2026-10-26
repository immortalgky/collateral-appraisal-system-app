import { z } from 'zod';
import type { TFunction } from 'i18next';
import { tokenT } from '@/shared/components/form/validationMessage';

// The factories take a `t`; the static schemas below are built with the token `t`, so each message
// is a token translated where it is shown and one schema serves every language.

// --- Raise Followup ---

export const makeLineItemInputSchema = (t: TFunction<'documentFollowup'>) =>
  z.object({
    documentType: z.string().min(1, t('validation.documentTypeRequired')),
    notes: z
      .string()
      .min(1, t('validation.notesRequired'))
      .max(4000, t('validation.notesMaxLength')),
  });

export const makeRaiseFollowupSchema = (t: TFunction<'documentFollowup'>) =>
  z.object({
    lineItems: z.array(makeLineItemInputSchema(t)).min(1, t('validation.atLeastOneItem')),
  });

const tokens = tokenT('documentFollowup');

export const lineItemInputSchema = makeLineItemInputSchema(tokens);

export const raiseFollowupSchema = makeRaiseFollowupSchema(tokens);

export type RaiseFollowupFormValues = z.infer<typeof raiseFollowupSchema>;

// --- Cancel Followup / Cancel Line Item ---

export const makeCancelWithReasonSchema = (t: TFunction<'documentFollowup'>) =>
  z.object({
    reason: z.string().min(1, t('validation.reasonRequired')),
  });

export const cancelWithReasonSchema = makeCancelWithReasonSchema(tokens);

export type CancelWithReasonFormValues = z.infer<typeof cancelWithReasonSchema>;

// --- Decline Line Item ---

export const makeDeclineLineItemSchema = (t: TFunction<'documentFollowup'>) =>
  z.object({
    reason: z.string().min(1, t('validation.reasonRequired')),
  });

export const declineLineItemSchema = makeDeclineLineItemSchema(tokens);

export type DeclineLineItemFormValues = z.infer<typeof declineLineItemSchema>;
