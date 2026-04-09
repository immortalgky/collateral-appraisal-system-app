import { floorToThousand, toNumber } from '../domain/calculation';
import { resolveRefTarget } from '../domain/dcf/resolveRefTarget';
import { getDCFFilteredAssumptions } from '../domain/getDCFFilteredAssumptions';
import type { DCFAssumption, DCFCategory, DCFSection } from '../types/dcf';
import type { DerivedFieldRule } from './useDerivedFieldArray';

export function buildStaticCalculationDerivedRules(
  sections: DCFSection[] | undefined,
  totalNumberOfYears: number,
) {
  return (sections ?? []).flatMap((section, sectionIdx) => {
    if (section.sectionType === 'income') {
      return [
        // calculate summation of categories under section
        ...Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
          const name = `sections.${sectionIdx}`;
          return {
            targetPath: `${name}.totalSectionValues.${idx}`,
            deps: [`${name}.categories`],
            compute: ({ getValues }) => {
              const categories = getValues(`${name}.categories`) ?? [];
              return categories.reduce((prev, curr: DCFCategory) => {
                return prev + toNumber(curr.totalCategoryValues?.[idx] ?? 0);
              }, 0);
            },
          };
        }),

        // calculate summation of assumptions under categories
        ...(section.categories ?? []).flatMap((category, categoryIdx) => {
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
        }),
      ];
    }

    if (section.sectionType === 'expenses') {
      return [
        // calculate summation of categories under section
        ...Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
          const name = `sections.${sectionIdx}`;
          return {
            targetPath: `${name}.totalSectionValues.${idx}`,
            deps: [`${name}.categories`],
            compute: ({ getValues }) => {
              const categories = getValues(`${name}.categories`) ?? [];
              return categories.reduce((prev, curr: DCFCategory) => {
                if (curr.categoryType === 'gop') return prev;
                return prev + toNumber(curr.totalCategoryValues?.[idx] ?? 0);
              }, 0);
            },
          };
        }),

        // calculate summation of assumptions under categories
        ...(section.categories ?? []).flatMap((category, categoryIdx) => {
          if (category.categoryType === 'expenses') {
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
          }

          if (category.categoryType === 'gop') {
            return Array.from({ length: totalNumberOfYears }).flatMap((_, yearIdx) => {
              const name = `sections.${sectionIdx}.categories.${categoryIdx}`;
              return {
                targetPath: `${name}.totalCategoryValues.${yearIdx}`,
                deps: [],
                compute: ({ ctx }) => {
                  const totalIncome = ctx.sections?.find(
                    section => section.sectionType === 'income',
                  )?.totalSectionValues;
                  const TotalExpensesExcludeFixedCharge = ctx.sections
                    ?.find(section => section.sectionType === 'expenses')
                    ?.categories?.filter(
                      category =>
                        category.categoryType !== 'gop' && category.categoryType !== 'fixedExps',
                    );
                  const income = totalIncome?.[yearIdx] ?? 0;
                  const exps =
                    TotalExpensesExcludeFixedCharge?.reduce(
                      (acc, curr) => (acc += curr.totalCategoryValues?.[yearIdx] ?? 0),
                      0,
                    ) ?? 0;
                  return income - exps;
                },
              };
            });
          }

          if (category.categoryType === 'fixedExps') {
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
          }
        }),
      ];
    }

    if (section.sectionType === 'summaryDCF') {
      return [
        ...Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
          return [
            {
              targetPath: `sections.${sectionIdx}.grossRevenue.${idx}`,
              deps: ['sections'],
              compute: ({ getValues, ctx }) => {
                const grossRevenue = (ctx.sections ?? []).reduce((prev, curr) => {
                  const identifer = curr.identifier ?? '';
                  if (identifer === 'positive')
                    return prev + toNumber(curr.totalSectionValues?.[idx] ?? 0);
                  if (identifer === 'negative')
                    return prev - toNumber(curr.totalSectionValues?.[idx] ?? 0);
                  return prev;
                }, 0);

                // minus contract fee from lease agreement
                const contractRentalFee =
                  getValues(`sections.${sectionIdx}.contractRentalFee.${idx}`) ?? 0;
                return grossRevenue - contractRentalFee;
              },
            },
            {
              targetPath: `sections.${sectionIdx}.grossRevenueProportional.${idx}`,
              deps: ['sections'],
              compute: ({ getValues }) => {
                const grossRevenue = getValues(`sections.${sectionIdx}.grossRevenue.${idx}`) ?? 0;
                const income = (sections ?? []).reduce((prev, curr) => {
                  const identifer = curr.identifier ?? '';
                  if (identifer === 'positive')
                    return prev + Number(curr.totalSectionValues?.[idx] ?? 0);
                  return prev;
                }, 0);
                if (income == 0) return 0;
                return (grossRevenue / income) * 100;
              },
            },
            {
              targetPath: `sections.${sectionIdx}.contractRentalFee.${idx}`,
              deps: [],
              compute: ({ getValues }) => {
                return 0;
              },
            },
          ];
        }),
        ...Array.from({ length: totalNumberOfYears - 1 }).flatMap((_, idx) => {
          return [
            {
              targetPath: `sections.${sectionIdx}.terminalRevenue.${idx}`,
              deps: ['sections', `capitalizeRate`],
              when: () => {
                return idx === totalNumberOfYears - 2;
              },
              compute: ({ getValues }) => {
                const lastYearGrossRevenue =
                  getValues(`sections.${sectionIdx}.grossRevenue.${totalNumberOfYears - 1}`) ?? 0;
                const capRate = getValues(`capitalizeRate`) ?? 0;
                if (capRate === 0) return 0;
                return lastYearGrossRevenue / (capRate / 100);
              },
            },
            {
              targetPath: `sections.${sectionIdx}.totalNet.${idx}`,
              deps: ['sections'],
              compute: ({ getValues }) => {
                const terminalRevenue =
                  getValues(`sections.${sectionIdx}.terminalRevenue.${idx}`) ?? 0;
                const grossRevenue = getValues(`sections.${sectionIdx}.grossRevenue.${idx}`) ?? 0;
                return Number(terminalRevenue) + Number(grossRevenue);
              },
            },
            {
              targetPath: `sections.${sectionIdx}.discount.${idx}`,
              deps: ['discountedRate'],
              compute: ({ getValues }) => {
                const dicountedRate = getValues('discountedRate');
                return 1 / Math.pow(1 + dicountedRate / 100, idx + 1);
              },
            },
            {
              targetPath: `sections.${sectionIdx}.presentValue.${idx}`,
              deps: [],
              compute: ({ getValues }) => {
                const discount = getValues(`sections.${sectionIdx}.discount.${idx}`) ?? 0;
                const totalNet = getValues(`sections.${sectionIdx}.totalNet.${idx}`) ?? 0;
                return discount * totalNet;
              },
            },
          ];
        }),
        {
          targetPath: `finalValue`,
          deps: ['sections'],
          compute: ({ getValues }) => {
            const summarySection = (getValues('sections') ?? []).find(
              (s: DCFSection) => s.sectionType === 'summaryDCF',
            ) as DCFSummarySection;
            const finalValue = (summarySection?.presentValue ?? []).reduce((prev, curr) => {
              return prev + Number(curr ?? 0);
            }, 0);
            return finalValue;
          },
        },
        {
          targetPath: `finalValueRounded`,
          deps: [`finalValue`],
          when: ({ getFieldState, formState }) => {
            const { isDirty } = getFieldState('finalValueRounded', formState);
            return !isDirty;
          },
          compute: ({ getValues }) => {
            const finalValue = getValues('finalValue') ?? 0;
            return finalValue;
          },
        },
      ];
    }

    if (section.sectionType === 'summaryDirect') {
      return [
        {
          targetPath: `sections.${sectionIdx}.totalNet`,
          deps: ['sections'],
          compute: ({ getValues }) => {
            const grossRevenue = (sections ?? []).reduce((prev, curr) => {
              const identifer = curr.identifier ?? '';
              if (identifer === 'positive') return prev + Number(curr.totalSectionValues?.[0] ?? 0);
              if (identifer === 'negative') return prev - Number(curr.totalSectionValues?.[0] ?? 0);
              return prev;
            }, 0);

            // minus contract fee from lease agreement
            const contractRentalFee = getValues(`sections.${sectionIdx}.contractRentalFee`) ?? 0;
            return grossRevenue - contractRentalFee;
          },
        },
        {
          targetPath: `sections.${sectionIdx}.contractRentalFee`,
          deps: [],
          compute: ({ getValues }) => {
            return 0;
          },
        },
        {
          targetPath: `sections.${sectionIdx}.presentValue`,
          deps: [`capitalizeRate`, `sections.${sectionIdx}.totalNet`],
          compute: ({ getValues }) => {
            const capitalizeRate = getValues(`capitalizeRate`);
            const totalNet = getValues(`sections.${sectionIdx}.totalNet`) ?? 0;

            if (!capitalizeRate) return 0;

            return toNumber(totalNet / capitalizeRate / 100);
          },
        },
        {
          targetPath: `finalValue`,
          deps: ['sections'],
          compute: ({ getValues }) => {
            return getValues(`sections.${sectionIdx}.presentValue`) ?? 0;
          },
        },
        {
          targetPath: `finalValueRounded`,
          deps: [`finalValue`],
          when: ({ getFieldState, formState }) => {
            const { isDirty } = getFieldState('finalValueRounded', formState);
            return !isDirty;
          },
          compute: ({ getValues }) => {
            const finalValue = getValues('finalValue') ?? 0;
            return finalValue;
          },
        },
      ];
    }
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

export function buildMethodParameterBasedOnTierOfPropertyValueDerivedRules({
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
        deps: [`${name}.detail.propertyTax.totalPropertyTax.${idx}`],
        compute: ({ getValues }) => {
          return getValues(`${name}.detail.propertyTax.totalPropertyTax.${idx}`);
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
        deps: ['totalNumberOfDayInYear', `${name}.detail.sumSaleableArea`],
        compute: ({ getValues }) => {
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
        return ctx.newReplacementCost ?? 0;
      },
    },
    ...Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
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
          targetPath: `${name}.detail.proportionOfNewReplacementCosts.${idx}`,
          deps: [`${name}.detail.proportionPct`, `${name}.detail.increaseRate.${idx}`],
          compute: ({ getValues, ctx }) => {
            const proportionPct = getValues(`${name}.detail.proportionPct`) ?? 0;
            const newReplacementCost = ctx.newReplacementCost ?? 0;
            const increaseRate = getValues(`${name}.detail.increaseRate.${idx}`) ?? 0;

            if (idx === 0) return (Number(proportionPct) / 100) * Number(newReplacementCost);

            const prevValue = getValues(
              `${name}.detail.proportionOfNewReplacementCosts.${idx - 1}`,
            );

            return toNumber(prevValue * (1 + increaseRate / 100));
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
          const increaseRate = getValues(`${name}.detail.increaseRates.${idx}`) ?? 0;

          if (idx === 0) return toNumber(firstYearAmt);

          return toNumber(prevYearValue * (1 + increaseRate / 100));
        },
      },
    ];
  });
}
