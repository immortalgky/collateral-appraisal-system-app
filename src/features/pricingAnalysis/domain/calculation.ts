/**
 * Numeric utility functions for the Collateral Appraisal System.
 * Place this file in: src/shared/utils/number.utils.ts
 */
import { propertyTaxRanges } from '@features/pricingAnalysis/data/dcfParameters.ts';

type Numberish = string | number | null | undefined;

/**
 * Safely converts any value to a finite number.
 * Returns `fallback` (default 0) for null, undefined, empty string, NaN, and Infinity.
 *
 * @example
 * toNumber("1,234.5")  // 1234.5
 * toNumber(null)        // 0
 * toNumber("abc")       // 0
 * toNumber(undefined, -1) // -1
 */
export function toNumber(value: Numberish, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;

  const cleaned = typeof value === 'string' ? value.replace(/,/g, '') : value;
  const num = Number(cleaned);

  return Number.isFinite(num) ? num : fallback;
}

/**
 * Sums an array of values, safely converting each to a number first.
 * Optionally accepts an accessor function to pluck a value from objects.
 *
 * @example
 * sumArray([1, 2, 3])                          // 6
 * sumArray(["10", null, "20"])                  // 30
 * sumArray(rooms, (r) => r.roomIncome)          // sum of roomIncome
 * sumArray(rooms, (r) => r.roomIncome * r.area) // sum of computed values
 */
export function sumArray(values: Numberish[]): number;
export function sumArray<T>(values: T[], accessor: (item: T) => Numberish): number;
export function sumArray<T>(values: T[], accessor?: (item: T) => Numberish): number {
  if (!Array.isArray(values) || values.length === 0) return 0;

  return values.reduce<number>((sum, item) => {
    const raw = accessor ? accessor(item) : (item as Numberish);
    return sum + toNumber(raw);
  }, 0);
}

/**
 * Rounds a number to the nearest thousand.
 *
 * @example
 * roundToThousand(1234567)   // 1235000
 * roundToThousand(500)       // 1000
 * roundToThousand(499)       // 0
 * roundToThousand("12,500")  // 13000
 */
export function roundToThousand(value: Numberish): number {
  return Math.round(toNumber(value) / 1000) * 1000;
}

/**
 * Rounds a number down (floor) to the nearest thousand.
 *
 * @example
 * floorToThousand(1234567)  // 1234000
 * floorToThousand(1999)     // 1000
 */
export function floorToThousand(value: Numberish): number {
  return Math.floor(toNumber(value) / 1000) * 1000;
}

/**
 * Rounds a number up (ceil) to the nearest thousand.
 *
 * @example
 * ceilToThousand(1234001)  // 1235000
 * ceilToThousand(1000)     // 1000
 */
export function ceilToThousand(value: Numberish): number {
  return Math.ceil(toNumber(value) / 1000) * 1000;
}

/**
 * Safely divides two numbers. Returns `fallback` if divisor is 0.
 *
 * @example
 * safeDivide(100, 3)    // 33.3333...
 * safeDivide(100, 0)    // 0
 * safeDivide(100, 0, -1) // -1
 */
export function safeDivide(numerator: Numberish, denominator: Numberish, fallback = 0): number {
  const num = toNumber(numerator);
  const den = toNumber(denominator);
  return den === 0 ? fallback : num / den;
}

// ─── Weighted Average ────────────────────────────────────────────────

/**
 * Computes a weighted average from an array of objects.
 * Returns 0 when total weight is 0 (avoids division by zero).
 *
 * @param items   - The array of objects
 * @param valueFn - Accessor for the value to be averaged
 * @param weightFn - Accessor for the weight of each value
 *
 * @example
 * // Average room rate weighted by saleable area
 * const rooms = [
 *   { roomIncome: 1200, saleableArea: 50 },
 *   { roomIncome: 1800, saleableArea: 30 },
 * ];
 * weightedAverage(rooms, r => r.roomIncome, r => r.saleableArea)
 * // (1200*50 + 1800*30) / (50+30) = 1425
 *
 * @example
 * // GPA calculation
 * const courses = [
 *   { grade: 4.0, credits: 3 },
 *   { grade: 3.5, credits: 4 },
 * ];
 * weightedAverage(courses, c => c.grade, c => c.credits)
 * // (4.0*3 + 3.5*4) / (3+4) = 3.714...
 *
 * @example
 * // Empty array returns 0
 * weightedAverage([], r => r.value, r => r.weight) // 0
 */
export function weightedAverage<T>(
  items: T[],
  valueFn: (item: T) => Numberish,
  weightFn: (item: T) => Numberish,
): number {
  if (!Array.isArray(items) || items.length === 0) return 0;

  let sumProduct = 0;
  let sumWeight = 0;

  for (const item of items) {
    const value = toNumber(valueFn(item));
    const weight = toNumber(weightFn(item));
    sumProduct += value * weight;
    sumWeight += weight;
  }

  return sumWeight === 0 ? 0 : sumProduct / sumWeight;
}

// ─── Decimal Precision ───────────────────────────────────────────────

/**
 * Rounds a number to exactly 2 decimal places.
 * Uses `Math.round` with epsilon correction to avoid floating-point errors
 * (e.g. `1.005 * 100 = 100.49999...` rounds incorrectly without correction).
 *
 * @example
 * toFixed2(1.005)     // 1.01  (correct — naive toFixed gives "1.00")
 * toFixed2(1.1)       // 1.1
 * toFixed2(1.999)     // 2
 * toFixed2("3.456")   // 3.46
 * toFixed2(null)       // 0
 */
export function toFixed2(value: Numberish): number {
  return toDecimal(value, 2);
}

/**
 * Rounds a number to the specified number of decimal places.
 * Uses the `Number.EPSILON` trick to handle floating-point edge cases.
 *
 * @param value    - The value to round
 * @param places   - Number of decimal places (default: 2, max: 20)
 *
 * @example
 * toDecimal(1.005, 2)     // 1.01
 * toDecimal(1.23456, 3)   // 1.235
 * toDecimal(1.23456, 0)   // 1
 * toDecimal("1,234.5", 1) // 1234.5
 * toDecimal(null, 2)      // 0
 */
export function toDecimal(value: Numberish, places = 2): number {
  const num = toNumber(value);
  const p = Math.min(Math.max(Math.round(places), 0), 20);
  const factor = 10 ** p;
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Formats a number to exactly 2 decimal places as a string.
 * Useful for display in UI / form fields where "1.50" should stay "1.50".
 *
 * @example
 * formatFixed2(1.5)      // "1.50"
 * formatFixed2(1000)     // "1000.00"
 * formatFixed2(null)     // "0.00"
 * formatFixed2("2.999")  // "3.00"
 */
export function formatFixed2(value: Numberish): string {
  return toFixed2(value).toFixed(2);
}

/**
 * Returns the marginal tax rate for the highest bracket reached by the given property value.
 *
 * This reflects the rate applied to the topmost portion of the value,
 * not the effective (average) rate across all brackets.
 *
 * @param totalGovPrice - The government-assessed value of the property (in THB)
 * @returns The marginal tax rate (e.g. 0.005 for 0.5%) of the matched bracket,
 *          or the base rate if the value is zero or below
 *
 * @example
 * getPropertyTaxRate(100_000_000) // => 0.004 (falls in 50M–200M bracket)
 * getPropertyTaxRate(300_000_000) // => 0.005 (falls in 200M–1B bracket)
 */
export function getPropertyTaxRate(totalGovPrice: number): number {
  const matchedRange = [...propertyTaxRanges]
    .reverse()
    .find(range => totalGovPrice > range.minValue);

  return matchedRange?.taxRate ?? propertyTaxRanges[0].taxRate;
}

/**
 * Calculates the total property tax using a progressive (tiered) tax structure.
 *
 * Each bracket is taxed only on the portion of the value that falls within it,
 * similar to income tax brackets. The results from all brackets are summed
 * to produce the final tax amount.
 *
 * @param totalGovPrice - The government-assessed value of the property (in THB)
 * @returns The total tax amount (in THB) across all applicable brackets
 *
 * @example
 * getPropertyTaxAmount(100_000_000)
 * // Bracket 1 (0–50M):    50,000,000 × 0.003 = 150,000
 * // Bracket 2 (50M–200M): 50,000,000 × 0.004 = 200,000
 * // Total: 350,000
 */
export function getPropertyTaxAmount(totalGovPrice: number): number {
  return propertyTaxRanges.reduce((sum, range) => {
    if (totalGovPrice <= range.minValue) return sum;

    const upperBound = range.maxValue ?? totalGovPrice;
    const taxableInThisBracket = Math.min(totalGovPrice, upperBound) - range.minValue;

    return sum + taxableInThisBracket * range.taxRate;
  }, 0);
}

export function floorToThousands(num) {
  return Math.floor(num / 1000) * 1000;
}
