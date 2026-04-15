import type {
  DCFMethod,
  MethodParameterBasedOnTierOfPropertyValue,
  MethodPositionBasedSalaryCalculation,
  MethodProportion,
  MethodProportionOfTheNewReplacementCost,
  MethodRoomCostBasedOnExpensesPerRoomPerDay,
  MethodSpecifiedEnergyCostIndex,
  MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay,
  MethodSpecifiedRentalIncomePerMonth,
  MethodSpecifiedRentalIncomePerSquareMeter,
  MethodSpecifiedRoomIncomeBySeasonalRates,
  MethodSpecifiedRoomIncomePerDay,
  MethodSpecifiedRoomIncomeWithGrowth,
  MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate,
  MethodSpecifiedValueWithGrowth,
} from '@features/pricingAnalysis/types/dcf.ts';

export function createEmptyMethodDetail(methodType: DCFMethod['methodType']) {
  switch (methodType) {
    case '01':
      return {
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
      } as MethodSpecifiedRoomIncomePerDay;
    case '02':
      return {
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
      } as MethodSpecifiedRoomIncomeBySeasonalRates;
    case '03':
      return {
        saleableArea: 0,
        totalNumberOfSaleableArea: 0,
        remark: '',
        firstYearAmt: 0,
        increaseRatePct: 0,
        increaseRateYrs: 0,
        roomRateIncrease: [],
        roomIncome: [],
        totalMethodValues: [],
      } as MethodSpecifiedRoomIncomeWithGrowth;
    case '04':
      return {
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
      } as MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate;
    case '05':
      return {
        roomDetails: [],
        sumSaleableArea: 0,
        sumRoomIncomePerMonth: 0,
        sumRoomIncomePerYear: 0,
        totalSaleableArea: 0,
        increaseRatePct: 0,
        increaseRateYrs: 0,
        roomRateIncrease: [],
        roomIncome: [],
      } as MethodSpecifiedRentalIncomePerMonth;
    case '06':
      return {
        areaDetail: [],
        sumRentalPrice: 0,
        sumSaleableArea: 0,
        sumTotalRentalIncomePerMonth: 0,
        sumTotalRentalIncomePerYear: 0,
        avgRentalRatePerMonth: 0,
        totalSaleableArea: 0,
        increaseRatePct: 0,
        increaseRateYrs: 0,
        occupancyRateFirstYearPct: 0,
        occupancyRatePct: 0,
        occupancyRateYrs: 0,
        occupancyRate: [],
        totalSaleableAreaDeductByOccRate: [],
        rentalRateIncrease: [],
        avgRentalRate: [],
        totalRentalIncome: [],
        totalMethodValues: [],
      } as MethodSpecifiedRentalIncomePerSquareMeter;
    case '07':
      return {
        roomDetails: [],
        sumSaleableArea: 0,
        sumTotalRoomExpensePerDay: 0,
        sumTotalRoomExpensePerYear: 0,
        increaseRatePct: 0,
        increaseRateYrs: 0,
        saleableArea: [],
        roomRateIncrease: [],
        roomExpense: [],
      } as MethodRoomCostBasedOnExpensesPerRoomPerDay;
    case '08':
      return {
        firstYearAmt: 0,
        increaseRatePct: 0,
        increaseRateYrs: 0,
        increaseRate: [],
        totalFoodAndBeveragePerRoomPerDay: [],
        totalFoodAndBeveragePerRoomPerYear: [],
      } as MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay;
    case '09':
      return {
        jobPositionDetails: [],
        sumSalaryBahtPerPersonPerMonth: 0,
        sumTotalSalaryPerYear: 0,
        increaseRatePct: 0,
        increaseRateYrs: 0,
        increaseRate: [],
        totalPositionBasedSalaryPerYear: [],
      } as MethodPositionBasedSalaryCalculation;
    case '10':
      return {
        propertyTax: {
          landPrices: [],
          totalPropertyPrice: [],
          totalPropertyTax: [],
          totalPropertyTaxRates: [],
        },
        increaseRatePct: 0,
        increaseRateYrs: 0,
        startIn: 0,
        totalMethodValues: [],
      } as MethodParameterBasedOnTierOfPropertyValue;
    case '11':
      return {
        energyCostIndex: 0,
        increaseRatePct: 0,
        increaseRateYrs: 0,
        increaseRate: [],
        energyCostIndexIncrease: [],
        totalEnegyCost: [],
      } as MethodSpecifiedEnergyCostIndex;
    case '12':
      return {
        proportionPct: 0,
        increaseRatePct: 0,
        increaseRateYrs: 0,
        newReplacementCost: 0,
        proportionOfNewReplacementCosts: [],
        totalMethodValues: [],
      } as MethodProportionOfTheNewReplacementCost;
    case '13':
      return {
        proportionPct: 0,
        refTarget: {
          kind: 'section',
          templateId: null,
          clientId: null,
          dbId: null,
        },
      } as MethodProportion;
    case '14':
      return {
        firstYearAmt: 0,
        increaseRatePct: 0,
        increaseRateYrs: 0,
        increaseRates: [],
      } as MethodSpecifiedValueWithGrowth;
    default:
      return null;
  }
}

export function createDefaultMethod(methodType: DCFMethod['methodType'], id?: string): DCFMethod {
  return {
    id,
    methodType,
    totalMethodValues: [],
    detail: createEmptyMethodDetail(methodType),
  } as DCFMethod;
}
