type Identifier = 'positive' | 'negative' | 'empty';
type CategoryType = 'income' | 'expenses' | 'gop' | 'fixedExps';
type SectionType = 'income' | 'expenses' | 'summaryDCF' | 'summaryDirect';

export interface MethodSpecifiedRoomIncomePerDay {
  // modal
  roomDetails: {
    roomType?: string; // collect to db
    roomTypeOther?: string; // collect to db
    roomIncome: number; // collect to db
    saleableArea: number; // collect to db
    totalRoomIncome: number;
  }[];
  sumRoomIncome: number;
  sumSaleableArea: number;
  sumTotalRoomIncome: number;
  avgRoomRate: number;
  totalSaleableArea: number; // collect to db
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db
  occupancyRateFirstYearPct: number; // collect to db
  occupancyRatePct: number; // collect to db
  occupancyRateYrs: number; // collect to db

  // table
  saleableArea: number[];
  occupancyRate: number[]; // collect to db
  totalSaleableAreaDeductByOccRate: number[];
  roomRateIncrease: number[];
  avgDailyRate: number[];
  roomIncome: number[];

  totalMethodValues: number[];
}

type SeasonRateInput = {
  seasonId: string;
  roomIncome: number | null; // collect to db
  saleableArea: number | null; // collect to db
};

type RoomIncomeRow = {
  id: string;
  roomType: string; // collect to db
  roomTypeOther?: string; // collect to db
  seasons: SeasonRateInput[];
};

export interface MethodSpecifiedRoomIncomeBySeasonalRates {
  // modal
  seasonCount: number; // collect to db
  seasonDetails: {
    seasonName: string; // collect to db
    numberOfMonths: number; // collect to db
    description: string; // collect to db
    avgTotalRoomIncomePerDay: number;
    avgTotalRoomIncomePerSeason: number;
  }[];
  roomDetails: RoomIncomeRow[];
  avgRoomRate: number;
  totalSaleableArea: number; // collect to db
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db
  occupancyRateFirstYearPct: number; // collect to db
  occupancyRatePct: number; // collect to db
  occupancyRateYrs: number; // collect to db

  // table
  saleableArea: number[];
  occupancyRate: number[]; // collect to db
  totalSaleableAreaDeductByOccRate: number[];
  roomRateIncrease: number[];
  avgDailyRate: number[];
  roomIncome: number[];
}

export interface MethodSpecifiedRoomIncomeWithGrowth {
  // modal
  saleableArea: number; // collect to db
  totalNumberOfSaleableArea: number; // collect to db
  remark: string; // collect to db
  firstYearAmt: number; // collect to db
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db

  // table
  roomRateIncrease: number[];
  roomIncome: number[];
  totalMethodValues: number[];
}

export interface MethodSpecifiedRoomIncomeWithGrowthByOccupancyRate {
  // modal
  saleableArea: number; // collect to db
  totalNumberOfSaleableArea: number; // collect to db
  remark: string; // collect to db
  firstYearAmt: number; // collect to db
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db
  occupancyRateFirstYearPct: number; // collect to db
  occupancyRatePct: number; // collect to db
  occupancyRateYrs: number; // collect to db

  // table
  occupancyRate: number[]; // collect to db
  roomRateIncrease: number[];
  roomIncomeAdjustedValuedByGrowthRates: number[];
  roomIncome: number[];
}

export interface MethodSpecifiedRentalIncomePerMonth {
  // modal
  roomDetails: {
    roomType: string; // collect to db
    roomTypeOther?: string; // collect to db
    roomIncome: number; // collect to db
    saleableArea: number; // collect to db
    totalRoomIncomePerMonth: number;
    totalRoomIncomePerYear: number;
  }[];
  sumSaleableArea: number;
  sumRoomIncomePerMonth: number;
  sumRoomIncomePerYear: number;
  totalSaleableArea: number; // collect to db
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db

  // table
  roomRateIncrease: number[];
  roomIncome: number[];
}

export interface MethodSpecifiedRentalIncomePerSquareMeter {
  // modal
  areaDetail: {
    description: string; // collect to db
    rentalPrice: number; // collect to db
    saleableArea: number; // collect to db
    totalRentalIncomePerMonth: number;
    totalRentalIncomePerYear: number;
  }[];
  sumRentalPrice: number;
  sumSaleableArea: number;
  sumTotalRentalIncomePerMonth: number;
  sumTotalRentalIncomePerYear: number;
  avgRentalRatePerMonth: number;
  totalSaleableArea: number; // collect to db
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db
  occupancyRateFirstYearPct: number; // collect to db
  occupancyRatePct: number; // collect to db
  occupancyRateYrs: number; // collect to db

  // table
  occupancyRate: number[]; // collect to db
  totalSaleableAreaDeductByOccRate: number[];
  rentalRateIncrease: number[];
  avgRentalRate: number[];
  totalRentalIncome: number[];

  totalMethodValues: number[];
}

export interface MethodRoomCostBasedOnExpensesPerRoomPerDay {
  // modal
  roomDetails: {
    roomType?: string; // collect to db
    roomTypeOther?: string; // collect to db
    roomExpensePerDay: number; // collect to db
    saleableArea: number; // collect to db
    totalRoomExpensePerDay: number;
    totalRoomExpensePerYear: number;
  }[];
  sumSaleableArea: number;
  sumTotalRoomExpensePerDay: number;
  sumTotalRoomExpensePerYear: number;
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db

  // table
  saleableArea: number[];
  roomRateIncrease: number[];
  roomExpense: number[];
}

export interface MethodSpecifiedFoodAndBeverageExpensesPerRoomPerDay {
  // modal
  firstYearAmt: number; // collect to db
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db

  // table
  increaseRate: number[];
  totalFoodAndBeveragePerRoomPerDay: number[];
  totalFoodAndBeveragePerRoomPerYear: number[];
}

export interface MethodPositionBasedSalaryCalculation {
  // modal
  jobPositionDetails: {
    jobPosition: string; // collect to db
    jobPositionOther?: string; // collect to db
    salaryBahtPerPersonPerMonth: number; // collect to db
    numberOfEmployees: number; // collect to db
    totalSalaryPerYear: number;
  }[];
  sumSalaryBahtPerPersonPerMonth: number;
  sumTotalSalaryPerYear: number;
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db

  // table
  increaseRate: number[];
  totalPositionBasedSalaryPerYear: number[];
}

export interface MethodParameterBasedOnTierOfPropertyValue {
  // modal
  propertyTax: {
    landPrices: number[];
    totalPropertyPrice: number[];
    totalPropertyTax: number[];
    totalPropertyTaxRates: number[];
  };
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db
  startIn: number; // collect to db

  // table
  totalMethodValues: number[];
}

export interface MethodSpecifiedEnergyCostIndex {
  // modal
  energyCostIndex: number; // collect to db
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db

  // table
  increaseRate: number[];
  energyCostIndexIncrease: number[];
  totalEnegyCost: number[];
}

export interface MethodProportionOfTheNewReplacementCost {
  // modal
  proportionPct: number; // collect to db
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db

  // table
  newReplacementCost: number;
  proportionOfNewReplacementCosts: number[];
  totalMethodValues: number[];
}

type RefTarget = {
  kind: 'section' | 'category' | 'assumption';
  templateId?: string | null;
  clientId?: string | null;
  dbId?: string | null;
};

export interface MethodProportion {
  // modal
  proportionPct: number; // collect to db
  refTarget: RefTarget; // collect to db
}

export interface MethodSpecifiedValueWithGrowth {
  // modal
  firstYearAmt: number; // collect to db
  increaseRatePct: number; // collect to db
  increaseRateYrs: number; // collect to db

  // table
  increaseRates: number[];
}

export interface MethodSpecifiedRoomIncomePerDayWrapper {
  id?: string;
  methodType: '01';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRoomIncomePerDay;
}

export interface MethodSpecifiedRoomIncomeBySeasonalRatesWrapper {
  id?: string;
  methodType: '02';
  totalMethodValues: number[];
  detail?: MethodSpecifiedRoomIncomeBySeasonalRates;
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

export type DCFMethod =
  | MethodSpecifiedRoomIncomePerDayWrapper
  | MethodSpecifiedRoomIncomeBySeasonalRatesWrapper
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
  | MethodSpecifiedValueWithGrowthWrapper;

interface Base {
  templateId?: string | null;
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
  categoryType: CategoryType; // maybe don't need
  categoryName: string;
  identifier: Identifier;
  displaySeq: number;
  totalCategoryValues: number[];
  assumptions: DCFAssumption[];
}

export interface DCFSection extends Base {
  sectionType: 'income' | 'expenses'; // render section e.g income, expenses
  sectionName: string;
  identifier: Identifier; // to identify total value of this section will be determined as positive or negative value
  displaySeq: number;
  totalSectionValues: number[];
  categories?: DCFCategory[];
}

export interface DCFSummarySection extends Base {
  sectionType: 'summaryDCF'; // render section e.g income, expenses
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

export interface DirectSummarySection extends Base {
  sectionType: 'summaryDirect'; // render section e.g income, expenses
  sectionName: string;
  identifier: Identifier; // to identify total value of this section will be determined as positive or negative value
  displaySeq: number;
  contractRentalFee: number;
  totalNet: number;
  presentValue: number;
  finalValueRounded: number;
}

export interface DCF extends Base {
  collateralType: string;
  templateCode: string;
  templateName: string;
  totalNumberOfYears: number;
  totalNumberOfDayInYear: number;
  capitalizeRate: number;
  discountedRate: number;
  finalValue: number;
  finalValueRounded: number;
  isHighestBestUsed: boolean;
  appraisalPrice: number;
  appraisalPriceRounded: number;
  sections: (DCFSection | DCFSummarySection | DirectSummarySection)[];
}

// Template Type
export interface DCFAssumption extends Base {
  assumptionType: string;
  assumptionName: string;
  identifier: Identifier;
  displaySeq: number;
  method: DCFMethod;
}
export interface DCFCategory extends Base {
  categoryType: CategoryType;
  categoryName: string;
  identifier: Identifier;
  displaySeq: number;
  assumptions: DCFAssumption[];
}
export interface DCFTemplateSection extends Base {
  sectionType: SectionType; // render section e.g income, expenses
  sectionName: string;
  identifier: Identifier; // to identify total value of this section will be determined as positive or negative value
  displaySeq: number;
  categories?: DCFCategory[];
}

export interface DCFTemplateType {
  id: string;
  collateralType: string;
  templateCode: string;
  templateName: string;
  totalNumberOfYears: number;
  totalNumberOfDayInYear: number;
  capitalizeRate: number;
  discountedRate: number;
  isHighestBestUsed: boolean;
  sections: DCFTemplateSection[];
}
