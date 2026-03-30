// Dashboard API response types

export type TaskSummaryItem = {
  period: string | null;
  notStarted: number;
  inProgress: number;
  overdue: number;
  completed: number;
};

export type TaskSummaryResponse = {
  items: TaskSummaryItem[];
};

export type AppraisalCountItem = {
  period: string | null;
  createdCount: number;
  completedCount: number;
};

export type AppraisalCountsResponse = {
  items: AppraisalCountItem[];
};

export type RequestStatusItem = {
  status: string;
  count: number;
};

export type RequestStatusSummaryResponse = {
  items: RequestStatusItem[];
};

export type TeamWorkloadItem = {
  username: string;
  notStarted: number;
  inProgress: number;
  completed: number;
};

export type TeamWorkloadResponse = {
  items: TeamWorkloadItem[];
};

export type RecentTaskItem = {
  id: string;
  appraisalNumber: string | null;
  customerName: string | null;
  taskType: string | null;
  taskDescription: string | null;
  purpose: string | null;
  status: string | null;
  requestedAt: string | null;
};

export type RecentTasksResponse = {
  items: RecentTaskItem[];
};

export type CompanyAppraisalSummaryItem = {
  companyId: string;
  companyName: string;
  assignedCount: number;
  completedCount: number;
};

export type CompanyAppraisalSummaryResponse = {
  items: CompanyAppraisalSummaryItem[];
};
