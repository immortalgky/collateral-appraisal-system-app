import { toNumber } from '../domain/calculation';
import { resolveRefTarget } from '../domain/dcf/resolveRefTarget';
import { getDCFFilteredAssumptions } from '../domain/getDCFFilteredAssumptions';
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
              return categories.reduce((prev, curr: DCFCategory) => {
                return prev + toNumber(curr.totalCategoryValues?.[idx] ?? 0);
              }, 0);
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
                return prev + toNumber(curr.totalAssumptionValues?.[yearIdx] ?? 0);
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
                  return toNumber(totalMethodValue);
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
        deps: [`${name}.detail.roomRateIncrease.${idx}`, `${name}.detail.sumRoomIncomePerYear`],
        compute: ({ getValues }) => {
          const totalRoomIncomePerYear = getValues(`${name}.detail.sumRoomIncomePerYear`) ?? 0;
          const increaseRate = getValues(`${name}.detail.roomRateIncrease.${idx}`) ?? 0;

          if (idx === 0) return totalRoomIncomePerYear;

          const prevRoomIncome = getValues(`${name}.detail.roomIncome.${idx - 1}`) ?? 0;

          return toNumber(prevRoomIncome * (1 + increaseRate / 100));
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
        targetPath: `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
        deps: [`${name}.detail.sumSaleableArea`],
        compute: ({ getValues }) => {
          const saleableArea = getValues(`${name}.detail.sumSaleableArea`) ?? 0;
          const occupancyRate = getValues(`${name}.detail.occupancyRate.${idx}`) ?? 0;
          return toNumber(saleableArea * (occupancyRate / 100));
        },
      },
      {
        targetPath: `${name}.detail.rentalRateIncrease.${idx}`,
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
        targetPath: `${name}.detail.avgRentalRate.${idx}`,
        deps: [`${name}.detail.avgRentalRatePerMonth`, `${name}.detail.rentalRateIncrease.${idx}`],
        compute: ({ getValues }) => {
          const avgRentalRatePerMonth = getValues(`${name}.detail.avgRentalRatePerMonth`) ?? 0;
          const increaseRate = getValues(`${name}.detail.rentalRateIncrease.${idx}`) ?? 0;

          if (idx === 0) return toNumber(avgRentalRatePerMonth);

          const prevAvgRentalRate = getValues(`${name}.detail.avgRentalRate.${idx - 1}`) ?? 0;

          return toNumber(prevAvgRentalRate * (1 + increaseRate / 100));
        },
      },
      {
        targetPath: `${name}.detail.totalRentalIncome.${idx}`,
        deps: [
          `${name}.detail.avgRentalRate.${idx}`,
          `${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`,
        ],
        compute: ({ getValues }) => {
          const avgRentalRate = getValues(`${name}.detail.avgRentalRate.${idx}`) ?? 0;
          const totalSaleableAreaDeductByOccRate =
            getValues(`${name}.detail.totalSaleableAreaDeductByOccRate.${idx}`) ?? 0;

          return toNumber(avgRentalRate * totalSaleableAreaDeductByOccRate * 12);
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.totalRentalIncome.${idx}`],
        compute: ({ getValues }) => {
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
        targetPath: `${name}.detail.roomExpense.${idx}`,
        deps: [
          `${name}.detail.roomRateIncrease.${idx}`,
          `${name}.detail.sumTotalRoomExpensePerYear`,
        ],
        compute: ({ getValues }) => {
          const firstYearAmt = getValues(`${name}.detail.sumTotalRoomExpensePerYear`) ?? 0;

          if (idx === 0) return firstYearAmt;

          const prevRoomIncome = getValues(`${name}.detail.roomExpense.${idx - 1}`);
          const roomRateIncrease = getValues(`${name}.detail.roomRateIncrease.${idx}`) ?? 0;

          return toNumber(prevRoomIncome * (1 + roomRateIncrease / 100));
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.roomExpense.${idx}`],
        compute: ({ getValues }) => {
          return getValues(`${name}.detail.roomExpense.${idx}`) ?? 0;
        },
      },
    ];
  });
}

export function buildMethodRoomCostBasedOnExpensesPerRoomPerDayDerivedRulesDerivedRules({
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
        targetPath: `${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx}`,
        deps: [`${name}.detail.increaseRate.${idx}`, `${name}.detail.firstYearAmt`],
        compute: ({ getValues }) => {
          const firstYearAmt = getValues(`${name}.detail.firstYearAmt`) ?? 0;

          if (idx === 0) return firstYearAmt;

          const prevTotalFoodAndBeveragePerRoomPerDay =
            getValues(`${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx - 1}`) ?? 0;
          const increaseRate = getValues(`${name}.detail.increaseRate.${idx}`) ?? 0;

          return toNumber(prevTotalFoodAndBeveragePerRoomPerDay * (1 + increaseRate / 100));
        },
      },
      {
        targetPath: `${name}.detail.totalFoodAndBeveragePerRoomPerYear.${idx}`,
        deps: [`${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx}`],
        compute: ({ getValues }) => {
          const totalFoodAndBeveragePerRoomPerDay =
            getValues(`${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx}`) ?? 0;
          const totalNumberOfSaleableArea =
            getDCFFilteredAssumptions(getValues, a => a.method?.methodType === '01')?.[0]
              ?.assumption.method?.detail?.totalSaleableAreaDeductByOccRate?.[idx] ?? 0;

          return toNumber(totalFoodAndBeveragePerRoomPerDay) * toNumber(totalNumberOfSaleableArea);
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.totalFoodAndBeveragePerRoomPerDay.${idx}`],
        compute: ({ getValues }) => {
          return getValues(`${name}.detail.totalFoodAndBeveragePerRoomPerYear.${idx}`) ?? 0;
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
        targetPath: `${name}.detail.energyCostIndexIncrease.${idx}`,
        deps: [`${name}.detail.increaseRate.${idx}`, `${name}.detail.energyCostIndex`],
        compute: ({ getValues }) => {
          const firstYearAmt = getValues(`${name}.detail.energyCostIndex`) ?? 0;

          if (idx === 0) return firstYearAmt;

          const prevEnergyCostIndexIncrease =
            getValues(`${name}.detail.energyCostIndexIncrease.${idx - 1}`) ?? 0;
          const increaseRate = getValues(`${name}.detail.increaseRate.${idx}`) ?? 0;

          return toNumber(prevEnergyCostIndexIncrease * (1 + increaseRate / 100));
        },
      },
      {
        targetPath: `${name}.detail.totalEnegyCost.${idx}`,
        deps: [`${name}.detail.energyCostIndexIncrease.${idx}`],
        compute: ({ getValues }) => {
          const totalEnegyCost = getValues(`${name}.detail.energyCostIndexIncrease.${idx}`) ?? 0;
          const totalNumberOfSaleableArea =
            getDCFFilteredAssumptions(getValues, a => a.method.methodType === '06')?.[0]?.assumption
              .method?.detail?.totalSaleableAreaDeductByOccRate?.[idx] ?? 0;

          return toNumber(totalEnegyCost) * toNumber(totalNumberOfSaleableArea) * 12;
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.totalEnegyCost.${idx}`],
        compute: ({ getValues }) => {
          return getValues(`${name}.detail.totalEnegyCost.${idx}`) ?? 0;
        },
      },
    ];
  });
}

export function buildMethodProportionOfTheNewReplacementCostDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return [
    {
      targetPath: `${name}.detail.newReplacementCost`,
      deps: [],
      compute: ({ ctx }) => {
        console.log('recompute new replacement cost');
        return ctx.newReplacementCost ?? 0;
      },
    },
    ...Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.detail.proportionOfNewReplacementCosts.${idx}`,
          deps: [`${name}.detail.proportionPct`],
          compute: ({ getValues, ctx }) => {
            const proportionPct = getValues(`${name}.detail.proportionPct`) ?? 0;
            const newReplacementCost = ctx.newReplacementCost ?? 0;

            return toNumber((Number(proportionPct) / 100) * Number(newReplacementCost));
          },
        },
        {
          targetPath: `${name}.totalMethodValues.${idx}`,
          deps: [`${name}.detail.proportionOfNewReplacementCosts.${idx}`],
          compute: ({ getValues }) => {
            return getValues(`${name}.detail.proportionOfNewReplacementCosts.${idx}`) ?? 0;
          },
        },
      ];
    }),
  ];
}

export function buildMethodProportionDerivedRules({
  name,
  totalNumberOfYears,
}: {
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [`${name}.detail.proportionPct`, `${name}.detail.refTargetId`],
        compute: ({ getValues, ctx }) => {
          const proportionPct = getValues(`${name}.detail.proportionPct`) ?? 0;
          const refTargetId = getValues(`${name}.detail.refTargetId`);
          const sections = ctx?.sections ?? [];
          const totalRefValue = resolveRefTarget(sections, refTargetId)?.[idx] ?? 0;

          return toNumber((Number(proportionPct) / 100) * Number(totalRefValue));
        },
      },
    ];
  });
}

export function buildMethodSpecifiedValueWithGrowthDerivedRules({
  sections,
  name,
  totalNumberOfYears,
}: {
  sections: DCFSection[];
  name: string;
  totalNumberOfYears: number;
}): DerivedFieldRule[] {
  return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
    return [
      {
        targetPath: `${name}.detail.increaseRates.${idx}`,
        deps: [`${name}.detail.increaseRatePct`, `${name}.detail.increaseRateYrs`],
        compute: ({ getValues }) => {
          const increaseRatePct = getValues(`${name}.detail.increaseRatePct`) ?? 0;
          const increaseRateYrs = getValues(`${name}.detail.increaseRateYrs`) ?? 0;
          if (idx === 0) return 0;

          if (idx % increaseRateYrs === 0) return toNumber(increaseRatePct);
        },
      },
      {
        targetPath: `${name}.totalMethodValues.${idx}`,
        deps: [
          `${name}.detail.firstYearAmt`,
          `${name}.detail.increaseRatePct`,
          `${name}.increaseRates.${idx}`,
        ],
        compute: ({ getValues }) => {
          const prevYearValue = getValues(`${name}.totalMethodValues.${idx - 1}`) ?? 0;
          const firstYearAmt = getValues(`${name}.detail.firstYearAmt`) ?? 0;
          const increaseRate = getValues(`${name}.increaseRates.${idx}`) ?? 0;

          if (idx === 0) return toNumber(firstYearAmt);

          return toNumber(prevYearValue * (1 + increaseRate / 100));
        },
      },
    ];
  });
}
