type Identifier = 'positive' | 'negative' | 'empty';
type MethodType = 'proportion' | 'specifyValueWithGrowth' | 'specifyRoomIncomePerDay';
type SectionType = 'income' | 'expenses' | 'summary';

interface MethodProportion {
  proportionPct: number;
  methodId?: string;
  assumptionType: string;
}

interface MethodSpecifyValueWithGrowth {
  firstYearAmt: number;
  increaseRatePct: number;
  increaseEveryYrs: number;
}

interface MethodSpecifyRoomIncomePerDay {
  roomDetails: { roomType?: string; roomIncome: number; saleableArea: number }[];
  sumRoomIncome: number;
  sumSaleableArea: number;
  sumTotalRoomIncome: number;
  avgRoomRate: number;
  increaseRatePct: number;
  increaseRateYrs: number;
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
    sectionType: string; // render section e.g income, expenses
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
          detail: MethodProportion | MethodSpecifyValueWithGrowth | MethodSpecifyRoomIncomePerDay;
          // default value
        };
      }[];
    }[];
  }[];
}

interface MethodProportionWrapper {
  id?: string;
  methodType: 'proportion';
  detail: MethodProportion;
}
interface MethodSpecifyValueWrapper {
  id?: string;
  methodType: 'specifyValueWithGrowth';
  detail: MethodSpecifyValueWithGrowth;
}
interface MethodRoomIncomeWrapper {
  id?: string;
  methodType: 'specifyRoomIncomePerDay';
  detail: MethodSpecifyRoomIncomePerDay;
}

type DCFMethod = MethodProportionWrapper | MethodSpecifyValueWrapper | MethodRoomIncomeWrapper;

export interface DCFAssumption {
  assumptionType: string; // maybe don't need
  assumptionName: string;
  identifier: Identifier;
  displaySeq: number;
  totalAssumptionValues: number[];
  method: DCFMethod;
}

export interface DCFCategory {
  categoryType: string; // maybe don't need
  categoryName: string;
  identifier: Identifier;
  displaySeq: number;
  totalCategoryValues: number[];
  assumptions: DCFAssumption[];
}

export interface DCFSection {
  id?: string;
  sectionType: string; // render section e.g income, expenses
  sectionName: string;
  identifier: Identifier; // to identify total value of this section will be determined as positive or negative value
  displaySeq: number;
  totalSectionValues: number[];
  categories?: DCFCategory[];
}

export interface DCFSummarySection {
  id?: string;
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

export interface DCF {
  id?: string;
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
