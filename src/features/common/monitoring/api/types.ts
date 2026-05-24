// ─── Shared primitives ────────────────────────────────────────────────────────

export type SortDir = 'asc' | 'desc';

// ─── SLA / KPI types ─────────────────────────────────────────────────────────

export type SlaBucket = 'breached' | 'atRisk' | 'healthy';
export type GroupByField = 'pic' | 'company' | 'activity';

export interface MonitoringSummary {
  total: number;
  breached?: number | null;
  atRisk?: number | null;
  healthy?: number | null;
}

export interface MonitoringGroupRow {
  key: string;
  label: string;
  count: number;
  breached: number;
  atRisk: number;
}

export interface MonitoringGroupedResult {
  groups: MonitoringGroupRow[];
  total: number;
}

export interface PaginatedResult<T> {
  items: T[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface BaseMonitoringFilter {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDir;
}

// ─── Pending Quotation ────────────────────────────────────────────────────────

export interface PendingQuotation {
  id: string;
  quotationNumber: string | null;
  status: string | null;
  requestDate: string | null;
  cutOffTime: string | null;
  requestedBy: string | null;
  totalAppraisals: number;
  totalCompaniesInvited: number;
  totalQuotationsReceived: number;
  rmUsername: string | null;
}

export interface PendingQuotationFilter extends BaseMonitoringFilter {
  status?: string[];
  cutOffTimeFrom?: string;
  cutOffTimeTo?: string;
}

// ─── Pending Internal / External (shared DTO) ─────────────────────────────────

export interface PendingTask {
  pendingTaskId: string;
  appraisalId: string | null;
  appraisalNumber: string | null;
  customerName: string | null;
  taskType: string | null;
  taskDescription: string | null;
  purpose: string | null;
  propertyType: string | null;
  slaStatus: string | null;
  priority: string | null;
  requestedDate: string | null;
  assignedDate: string | null;
  pic: string | null;
  movement: string | null;
  olaTargetHours: number | null;
  olaActualHours: number | null;
  olaVarianceHours: number | null;
  activityId: string | null;
  appraisalCompanyName: string | null;
  monitoringType: string;
  assignedTo: string | null;
  assignedType: string | null;
}

export interface PendingInternalFilter extends BaseMonitoringFilter {
  slaStatus?: string[];
  slaBucket?: SlaBucket[];
  activityId?: string[];
  pic?: string;
  purpose?: string[];
  propertyType?: string[];
  taskType?: string[];
}

// ─── Pending External ─────────────────────────────────────────────────────────

// External uses the same PendingTaskDto — no separate type needed
export type PendingExternalTask = PendingTask;

export interface PendingExternalFilter extends BaseMonitoringFilter {
  slaStatus?: string[];
  slaBucket?: SlaBucket[];
  activityId?: string[];
  pic?: string;
  purpose?: string[];
  propertyType?: string[];
  taskType?: string[];
  appraisalCompanyId?: string;
}

// ─── Pending Follow-up ────────────────────────────────────────────────────────

// Follow-up now returns the same PendingTaskDto shape as Internal/External
export type PendingFollowup = PendingTask;

export interface PendingFollowupFilter extends BaseMonitoringFilter {
  slaStatus?: string[];
  slaBucket?: SlaBucket[];
  activityId?: string[];
  pic?: string;
  purpose?: string[];
  propertyType?: string[];
  taskType?: string[];
}

// ─── Pending Evaluation ───────────────────────────────────────────────────────

export interface PendingEvaluation {
  appraisalId: string;
  appraisalNumber: string | null;
  appraisalStatus: string | null;
  customerName: string | null;
  reportReceivedDate: string | null;
  externalAppraiserName: string | null;
  assigneeCompanyId: string | null;
  appraiserCompanyName: string | null;
  appraisalValue: number | null;
  evaluationId: string | null;
  evaluationStatus: string | null;
  totalScore: number | null;
}

export interface PendingEvaluationFilter extends BaseMonitoringFilter {
  evaluationStatus?: string[];
  appraisalCompanyId?: string;
  appraisalStatus?: string[];
}

// ─── Meeting Follow-up ────────────────────────────────────────────────────────

export interface MeetingFollowup {
  appraisalId: string;
  appraisalNumber: string;
  customerName: string | null;
  approvalTier: number; // 1=SUB_COMMITTEE, 2=COMMITTEE, 3=COMMITTEE_WITH_MEETING
  pendingCount: number;
  totalApprovers: number;
  earliestDueAt: string | null;
  worstSlaStatus: string | null; // 'Breached' | 'AtRisk' | 'OnTime'
  // Tier 3 only — null for tiers 1/2
  meetingId: string | null;
  meetingNumber: string | null;
  meetingDate: string | null;
  meetingStatus: string | null;
}

export interface MeetingFollowupFilter extends BaseMonitoringFilter {
  tier?: number[];
  slaStatus?: string[];
  slaBucket?: SlaBucket[];
  meetingNumber?: string;
  meetingDateFrom?: string; // YYYY-MM-DD
  meetingDateTo?: string;   // YYYY-MM-DD
}
