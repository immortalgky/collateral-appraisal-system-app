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
