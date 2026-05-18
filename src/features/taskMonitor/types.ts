// SLA status values that may come from the backend
export type SlaStatus = 'OnTrack' | 'AtRisk' | 'Breached';

// Task status values that the monitor endpoint filters on
export type MonitorTaskStatus = 'Assigned' | 'InProgress';

// A single row returned by GET /tasks/monitor
export interface MonitoredTask {
  taskId: string;
  taskName: string;
  taskDescription: string | null;
  activityId: string;
  activityName: string;
  assignedTo: string;
  assignedToDisplayName: string;
  groupId: string;
  groupName: string;
  dueAt: string | null;
  slaStatus: SlaStatus | null;
  taskStatus: MonitorTaskStatus;
  appraisalStatus: string | null;
  workflowInstanceId: string;
  assignedAt: string | null;
  appraisalNumber: string | null;
  prevAppraisalNumber: string | null;
  customerName: string | null;
  purpose: string | null;
  facilityLimit: number | null;
}

// Paginated response wrapper that matches the project's existing pattern
export interface MonitoredTaskListResponse {
  items: MonitoredTask[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export type SortDir = 'asc' | 'desc';

// Query params for GET /tasks/monitor
export interface GetMonitoredTasksParams {
  groupId?: string;
  assigneeUsername?: string;
  sla?: SlaStatus;
  activityId?: string;
  search?: string;
  appraisalNumber?: string;
  customerName?: string;
  appraisalStatus?: string;
  taskType?: string;
  sortBy?: string;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
}

// Response from GET /tasks/monitor/filter-options
export interface MonitorFilterOptions {
  taskTypes: string[];
  appraisalStatuses: string[];
}

// One row in the supervisor "people I monitor" list (GET /tasks/monitor/people)
export interface MonitoredPerson {
  userName: string;
  displayName: string | null;
  openTasks: number;
  availableTasks: number;
  totalTasks: number;
}

export interface MonitoredPersonListResponse {
  items: MonitoredPerson[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetMonitoredPeopleParams {
  search?: string;
  sortBy?: string;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
}

// Eligible assignee item returned by the existing eligible-assignees endpoint
export interface EligibleAssignee {
  userId: string;
  userName: string;
  displayName: string;
  roles: string[];
}

// Response from GET /api/workflows/instances/{id}/activities/{activityId}/eligible-assignees
export interface EligibleAssigneesResponse {
  activityId: string;
  teamId?: string;
  teamName?: string;
  eligibleAssignees: EligibleAssignee[];
}

// POST /tasks/{taskId}/reassign request body
export interface ReassignTaskRequest {
  newAssignedTo: string;
}

// POST /tasks/{taskId}/reassign response
export interface ReassignTaskResponse {
  isSuccess: boolean;
  changed: boolean;
  assignedTo?: string;
  errorMessage?: string;
}
