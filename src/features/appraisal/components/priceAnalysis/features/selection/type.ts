export interface PriceAnalysisMethodRequest {
  id: string;
  isCandidated: boolean;
  isSelected: boolean;
  appraisalValue: number;
}

export interface PriceAnalysisApproachRequest {
  id: string;
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

export type PriceAnalysisSelectorMode = 'editing' | 'summary';
