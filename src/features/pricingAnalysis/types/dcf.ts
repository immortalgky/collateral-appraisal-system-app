type Identifier = 'positive' | 'negative' | 'empty';

interface MethodProportion {
  proportionPct: number;
  methodId: string;
}

interface MethodSpecifyValueWithGrowth {
  firstYearAmt: number;
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
    categories?: {
      categoryType: string; // maybe don't need
      categoryName: string;
      identifier: Identifier;
      assumptions: {
        assumptionType: string; // maybe don't need
        assumptionName: string;
        identifier: Identifier;
        method: {
          methodType: string;
          detail: MethodProportion | MethodSpecifyValueWithGrowth;
          // default value
        };
      }[];
    }[];
  }[];
}
