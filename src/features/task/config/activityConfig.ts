import type { ActivityColumnDef } from '../components/ActivityTaskTable';

export interface ActivityConfig {
  activityId: string;
  title: string;
  description: string;
  columns: ActivityColumnDef[];
  icon: string;
  allowedRoles: string[];
}

// ---------------------------------------------------------------------------
// Column patterns (3 patterns per design doc)
// ---------------------------------------------------------------------------

const BASE_COLUMNS: ActivityColumnDef[] = [
  { key: 'appraisalNumber', label: 'Appraisal Number' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'taskType', label: 'Task Type' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'propertyType', label: 'Property Type' },
  { key: 'status', label: 'Status' },
];

// For: initiation-check, appraisal-initiation, appraisal-assignment,
//      int-appraisal-execution, appraisal-book-verification
const INTERNAL_COLUMNS: ActivityColumnDef[] = [
  ...BASE_COLUMNS,
  { key: 'appointmentDateTime', label: 'Appointment Date' },
  { key: 'requestedBy', label: 'Requested By' },
  { key: 'assignedDate', label: 'Assigned Date' },
  { key: 'movement', label: 'Movement' },
  { key: 'dueAt', label: 'Due Date' },
  { key: 'elapsedHours', label: 'SLA (Actual)' },
  { key: 'remainingHours', label: 'SLA (Difference)' },
  { key: 'slaStatus', label: 'SLA Status' },
  { key: 'priority', label: 'Priority' },
];

// For: ext-appraisal-assignment, ext-appraisal-execution
const EXTERNAL_COLUMNS: ActivityColumnDef[] = [
  ...BASE_COLUMNS,
  { key: 'appointmentDateTime', label: 'Appointment Date' },
  { key: 'internalFollowupStaff', label: 'Internal Followup Staff' },
  { key: 'requestReceivedDate', label: 'Request Received Date' },
  { key: 'assignedDate', label: 'Assigned Date' },
  { key: 'movement', label: 'Movement' },
  { key: 'dueAt', label: 'Due Date' },
  { key: 'elapsedHours', label: 'SLA (Actual)' },
  { key: 'remainingHours', label: 'SLA (Difference)' },
  { key: 'slaStatus', label: 'SLA Status' },
  { key: 'priority', label: 'Priority' },
];

// For: ext-appraisal-check, ext-appraisal-verification,
//      int-appraisal-check, int-appraisal-verification, pending-approval
const CHECKER_COLUMNS: ActivityColumnDef[] = [
  ...BASE_COLUMNS,
  { key: 'appointmentDateTime', label: 'Appointment Date' },
  { key: 'appraiser', label: 'Appraiser' },
  { key: 'requestReceivedDate', label: 'Request Received Date' },
  { key: 'assignedDate', label: 'Assigned Date' },
  { key: 'movement', label: 'Movement' },
  { key: 'dueAt', label: 'Due Date' },
  { key: 'elapsedHours', label: 'SLA (Actual)' },
  { key: 'remainingHours', label: 'SLA (Difference)' },
  { key: 'slaStatus', label: 'SLA Status' },
  { key: 'priority', label: 'Priority' },
];

// ---------------------------------------------------------------------------
// Activity config map — 1:1 with workflow-definition.json TaskActivity nodes
// ---------------------------------------------------------------------------

const ACTIVITY_CONFIG_MAP: Record<string, ActivityConfig> = {
  'appraisal-initiation-check': {
    activityId: 'appraisal-initiation-check',
    title: 'Appraisal Initiation Check',
    description: 'Tasks for reviewing initiated appraisal requests for completeness and accuracy',
    columns: INTERNAL_COLUMNS,
    icon: 'clipboard-check',
    allowedRoles: ['admin', 'request_creator'],
  },
  'appraisal-initiation': {
    activityId: 'appraisal-initiation',
    title: 'Appraisal Initiation',
    description: 'Tasks for providing additional information when routed back',
    columns: INTERNAL_COLUMNS,
    icon: 'file-pen',
    allowedRoles: ['admin', 'request_creator'],
  },
  'appraisal-assignment': {
    activityId: 'appraisal-assignment',
    title: 'Appraisal Assignment',
    description: 'Tasks for reviewing requests and assigning to external or internal appraisal',
    columns: INTERNAL_COLUMNS,
    icon: 'building',
    allowedRoles: ['admin', 'task_assigner'],
  },
  'ext-appraisal-assignment': {
    activityId: 'ext-appraisal-assignment',
    title: 'External Appraisal Assignment',
    description: 'Tasks for handling appointment, fee, and assigning to company appraiser',
    columns: EXTERNAL_COLUMNS,
    icon: 'building-columns',
    allowedRoles: ['admin', 'external_appraiser'],
  },
  'ext-appraisal-execution': {
    activityId: 'ext-appraisal-execution',
    title: 'External Appraisal Execution',
    description: 'Tasks for conducting external property appraisal',
    columns: EXTERNAL_COLUMNS,
    icon: 'user-tie',
    allowedRoles: ['admin', 'task_assigner', 'external_appraiser'],
  },
  'ext-appraisal-check': {
    activityId: 'ext-appraisal-check',
    title: 'External Appraisal Check',
    description: 'Tasks for reviewing external appraisal work for accuracy and completeness',
    columns: CHECKER_COLUMNS,
    icon: 'clipboard-check',
    allowedRoles: ['admin', 'task_assigner', 'appraisal_checker'],
  },
  'ext-appraisal-verification': {
    activityId: 'ext-appraisal-verification',
    title: 'External Appraisal Verification',
    description: 'Tasks for final verification before handoff to internal',
    columns: CHECKER_COLUMNS,
    icon: 'shield-check',
    allowedRoles: ['admin', 'appraisal_checker'],
  },
  'appraisal-book-verification': {
    activityId: 'appraisal-book-verification',
    title: 'Appraisal Book Verification',
    description: 'Tasks for verifying the external company appraisal book',
    columns: INTERNAL_COLUMNS,
    icon: 'book-open',
    allowedRoles: ['admin', 'task_assigner', 'internal_appraiser'],
  },
  'int-appraisal-execution': {
    activityId: 'int-appraisal-execution',
    title: 'Internal Appraisal Execution',
    description: 'Tasks for conducting internal property appraisal',
    columns: INTERNAL_COLUMNS,
    icon: 'user',
    allowedRoles: ['admin', 'task_assigner', 'internal_appraiser'],
  },
  'int-appraisal-check': {
    activityId: 'int-appraisal-check',
    title: 'Internal Appraisal Check',
    description: 'Tasks for reviewing internal appraisal work for accuracy and completeness',
    columns: CHECKER_COLUMNS,
    icon: 'magnifying-glass-check',
    allowedRoles: ['admin', 'task_assigner', 'appraisal_checker'],
  },
  'int-appraisal-verification': {
    activityId: 'int-appraisal-verification',
    title: 'Internal Appraisal Verification',
    description: 'Tasks for final internal verification and sign-off',
    columns: CHECKER_COLUMNS,
    icon: 'badge-check',
    allowedRoles: ['admin', 'appraisal_checker'],
  },
  'pending-approval': {
    activityId: 'pending-approval',
    title: 'Pending Approval',
    description: 'Tasks awaiting final approval from appraisal committee',
    columns: CHECKER_COLUMNS,
    icon: 'hourglass-half',
    allowedRoles: ['admin', 'task_assigner', 'appraisal_approver'],
  },
};

export const ACTIVITY_IDS = Object.keys(ACTIVITY_CONFIG_MAP);

export function getActivityConfig(activityId: string): ActivityConfig | undefined {
  return ACTIVITY_CONFIG_MAP[activityId];
}
