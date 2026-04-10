// Task status types (for badges)
export const TaskStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

// Kanban column status (for grouping)
export const KanbanStatus = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  OVERDUE: 'Overdue',
  COMPLETED: 'Completed',
} as const;

export type KanbanStatusType = (typeof KanbanStatus)[keyof typeof KanbanStatus];

// Priority types
export const TaskPriority = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const;

export type TaskPriorityType = (typeof TaskPriority)[keyof typeof TaskPriority];

// Action types
export const TaskAction = {
  FORWARD: 'Forward',
  REVIEW: 'Review',
  APPROVE: 'Approve',
  REJECT: 'Reject',
} as const;

export type TaskActionType = (typeof TaskAction)[keyof typeof TaskAction];

// Task type enum based on Figma design
export const TaskType = {
  ROUTE_BACK_FOLLOW_UP: 'Route Back Follow Up',
  NEW_APPRAISAL: 'New Appraisal',
  REVIEW: 'Review',
  REVISION: 'Revision',
} as const;

export type TaskTypeType = (typeof TaskType)[keyof typeof TaskType];

// Purpose types
export const TaskPurpose = {
  REQUEST_CREDIT_LIMIT: 'Request for credit limit',
  REQUEST_REVIEW: 'Request to review',
  REFINANCE: 'Refinance',
  NEW_LOAN: 'New Loan',
} as const;

export type TaskPurposeType = (typeof TaskPurpose)[keyof typeof TaskPurpose];

// Property types
export const PropertyType = {
  LAND: 'Land',
  LAND_AND_BUILDING: 'Land and building',
  CONDOMINIUM: 'Condominium',
  BUILDING: 'Building',
  MACHINE: 'Machine',
  VEHICLE: 'Vehicle',
} as const;

export type PropertyTypeType = (typeof PropertyType)[keyof typeof PropertyType];

// Assignee interface
export interface Assignee {
  id: string;
  name: string;
  avatar?: string;
}

// Movement types
export const Movement = {
  FORWARD: 'Forward',
  BACKWARD: 'Backward',
} as const;

export type MovementType = (typeof Movement)[keyof typeof Movement];

// Main Task interface - matches API TaskItemType (TaskDto) from v1.ts
export interface Task {
  id: string;
  taskId: string;
  workflowInstanceId: string;
  activityId: string;
  appraisalNumber: string | null;
  customerName: string | null;
  taskType: string | null;
  taskDescription: string | null;
  purpose: string | null;
  propertyType: string | null;
  status: string | null;
  appointmentDateTime: string | null;
  assigneeUserId: string | null;
  requestedAt: string | null;
  receivedDate: string | null;
  movement: string | null;
  priority: string | null;
  dueAt: string | null;
  slaStatus: string | null;
  elapsedHours: number | null;
  remainingHours: number | null;
  // New fields added to backend DTO
  requestedBy: string | null;
  requestedByName: string | null;
  requestReceivedDate: string | null;
  internalFollowupStaff: string | null;
  appraiser: string | null;
  assignedDate: string | null;
  reportReceivedAt: string | null;
  // Pool task / lock fields
  workingBy: string | null;
  lockedAt: string | null;
  assignedType: string | null;  // "1" = USER, "2" = GROUP
  pendingTaskStatus: string | null;
}

// Pool task — same as Task but assignedType is always present
export interface PoolTask extends Task {
  assignedType: string;
}

// Paginated response for pool tasks
export interface PoolTaskListResponse {
  items: PoolTask[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

// Query params for pool task listing
export interface GetPoolTasksParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  appraisalNumber?: string;
  customerName?: string;
  taskStatus?: string;
  taskType?: string;
  dateFrom?: string;
  dateTo?: string;
  activityId?: string;
}

// Grouping options for Kanban view
export type GroupByField = 'status' | 'purpose' | 'taskType' | 'priority';

// Paginated response type
export interface TaskListResponse {
  items: Task[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

// Query params for task listing
export interface GetTasksParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  taskName?: string;
  status?: string;
  priority?: string;
  activityId?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  // Advanced filter params
  appraisalNumber?: string;
  customerName?: string;
  taskStatus?: string;
  taskType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TaskFilterParams {
  appraisalNumber?: string;
  customerName?: string;
  taskStatus?: string;
  taskType?: string;
  dateFrom?: string;
  dateTo?: string;
}
