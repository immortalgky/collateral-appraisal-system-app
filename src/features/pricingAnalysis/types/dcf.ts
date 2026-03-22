type Identifier = 'positive' | 'negative' | 'empty';

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
  increaseRatePct: number;
  increaseEveryYrs: number;
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

export interface DCFMethod {
  id?: string;
  methodType: string;
  detail: MethodProportion | MethodSpecifyValueWithGrowth;
}

export interface DCFAssumption {
  assumptionType: string; // maybe don't need
  assumptionName: string;
  identifier: Identifier;
  displaySeq: number;
  method: DCFMethod;
}

export interface DCFCategory {
  categoryType: string; // maybe don't need
  categoryName: string;
  identifier: Identifier;
  displaySeq: number;
  assumptions: DCFAssumption[];
}

export interface DCFSection {
  id?: string;
  sectionType: string; // render section e.g income, expenses
  sectionName: string;
  identifier: Identifier; // to identify total value of this section will be determined as positive or negative value
  displaySeq: number;
  categories?: DCFCategory;
}

export interface DCF {
  id?: string;
  templateCode: string;
  templateName: string;
  totalNumberOfYears: number;
  totalNumberOfDayInYear: number;
  capitalizeRate: number;
  discountedRate: number;
  sections: DCFSection[];
}
