import { describe, expect, it } from 'vitest';
import { isFeeChanged, splitPayment } from './winnerFee';

describe('splitPayment', () => {
  it('lets the bank pay the whole quote on full absorb', () => {
    expect(splitPayment(4_000, 0, true)).toEqual({ bankPays: 4_000, customerPays: 0 });
  });

  it('caps a partial absorb at the quoted price', () => {
    expect(splitPayment(4_000, 5_000, false)).toEqual({ bankPays: 4_000, customerPays: 0 });
  });

  it('treats an empty absorb as 0', () => {
    expect(splitPayment(4_000, null, false)).toEqual({ bankPays: 0, customerPays: 4_000 });
  });
});

describe('isFeeChanged', () => {
  const fee = (feePaymentType: string, bankAbsorbAmount: number | null) => ({
    feePaymentType,
    bankAbsorbAmount,
  });

  it('counts a different fee payment type as a change', () => {
    expect(isFeeChanged(fee('01', 0), fee('04', 0))).toBe(true);
  });

  it('counts a new absorb amount on a bank absorb type as a change', () => {
    expect(isFeeChanged(fee('04', 500), fee('04', 800))).toBe(true);
    expect(isFeeChanged(fee('99', 0), fee('99', 300))).toBe(true);
  });

  it('ignores a bank absorb type left at its saved amount', () => {
    expect(isFeeChanged(fee('04', 500), fee('04', 500))).toBe(false);
    expect(isFeeChanged(fee('04', null), fee('04', 0))).toBe(false);
  });

  it('ignores the amount on a type without a user-entered absorb', () => {
    expect(isFeeChanged(fee('01', 0), fee('01', 0))).toBe(false);
    expect(isFeeChanged(fee('05', 0), fee('05', 4_280))).toBe(false);
  });

  it('counts any edit as a change while the saved fee is unknown', () => {
    expect(isFeeChanged(undefined, fee('01', 0))).toBe(true);
  });
});
