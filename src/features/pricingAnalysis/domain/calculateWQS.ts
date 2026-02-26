export function round2(n: unknown): number {
  const x = Number(n) || 0;
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

export function floorToTenThousands(n: unknown) {
  const x = Number(n) || 0;
  return Math.floor(x / 10000) * 10000;
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

export const toFiniteNumber = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;

  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  // If RHF gives you an array (or someone stored a tuple), take the first usable number.
  if (Array.isArray(v)) {
    for (const item of v) {
      const n = toFiniteNumber(item, NaN);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  }

  return fallback;
};

export const toNumberArray = (arr: unknown[], fallback = 0): number[] =>
  arr.map(v => toFiniteNumber(v, fallback));

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

export function calcAdjustedValueFromSellingPrice(
  sellingPrice: unknown,
  numberOfYears: unknown,
  sellingPriceAdjustmentYearPct: unknown,
): number {
  const price = Number(sellingPrice);
  if (!Number.isFinite(price) || price === 0) return 0;

  const years = Number(numberOfYears) || 0;
  const pctPerYear = Number(sellingPriceAdjustmentYearPct) || 0;

  return round2(price + (price * years * pctPerYear) / 100);
}
