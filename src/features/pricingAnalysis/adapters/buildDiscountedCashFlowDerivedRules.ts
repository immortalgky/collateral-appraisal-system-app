import { toNumber } from '../domain/calculation';
import type { DCFAssumption, DCFCategory, DCFSection } from '../types/dcf';
import type { DerivedFieldRule } from './useDerivedFieldArray';

export function buildCalculateTotalIncomeDerivedRules(
  sections: DCFSection[] | undefined,
  totalNumberOfYears: number,
): DerivedFieldRule[] {
  return (sections ?? [])
    .filter(section => section.sectionType === 'income' || section.sectionType === 'expenses')
    .flatMap((section, sectionIdx) => {
      return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
        const name = `sections.${sectionIdx}`;
        return [
          {
            targetPath: `${name}.totalSectionValues.${idx}`,
            deps: [`${name}.categories`],
            compute: ({ getValues }) => {
              const categories = getValues(`${name}.categories`) ?? [];
              const totalCategoryValue = categories.reduce((prev, curr: DCFCategory) => {
                return prev + Number(curr.totalCategoryValues?.[idx] ?? 0);
              }, 0);

              return Number(totalCategoryValue);
            },
          },
        ];
      });
    });
}

export function buildCalculateTotalCategoryDerivedRules(
  sections: DCFSection[] | undefined,
  totalNumberOfYears: number,
): DerivedFieldRule[] {
  return (sections ?? [])
    .filter(section => section.sectionType === 'income' || section.sectionType === 'expenses')
    .flatMap((section, sectionIdx) => {
      return (section.categories ?? []).flatMap((category, categoryIdx) => {
        return Array.from({ length: totalNumberOfYears }).flatMap((_, yearIdx) => {
          const name = `sections.${sectionIdx}.categories.${categoryIdx}`;
          return {
            targetPath: `${name}.totalCategoryValues.${yearIdx}`,
            deps: [`${name}.assumptions`],
            compute: ({ getValues }) => {
              const assumptions = getValues(`${name}.assumptions`) ?? [];
              return assumptions.reduce((prev: number, curr: DCFAssumption) => {
                return prev + Number(curr.totalAssumptionValues?.[yearIdx] ?? 0);
              }, 0);
            },
          };
        });
      });
    });
}

export function buildCalculateTotalAssumptionDerivedRules(
  sections: DCFSection[] | undefined,
  totalNumberOfYears: number,
): DerivedFieldRule[] {
  return (sections ?? [])
    .filter(section => section.sectionType === 'income' || section.sectionType === 'expenses')
    .flatMap((section, sectionIdx) => {
      return (section.categories ?? []).flatMap((category, categoryIdx) => {
        return (category.assumptions ?? []).flatMap((assumption, assumptionIdx) => {
          return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
            const name = `sections.${sectionIdx}.categories.${categoryIdx}.assumptions.${assumptionIdx}`;
            return [
              {
                targetPath: `${name}.totalAssumptionValues.${idx}`,
                deps: [`${name}.method.totalMethodValues.${idx}`],
                compute: ({ getValues }) => {
                  const totalMethodValue =
                    getValues(`${name}.method.totalMethodValues.${idx}`) ?? 0;
                  return Number(totalMethodValue);
                },
              },
            ];
          });
        });
      });
    });
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
        deps: [`${name}.detail.increaseRatePct`, `${name}.detail.increaseRateYrs`],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          if (idx === 0) return 0;
          if (idx % increateRateYrs === 0) return increaseRatePct;
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.totalPositionBasedSalaryPerYear.${idx}`,
        deps: [`${name}.detail.increaseRate.${idx}`, `${name}.detail.sumTotalSalaryPerYear`],
        compute: ({ getValues }) => {
          const firstYearAmt = getValues(`${name}.detail.sumTotalSalaryPerYear`) ?? 0;

          if (idx === 0) return firstYearAmt;

          const prevTotalSalaryCost = getValues(
            `${name}.detail.totalPositionBasedSalaryPerYear.${idx - 1}`,
          );
          const increaseRate = getValues(`${name}.detail.increaseRate.${idx}`) ?? 0;

          return toNumber(prevTotalSalaryCost * (1 + increaseRate / 100));
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.totalPositionBasedSalaryPerYear.${idx}`],
        compute: ({ getValues }) => {
          return getValues(`${name}.detail.totalPositionBasedSalaryPerYear.${idx}`) ?? 0;
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
        deps: ['totalNumberOfDayInYear', `${name}.detail.sumSaleableArea`],
        compute: ({ getValues }) => {
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
        ],
        when: ({ getFieldState, formState }) => {
          const { isDirty } = getFieldState(`${name}.detail.occupancyRate.${idx}`, formState);
          return !isDirty;
        },
        compute: ({ getValues }) => {
          const occupancyRateFirstYearPct =
            getValues(`${name}.detail.occupancyRateFirstYearPct`) ?? 0;
          const occupancyRatePct = getValues(`${name}.detail.occupancyRatePct`) ?? 0;
          const occupancyRateYrs = getValues(`${name}.detail.occupancyRateYrs`) ?? 0;

          if (idx === 0) return toNumber(occupancyRateFirstYearPct);

          const prevOccupancyRate = getValues(`${name}.detail.occupancyRate.${idx - 1}`) ?? 0;

          if (prevOccupancyRate >= 100) return 100;

          if (idx % occupancyRateYrs === 0) return toNumber(prevOccupancyRate + occupancyRatePct);

          return toNumber(prevOccupancyRate);
        },
      },
      {
        targetPath: `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
        deps: [`${name}.detail.saleableArea.${idx}`, `${name}.detail.occupancyRate.${idx}`],
        compute: ({ getValues }) => {
          const saleableArea = getValues(`${name}.detail.saleableArea.${idx}`) ?? 0;
          const occupancyRate = getValues(`${name}.detail.occupancyRate.${idx}`) ?? 0;
          return toNumber(saleableArea * (occupancyRate / 100));
        },
      },
      {
        targetPath: `${name}.detail.roomRateIncrease.${idx}`,
        deps: [`${name}.detail.increaseRatePct`, `${name}.detail.increaseRateYrs`],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          if (idx === 0) return 0;
          if (idx % increateRateYrs === 0) return toNumber(increaseRatePct);
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.avgDailyRate.${idx}`,
        deps: [`${name}.detail.roomRateIncrease.${idx}`, `${name}.detail.avgRoomRate`],
        compute: ({ getValues }) => {
          const avgRoomRate = getValues(`${name}.detail.avgRoomRate`);
          const prevAvgDailyRate = getValues(`${name}.detail.avgDailyRate.${idx - 1}`);
          const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`);
          if (idx === 0) return avgRoomRate;
          return toNumber(prevAvgDailyRate * (1 + roomRateIncrease / 100));
        },
      },
      {
        targetPath: `${name}.detail.roomIncome.${idx}`,
        deps: [
          `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
          `${name}.detail.avgDailyRate.${idx}`,
        ],
        compute: ({ getValues }) => {
          const totalSaleableAreaDeductByOccRate = getValues(
            `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
          );
          const avgDailyRate = getValues(`${name}.detail.avgDailyRate.${idx}`);
          return toNumber(totalSaleableAreaDeductByOccRate * avgDailyRate);
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.roomIncome.${idx}`],
        compute: ({ getValues }) => {
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
        deps: [`${name}.detail.increaseRatePct`, `${name}.detail.increaseRateYrs`],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          if (idx === 0) return 0;
          if (idx % increateRateYrs === 0) return increaseRatePct;
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.roomIncome.${idx}`,
        deps: [`${name}.detail.roomRateIncrease.${idx}`, `${name}.detail.firstYearAmt`],
        compute: ({ getValues }) => {
          const firstYearAmt = getValues(`${name}.detail.firstYearAmt`) ?? 0;

          if (idx === 0) return firstYearAmt;

          const prevRoomIncome = getValues(`${name}.detail.roomIncome.${idx - 1}`);
          const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`) ?? 0;

          return toNumber(prevRoomIncome * (1 + roomRateIncrease / 100));
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.roomIncome.${idx}`],
        compute: ({ getValues }) => {
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
        ],
        when: ({ getFieldState, formState }) => {
          const { isDirty } = getFieldState(`${name}.detail.occupancyRate.${idx}`, formState);
          return !isDirty;
        },
        compute: ({ getValues }) => {
          const occupancyRateFirstYearPct =
            getValues(`${name}.detail.occupancyRateFirstYearPct`) ?? 0;
          const occupancyRatePct = getValues(`${name}.detail.occupancyRatePct`) ?? 0;
          const occupancyRateYrs = getValues(`${name}.detail.occupancyRateYrs`) ?? 0;

          if (idx === 0) return occupancyRateFirstYearPct;

          const prevOccupancyRate = getValues(`${name}.detail.occupancyRate.${idx - 1}`) ?? 0;

          if (idx % occupancyRateYrs === 0) return prevOccupancyRate + occupancyRatePct;

          return prevOccupancyRate;
        },
      },
      {
        targetPath: `${name}.detail.roomRateIncrease.${idx}`,
        deps: [`${name}.detail.increaseRatePct`, `${name}.detail.increaseRateYrs`],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increateRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          if (idx === 0) return 0;
          if (idx % increateRateYrs === 0) return increaseRatePct;
          return 0;
        },
      },
      {
        targetPath: `${name}.detail.roomIncomeAdjustedValuedByGrowthRates.${idx}`,
        deps: [`${name}.detail.roomRateIncrease.${idx}`, `${name}.detail.firstYearAmt`],
        compute: ({ getValues }) => {
          const firstYearAmt = getValues(`${name}.detail.firstYearAmt`) ?? 0;

          if (idx === 0) return toNumber(firstYearAmt);

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
        ],
        compute: ({ getValues }) => {
          const adjRoomIncome =
            getValues(`${name}.detail.roomIncomeAdjustedValuedByGrowthRates.${idx}`) ?? 0;
          const occupancyRate = getValues(`${name}.detail.occupancyRate.${idx}`) ?? 0;

          return toNumber((adjRoomIncome * occupancyRate) / 100);
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.roomIncome.${idx}`],
        compute: ({ getValues }) => {
          return getValues(`${name}.detail.roomIncome.${idx}`) ?? 0;
        },
      },
    ];
  });
}
