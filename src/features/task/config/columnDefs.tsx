import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { Task } from '../types';
import Badge from '@/shared/components/Badge';
import ParameterDisplay from '@/shared/components/ParameterDisplay';

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch {
    return dateString;
  }
};

export type ColumnKey =
  | 'appraisalNumber'
  | 'customerName'
  | 'taskType'
  | 'purpose'
  | 'propertyType'
  | 'status'
  | 'appointmentDateTime'
  | 'requestedBy'
  | 'requestReceivedDate'
  | 'internalFollowupStaff'
  | 'appraiser'
  | 'assignedDate'
  | 'movement'
  | 'dueAt'
  | 'elapsedHours'
  | 'remainingHours'
  | 'slaStatus'
  | 'priority';

export type ColumnDef = {
  label: string;
  /** Backend sort field name. Omit to make the column non-sortable. */
  sortField?: string;
  /** True for the leftmost sticky column (appraisalNumber). */
  sticky?: boolean;
  /** td className override. Defaults to 'px-3 py-2.5 text-gray-600' when not set. */
  tdClassName?: string;
  render: (task: Task) => ReactNode;
};

export const columnDefs: Record<ColumnKey, ColumnDef> = {
  appraisalNumber: {
    label: 'Appraisal Number',
    sortField: 'appraisalNumber',
    sticky: true,
    render: (task) => (
      <Link
        to={`/tasks/${task.taskId}`}
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-primary hover:underline"
      >
        {task.appraisalNumber ?? '-'}
      </Link>
    ),
  },
  customerName: {
    label: 'Customer Name',
    sortField: 'customerName',
    render: (task) => task.customerName ?? '-',
  },
  taskType: {
    label: 'Task Type',
    sortField: 'taskType',
    render: (task) => task.taskDescription || task.taskType || '-',
  },
  purpose: {
    label: 'Purpose',
    sortField: 'purpose',
    render: (task) => <ParameterDisplay group="AppraisalPurpose" code={task.purpose} />,
  },
  propertyType: {
    label: 'Property Type',
    sortField: 'propertyType',
    render: (task) => <ParameterDisplay group="PropertyType" code={task.propertyType} />,
  },
  status: {
    label: 'Status',
    tdClassName: 'px-3 py-2.5',
    render: (task) => <Badge type="status" value={task.status} size="sm" />,
  },
  appointmentDateTime: {
    label: 'Appointment Date',
    sortField: 'appointmentDateTime',
    render: (task) => formatDate(task.appointmentDateTime),
  },
  requestedBy: {
    label: 'Requested By',
    render: (task) => task.requestedBy ?? '-',
  },
  requestReceivedDate: {
    label: 'Request Received Date',
    sortField: 'requestReceivedDate',
    render: (task) => formatDate(task.requestReceivedDate),
  },
  internalFollowupStaff: {
    label: 'Internal Followup Staff',
    render: (task) => task.internalFollowupStaff ?? '-',
  },
  appraiser: {
    label: 'Appraiser',
    render: (task) => task.appraiser ?? '-',
  },
  assignedDate: {
    label: 'Assigned Date',
    sortField: 'assignedDate',
    render: (task) => formatDate(task.assignedDate),
  },
  movement: {
    label: 'Movement',
    sortField: 'movement',
    render: (task) => task.movement ?? '-',
  },
  dueAt: {
    label: 'SLA Due',
    sortField: 'dueAt',
    render: (task) => formatDate(task.dueAt),
  },
  elapsedHours: {
    label: 'Elapsed (hrs)',
    sortField: 'elapsedHours',
    render: (task) => (task.elapsedHours != null ? `${task.elapsedHours}h` : '-'),
  },
  remainingHours: {
    label: 'Remaining (hrs)',
    sortField: 'remainingHours',
    render: (task) => (task.remainingHours != null ? `${task.remainingHours}h` : '-'),
  },
  slaStatus: {
    label: 'SLA Status',
    tdClassName: 'px-3 py-2.5',
    render: (task) => <Badge type="status" value={task.slaStatus} size="sm" />,
  },
  priority: {
    label: 'Priority',
    sortField: 'priority',
    tdClassName: 'px-3 py-2.5',
    render: (task) => <Badge type="priority" value={task.priority} size="sm" />,
  },
};

/** All columns in display order — used by TaskListingPage (shows everything). */
export const ALL_COLUMNS: ColumnKey[] = [
  'appraisalNumber',
  'customerName',
  'taskType',
  'purpose',
  'propertyType',
  'status',
  'appointmentDateTime',
  'requestedBy',
  'internalFollowupStaff',
  'appraiser',
  'requestReceivedDate',
  'assignedDate',
  'movement',
  'dueAt',
  'elapsedHours',
  'remainingHours',
  'slaStatus',
  'priority',
];
