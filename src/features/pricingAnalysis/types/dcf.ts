type Identifier = 'positive' | 'negative' | 'empty';
type CategoryIdentifier = 'income' | 'expenses' | 'gop' | 'fixedExps';
type SectionType = 'income' | 'expenses' | 'summary' | 'directSummary';

interface MethodSpecifiedRoomIncomePerDay {
  // modal
  roomDetails: {
    roomType?: string;
    roomIncome: number;
    saleableArea: number;
    totalRoomIncome: number;
  }[];
  sumRoomIncome: number;
  sumSaleableArea: number;
  sumTotalRoomIncome: number;
  avgRoomRate: number;
  totalSaleableArea: number;
  increaseRatePct: number;
  increaseRateYrs: number;
  occupancyRateFirstYearPct: number;
  occupancyRatePct: number;
  occupancyRateYrs: number;

  // table
  saleableArea: number[];
  occupancyRate: number[];
  totalSaleableAreaDeductByOccRate: number[];
  roomRateIncrease: number[];
  avgDailyRate: number[];
  roomIncome: number[];

  totalMethodValues: number[];
}

interface MethodSpecifiedRoomIncomeBySeasonalRates {
  // modal
  seasonCount: number;
  seasonNames: string[];
  rows: {
    roomType: string;
    otherRoomType: string;
    seasons: {
      seasonName: string;
      numberOfMonths: number;
      description: string;
      roomType: {
        roomIncome: number;
        saleableArea: number;
        totalRoomIncomePerDay: number;
      };
    }[];
  }[];
  totalSaleableArea: number;
  increaseRatePct: number;
  increaseRateYrs: number;
  occupancyRateFirstYearPct: number;
  occupancyRatePct: number;
  occupancyRateYrs: number;
}

interface MethodSpecifiedRoomIncomeWithGrowth {
  // modal
  saleableArea: number;
  totalNumberOfSaleableArea: number;
  remark: string;
  firstYearAmt: number;
  increaseRatePct: number;
  increaseRateYrs: number;

  // table
  roomRateIncrease: number[];
  roomIncome: number[];
  totalMethodValues: number[];
}

interface MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate {
  // modal
  saleableArea: number;
  totalNumberOfSaleableArea: number;
  remark: string;
  firstYearAmt: number;
  increaseRatePct: number;
  increaseRateYrs: number;
  occupancyRateFirstYearPct: number;
  occupancyRatePct: number;
  occupancyRateYrs: number;

  // table
  occupancyRate: number[];
  roomRateIncrease: number[];
  roomIncomeAdjustedValuedByGrowthRates: number[];
  roomIncome: number[];
}

interface MethodSpecifiedRentalIncomePerMonth {
  // modal
  roomDetails: {
    roomType: string;
    roomIncome: number;
    saleableArea: number;
    totalRoomIncomePerMonth: number;
    totalRoomIncomePerYear: number;
  };
  sumSaleableArea: number;
  sumRoomIncomePerMonth: number;
  sumRoomIncomePerYear: number;
  totalSaleableArea: number;
  increaseRatePct: number;
  increaseRateYrs: number;

  // table
  roomRateIncrease: number[];
  roomIncome: number[];
}

interface MethodSpecifiedRentalIncomePerSquareMeter {
  // modal
  areaDetail: {
    description: string;
    rentalPrice: number;
    saleableArea: number;
    totalRentalIncomePerMonth: number;
    totalRentalIncomePerYear: number;
  };
  sumRentalPrice: number;
  sumSaleableArea: number;
  sumTotalRentalIncomePerMonth: number;
  sumTotalRentalIncomePerYear: number;
  totalSaleableArea: number;
  increaseRatePct: number;
  increaseRateYrs: number;
  avgRentalRatePerMonth: number;
  occupancyRateFirstYearPct: number;
  occupancyRatePct: number;
  occupancyRateYrs: number;

  // table
  occupancyRate: number[];
  totalSaleableAreaDeductByOccRate: number[];
  rentalRateIncrease: number[];
  avgRentalRate: number[];
  totalRentalIncome: number[];

  totalMethodValues: number[];
}

interface MethodRoomCostBasedOnExpensesPerRoomPerDay {
  // modal
  roomDetails: {
    roomType?: string;
    roomExpensePerDay: number;
    saleableArea: number;
    totalRoomExpensePerDay: number;
    totalRoomExpensePerYear: number; // same rate as
  }[];
  sumSaleableArea: number;
  sumTotalRoomExpensePerDay: number;
  sumTotalRoomExpensePerYear: number;
  increaseRatePct: number;
  increaseRateYrs: number;

  // table
  saleableArea: number[];
  roomRateIncrease: number[];
  roomExpense: number[];

  totalMethodValues: number[];
}

interface MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay {
  // modal
  firstYearAmt: number;
  increaseRatePct: number;
  increaseRateYrs: number;

  // table
  increaseRate: number[];
  totalFoodAndBeveragePerRoomPerDay: number[];
  totalFoodAndBeveragePerRoomPerYear: number[];
}

interface MethodPositionBasedSalaryCalculation {
  // modal
  jobPositionDetails: {
    jobPosition: string;
    salaryBahtPerPersonPerMonth: number;
    numberOfEmployees: number;
    totalSalaryPerYear: number;
  }[];
  sumSalaryBahtPerPersonPerMonth: number;
  sumTotalSalaryPerYear: number;
  increaseRatePct: number;
  increaseRateYrs: number;

  // table
  increaseRate: number[];
  totalPositionBasedSalaryPerYear: number[];
}

interface MethodParameterBasedOnTierOfPropertyValue {}

interface MethodSpecifiedEnergyCostIndex {
  // modal
  energyCostIndex: number;
  increaseRatePct: number;
  increaseRateYrs: number;

  // table
  increaseRate: number[];
  energyCostIndexIncrease: number[];
  totalEnegyCost: number[];
}

interface MethodProportionOfTheNewReplacementCost {
  // modal
  proportionPct: number;

  // table
  newReplacementCost: number;
  proportionOfNewReplacementCosts: number[];
  totalMethodValues: number[];
}

type RefTarget = {
  kind: 'section' | 'category' | 'assumption';
  clientId?: string | null;
  dbId?: number | null;
};

interface MethodProportion {
  // modal
  proportionPct: number;
  refTarget: RefTarget;
}

interface MethodSpecifiedValueWithGrowth {
  // modal
  firstYearAmt: number;
  increaseRatePct: number;
  increaseRateYrs: number;

  // table
  increaseRates: number[];
}

interface MethodGrossOperatingProfit {}

export interface MethodSpecifiedRoomIncomePerDayWrapper {
  id?: string;
  methodType: '01';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRoomIncomePerDay;
}

export interface MethodSpecifiedRoomIncomeWithGrowthWrapper {
  id?: string;
  methodType: '03';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRoomIncomeWithGrowth;
}

export interface MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateWrapper {
  id?: string;
  methodType: '04';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate;
}

export interface MethodSpecifiedRentalIncomePerMonthWrapper {
  id?: string;
  methodType: '05';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRentalIncomePerMonth;
}

export interface MethodSpecifiedRentalIncomePerSquareMeterWrapper {
  id?: string;
  methodType: '06';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRentalIncomePerSquareMeter;
}

export interface MethodRoomCostBasedOnExpensesPerRoomPerDayWrapper {
  id?: string;
  methodType: '07';
  totalMethodValues: number[];
  detail?: MethodRoomCostBasedOnExpensesPerRoomPerDay;
}

export interface MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayWrapper {
  id?: string;
  methodType: '08';
  totalMethodValues: number[];
  detail?: MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay;
}

export interface MethodPositionBasedSalaryCalculationWrapper {
  id?: string;
  methodType: '09';
  totalMethodValues: number[];
  detail?: MethodPositionBasedSalaryCalculation;
}

export interface MethodParameterBasedOnTierOfPropertyValueWrapper {
  id?: string;
  methodType: '10';
  totalMethodValues: number[];
  detail?: MethodParameterBasedOnTierOfPropertyValue;
}

export interface MethodSpecifiedEnergyCostIndexWrapper {
  id?: string;
  methodType: '11';
  totalMethodValues: number[];
  detail?: MethodSpecifiedEnergyCostIndex;
}

export interface MethodProportionOfTheNewReplacementCostWrapper {
  id?: string;
  methodType: '12';
  totalMethodValues: number[];
  detail?: MethodProportionOfTheNewReplacementCost;
}

export interface MethodProportionWrapper {
  id?: string;
  methodType: '13';
  totalMethodValues: number[];
  detail?: MethodProportion;
}
export interface MethodSpecifiedValueWithGrowthWrapper {
  id?: string;
  methodType: '14';
  totalMethodValues: number[];
  detail?: MethodSpecifiedValueWithGrowth;
}

export interface MethodGrossOperatingProfitWrapper {
  id?: string;
  methodType: '15';
  totalMethodValues: number[];
  detail?: MethodGrossOperatingProfit;
}

export type DCFMethod =
  | MethodSpecifiedRoomIncomePerDayWrapper
  | MethodSpecifiedRoomIncomeWithGrowthWrapper
  | MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateWrapper
  | MethodSpecifiedRentalIncomePerMonthWrapper
  | MethodSpecifiedRentalIncomePerSquareMeterWrapper
  | MethodRoomCostBasedOnExpensesPerRoomPerDayWrapper
  | MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDayWrapper
  | MethodPositionBasedSalaryCalculationWrapper
  | MethodParameterBasedOnTierOfPropertyValueWrapper
  | MethodSpecifiedEnergyCostIndexWrapper
  | MethodProportionOfTheNewReplacementCostWrapper
  | MethodProportionWrapper
  | MethodSpecifiedValueWithGrowthWrapper
  | MethodGrossOperatingProfitWrapper;

interface Base {
  clientId: string; // on runtime generated id for client side usage, not saved in DB
  dbId?: string | null; // id from DB, null when the data is note yet saved in DB. system will mainly use dbId to identify the data and clientId
}

export interface DCFAssumption extends Base {
  assumptionType: string; // unique except miscellaneous
  assumptionName: string;
  identifier: Identifier;
  displaySeq: number;
  totalAssumptionValues: number[];
  method: DCFMethod;
}

export interface DCFCategory extends Base {
  categoryType: string; // maybe don't need
  categoryName: string;
  identifier: CategoryIdentifier;
  displaySeq: number;
  totalCategoryValues: number[];
  assumptions: DCFAssumption[];
}

export interface DCFSection extends Base {
  sectionType: string; // render section e.g income, expenses
  sectionName: string;
  identifier: Identifier; // to identify total value of this section will be determined as positive or negative value
  displaySeq: number;
  totalSectionValues: number[];
  categories?: DCFCategory[];
}

export interface DCFSummarySection extends Base {
  sectionType: string; // render section e.g income, expenses
  sectionName: string;
  identifier: Identifier; // to identify total value of this section will be determined as positive or negative value
  displaySeq: number;
  contractRentalFee: number[];
  grossRevenue: number[];
  grossRevenueProportional: number[];
  terminalRevenue: number[];
  totalNet: number[];
  discount: number[];
  presentValue: number[];
}

export interface DCF extends Base {
  templateCode: string;
  templateName: string;
  totalNumberOfYears: number;
  totalNumberOfDayInYear: number;
  capitalizeRate: number;
  discountedRate: number;
  finalValue: number;
  finalValueRounded: number;
  sections: (DCFSection | DCFSummarySection)[];
}

export interface DCFTemplateType {
  id: string;
  templateCode: string;
  templateName: string;
  totalNumberOfYears: number;
  totalNumberOfDayInYear: number;
  capitalizeRate: number;
  discountedRate: number;
  sections: {
    sectionType: SectionType; // render section e.g income, expenses
    sectionName: string;
    identifier: Identifier; // to identify total value of this section will be determined as positive or negative value
    displaySeq: number;
    categories?: {
      categoryType: string;
      categoryName: string;
      identifier: CategoryIdentifier;
      displaySeq: number;
      assumptions: {
        assumptionType: string;
        assumptionName: string;
        identifier: Identifier;
        displaySeq: number;
        method: DCFMethod;
      }[];
    }[];
  }[];
}
