// Task status types (for badges)
export const TaskStatus = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
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

// Main Task interface
export interface Task {
  id: string;
  appraisalReportNo: string;
  referenceNo?: string;
  customerName: string;
  taskType: TaskTypeType;
  purpose: TaskPurposeType;
  propertyType: PropertyTypeType;
  status: TaskStatusType;
  kanbanStatus: KanbanStatusType;
  priority: TaskPriorityType;
  action: TaskActionType;
  assignee?: Assignee;
  commentCount: number;
  timeInfo?: string; // e.g., "1 / 0.7 / 0.3"
  appointmentDate?: string;
  requestDate?: string;
  movement?: MovementType;
  ola?: number;
  olaActual?: number;
  olaDifference?: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Grouping options for Kanban view
export type GroupByField = 'kanbanStatus' | 'status' | 'purpose' | 'taskType' | 'priority';

// Paginated response type
export interface TaskListResponse {
  result: {
    items: Task[];
    count: number;
    pageNumber: number;
    pageSize: number;
  };
}

// Query params for task listing
export interface GetTasksParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  taskType?: string;
  propertyType?: string;
  purpose?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}
