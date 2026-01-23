// excelUtils/regression.ts

export type ExcelErrorCode = '#N/A' | '#DIV/0!' | '#VALUE!' | '#NUM!';

export class ExcelError extends Error {
  public readonly code: ExcelErrorCode;

  constructor(code: ExcelErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ExcelError';
    this.code = code;
  }
}

export type CellValue = number | string | boolean | null | undefined;
export type RangeLike = CellValue[] | CellValue[][];

export interface ExcelStatOptions {
  /**
   * strict=true is closer to Excel when you pass "arrays/constants":
   * - numeric strings (e.g. "3.2") => #VALUE!
   * strict=false (default) is nicer for app data:
   * - numeric strings are coerced to numbers
   */
  strict?: boolean;
}

/** Flatten a 1D/2D "range" into 1D (row-major). */
function flatten(range: RangeLike): CellValue[] {
  if (!Array.isArray(range)) return [];
  if (range.length === 0) return [];
  const first = range[0] as any;
  if (Array.isArray(first)) {
    const out: CellValue[] = [];
    for (const row of range as CellValue[][]) out.push(...row);
    return out;
  }
  return range as CellValue[];
}

function isBlank(v: CellValue): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function toNumber(v: CellValue, opts: ExcelStatOptions): number | null {
  // null means "blank / ignored"
  if (isBlank(v)) return null;

  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new ExcelError('#NUM!', 'Non-finite number.');
    return v;
  }

  if (typeof v === 'string') {
    if (opts.strict) throw new ExcelError('#VALUE!', 'Text value is not allowed in strict mode.');
    const s = v.trim();
    const n = Number(s);
    if (!Number.isFinite(n)) throw new ExcelError('#VALUE!', `Cannot coerce "${v}" to number.`);
    return n;
  }

  // booleans: Excel behavior varies by function/context; safest is to error.
  throw new ExcelError('#VALUE!', 'Logical/boolean values are not supported.');
}

function collectPairs(
  knownY: RangeLike,
  knownX: RangeLike,
  opts: ExcelStatOptions,
): { xs: number[]; ys: number[] } {
  const yFlat = flatten(knownY);
  const xFlat = flatten(knownX);

  if (yFlat.length !== xFlat.length) {
    throw new ExcelError('#N/A', 'known_y and known_x must have the same length.');
  }

  const xs: number[] = [];
  const ys: number[] = [];

  for (let i = 0; i < yFlat.length; i++) {
    const yv = yFlat[i];
    const xv = xFlat[i];

    // Excel-style: skip blank pairs
    if (isBlank(yv) || isBlank(xv)) continue;

    const yNum = toNumber(yv, opts);
    const xNum = toNumber(xv, opts);

    // non-blank already, so these should be numbers
    if (yNum === null || xNum === null) continue;

    xs.push(xNum);
    ys.push(yNum);
  }

  return { xs, ys };
}

function sums(xs: number[], ys: number[]) {
  let n = xs.length;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;

  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    const y = ys[i]!;
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumYY += y * y;
    sumXY += x * y;
  }

  return { n, sumX, sumY, sumXX, sumYY, sumXY };
}

/**
 * Excel SLOPE(known_y's, known_x's)
 * slope = (n*sumXY - sumX*sumY) / (n*sumXX - sumX^2)
 */
export function SLOPE(knownY: RangeLike, knownX: RangeLike, opts: ExcelStatOptions = {}): number {
  const { xs, ys } = collectPairs(knownY, knownX, opts);

  if (xs.length < 2) return 0;

  // if (xs.length < 2) throw new ExcelError('#DIV/0!', 'Not enough data points.');

  const { n, sumX, sumY, sumXX, sumXY } = sums(xs, ys);
  const denom = n * sumXX - sumX * sumX;

  if (denom === 0) return 0;

  // if (denom === 0) throw new ExcelError('#DIV/0!', 'Variance of X is zero.');

  const numer = n * sumXY - sumX * sumY;
  return numer / denom;
}

/**
 * Excel INTERCEPT(known_y's, known_x's)
 * intercept = meanY - slope*meanX
 */
export function INTERCEPT(
  knownY: RangeLike,
  knownX: RangeLike,
  opts: ExcelStatOptions = {},
): number {
  const { xs, ys } = collectPairs(knownY, knownX, opts);

  if (xs.length < 2) return 0;

  // if (xs.length < 2) throw new ExcelError('#DIV/0!', 'Not enough data points.');

  const { n, sumX, sumY } = sums(xs, ys);
  const m = SLOPE(ys, xs, opts); // reuse for consistent error behavior

  const meanX = sumX / n;
  const meanY = sumY / n;
  return meanY - m * meanX;
}

/**
 * Excel RSQ(known_y's, known_x's)
 * RSQ = r^2 where r is Pearson correlation of X and Y
 * r^2 = (n*sumXY - sumX*sumY)^2 / ((n*sumXX - sumX^2) * (n*sumYY - sumY^2))
 */
export function RSQ(knownY: RangeLike, knownX: RangeLike, opts: ExcelStatOptions = {}): number {
  const { xs, ys } = collectPairs(knownY, knownX, opts);
  if (xs.length < 2) throw new ExcelError('#DIV/0!', 'Not enough data points.');

  const { n, sumX, sumY, sumXX, sumYY, sumXY } = sums(xs, ys);
  const sxx = n * sumXX - sumX * sumX;
  const syy = n * sumYY - sumY * sumY;
  if (sxx === 0 || syy === 0) return 0;

  // if (sxx === 0 || syy === 0) throw new ExcelError('#DIV/0!', 'Zero variance in X or Y.');

  const sxy = n * sumXY - sumX * sumY;
  return (sxy * sxy) / (sxx * syy);
}

/**
 * Excel STEYX(known_y's, known_x's)
 * Standard error of the predicted y for each x in a linear regression:
 * STEYX = sqrt( SSE / (n - 2) )
 * where SSE = sum((y - (intercept + slope*x))^2)
 */
export function STEYX(knownY: RangeLike, knownX: RangeLike, opts: ExcelStatOptions = {}): number {
  const { xs, ys } = collectPairs(knownY, knownX, opts);
  const n = xs.length;

  if (n < 3) return 0;

  // if (n < 3) throw new ExcelError('#DIV/0!', 'Need at least 3 data points.');

  const m = SLOPE(ys, xs, opts);
  const b = INTERCEPT(ys, xs, opts);

  let sse = 0;
  for (let i = 0; i < n; i++) {
    const yHat = b + m * xs[i]!;
    const err = ys[i]! - yHat;
    sse += err * err;
  }

  return Math.sqrt(sse / (n - 2));
}

/**
 * If you prefer not to throw, wrap calls with this.
 */
export function safe<T>(fn: () => T): T | ExcelError {
  try {
    return fn();
  } catch (e) {
    if (e instanceof ExcelError) return e;
    return new ExcelError('#VALUE!', (e as Error)?.message ?? 'Unknown error');
  }
}
