import { describe, expect, it } from 'vitest';
import { isFullBankAbsorb, nextAbsorbAmount } from './feePaymentRules';

const fee = { bankAbsorbAmount: 1_000, totalFeeAfterVAT: 5_350 };

describe('nextAbsorbAmount', () => {
  it('takes the whole fee when switching to full absorb', () => {
    expect(nextAbsorbAmount('01', '05', fee)).toBe(5_350);
  });

  it('resets to 0 when switching to a type without absorb', () => {
    expect(nextAbsorbAmount('04', '01', fee)).toBe(0);
  });

  it('resets to 0 when moving from full absorb to partial', () => {
    expect(nextAbsorbAmount('06', '04', fee)).toBe(0);
  });

  it('keeps the current amount when moving to partial from a non-full type', () => {
    expect(nextAbsorbAmount('99', '04', fee)).toBe(1_000);
  });
});

describe('isFullBankAbsorb', () => {
  it('handles missing types', () => {
    expect(isFullBankAbsorb(undefined)).toBe(false);
    expect(isFullBankAbsorb('07')).toBe(true);
  });
});
