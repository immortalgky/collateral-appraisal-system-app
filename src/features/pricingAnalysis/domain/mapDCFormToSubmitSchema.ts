import type {
  DCF,
  DCFAssumption,
  DCFCategory,
  DCFMethod,
} from '@features/pricingAnalysis/types/dcf.ts';
import { getNewId } from '@features/pricingAnalysis/domain/getNewId.ts';

function buildMethod(method: DCFMethod): DCFMethod {
  const base = {
    ...method,
    clientId: method.clientId,
  } as DCFMethod;

  switch (method.methodType) {
    case '01':
      return {
        ...base,
        detail: method.detail
          ? {
              roomDetails: method.detail.roomDetails ?? [],
              // sumRoomIncome: method.detail.sumRoomIncome ?? 0,
              // sumSaleableArea: method.detail.sumSaleableArea ?? 0,
              // sumTotalRoomIncome: method.detail.sumTotalRoomIncome ?? 0,
              // avgRoomRate: method.detail.avgRoomRate ?? 0,
              totalSaleableArea: method.detail.totalSaleableArea ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              occupancyRateFirstYearPct: method.detail.occupancyRateFirstYearPct ?? 0,
              occupancyRatePct: method.detail.occupancyRatePct ?? 0,
              occupancyRateYrs: method.detail.occupancyRateYrs ?? 0,
              // saleableArea: method.detail.saleableArea ?? [],
              occupancyRate: method.detail.occupancyRate ?? [],
              // totalSaleableAreaDeductByOccRate:
              //   method.detail.totalSaleableAreaDeductByOccRate ?? [],
              // roomRateIncrease: method.detail.roomRateIncrease ?? [],
              // avgDailyRate: method.detail.avgDailyRate ?? [],
              roomIncome: method.detail.roomIncome ?? [],
              totalMethodValues: method.detail.totalMethodValues ?? [],
            }
          : undefined,
      };

    case '02':
      return {
        ...base,
        detail: method.detail
          ? {
              seasonCount: method.detail.seasonCount ?? 0,
              seasonDetails: method.detail.seasonDetails ?? [],
              roomDetails: method.detail.roomDetails ?? [],
              // avgRoomRate: method.detail.avgRoomRate ?? 0,
              totalSaleableArea: method.detail.totalSaleableArea ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              occupancyRateFirstYearPct: method.detail.occupancyRateFirstYearPct ?? 0,
              occupancyRatePct: method.detail.occupancyRatePct ?? 0,
              occupancyRateYrs: method.detail.occupancyRateYrs ?? 0,
              // saleableArea: method.detail.saleableArea ?? [],
              occupancyRate: method.detail.occupancyRate ?? [],
              // totalSaleableAreaDeductByOccRate:
              //   method.detail.totalSaleableAreaDeductByOccRate ?? [],
              // roomRateIncrease: method.detail.roomRateIncrease ?? [],
              // avgDailyRate: method.detail.avgDailyRate ?? [],
              // roomIncome: method.detail.roomIncome ?? [],
            }
          : undefined,
      };

    case '03':
      return {
        ...base,
        detail: method.detail
          ? {
              saleableArea: method.detail.saleableArea ?? 0,
              totalNumberOfSaleableArea: method.detail.totalNumberOfSaleableArea ?? 0,
              remark: method.detail.remark ?? '',
              firstYearAmt: method.detail.firstYearAmt ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              // roomRateIncrease: method.detail.roomRateIncrease ?? [],
              // roomIncome: method.detail.roomIncome ?? [],
              // totalMethodValues: method.detail.totalMethodValues ?? [],
            }
          : undefined,
      };

    case '04':
      return {
        ...base,
        detail: method.detail
          ? {
              saleableArea: method.detail.saleableArea ?? 0,
              totalNumberOfSaleableArea: method.detail.totalNumberOfSaleableArea ?? 0,
              remark: method.detail.remark ?? '',
              firstYearAmt: method.detail.firstYearAmt ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              occupancyRateFirstYearPct: method.detail.occupancyRateFirstYearPct ?? 0,
              occupancyRatePct: method.detail.occupancyRatePct ?? 0,
              occupancyRateYrs: method.detail.occupancyRateYrs ?? 0,
              occupancyRate: method.detail.occupancyRate ?? [],
              // roomRateIncrease: method.detail.roomRateIncrease ?? [],
              // roomIncomeAdjustedValuedByGrowthRates:
              //   method.detail.roomIncomeAdjustedValuedByGrowthRates ?? [],
              // roomIncome: method.detail.roomIncome ?? [],
            }
          : undefined,
      };

    case '05':
      return {
        ...base,
        detail: method.detail
          ? {
              roomDetails: method.detail.roomDetails ?? {
                roomType: '',
                roomTypeOther: undefined,
                roomIncome: 0,
                saleableArea: 0,
                totalRoomIncomePerMonth: 0,
                totalRoomIncomePerYear: 0,
              },
              // sumSaleableArea: method.detail.sumSaleableArea ?? 0,
              // sumRoomIncomePerMonth: method.detail.sumRoomIncomePerMonth ?? 0,
              // sumRoomIncomePerYear: method.detail.sumRoomIncomePerYear ?? 0,
              totalSaleableArea: method.detail.totalSaleableArea ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              // roomRateIncrease: method.detail.roomRateIncrease ?? [],
              // roomIncome: method.detail.roomIncome ?? [],
            }
          : undefined,
      };

    case '06':
      return {
        ...base,
        detail: method.detail
          ? {
              areaDetail: method.detail.areaDetail ?? {
                description: '',
                rentalPrice: 0,
                saleableArea: 0,
                totalRentalIncomePerMonth: 0,
                totalRentalIncomePerYear: 0,
              },
              // sumRentalPrice: method.detail.sumRentalPrice ?? 0,
              // sumSaleableArea: method.detail.sumSaleableArea ?? 0,
              // sumTotalRentalIncomePerMonth: method.detail.sumTotalRentalIncomePerMonth ?? 0,
              // sumTotalRentalIncomePerYear: method.detail.sumTotalRentalIncomePerYear ?? 0,
              // avgRentalRatePerMonth: method.detail.avgRentalRatePerMonth ?? 0,
              totalSaleableArea: method.detail.totalSaleableArea ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              occupancyRateFirstYearPct: method.detail.occupancyRateFirstYearPct ?? 0,
              occupancyRatePct: method.detail.occupancyRatePct ?? 0,
              occupancyRateYrs: method.detail.occupancyRateYrs ?? 0,
              occupancyRate: method.detail.occupancyRate ?? [],
              // totalSaleableAreaDeductByOccRate:
              //   method.detail.totalSaleableAreaDeductByOccRate ?? [],
              // rentalRateIncrease: method.detail.rentalRateIncrease ?? [],
              // avgRentalRate: method.detail.avgRentalRate ?? [],
              // totalRentalIncome: method.detail.totalRentalIncome ?? [],
              // totalMethodValues: method.detail.totalMethodValues ?? [],
            }
          : undefined,
      };

    case '07':
      return {
        ...base,
        detail: method.detail
          ? {
              roomDetails: method.detail.roomDetails ?? [],
              // sumSaleableArea: method.detail.sumSaleableArea ?? 0,
              // sumTotalRoomExpensePerDay: method.detail.sumTotalRoomExpensePerDay ?? 0,
              // sumTotalRoomExpensePerYear: method.detail.sumTotalRoomExpensePerYear ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              // saleableArea: method.detail.saleableArea ?? [],
              // roomRateIncrease: method.detail.roomRateIncrease ?? [],
              // roomExpense: method.detail.roomExpense ?? [],
            }
          : undefined,
      };

    case '08':
      return {
        ...base,
        detail: method.detail
          ? {
              firstYearAmt: method.detail.firstYearAmt ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              // increaseRate: method.detail.increaseRate ?? [],
              // totalFoodAndBeveragePerRoomPerDay:
              //   method.detail.totalFoodAndBeveragePerRoomPerDay ?? [],
              // totalFoodAndBeveragePerRoomPerYear:
              //   method.detail.totalFoodAndBeveragePerRoomPerYear ?? [],
            }
          : undefined,
      };

    case '09':
      return {
        ...base,
        detail: method.detail
          ? {
              jobPositionDetails: method.detail.jobPositionDetails ?? [],
              // sumSalaryBahtPerPersonPerMonth: method.detail.sumSalaryBahtPerPersonPerMonth ?? 0,
              // sumTotalSalaryPerYear: method.detail.sumTotalSalaryPerYear ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              // increaseRate: method.detail.increaseRate ?? [],
              // totalPositionBasedSalaryPerYear: method.detail.totalPositionBasedSalaryPerYear ?? [],
            }
          : undefined,
      };

    case '10':
      return {
        ...base,
        detail: method.detail
          ? {
              // propertyTax: method.detail.propertyTax ?? {
              //   landPrices: [],
              //   totalPropertyPrice: [],
              //   totalPropertyTax: [],
              //   totalPropertyTaxRates: [],
              // },
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              startIn: method.detail.startIn ?? 0,
              // totalMethodValues: method.detail.totalMethodValues ?? [],
            }
          : undefined,
      };

    case '11':
      return {
        ...base,
        detail: method.detail
          ? {
              energyCostIndex: method.detail.energyCostIndex ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              // increaseRate: method.detail.increaseRate ?? [],
              // energyCostIndexIncrease: method.detail.energyCostIndexIncrease ?? [],
              // totalEnegyCost: method.detail.totalEnegyCost ?? [],
            }
          : undefined,
      };

    case '12':
      return {
        ...base,
        detail: method.detail
          ? {
              proportionPct: method.detail.proportionPct ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              // newReplacementCost: method.detail.newReplacementCost ?? 0,
              // proportionOfNewReplacementCosts: method.detail.proportionOfNewReplacementCosts ?? [],
              // totalMethodValues: method.detail.totalMethodValues ?? [],
            }
          : undefined,
      };

    case '13':
      return {
        ...base,
        detail: {
          proportionPct: method.detail?.proportionPct ?? 0,
          refTarget: {
            kind: method.detail?.refTarget?.kind ?? 'assumption',
            templateId: method.detail?.refTarget?.templateId ?? null,
            clientId: method.detail?.refTarget?.clientId ?? null,
            dbId: method.detail?.refTarget?.dbId ?? null,
          },
        },
      };

    case '14':
      return {
        ...base,
        detail: method.detail
          ? {
              firstYearAmt: method.detail.firstYearAmt ?? 0,
              increaseRatePct: method.detail.increaseRatePct ?? 0,
              increaseRateYrs: method.detail.increaseRateYrs ?? 0,
              increaseRates: method.detail.increaseRates ?? [],
            }
          : undefined,
      };

    default:
      return structuredClone(method);
  }
}

interface MapDCFFormToSubmitSchemaProps {
  DCFForm: DCF;
}
export function mapDCFFormToSubmitSchema({ DCFForm }: MapDCFFormToSubmitSchemaProps) {
  return {
    clientId: getNewId(),
    templateCode: DCFForm.templateCode,
    templateName: DCFForm.templateName,
    totalNumberOfYears: DCFForm.totalNumberOfYears,
    totalNumberOfDayInYear: DCFForm.totalNumberOfDayInYear,
    capitalizeRate: DCFForm.capitalizeRate,
    discountedRate: DCFForm.discountedRate,

    sections: (DCFForm.sections ?? []).map((section, sIdx) => ({
      ...section,
      templateId: section.templateId,
      clientId: section.clientId,
      dbId: section.dbId,
      displaySeq: sIdx,

      categories: (section.categories ?? []).map((category: DCFCategory) => ({
        ...category,
        templateId: category.templateId,
        clientId: category.clientId,
        dbId: category.dbId,
        displaySeq: category.displaySeq,

        assumptions: (category.assumptions ?? []).map((assumption: DCFAssumption) => ({
          ...assumption,
          templateId: assumption.templateId,
          clientId: assumption.clientId,
          dbId: assumption.dbId,
          displaySeq: assumption.displaySeq,
          method: buildMethod(assumption.method),
        })),
      })),
    })),

    isHighestBestUsed: DCFForm.isHighestBestUsed,
    finalValue: DCFForm.finalValue,
    finalValueRounded: DCFForm.finalValueRounded,
    appraisalPrice: DCFForm.appraisalPrice,
    appraisalPriceRounded: DCFForm.appraisalPriceRounded,
  };
}
