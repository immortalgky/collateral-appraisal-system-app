export interface AppraisalEvaluationListItem {
  appraisalId: string;
  appraisalNumber: string;
  customerName: string;
  reportReceivedDate: string | null;
  appraisalStatus: string;
  externalAppraiserName: string;
  assigneeCompanyId: string;
  appraisalValue: number | null;
  evaluationId: string | null;
  evaluationStatus: string; // "Pending" | "Draft" | "Completed"
  totalScore: number | null;
}

export interface AppraisalEvaluationDetail {
  id: string | null;
  appraisalId: string;
  appraisalNumber: string;
  evaluationStatus: string;
  evaluatedBy: string | null;
  evaluatedAt: string | null;
  criteria1Rating: number;
  criteria1Description: string | null;
  criteria2Rating: number;
  criteria2IsAutoDetected: boolean;
  criteria2DetectedDays: number | null;
  criteria2Description: string | null;
  criteria3Rating: number;
  criteria3Description: string | null;
  criteria4Rating: number;
  criteria4Description: string | null;
  criteria5Rating: number;
  criteria5Description: string | null;
  additionalComments: string | null;
  note: string | null;
}

export interface DetectDeliveryTimeResponse {
  detectedDays: number | null;
  suggestedRating: number | null;
}

export interface EvaluationListParams {
  appraisalNumber?: string;
  customerName?: string;
  appraisalStatus?: string;
  appraiserName?: string;
  evaluationStatus?: string;
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
  criteria1Rating: number;
  criteria1Description: string | null;
  criteria2Rating: number;
  criteria2IsAutoDetected: boolean;
  criteria2DetectedDays: number | null;
  criteria2Description: string | null;
  criteria3Rating: number;
  criteria3Description: string | null;
  criteria4Rating: number;
  criteria4Description: string | null;
  criteria5Rating: number;
  criteria5Description: string | null;
  additionalComments: string | null;
  note: string | null;
}

export interface UpdateEvaluationBody {
  evaluationStatus: string;
  criteria1Rating: number;
  criteria1Description: string | null;
  criteria2Rating: number;
  criteria2IsAutoDetected: boolean;
  criteria2DetectedDays: number | null;
  criteria2Description: string | null;
  criteria3Rating: number;
  criteria3Description: string | null;
  criteria4Rating: number;
  criteria4Description: string | null;
  criteria5Rating: number;
  criteria5Description: string | null;
  additionalComments: string | null;
  note: string | null;
}
