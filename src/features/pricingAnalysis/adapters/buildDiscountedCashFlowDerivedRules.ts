import { toNumber } from '../domain/calculation';
import { getDCFFilteredAssumptions } from '../domain/getDCFFilteredAssumptions';
import type { DerivedFieldRule } from './useDerivedFieldArray';

// Returns the 0-based index at which calculations should start.
// startIn is 1-based (startIn=3 → startIdx=2).
function getStartIdx(startIn: number): number {
  return Math.max(0, startIn - 1);
}

// Returns how many years have elapsed since the calculation started.
// Used to determine when to apply growth (shift growth schedule right).
function getElapsedYears(idx: number, startIdx: number): number {
  return idx - startIdx;
}

export function buildMethodPositionBasedSalaryCalculationDerviedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.increaseRate.${idx}`,
        deps: [
          `${name}.detail.increaseRatePct`,
          `${name}.detail.increaseRateYrs`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const elapsed = getElapsedYears(idx, startIdx);

          // First active year: no growth yet
          if (elapsed === 0) return 0;
          // Growth applies every increaseRateYrs elapsed years
          if (elapsed % increateRateYrs === 0) return increaseRatePct;
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.totalPositionBasedSalaryPerYear.${idx}`,
        deps: [
          `${name}.detail.increaseRate.${idx}`,
          `${name}.detail.sumTotalSalaryPerYear`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          // Before start: zero
          if (idx < startIdx) return 0;

          const firstYearAmt = getValues(`${name}.detail.sumTotalSalaryPerYear`) ?? 0;

          // First active year: use base value
          if (idx === startIdx) return firstYearAmt;

          const prevTotalSalaryCost = getValues(
            `${name}.detail.totalPositionBasedSalaryPerYear.${idx - 1}`,
          );
          const increaseRate = getValues(`${name}.detail.increaseRate.${idx}`) ?? 0;

          return toNumber(prevTotalSalaryCost * (1 + increaseRate / 100));
        },
      },
    ];
  });
}

export function buildMethodSpecifiedRoomIncomePerDayDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.saleableArea.${idx}`,
        deps: [
          'totalNumberOfDayInYear',
          `${name}.detail.sumSaleableArea`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);
          if (idx < startIdx) return 0;

          const totalNumberOfDayInYear = getValues('totalNumberOfDayInYear') ?? 0;
          const sumSaleableArea = getValues(`${name}.detail.sumSaleableArea`) ?? 0;
          return toNumber(sumSaleableArea * totalNumberOfDayInYear);
        },
      },
      {
        targetPath: `${name}.detail.occupancyRate.${idx}`,
        deps: [
          `${name}.detail.occupancyRateFirstYearPct`,
          `${name}.detail.occupancyRatePct`,
          `${name}.detail.occupancyRateYrs`,
          `${name}.detail.startIn`,
        ],
        when: ({ getFieldState, formState }) => {
          const { isDirty } = getFieldState(`${name}.detail.occupancyRate.${idx}`, formState);
          return !isDirty;
        },
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);
          if (idx < startIdx) return 0;

          const occupancyRateFirstYearPct =
            getValues(`${name}.detail.occupancyRateFirstYearPct`) ?? 0;
          const occupancyRatePct = getValues(`${name}.detail.occupancyRatePct`) ?? 0;
          const occupancyRateYrs = getValues(`${name}.detail.occupancyRateYrs`) ?? 0;

          if (idx === startIdx) return toNumber(occupancyRateFirstYearPct);

          const prevOccupancyRate = getValues(`${name}.detail.occupancyRate.${idx - 1}`) ?? 0;
          if (prevOccupancyRate >= 100) return 100;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed % occupancyRateYrs === 0)
            return toNumber(prevOccupancyRate + occupancyRatePct);

          return toNumber(prevOccupancyRate);
        },
      },
      {
        targetPath: `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
        deps: [
          `${name}.detail.saleableArea.${idx}`,
          `${name}.detail.occupancyRate.${idx}`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const saleableArea = getValues(`${name}.detail.saleableArea.${idx}`) ?? 0;
          const occupancyRate = getValues(`${name}.detail.occupancyRate.${idx}`) ?? 0;
          return toNumber(saleableArea * (occupancyRate / 100));
        },
      },
      {
        targetPath: `${name}.detail.roomRateIncrease.${idx}`,
        deps: [
          `${name}.detail.increaseRatePct`,
          `${name}.detail.increaseRateYrs`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed === 0) return 0;
          if (elapsed % increateRateYrs === 0) return toNumber(increaseRatePct);
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.avgDailyRate.${idx}`,
        deps: [
          `${name}.detail.roomRateIncrease.${idx}`,
          `${name}.detail.avgRoomRate`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;
          if (idx === startIdx) return getValues(`${name}.detail.avgRoomRate`);

          const prevAvgDailyRate = getValues(`${name}.detail.avgDailyRate.${idx - 1}`);
          const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`);
          return toNumber(prevAvgDailyRate * (1 + roomRateIncrease / 100));
        },
      },
      {
        targetPath: `${name}.detail.roomIncome.${idx}`,
        deps: [
          `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
          `${name}.detail.avgDailyRate.${idx}`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const totalSaleableAreaDeductByOccRate = getValues(
            `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
          );
          const avgDailyRate = getValues(`${name}.detail.avgDailyRate.${idx}`);
          return toNumber(totalSaleableAreaDeductByOccRate * avgDailyRate);
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.roomIncome.${idx}`, `${name}.detail.startIn`],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const roomIncome = getValues(`${name}.detail.roomIncome.${idx}`);
          return toNumber(roomIncome);
        },
      },
    ];
  });
}

export function buildSpecifiedRoomIncomeBySeasonalRatesDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.saleableArea.${idx}`,
        deps: [
          'totalNumberOfDayInYear',
          `${name}.detail.sumSaleableArea`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const totalNumberOfDayInYear = getValues('totalNumberOfDayInYear') ?? 0;
          const sumSaleableArea = getValues(`${name}.detail.totalSaleableArea`) ?? 0;
          return toNumber(sumSaleableArea * totalNumberOfDayInYear);
        },
      },
      {
        targetPath: `${name}.detail.occupancyRate.${idx}`,
        deps: [
          `${name}.detail.occupancyRateFirstYearPct`,
          `${name}.detail.occupancyRatePct`,
          `${name}.detail.occupancyRateYrs`,
          `${name}.detail.startIn`,
        ],
        when: ({ getFieldState, formState }) => {
          const { isDirty } = getFieldState(`${name}.detail.occupancyRate.${idx}`, formState);
          return !isDirty;
        },
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);
          if (idx < startIdx) return 0;

          const occupancyRateFirstYearPct =
            getValues(`${name}.detail.occupancyRateFirstYearPct`) ?? 0;
          const occupancyRatePct = getValues(`${name}.detail.occupancyRatePct`) ?? 0;
          const occupancyRateYrs = getValues(`${name}.detail.occupancyRateYrs`) ?? 0;

          if (idx === startIdx) return toNumber(occupancyRateFirstYearPct);

          const prevOccupancyRate = getValues(`${name}.detail.occupancyRate.${idx - 1}`) ?? 0;
          if (prevOccupancyRate >= 100) return 100;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed % occupancyRateYrs === 0)
            return toNumber(prevOccupancyRate + occupancyRatePct);

          return toNumber(prevOccupancyRate);
        },
      },
      {
        targetPath: `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
        deps: [
          `${name}.detail.saleableArea.${idx}`,
          `${name}.detail.occupancyRate.${idx}`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const saleableArea = getValues(`${name}.detail.saleableArea.${idx}`) ?? 0;
          const occupancyRate = getValues(`${name}.detail.occupancyRate.${idx}`) ?? 0;
          return toNumber(saleableArea * (occupancyRate / 100));
        },
      },
      {
        targetPath: `${name}.detail.roomRateIncrease.${idx}`,
        deps: [
          `${name}.detail.increaseRatePct`,
          `${name}.detail.increaseRateYrs`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed === 0) return 0;
          if (elapsed % increateRateYrs === 0) return toNumber(increaseRatePct);
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.avgDailyRate.${idx}`,
        deps: [
          `${name}.detail.roomRateIncrease.${idx}`,
          `${name}.detail.avgRoomRate`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;
          if (idx === startIdx) return getValues(`${name}.detail.avgRoomRate`);

          const prevAvgDailyRate = getValues(`${name}.detail.avgDailyRate.${idx - 1}`);
          const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`);
          return toNumber(prevAvgDailyRate * (1 + roomRateIncrease / 100));
        },
      },
      {
        targetPath: `${name}.detail.roomIncome.${idx}`,
        deps: [
          `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
          `${name}.detail.avgDailyRate.${idx}`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const totalSaleableAreaDeductByOccRate = getValues(
            `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
          );
          const avgDailyRate = getValues(`${name}.detail.avgDailyRate.${idx}`);
          return toNumber(totalSaleableAreaDeductByOccRate * avgDailyRate);
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.roomIncome.${idx}`, `${name}.detail.startIn`],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const roomIncome = getValues(`${name}.detail.roomIncome.${idx}`);
          return toNumber(roomIncome);
        },
      },
    ];
  });
}

export function buildMethodSpecifiedRoomIncomeWithGrowthDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.roomRateIncrease.${idx}`,
        deps: [
          `${name}.detail.increaseRatePct`,
          `${name}.detail.increaseRateYrs`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed === 0) return 0;
          if (elapsed % increateRateYrs === 0) return increaseRatePct;
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.roomIncome.${idx}`,
        deps: [
          `${name}.detail.roomRateIncrease.${idx}`,
          `${name}.detail.firstYearAmt`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const firstYearAmt = getValues(`${name}.detail.firstYearAmt`) ?? 0;
          if (idx === startIdx) return firstYearAmt;

          const prevRoomIncome = getValues(`${name}.detail.roomIncome.${idx - 1}`);
          const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`) ?? 0;

          return toNumber(prevRoomIncome * (1 + roomRateIncrease / 100));
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.roomIncome.${idx}`, `${name}.detail.startIn`],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          return getValues(`${name}.detail.roomIncome.${idx}`) ?? 0;
        },
      },
    ];
  });
}

export function buildMethodSpecifiedRoomIncomeWithGrowthByOccupancyRateDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.occupancyRate.${idx}`,
        deps: [
          `${name}.detail.occupancyRateFirstYearPct`,
          `${name}.detail.occupancyRatePct`,
          `${name}.detail.occupancyRateYrs`,
          `${name}.detail.startIn`,
        ],
        when: ({ getFieldState, formState }) => {
          const { isDirty } = getFieldState(`${name}.detail.occupancyRate.${idx}`, formState);
          return !isDirty;
        },
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);
          if (idx < startIdx) return 0;

          const occupancyRateFirstYearPct =
            getValues(`${name}.detail.occupancyRateFirstYearPct`) ?? 0;
          const occupancyRatePct = getValues(`${name}.detail.occupancyRatePct`) ?? 0;
          const occupancyRateYrs = getValues(`${name}.detail.occupancyRateYrs`) ?? 0;

          if (idx === startIdx) return occupancyRateFirstYearPct;

          const prevOccupancyRate = getValues(`${name}.detail.occupancyRate.${idx - 1}`) ?? 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed % occupancyRateYrs === 0) return prevOccupancyRate + occupancyRatePct;

          return prevOccupancyRate;
        },
      },
      {
        targetPath: `${name}.detail.roomRateIncrease.${idx}`,
        deps: [
          `${name}.detail.increaseRatePct`,
          `${name}.detail.increaseRateYrs`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed === 0) return 0;
          if (elapsed % increateRateYrs === 0) return increaseRatePct;
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.roomIncomeAdjustedValuedByGrowthRates.${idx}`,
        deps: [
          `${name}.detail.roomRateIncrease.${idx}`,
          `${name}.detail.firstYearAmt`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const firstYearAmt = getValues(`${name}.detail.firstYearAmt`) ?? 0;
          if (idx === startIdx) return toNumber(firstYearAmt);

          const prevAdjutedValue = getValues(
            `${name}.detail.roomIncomeAdjustedValuedByGrowthRates.${idx - 1}`,
          );
          const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`) ?? 0;

          return toNumber(prevAdjutedValue * (1 + roomRateIncrease / 100));
        },
      },
      {
        targetPath: `${name}.detail.roomIncome.${idx}`,
        deps: [
          `${name}.detail.occupancyRate.${idx}`,
          `${name}.detail.roomIncomeAdjustedValuedByGrowthRates.${idx}`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const adjRoomIncome =
            getValues(`${name}.detail.roomIncomeAdjustedValuedByGrowthRates.${idx}`) ?? 0;
          const occupancyRate = getValues(`${name}.detail.occupancyRate.${idx}`) ?? 0;

          return toNumber((adjRoomIncome * occupancyRate) / 100);
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.roomIncome.${idx}`, `${name}.detail.startIn`],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          return getValues(`${name}.detail.roomIncome.${idx}`) ?? 0;
        },
      },
    ];
  });
}

export function buildMethodSpecifiedRentalIncomePerMonthDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.roomRateIncrease.${idx}`,
        deps: [
          `${name}.detail.increaseRatePct`,
          `${name}.detail.increaseRateYrs`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed === 0) return 0;
          if (elapsed % increateRateYrs === 0) return increaseRatePct;
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.roomIncome.${idx}`,
        deps: [
          `${name}.detail.roomRateIncrease.${idx}`,
          `${name}.detail.sumRoomIncomePerYear`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const totalRoomIncomePerYear = getValues(`${name}.detail.sumRoomIncomePerYear`) ?? 0;
          if (idx === startIdx) return totalRoomIncomePerYear;

          const prevRoomIncome = getValues(`${name}.detail.roomIncome.${idx - 1}`) ?? 0;
          const increaseRate = getValues(`${name}.detail.roomRateIncrease.${idx}`) ?? 0;

          return toNumber(prevRoomIncome * (1 + increaseRate / 100));
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.roomIncome.${idx}`, `${name}.detail.startIn`],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          return getValues(`${name}.detail.roomIncome.${idx}`) ?? 0;
        },
      },
    ];
  });
}

export function buildMethodSpecifiedRentalIncomePerSquareMeterDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.occupancyRate.${idx}`,
        deps: [
          `${name}.detail.occupancyRateFirstYearPct`,
          `${name}.detail.occupancyRatePct`,
          `${name}.detail.occupancyRateYrs`,
          `${name}.detail.startIn`,
        ],
        when: ({ getFieldState, formState }) => {
          const { isDirty } = getFieldState(`${name}.detail.occupancyRate.${idx}`, formState);
          return !isDirty;
        },
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);
          if (idx < startIdx) return 0;

          const occupancyRateFirstYearPct =
            getValues(`${name}.detail.occupancyRateFirstYearPct`) ?? 0;
          const occupancyRatePct = getValues(`${name}.detail.occupancyRatePct`) ?? 0;
          const occupancyRateYrs = getValues(`${name}.detail.occupancyRateYrs`) ?? 0;

          if (idx === startIdx) return occupancyRateFirstYearPct;

          const prevOccupancyRate = getValues(`${name}.detail.occupancyRate.${idx - 1}`) ?? 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed % occupancyRateYrs === 0) return prevOccupancyRate + occupancyRatePct;

          return prevOccupancyRate;
        },
      },
      {
        targetPath: `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
        deps: [`${name}.detail.sumSaleableArea`, `${name}.detail.startIn`],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const saleableArea = getValues(`${name}.detail.sumSaleableArea`) ?? 0;
          const occupancyRate = getValues(`${name}.detail.occupancyRate.${idx}`) ?? 0;
          return toNumber(saleableArea * (occupancyRate / 100));
        },
      },
      {
        targetPath: `${name}.detail.rentalRateIncrease.${idx}`,
        deps: [
          `${name}.detail.increaseRatePct`,
          `${name}.detail.increaseRateYrs`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed === 0) return 0;
          if (elapsed % increateRateYrs === 0) return toNumber(increaseRatePct);
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.avgRentalRate.${idx}`,
        deps: [
          `${name}.detail.avgRentalRatePerMonth`,
          `${name}.detail.rentalRateIncrease.${idx}`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const avgRentalRatePerMonth = getValues(`${name}.detail.avgRentalRatePerMonth`) ?? 0;
          if (idx === startIdx) return toNumber(avgRentalRatePerMonth);

          const prevAvgRentalRate = getValues(`${name}.detail.avgRentalRate.${idx - 1}`) ?? 0;
          const increaseRate = getValues(`${name}.detail.rentalRateIncrease.${idx}`) ?? 0;

          return toNumber(prevAvgRentalRate * (1 + increaseRate / 100));
        },
      },
      {
        targetPath: `${name}.detail.totalRentalIncome.${idx}`,
        deps: [
          `${name}.detail.avgRentalRate.${idx}`,
          `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const avgRentalRate = getValues(`${name}.detail.avgRentalRate.${idx}`) ?? 0;
          const totalSaleableAreaDeductByOccRate =
            getValues(`${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`) ?? 0;

          return toNumber(avgRentalRate * totalSaleableAreaDeductByOccRate * 12);
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.totalRentalIncome.${idx}`, `${name}.detail.startIn`],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          return getValues(`${name}.detail.totalRentalIncome.${idx}`) ?? 0;
        },
      },
    ];
  });
}

export function buildMethodRoomCostBasedOnExpensesPerRoomPerDayDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.roomRateIncrease.${idx}`,
        deps: [
          `${name}.detail.increaseRatePct`,
          `${name}.detail.increaseRateYrs`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed === 0) return 0;
          if (elapsed % increateRateYrs === 0) return toNumber(increaseRatePct);
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.roomExpense.${idx}`,
        deps: [
          `${name}.detail.roomRateIncrease.${idx}`,
          `${name}.detail.sumTotalRoomExpensePerYear`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const firstYearAmt = getValues(`${name}.detail.sumTotalRoomExpensePerYear`) ?? 0;
          if (idx === startIdx) return firstYearAmt;

          const prevRoomIncome = getValues(`${name}.detail.roomExpense.${idx - 1}`);
          const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`) ?? 0;

          return toNumber(prevRoomIncome * (1 + roomRateIncrease / 100));
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.roomExpense.${idx}`, `${name}.detail.startIn`],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          return getValues(`${name}.detail.roomExpense.${idx}`) ?? 0;
        },
      },
    ];
  });
}

export function buildMethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.increaseRate.${idx}`,
        deps: [
          `${name}.detail.increaseRatePct`,
          `${name}.detail.increaseRateYrs`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed === 0) return 0;
          if (elapsed % increateRateYrs === 0) return increaseRatePct;
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx}`,
        deps: [
          `${name}.detail.increaseRate.${idx}`,
          `${name}.detail.firstYearAmt`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const firstYearAmt = getValues(`${name}.detail.firstYearAmt`) ?? 0;
          if (idx === startIdx) return firstYearAmt;

          const prevTotalFoodAndBeveragePerRoomPerDay =
            getValues(`${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx - 1}`) ?? 0;
          const increaseRate = getValues(`${name}.detail.increaseRate.${idx}`) ?? 0;

          return toNumber(prevTotalFoodAndBeveragePerRoomPerDay * (1 + increaseRate / 100));
        },
      },
      {
        targetPath: `${name}.detail.totalFoodAndBeveragePerRoomPerYear.${idx}`,
        deps: [`${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx}`, `${name}.detail.startIn`],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const totalFoodAndBeveragePerRoomPerDay =
            getValues(`${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx}`) ?? 0;
          const totalNumberOfSaleableArea =
            getDCFFilteredAssumptions(
              getValues,
              a =>
                a.method?.methodType === '01' ||
                a.method?.methodType === '02' ||
                a.method?.methodType === '06',
            )?.[0]?.assumption.method?.detail?.totalSaleableAreaDeductByOccRate?.[idx] ?? 0;

          return toNumber(totalFoodAndBeveragePerRoomPerDay) * toNumber(totalNumberOfSaleableArea);
        },
      },
    ];
  });
}

export function buildMethodSpecifiedEnergyCostIndexDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.increaseRate.${idx}`,
        deps: [
          `${name}.detail.increaseRatePct`,
          `${name}.detail.increaseRateYrs`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed === 0) return 0;
          if (elapsed % increateRateYrs === 0) return increaseRatePct;
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.energyCostIndexIncrease.${idx}`,
        deps: [
          `${name}.detail.increaseRate.${idx}`,
          `${name}.detail.energyCostIndex`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const firstYearAmt = getValues(`${name}.detail.energyCostIndex`) ?? 0;
          if (idx === startIdx) return firstYearAmt;

          const prevEnergyCostIndexIncrease =
            getValues(`${name}.detail.energyCostIndexIncrease.${idx - 1}`) ?? 0;
          const increaseRate = getValues(`${name}.detail.increaseRate.${idx}`) ?? 0;

          return toNumber(prevEnergyCostIndexIncrease * (1 + increaseRate / 100));
        },
      },
      {
        targetPath: `${name}.detail.totalEnegyCost.${idx}`,
        deps: [`${name}.detail.energyCostIndexIncrease.${idx}`, `${name}.detail.startIn`],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          const totalEnegyCost = getValues(`${name}.detail.energyCostIndexIncrease.${idx}`) ?? 0;
          const totalNumberOfSaleableArea =
            getDCFFilteredAssumptions(
              getValues,
              a =>
                a.method?.methodType === '01' ||
                a.method?.methodType === '02' ||
                a.method?.methodType === '06',
            )?.[0]?.assumption.method?.detail?.totalSaleableAreaDeductByOccRate?.[idx] ?? 0;

          return toNumber(totalEnegyCost) * toNumber(totalNumberOfSaleableArea) * 12;
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.totalEnegyCost.${idx}`, `${name}.detail.startIn`],
        compute: ({ getValues }) => {
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          if (idx < getStartIdx(startIn)) return 0;

          return getValues(`${name}.detail.totalEnegyCost.${idx}`) ?? 0;
        },
      },
    ];
  });
}

export function buildMethodSpecifiedValueWithGrowthDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.increaseRates.${idx}`,
        deps: [
          `${name}.detail.increaseRatePct`,
          `${name}.detail.increaseRateYrs`,
          `${name}.detail.startIn`,
        ],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increaseRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          const startIn = getValues(`${name}.detail.startIn`) ?? 1;
          const startIdx = getStartIdx(startIn);

          if (idx < startIdx) return 0;

          const elapsed = getElapsedYears(idx, startIdx);
          if (elapsed === 0) return 0;
          if (elapsed % increaseRateYrs === 0) return toNumber(increaseRatePct);
          return 0;
        },
      },
    ];
  });
}
