export interface AppraisalEvaluationListItem {
  appraisalId: string;
  appraisalNumber: string;
  customerName: string;
  reportReceivedDate: string | null;
  appraisalStatus: string;
  externalAppraiserName: string;
  assigneeCompanyId: string;
  appraiserCompanyName: string | null;
  appraisalValue: number | null;
  evaluationId: string | null;
  evaluationStatus: string; // "Pending" | "Completed"
  totalScore: number | null;
}

export interface AppraisalEvaluationHeader {
  appraisalId: string;
  appraisalNumber: string | null;
  appraisalStatus: string | null;
  customerName: string | null;
  reportReceivedDate: string | null;
  appraiserCompanyName: string | null;
  assigneeCompanyId: string | null;
  collateralTypes: string | null;
  inspectionDates: string | null;
  departmentOfAppraisal: string | null;
}

export interface AppraisalEvaluationDetail {
  id: string | null;
  appraisalId: string;
  appraisalNumber: string;
  evaluationStatus: string;
  evaluatedBy: string | null;
  evaluatedAt: string | null;
  criteria1Rating: number | null;
  criteria2Rating: number | null;
  criteria2IsAutoDetected: boolean;
  criteria2DetectedDays: number | null;
  criteria3Rating: number | null;
  criteria4Rating: number | null;
  criteria5Rating: number | null;
  additionalComments: string | null;
  note: string | null;
}

export interface DetectDeliveryTimeResponse {
  detectedDays: number | null;
  suggestedRating: number | null;
}

export interface EvaluationListParams {
  search?: string;
  appraisalStatus?: string;
  appraiserCompanyId?: string;
  evaluationStatus?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  pageNumber: number;
  pageSize: number;
}

export interface PaginatedEvaluationList {
  items: AppraisalEvaluationListItem[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateEvaluationBody {
  appraisalId: string;
  evaluationStatus: string;
  criteria1Rating: number | null;
  criteria2Rating: number | null;
  criteria2IsAutoDetected: boolean;
  criteria2DetectedDays: number | null;
  criteria3Rating: number | null;
  criteria4Rating: number | null;
  criteria5Rating: number | null;
  additionalComments: string | null;
  note: string | null;
}

export interface UpdateEvaluationBody {
  evaluationStatus: string;
  criteria1Rating: number | null;
  criteria2Rating: number | null;
  criteria2IsAutoDetected: boolean;
  criteria2DetectedDays: number | null;
  criteria3Rating: number | null;
  criteria4Rating: number | null;
  criteria5Rating: number | null;
  additionalComments: string | null;
  note: string | null;
}
