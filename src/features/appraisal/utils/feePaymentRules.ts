/** Fee types where the bank absorbs part of the fee and the customer pays the rest. */
export const BANK_ABSORB_FEE_TYPES = ['04'];
/** Fee types for which the bank absorbs the entire fee amount automatically (not user-editable). */
export const FULL_BANK_ABSORB_FEE_TYPES = ['05', '06', '07'];
/** Fee types for which the bank-absorb amount input is shown (required for '04', optional for '99'). */
export const BANK_ABSORB_SHOW_TYPES = ['04', '99'];

export const isFullBankAbsorb = (feePaymentType?: string | null) =>
  FULL_BANK_ABSORB_FEE_TYPES.includes(feePaymentType ?? '');

/**
 * Bank-absorb amount after switching fee type:
 * - to full absorb: the whole fee
 * - to a type without absorb: 0
 * - from full absorb to partial: 0 (the old figure was the whole fee, not a chosen amount)
 * - otherwise to partial: keep the current amount
 */
export const nextAbsorbAmount = (
  fromType: string,
  toType: string,
  fee: { bankAbsorbAmount: number; totalFeeAfterVAT: number },
): number => {
  if (isFullBankAbsorb(toType)) return fee.totalFeeAfterVAT;
  if (!BANK_ABSORB_FEE_TYPES.includes(toType)) return 0;
  return isFullBankAbsorb(fromType) ? 0 : fee.bankAbsorbAmount;
};
