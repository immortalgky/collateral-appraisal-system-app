export function round2(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

export function floorToTenThousands(num) {
  return Math.floor(num / 10000) * 10000;
}

/**
 * NOTE:
 * - pct > 0 => offeringPrice - offeringPrice * pct/100
 * - else if amt > 0 => returns amt (NOT offeringPrice +/- amt)
 * - else => offeringPrice
 *
 */
export function calcAdjustedValueFromOfferingPrice(
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

export function calcDiff(propertyValue: unknown, surveyValue: unknown): number {
  const p = Number(propertyValue) || 0;
  const s = Number(surveyValue) || 0;
  return round2(p - s);
}

export function calcIncreaseDecrease(unitPrice: unknown, diff: unknown): number {
  const price = Number(unitPrice) || 0;
  const d = Number(diff) || 0;
  return round2(price * d);
}

export function calcTotalSecondRevision(
  adjustedValue: unknown,
  buildingValueIncreaseDecrease: unknown,
  landValueIncreaseDecrease: unknown,
): number {
  const a = Number(adjustedValue) || 0;
  const b = Number(buildingValueIncreaseDecrease) || 0;
  const l = Number(landValueIncreaseDecrease) || 0;
  return round2(a + b + l);
}

export function calcSum(values: unknown): number {
  const nums = (Array.isArray(values) ? values : []).map(v => Number(v) || 0);
  return round2(nums.reduce((acc, n) => acc + n, 0));
}

export function calcTotalAdjustValue(totalDiffAmt: unknown, totalSecondRevision: unknown): number {
  const td = Number(totalDiffAmt) || 0;
  const ts = Number(totalSecondRevision) || 0;
  return round2(td + ts);
}

/**
 * NOTE:
 * Weight is percent by input, so no need to (weight / 100).
 */
export function calcWeightedAdjustValue(totalAdjustValue: unknown, weight: unknown): number {
  const v = Number(totalAdjustValue) || 0;
  const w = Number(weight) || 0;
  return round2(v * w);
}

export function calcFinalValueRoundedValue(finalValue: unknown): number {
  const v = Number(finalValue) || 0;
  return floorToTenThousands(v);
}
