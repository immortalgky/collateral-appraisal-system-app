import type { LandGrowthRateType } from '../types/leasehold';
import type { RentalScheduleRow } from '@/features/appraisal/api/property';

/**
 * Round to 2 decimal places.
 */
function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * ROUND(value, -3) — round to nearest 1,000.
 */
function roundToThousands(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / 1000) * 1000;
}

// ---------------------------------------------------------------------------
// Land Value Growth
// ---------------------------------------------------------------------------

interface LandGrowthPeriodInput {
  fromYear: number;
  toYear: number;
  growthRatePercent: number;
}

interface LandValueGrowthConfig {
  baseValue: number;
  growthType: LandGrowthRateType;
  /** Used when growthType === 'Frequency' */
  growthRatePercent: number;
  /** Used when growthType === 'Frequency' */
  intervalYears: number;
  /** Used when growthType === 'Period' */
  periods: LandGrowthPeriodInput[];
}

/**
 * Calculate land value for a given year based on growth configuration.
 *
 * - Frequency mode: value grows by `growthRatePercent` every `intervalYears`.
 * - Period mode: value grows by the rate defined for the period containing `year`.
 */
export function calculateLandValueGrowth(
  config: LandValueGrowthConfig,
  year: number,
): number {
  const { baseValue, growthType, growthRatePercent, intervalYears, periods } = config;
  if (year <= 0) return round2(baseValue);

  if (growthType === 'Frequency') {
    const interval = intervalYears > 0 ? intervalYears : 1;
    const growthSteps = Math.floor(year / interval);
    return round2(baseValue * Math.pow(1 + growthRatePercent / 100, growthSteps));
  }

  // Period mode: compound year by year using the rate for each year's period
  let value = baseValue;
  for (let y = 1; y <= year; y++) {
    const period = periods.find((p) => y >= p.fromYear && y <= p.toYear);
    const rate = period ? period.growthRatePercent / 100 : 0;
    value = value * (1 + rate);
  }
  return round2(value);
}

// ---------------------------------------------------------------------------
// Building Depreciation
// ---------------------------------------------------------------------------

/**
 * Calculate building value after depreciation for a given year.
 *
 * @param buildingValue   - Initial building value
 * @param costIndex       - Construction cost index (%) applied yearly
 * @param depRate         - Depreciation rate (%) per interval
 * @param depInterval     - Depreciation interval in years
 * @param startYear       - Year offset at which building calculation starts
 * @param year            - The target year to calculate
 */
export function calculateBuildingDepreciation(
  buildingValue: number,
  costIndex: number,
  depRate: number,
  depInterval: number,
  startYear: number,
  year: number,
): number {
  if (buildingValue <= 0) return 0;

  const effectiveYear = year + startYear;
  // Adjust building value by cost index
  const adjustedValue = buildingValue * Math.pow(1 + costIndex / 100, effectiveYear);
  // Apply compound depreciation (matches backend: Math.Pow(1 - depRate/100, depPeriods))
  const interval = depInterval > 0 ? depInterval : 1;
  const depSteps = Math.floor(effectiveYear / interval);
  const depreciation = Math.pow(1 - depRate / 100, depSteps);
  const result = adjustedValue * Math.max(depreciation, 0);
  return round2(result);
}

// ---------------------------------------------------------------------------
// Present Value Factor
// ---------------------------------------------------------------------------

/**
 * Calculate present value factor: 1 / (1 + r)^t
 *
 * @param discountRate  - Annual discount rate in percent
 * @param year          - Number of years
 */
export function calculatePVFactor(discountRate: number, year: number): number {
  if (discountRate <= 0 || year <= 0) return 1;
  return 1 / Math.pow(1 + discountRate / 100, year);
}

// ---------------------------------------------------------------------------
// Partial Usage
// ---------------------------------------------------------------------------

interface PartialUsageInput {
  finalValue: number;
  rai: number;
  ngan: number;
  wa: number;
  pricePerSqWa: number;
}

/**
 * Calculate partial land usage deduction.
 *
 * Partial land area (Sq.Wa) = rai * 400 + ngan * 100 + wa
 * Partial land price = partialLandArea * pricePerSqWa
 * Estimate net price = finalValue - partialLandPrice
 */
export function calculatePartialUsage(input: PartialUsageInput) {
  const { finalValue, rai, ngan, wa, pricePerSqWa } = input;
  const partialLandArea = round2((rai || 0) * 400 + (ngan || 0) * 100 + (wa || 0));
  const partialLandPrice = round2(partialLandArea * (pricePerSqWa || 0));
  const estimateNetPrice = round2(finalValue + partialLandPrice);
  const estimatePriceRounded = roundToThousands(estimateNetPrice);
  return { partialLandArea, partialLandPrice, estimateNetPrice, estimatePriceRounded };
}

// ---------------------------------------------------------------------------
// Full Table Generation
// ---------------------------------------------------------------------------

interface LeaseholdTableInput {
  /** Half-year intervals: [0.5, 1.5, 2.5, ...] */
  years: number[];
  landValueConfig: LandValueGrowthConfig;
  initialBuildingValue: number;
  constructionCostIndex: number;
  depreciationRate: number;
  depreciationIntervalYears: number;
  buildingCalcStartYear: number;
  discountRate: number;
  /** Rental income per period (aligned with years array) */
  rentalIncomePerPeriod: number[];
}

export interface LeaseholdTableRow {
  year: number;
  landValue: number;
  landGrowthPercent: number;
  buildingValue: number;
  depreciationAmount: number;
  depreciationPercent: number;
  buildingAfterDepreciation: number;
  totalLandAndBuilding: number;
  rentalIncome: number;
  pvFactor: number;
  netCurrentRentalIncome: number;
}

export interface LeaseholdTableResult {
  rows: LeaseholdTableRow[];
  totalIncomeOverLeaseTerm: number;
  valueAtLeaseExpiry: number;
  finalValue: number;
  finalValueRounded: number;
}

/**
 * Generate the full leasehold analysis table.
 *
 * Each column represents a half-year period. The function calculates:
 * - Land value growth per period
 * - Building depreciation per period
 * - Total property value (land + building after depreciation)
 * - PV factor and net current rental income
 * - Summary values (total income, value at expiry, final value)
 */
export function generateLeaseholdTable(input: LeaseholdTableInput): LeaseholdTableResult {
  const {
    years,
    landValueConfig,
    initialBuildingValue,
    constructionCostIndex,
    depreciationRate,
    depreciationIntervalYears,
    buildingCalcStartYear,
    discountRate,
    rentalIncomePerPeriod,
  } = input;

  // Running building: track prev building value and prev depreciation amount
  let prevBuildingValue = 0;
  let prevDepAmount = 0;
  const depInterval = depreciationIntervalYears > 0 ? depreciationIntervalYears : 1;

  const rows: LeaseholdTableRow[] = years.map((year, i) => {
    const landValue = calculateLandValueGrowth(landValueConfig, year);

    // Determine land growth % for this period
    let landGrowthPercent = 0;
    if (i > 0) {
      const prevLandValue = calculateLandValueGrowth(landValueConfig, years[i - 1]);
      if (prevLandValue > 0) {
        landGrowthPercent = round2(((landValue - prevLandValue) / prevLandValue) * 100);
      }
    }

    // buildingCalcStartYear is 1-based column index. e.g. 2 = start from 2nd column (i=1)
    const showBuilding = initialBuildingValue > 0 && (i + 1) >= buildingCalcStartYear;
    const isFirstBuildingYear = showBuilding && (i + 1) === buildingCalcStartYear;

    // Building value:
    // 1st building year: raw initialBuildingValue
    // subsequent: (prevBuildingValue × (1 + costIndex%)) - prevDepreciationAmount
    const buildingValue = !showBuilding
      ? 0
      : isFirstBuildingYear
        ? round2(initialBuildingValue)
        : round2(prevBuildingValue * (1 + constructionCostIndex / 100) - prevDepAmount);

    // Depreciation: flat depreciationRate% of building value, applied every depInterval years
    const isDepreciationYear = showBuilding && Math.floor(year / depInterval) > Math.floor((year - 1) / depInterval);
    const depreciationPercent = isDepreciationYear ? depreciationRate : 0;
    const depreciationAmount = isDepreciationYear ? round2(buildingValue * depreciationRate / 100) : 0;
    const buildingAfterDepreciation = showBuilding ? round2(buildingValue - depreciationAmount) : 0;

    // Update running values for next iteration
    if (showBuilding) {
      prevBuildingValue = buildingValue;
      prevDepAmount = depreciationAmount;
    }

    const totalLandAndBuilding = round2(landValue + buildingAfterDepreciation);
    const rentalIncome = rentalIncomePerPeriod[i] ?? 0;
    const pvFactor = calculatePVFactor(discountRate, year);
    const netCurrentRentalIncome = round2(rentalIncome * pvFactor);

    return {
      year,
      landValue,
      landGrowthPercent,
      buildingValue,
      depreciationAmount,
      depreciationPercent,
      buildingAfterDepreciation,
      totalLandAndBuilding,
      rentalIncome,
      pvFactor,
      netCurrentRentalIncome,
    };
  });

  const totalIncomeOverLeaseTerm = round2(
    rows.reduce((sum, r) => sum + r.netCurrentRentalIncome, 0),
  );

  const lastRow = rows[rows.length - 1];
  const valueAtLeaseExpiry = lastRow
    ? round2(lastRow.totalLandAndBuilding * lastRow.pvFactor)
    : 0;

  const finalValue = round2(totalIncomeOverLeaseTerm + valueAtLeaseExpiry);
  const finalValueRounded = roundToThousands(finalValue);

  return {
    rows,
    totalIncomeOverLeaseTerm,
    valueAtLeaseExpiry,
    finalValue,
    finalValueRounded,
  };
}

// ---------------------------------------------------------------------------
// Appraisal Schedule (re-indexed from appraisal date)
// ---------------------------------------------------------------------------

export interface AppraisalScheduleRow {
  year: number;
  contractStart: string;
  contractEnd: string;
  totalAmount: number;
}

/**
 * DAYS360 calculation (US/NASD method) — same as Excel's DAYS360.
 * Treats each month as 30 days, each year as 360 days.
 */
export function days360Between(start: Date, end: Date): number {
  const d1 = Math.min(start.getDate(), 30);
  let d2 = end.getDate();
  if (d1 === 30) d2 = Math.min(d2, 30);

  const m1 = start.getMonth() + 1;
  const m2 = end.getMonth() + 1;
  const y1 = start.getFullYear();
  const y2 = end.getFullYear();

  return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
}

/**
 * Compute appraisal schedule from contract schedule + appraisal date.
 *
 * 1. Find which contract row the appraisal date falls into
 * 2. Calculate remaining fraction using DAYS360: ROUND((DAYS360(appraisalDate, contractEnd) + 1) / 360, 1)
 * 3. First row: year=fraction, start=appraisalDate, end=contractEnd, amount=fraction×totalAmount
 * 4. Subsequent rows: year increments by 1, full amounts, original contract dates
 *
 * Returns the schedule rows and the index in contractSchedule where it starts (for row alignment).
 */
export function computeAppraisalSchedule(
  contractRows: RentalScheduleRow[],
  appraisalDate: string,
): { rows: AppraisalScheduleRow[]; startIdx: number } {
  if (!contractRows.length || !appraisalDate) return { rows: [], startIdx: -1 };

  const appraisal = new Date(appraisalDate);

  // Find the contract row that contains the appraisal date
  let startIdx = -1;
  for (let i = 0; i < contractRows.length; i++) {
    const start = new Date(contractRows[i].contractStart);
    const end = new Date(contractRows[i].contractEnd);
    if (appraisal >= start && appraisal <= end) {
      startIdx = i;
      break;
    }
  }

  // Appraisal date is before contract starts
  if (startIdx === -1) {
    const firstStart = new Date(contractRows[0].contractStart);
    if (appraisal < firstStart) {
      const result: AppraisalScheduleRow[] = [];
      for (let i = 0; i < contractRows.length; i++) {
        const row = contractRows[i];
        result.push({
          year: i + 1,
          contractStart: i === 0 ? appraisalDate : row.contractStart,
          contractEnd: row.contractEnd,
          totalAmount: row.totalAmount,
        });
      }
      return { rows: result, startIdx: 0 };
    }
    return { rows: [], startIdx: -1 };
  }

  // Appraisal date falls within a contract period
  const result: AppraisalScheduleRow[] = [];
  const firstRow = contractRows[startIdx];
  const periodEnd = new Date(firstRow.contractEnd);

  const days360 = days360Between(appraisal, periodEnd);
  const fraction = Math.round(((days360 + 1) / 360) * 10) / 10;

  if (fraction > 0) {
    result.push({
      year: fraction,
      contractStart: appraisalDate,
      contractEnd: firstRow.contractEnd,
      totalAmount: firstRow.totalAmount * fraction,
    });
  }

  for (let i = startIdx + 1; i < contractRows.length; i++) {
    const row = contractRows[i];
    result.push({
      year: fraction + (i - startIdx),
      contractStart: row.contractStart,
      contractEnd: row.contractEnd,
      totalAmount: row.totalAmount,
    });
  }

  return { rows: result, startIdx };
}
