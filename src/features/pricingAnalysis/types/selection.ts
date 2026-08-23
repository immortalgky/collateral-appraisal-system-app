import type { GetPropertyGroupByIdResponse, PropertyGroupItemDto } from '@features/appraisal/api';
import type {
  FactorDataType,
  MarketComparableDetailType,
  PricingAnalysisConfigType,
} from '../schemas';
import type { FlatContext, ProjectModelPricingContextDto } from '../utils/flattenPricingContext';

export interface PricingAnalysisMethodRequest {
  id: string;
  methodType: string;
  isSelected: boolean;
  isIncluded: boolean;
  appraisalValue: number;
}

export interface PricingAnalysisApproachRequest {
  id: string;
  approachType: string;
  appraisalValue: number;
  isSelected: boolean;
  methods: PricingAnalysisMethodRequest[];
}

export type ApproachMethodLink = {
  apprId: string;
  methodIds: string[]; // pick ONE naming and stick to it
};

export interface Method {
  id?: string;
  methodType: string;
  label: string;
  icon: string;
  appraisalValue: number;
  isIncluded: boolean;
  isSelected: boolean;
  /**
   * Land price per square wa, typed by the appraiser when pricing a Cost-approach group by hand.
   * Its presence is what lets the appraisal summary print ที่ดิน and สิ่งปลูกสร้าง on separate
   * rows — null means the group is priced as one blended figure.
   */
  landRatePerSqWa?: number | null;
}

export interface Approach {
  id?: string;
  approachType: string;
  label: string;
  icon: string;
  appraisalValue: number;
  isSelected: boolean;
  methods: Method[];
}

export interface GroupDetails {
  id: string;
  groupNumber: number;
  groupName: string;
  description: string;
  useSystemCalc: boolean;
  properties: PropertyGroupItemDto[];
}

// export type MarketSurvey;

export type PricingAnalysisSelectorMode = 'editing' | 'summary';

export interface PricingServerData {
  groupDetail: GetPropertyGroupByIdResponse | undefined;
  properties: Record<string, unknown>[] | undefined;
  propertiesMap: Record<string, Record<string, unknown>>;
  marketSurveyDetails: MarketComparableDetailType[];
  allFactors: FactorDataType[] | undefined;
  pricingConfiguration: PricingAnalysisConfigType[] | undefined;
  /** Populated for projectModel subjects only. Used by ModelCardContent. */
  flatContext?: FlatContext;
  /** Raw pricing context DTO — populated for projectModel subjects only. */
  pricingContext?: ProjectModelPricingContextDto;
}

export interface MethodConfiguration {
  methodType: string;
  type: string;

  // sale grid & direct configs
  showQualitativeSection?: boolean;
  showInitialPriceSection?: boolean;
  showSecondRevisionSection?: boolean;
  showAdjustedValueSection?: boolean;
  showAdjustedWeightSection?: boolean;
  showAdjustFinalValueSection?: boolean;
}

/**
 * What the manual Cost-approach card needs to split a group's value into land and building.
 *
 * Both figures come from the server with the pricing analysis: the area is the group's title-deed
 * total and the building figure is its depreciated schedule total — the same one the appraisal
 * summary subtotals as รวมมูลค่าสิ่งปลูกสร้าง. Reading them rather than deriving them here is what
 * keeps the card's arithmetic and the report's rows in agreement.
 */
export interface ManualCostBreakdownContext {
  /** Group land area in square wa. Null or 0 means there is no land to price by rate. */
  landAreaInSqWa: number | null;
  /** Depreciated building total for the group. Null or 0 means the schedule has not been entered. */
  buildingValue: number | null;
  onLandRateSync: (arg: {
    approachType: string;
    methodType: string;
    rate: number | null;
    methodId?: string;
  }) => void;
}
