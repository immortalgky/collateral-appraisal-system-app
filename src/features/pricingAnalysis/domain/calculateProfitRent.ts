import type { GrowthRateType, ProfitRentGrowthPeriod } from '../types/profitRent';
import { calculatePVFactor, computeAppraisalSchedule, type AppraisalScheduleRow } from './calculateLeasehold';
import type { RentalScheduleRow } from '@/features/appraisal/api/property';

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function roundToThousands(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / 1000) * 1000;
}

// ---------------------------------------------------------------------------
// Market Fee Growth
// ---------------------------------------------------------------------------

interface MarketFeeGrowthConfig {
  baseFee: number;
  growthType: GrowthRateType;
  growthRatePercent: number;
  intervalYears: number;
  periods: ProfitRentGrowthPeriod[];
}

function calculateMarketFeeGrowth(config: MarketFeeGrowthConfig, year: number): number {
  const { baseFee, growthType, growthRatePercent, intervalYears, periods } = config;
  if (baseFee <= 0) return 0;

  if (growthType === 'Frequency') {
    const interval = intervalYears > 0 ? intervalYears : 1;
    const steps = Math.floor(year / interval);
    return round2(baseFee * Math.pow(1 + growthRatePercent / 100, steps));
  }

  // Period mode
  let value = baseFee;
  for (let y = 1; y <= Math.floor(year); y++) {
    const period = periods.find((p) => y >= p.fromYear && y <= p.toYear);
    const rate = period ? period.growthRatePercent / 100 : 0;
    value = value * (1 + rate);
  }
  return round2(value);
}

// ---------------------------------------------------------------------------
// Table Generation
// ---------------------------------------------------------------------------

export interface ProfitRentTableRow {
  year: number;
  numberOfMonths: number;
  contractStart: string;
  contractEnd: string;
  marketRentalFeePerSqWa: number;
  marketRentalFeeGrowthPercent: number;
  marketRentalFeePerMonth: number;
  marketRentalFeePerYear: number;
  contractRentalFeePerYear: number;
  returnsFromLease: number;
  pvFactor: number;
  presentValue: number;
}

export interface ProfitRentTableResult {
  rows: ProfitRentTableRow[];
  totalMarketRentalFee: number;
  totalContractRentalFee: number;
  totalReturnsFromLease: number;
  totalPresentValue: number;
  finalValueRounded: number;
}

interface ProfitRentTableInput {
  appraisalSchedule: AppraisalScheduleRow[];
  landAreaSqWa: number;
  marketRentalFeePerSqWa: number;
  growthRateType: GrowthRateType;
  growthRatePercent: number;
  growthIntervalYears: number;
  growthPeriods: ProfitRentGrowthPeriod[];
  discountRate: number;
}

export function generateProfitRentTable(input: ProfitRentTableInput): ProfitRentTableResult {
  const {
    appraisalSchedule,
    landAreaSqWa,
    marketRentalFeePerSqWa,
    growthRateType,
    growthRatePercent,
    growthIntervalYears,
    growthPeriods,
    discountRate,
  } = input;

  if (appraisalSchedule.length === 0) {
    return { rows: [], totalMarketRentalFee: 0, totalContractRentalFee: 0, totalReturnsFromLease: 0, totalPresentValue: 0, finalValueRounded: 0 };
  }

  const config: MarketFeeGrowthConfig = {
    baseFee: marketRentalFeePerSqWa,
    growthType: growthRateType,
    growthRatePercent,
    intervalYears: growthIntervalYears,
    periods: growthPeriods,
  };

  let prevFeePerSqWa = 0;
  let totalMarket = 0;
  let totalContract = 0;
  let totalReturns = 0;
  let totalPV = 0;

  const rows: ProfitRentTableRow[] = appraisalSchedule.map((schedRow, i) => {
    const year = schedRow.year;
    const isFirstRow = i === 0 && year < 1;
    const numberOfMonths = isFirstRow ? round2(year * 12) : 12;

    const feePerSqWa = calculateMarketFeeGrowth(config, year);

    let growthPercent = 0;
    if (i > 0 && prevFeePerSqWa > 0) {
      growthPercent = round2(((feePerSqWa - prevFeePerSqWa) / prevFeePerSqWa) * 100);
    }
    prevFeePerSqWa = feePerSqWa;

    const marketFeePerMonth = round2(feePerSqWa * landAreaSqWa);
    const marketFeePerYear = round2(marketFeePerMonth * numberOfMonths);
    const contractFeePerYear = round2(schedRow.totalAmount);
    const returnsFromLease = round2(marketFeePerYear - contractFeePerYear);
    const pvFactor = calculatePVFactor(discountRate, year);
    const presentValue = round2(returnsFromLease * pvFactor);

    totalMarket += marketFeePerYear;
    totalContract += contractFeePerYear;
    totalReturns += returnsFromLease;
    totalPV += presentValue;

    return {
      year,
      numberOfMonths,
      contractStart: schedRow.contractStart,
      contractEnd: schedRow.contractEnd,
      marketRentalFeePerSqWa: feePerSqWa,
      marketRentalFeeGrowthPercent: growthPercent,
      marketRentalFeePerMonth: marketFeePerMonth,
      marketRentalFeePerYear: marketFeePerYear,
      contractRentalFeePerYear: contractFeePerYear,
      returnsFromLease,
      pvFactor,
      presentValue,
    };
  });

  return {
    rows,
    totalMarketRentalFee: round2(totalMarket),
    totalContractRentalFee: round2(totalContract),
    totalReturnsFromLease: round2(totalReturns),
    totalPresentValue: round2(totalPV),
    finalValueRounded: roundToThousands(totalPV),
  };
}

// ---------------------------------------------------------------------------
// Schedule builder for ProfitRent (reuses computeAppraisalSchedule from leasehold)
// ---------------------------------------------------------------------------

export function computeProfitRentSchedule(
  contractRows: RentalScheduleRow[],
  appraisalDate: string,
): AppraisalScheduleRow[] {
  const { rows } = computeAppraisalSchedule(contractRows, appraisalDate);
  return rows;
}
