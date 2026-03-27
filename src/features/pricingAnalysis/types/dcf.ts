type Identifier = 'positive' | 'negative' | 'empty';
type MethodType = 'proportion' | 'specifyValueWithGrowth' | 'specifyRoomIncomePerDay';
type SectionType = 'income' | 'expenses' | 'summary';

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

interface MethodSpecifiedRoomIncomeBySeasonalRates {}

interface MethodSpecifiedRoomIncomeWithGrowth {
  // modal
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
  sumtotalRoomExpensePerDay: number;
  sumTotalRoomExpensePerYear: number;
  increaseRatePct: number;
  increaseRateYrs: number;

  // table
  saleableArea: number[];
  occupancyRate: number[];
  totalSaleableAreaDeductByOccRate: number[];
  roomRateIncrease: number[];
  avgDailyRate: number[];
  roomIncome: number[];

  totalMethodValues: number[];
}

interface MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay {}

interface MethodPositionBasedSalaryCalculation {}

interface MethodParameterBasedOnTierOfPropertyValue {}

interface MethodSpecifiedEnergyCostIndex {}

interface MethodProportionOfTheNewReplacementCost {}

interface MethodProportion {
  proportionPct: number;
  refTargetId: string | null;
}

interface MethodSpecifiedValueWithGrowth {
  firstYearAmt: number;
  increaseRatePct: number;
  increaseRateYrs: number;
}

interface MethodGrossOperatingProfit {}

interface MethodProportionWrapper {
  id?: string;
  methodType: 'proportion';
  totalMethodValues: number[];
  detail?: MethodProportion;
}
interface MethodSpecifyValueWrapper {
  id?: string;
  methodType: 'specifyValueWithGrowth';
  totalMethodValues: number[];
  detail?: MethodSpecifiedValueWithGrowth;
}
interface MethodSpecifiedRoomIncomePerDayWrapper {
  id?: string;
  methodType: 'specifyRoomIncomePerDay';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRoomIncomePerDay;
}

interface MethodSpecifiedRoomIncomeWithGrowthWrapper {
  id?: string;
  methodType: 'specifiedRoomIncomeWithGrowth';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRoomIncomeWithGrowth;
}

interface MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateWrapper {
  id?: string;
  methodType: 'specifiedRoomIncomeWithGrowthByOccupancyRate';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate;
}

interface MethodSpecifiedRentalIncomePerMonthWrapper {
  id?: string;
  methodType: 'specifiedRentalIncomePerMonth';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRentalIncomePerMonth;
}

interface MethodSpecifiedRentalIncomePerSquareMeterWrapper {
  id?: string;
  methodType: 'specifiedRentalIncomePerSquareMeter';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRentalIncomePerSquareMeter;
}

export type DCFMethod =
  | MethodSpecifiedRoomIncomePerDayWrapper
  | MethodSpecifiedRoomIncomeWithGrowthWrapper
  | MethodSpecifiedRoomIncomeWithGrowthByOccupancyRateWrapper
  | MethodSpecifiedRentalIncomePerMonthWrapper
  | MethodSpecifiedRentalIncomePerSquareMeterWrapper
  | MethodProportionWrapper
  | MethodSpecifyValueWrapper;

interface Base {
  clientId: string;
  dbId?: string | null;
}

export interface DCFAssumption extends Base {
  assumptionType: string; // maybe don't need
  assumptionName: string;
  identifier: Identifier;
  displaySeq: number;
  totalAssumptionValues: number[];
  method: DCFMethod;
}

export interface DCFCategory extends Base {
  categoryType: string; // maybe don't need
  categoryName: string;
  identifier: Identifier;
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
      identifier: Identifier;
      displaySeq: number;
      assumptions: {
        assumptionType: string;
        assumptionName: string;
        identifier: Identifier;
        displaySeq: number;
        method: {
          methodType: string;
          detail:
            | MethodProportion
            | MethodSpecifiedValueWithGrowth
            | MethodSpecifiedRoomIncomePerDay;
          // default value
        };
      }[];
    }[];
  }[];
}
