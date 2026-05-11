// Dashboard API response types

export type TaskSummaryResponse = {
  notStarted: number;
  inProgress: number;
  overdue: number;
  completed: number;
};

export type AppraisalCountItem = {
  period: string | null;
  createdCount: number;
  completedCount: number;
};

export type AppraisalCountsResponse = {
  items: AppraisalCountItem[];
};

export type AppraisalStatusItem = {
  status: string;
  count: number;
};

export type AppraisalStatusSummaryResponse = {
  items: AppraisalStatusItem[];
};

export type TeamWorkloadItem = {
  username: string;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
};

export type TeamWorkloadResponse = {
  items: TeamWorkloadItem[];
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

export type ReminderItemType = 'task_due' | 'followup';

export type ReminderItem = {
  id: string;
  type: ReminderItemType;
  title: string;
  appraisalNumber: string | null;
  dueAt: string | null;
  overdue: boolean;
};

export type RemindersResponse = {
  items: ReminderItem[];
};

export type CalendarItemType = 'meeting' | 'task_due';
export type CalendarLinkEntityType = 'meeting' | 'appraisal' | 'request' | 'task';

export type CalendarItem = {
  type: CalendarItemType;
  title: string;
  time: string | null;
  linkEntityType: CalendarLinkEntityType;
  linkEntityId: string;
  // When the event is tied to an appraisal task, carries the human-readable
  // appraisal number (e.g. "APP-2026-0123"). Null for standalone meetings.
  appraisalNumber: string | null;
  // True when the task's SLA is AtRisk or Breached. UI uses this to color the
  // dot red (urgent) rather than yellow (normal). Always false for meetings.
  isSlaCritical: boolean;
};

export type CalendarDay = {
  date: string; // YYYY-MM-DD
  items: CalendarItem[];
};

export type CalendarResponse = {
  items: CalendarDay[];
};

export type NoteItem = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type NotesResponse = {
  items: NoteItem[];
};

export type QuotationTaskSummaryResponse = {
  pendingQuotationCreation: number;
  waitingCompanySubmission: number;
  waitingRmSelection: number;
};
