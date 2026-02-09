export function round2(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

export function floorToTenThousands(num) {
  return Math.floor(num / 10000) * 10000;
}

export function calcWeightedScore(weight: unknown, score: unknown) {
  const w = Number(weight) || 0;
  const s = Number(score) || 0;
  return round2(w * s);
}

export function calcSum(values: unknown): number {
  const nums = (Array.isArray(values) ? values : []).map(v => Number(v) || 0);
  return round2(nums.reduce((acc, n) => acc + n, 0));
}

/**
 * NOTE:
 * - pct > 0 => offeringPrice - offeringPrice * pct/100
 * - else if amt > 0 => returns amt (NOT offeringPrice +/- amt)
 * - else => offeringPrice
 *
 */
export function calcAdjustedValue(
  offeringPrice: unknown,
  offeringPriceAdjustmentPct: unknown,
  offeringPriceAdjustmentAmt: unknown,
): number {
  const price = Number(offeringPrice);
  if (!Number.isFinite(price) || price === 0) return 0;

  const pct = Number(offeringPriceAdjustmentPct) || 0;
  const amt = Number(offeringPriceAdjustmentAmt) || 0;

  if (pct > 0) return round2(price - (price * pct) / 100);
  if (amt > 0) return round2(amt); // keeping your current logic
  return round2(price);
}

export function calcAdjustValueFromSellingPrice(
  sellingPriceAdjustmentPct: unknown,
  totalNumberOfYear: unknown,
): number {
  const price = Number(sellingPriceAdjustmentPct);
  if (!Number.isFinite(price) || price === 0) return 0;

  const totalYear = Number(totalNumberOfYear) || 0;

  return round2(price * totalYear);
}
