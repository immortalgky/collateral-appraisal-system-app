import { BANK_ABSORB_SHOW_TYPES } from '@/features/appraisal/utils/feePaymentRules';

/** A fee as last saved; fields are optional because the API may leave them out. */
export interface SavedFee {
  feePaymentType?: string | null;
  bankAbsorbAmount?: number | null;
}

/**
 * Whether an edit differs from the saved fee, so only real changes are sent on confirm.
 * The absorb amount only counts for types where the user enters it; an empty amount is 0,
 * as that is what gets saved.
 */
export function isFeeChanged(
  saved: SavedFee | undefined,
  next: { feePaymentType: string; bankAbsorbAmount: number | null },
) {
  if (!saved) return true;
  if (saved.feePaymentType !== next.feePaymentType) return true;
  if (!BANK_ABSORB_SHOW_TYPES.includes(next.feePaymentType)) return false;
  return (saved.bankAbsorbAmount ?? 0) !== (next.bankAbsorbAmount ?? 0);
}

/** Splits a quoted price between bank and customer; the bank never pays more than the quote. */
export function splitPayment(
  quotedPrice: number,
  bankAbsorbAmount: number | null,
  isFullAbsorb: boolean,
) {
  const bankPays = isFullAbsorb
    ? quotedPrice
    : Math.min(Math.max(bankAbsorbAmount ?? 0, 0), quotedPrice);
  return { bankPays, customerPays: quotedPrice - bankPays };
}
