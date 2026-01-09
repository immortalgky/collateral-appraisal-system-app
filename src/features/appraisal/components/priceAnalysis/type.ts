export interface PriceAnalysisMethodRequest {
  id: string;
  appraisalValue: number;
}

export interface PriceAnalysisApproachRequest {
  id: string;
  appraisalValue: number;
  methods: PriceAnalysisMethodRequest[];
}

export type ApproachMethodLink = {
  apprId: string;
  methodIds: string[]; // pick ONE naming and stick to it
};
