import type { PropertyGroupItemDto } from '@features/appraisal/api';

export interface PriceAnalysisMethodRequest {
  id: string;
  methodType: string;
  isCandidated: boolean;
  isSelected: boolean;
  appraisalValue: number;
}

export interface PriceAnalysisApproachRequest {
  id: string;
  approachType: string;
  appraisalValue: number;
  isCandidated: boolean;
  methods: PriceAnalysisMethodRequest[];
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
  isSelected: boolean;
  isCandidated: boolean;
}

export interface Approach {
  id?: string;
  approachType: string;
  label: string;
  icon: string;
  appraisalValue: number;
  isCandidated: boolean; // if no method means not selected
  methods: Method[]; // selected methods from database
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

export type PriceAnalysisSelectorMode = 'editing' | 'summary';

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
