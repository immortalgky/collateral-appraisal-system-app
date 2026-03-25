type Identifier = 'positive' | 'negative' | 'empty';
type MethodType = 'proportion' | 'specifyValueWithGrowth' | 'specifyRoomIncomePerDay';
type SectionType = 'income' | 'expenses' | 'summary';
export type DcfRefTargetId = `section:${string}` | `category:${string}` | `assumption:${string}`;

interface MethodProportion {
  proportionPct: number;
  refTargetId: DcfRefTargetId | null;
}

interface MethodSpecifiedValueWithGrowth {
  firstYearAmt: number;
  increaseRatePct: number;
  increaseRateYrs: number;
}

interface MethodSpecifiedRoomIncomePerDay {
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

interface MethodProportionWrapper {
  id?: string;
  methodType: 'proportion';
  detail: MethodProportion;
}
interface MethodSpecifyValueWrapper {
  id?: string;
  methodType: 'specifyValueWithGrowth';
  detail: MethodSpecifiedValueWithGrowth;
}
interface MethodRoomIncomeWrapper {
  id?: string;
  methodType: 'specifyRoomIncomePerDay';
  detail: MethodSpecifiedRoomIncomePerDay;
}

type DCFMethod = MethodProportionWrapper | MethodSpecifyValueWrapper | MethodRoomIncomeWrapper;

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
