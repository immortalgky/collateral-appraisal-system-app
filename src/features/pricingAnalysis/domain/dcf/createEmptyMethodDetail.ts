import type { DCFMethod } from '../../types/dcf';
import { getNewId } from '../getNewId';

type MethodType = DCFMethod['methodType'];

export function createDefaultMethod(methodType: MethodType): DCFMethod {
  const id = getNewId();

  switch (methodType) {
    case '01':
      return {
        id,
        methodType: '01',
        totalMethodValues: [],
        detail: {
          roomDetails: [],
          sumRoomIncome: 0,
          sumSaleableArea: 0,
          sumTotalRoomIncome: 0,
          avgRoomRate: 0,
          totalSaleableArea: 0,
          increaseRatePct: 0,
          increaseRateYrs: 0,
          occupancyRateFirstYearPct: 0,
          occupancyRatePct: 0,
          occupancyRateYrs: 0,
          saleableArea: [],
          occupancyRate: [],
          totalSaleableAreaDeductByOccRate: [],
          roomRateIncrease: [],
          avgDailyRate: [],
          roomIncome: [],
          totalMethodValues: [],
          startIn: 1,
        },
      };
    case '02':
      return {
        id,
        methodType: '02',
        totalMethodValues: [],
        detail: {
          seasonCount: 1,
          seasonDetails: [],
          roomDetails: [],
          avgRoomRate: 0,
          totalSaleableArea: 0,
          increaseRatePct: 0,
          increaseRateYrs: 0,
          occupancyRateFirstYearPct: 0,
          occupancyRatePct: 0,
          occupancyRateYrs: 0,
          saleableArea: [],
          occupancyRate: [],
          totalSaleableAreaDeductByOccRate: [],
          roomRateIncrease: [],
          avgDailyRate: [],
          roomIncome: [],
          startIn: 1,
        },
      };
    case '03':
      return {
        id,
        methodType: '03',
        totalMethodValues: [],
        detail: {
          saleableArea: 0,
          totalNumberOfSaleableArea: 0,
          remark: '',
          firstYearAmt: 0,
          increaseRatePct: 0,
          increaseRateYrs: 0,
          roomRateIncrease: [],
          roomIncome: [],
          totalMethodValues: [],
          startIn: 1,
        },
      };
    case '04':
      return {
        id,
        methodType: '04',
        totalMethodValues: [],
        detail: {
          saleableArea: 0,
          totalNumberOfSaleableArea: 0,
          remark: '',
          firstYearAmt: 0,
          increaseRatePct: 0,
          increaseRateYrs: 0,
          occupancyRateFirstYearPct: 0,
          occupancyRatePct: 0,
          occupancyRateYrs: 0,
          occupancyRate: [],
          roomRateIncrease: [],
          roomIncomeAdjustedValuedByGrowthRates: [],
          roomIncome: [],
          startIn: 1,
        },
      };
    case '05':
      return {
        id,
        methodType: '05',
        totalMethodValues: [],
        detail: {
          roomDetails: [],
          sumSaleableArea: 0,
          sumRoomIncomePerMonth: 0,
          sumRoomIncomePerYear: 0,
          totalSaleableArea: 0,
          increaseRatePct: 0,
          increaseRateYrs: 0,
          roomRateIncrease: [],
          roomIncome: [],
          startIn: 1,
        },
      };
    case '06':
      return {
        id,
        methodType: '06',
        totalMethodValues: [],
        detail: {
          areaDetail: [],
          sumRentalPrice: 0,
          sumSaleableArea: 0,
          sumTotalRentalIncomePerMonth: 0,
          sumTotalRentalIncomePerYear: 0,
          totalSaleableArea: 0,
          increaseRatePct: 0,
          increaseRateYrs: 0,
          avgRentalRatePerMonth: 0,
          occupancyRateFirstYearPct: 0,
          occupancyRatePct: 0,
          occupancyRateYrs: 0,
          occupancyRate: [],
          totalSaleableAreaDeductByOccRate: [],
          rentalRateIncrease: [],
          avgRentalRate: [],
          totalRentalIncome: [],
          totalMethodValues: [],
          startIn: 1,
        },
      };
    case '07':
      return {
        id,
        methodType: '07',
        totalMethodValues: [],
        detail: {
          roomDetails: [],
          sumSaleableArea: 0,
          sumTotalRoomExpensePerDay: 0,
          sumTotalRoomExpensePerYear: 0,
          increaseRatePct: 0,
          increaseRateYrs: 0,
          saleableArea: [],
          roomRateIncrease: [],
          roomExpense: [],
          totalMethodValues: [],
          startIn: 1,
        },
      };
    case '08':
      return {
        id,
        methodType: '08',
        totalMethodValues: [],
        detail: {
          firstYearAmt: 0,
          increaseRatePct: 0,
          increaseRateYrs: 0,
          increaseRate: [],
          totalFoodAndBeveragePerRoomPerDay: [],
          totalFoodAndBeveragePerRoomPerYear: [],
          startIn: 1,
        },
      };
    case '09':
      return {
        id,
        methodType: '09',
        totalMethodValues: [],
        detail: {
          jobPositionDetails: [],
          sumSalaryBahtPerPersonPerMonth: 0,
          sumTotalSalaryPerYear: 0,
          increaseRatePct: 0,
          increaseRateYrs: 0,
          increaseRate: [],
          totalPositionBasedSalaryPerYear: [],
          startIn: 1,
        },
      };
    case '10':
      return {
        id,
        methodType: '10',
        totalMethodValues: [],
        detail: { startIn: 1 },
      };
    case '11':
      return {
        id,
        methodType: '11',
        totalMethodValues: [],
        detail: {
          energyCostIndex: 0,
          increaseRatePct: 0,
          increaseRateYrs: 0,
          increaseRate: [],
          energyCostIndexIncrease: [],
          totalEnegyCost: [],
          startIn: 1,
        },
      };
    case '12':
      return {
        id,
        methodType: '12',
        totalMethodValues: [],
        detail: {
          proportionPct: 0,
          newReplacementCost: 0,
          proportionOfNewReplacementCosts: [],
          totalMethodValues: [],
          startIn: 1,
        },
      };
    case '13':
      return {
        id,
        methodType: '13',
        totalMethodValues: [],
        detail: {
          proportionPct: 0,
          refTarget: { kind: 'assumption' },
          startIn: 1,
        },
      };
    case '14':
      return {
        id,
        methodType: '14',
        totalMethodValues: [],
        detail: {
          firstYearAmt: 0,
          increaseRatePct: 0,
          increaseRateYrs: 0,
          startIn: 1,
        },
      };
    case '15':
      return {
        id,
        methodType: '15',
        totalMethodValues: [],
        detail: { startIn: 1 },
      };
    default: {
      const _exhaustive: never = methodType;
      return _exhaustive;
    }
  }
}
