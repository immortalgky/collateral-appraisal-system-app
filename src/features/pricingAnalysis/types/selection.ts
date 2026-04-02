import type { GetPropertyGroupByIdResponse, PropertyGroupItemDto } from '@features/appraisal/api';
import type {
  FactorDataType,
  MarketComparableDetailType,
  PricingAnalysisConfigType,
} from '../schemas';

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
