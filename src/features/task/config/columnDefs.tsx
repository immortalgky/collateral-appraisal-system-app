import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { differenceInDays, format, isPast } from 'date-fns';
import type { Task } from '../types';
import Badge from '@/shared/components/Badge';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import Icon from '@/shared/components/Icon';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch {
    return dateString;
  }
};

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map(n => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function PersonCell({ name }: { name: string | null | undefined }) {
  if (!name) return <>-</>;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`inline-flex items-center justify-center size-6 rounded-full text-[10px] font-bold flex-shrink-0 ${avatarColor(name)}`}
      >
        {initials(name)}
      </span>
      <span className="truncate text-sm text-gray-700">{name}</span>
    </div>
  );
}

function MovementCell({ value }: { value: string | null | undefined }) {
  if (!value) return <>-</>;
  const isForward = value.toLowerCase() === 'forward';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isForward ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      <Icon
        style="solid"
        name={isForward ? 'arrow-right' : 'arrow-rotate-left'}
        className="size-2.5"
      />
      {value}
    </span>
  );
}

function DueDateCell({ dateString }: { dateString: string | null | undefined }) {
  if (!dateString) return <>-</>;
  try {
    const date = new Date(dateString);
    const days = differenceInDays(date, new Date());
    const overdue = isPast(date);
    const formatted = format(date, 'dd/MM/yyyy');
    if (overdue)
      return (
        <span className="inline-flex items-center gap-1 text-red-600 font-medium text-sm">
          <Icon style="solid" name="circle-exclamation" className="size-3 flex-shrink-0" />
          {formatted}
        </span>
      );
    if (days <= 3)
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 font-medium text-sm">
          <Icon style="solid" name="clock" className="size-3 flex-shrink-0" />
          {formatted}
        </span>
      );
    return <>{formatted}</>;
  } catch {
    return <>{dateString}</>;
  }
}

function HoursCell({
  hours,
  type,
}: {
  hours: number | null | undefined;
  type: 'elapsed' | 'remaining';
}) {
  if (hours == null) return <>-</>;
  let cls = 'text-gray-600';
  let label = `${hours}h`;
  if (type === 'remaining') {
    if (hours < 0) {
      cls = 'text-red-600 font-medium';
      label = `${Math.abs(hours)}h late`;
    } else if (hours <= 24) cls = 'text-amber-600 font-medium';
    else cls = 'text-emerald-600';
  } else {
    if (hours > 72) cls = 'text-red-600 font-medium';
    else if (hours > 24) cls = 'text-amber-600 font-medium';
    else cls = 'text-emerald-600';
  }
  return <span className={`text-sm ${cls}`}>{label}</span>;
}

function AppointmentCell({ dateString }: { dateString: string | null | undefined }) {
  if (!dateString) return <>-</>;
  try {
    const date = new Date(dateString);
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon style="regular" name="calendar" className="size-3 text-gray-400 flex-shrink-0" />
        <span className="text-sm">{format(date, 'dd/MM/yyyy HH:mm')}</span>
      </div>
    );
  } catch {
    return <>{dateString}</>;
  }
}

// ── Column definitions ─────────────────────────────────────────────────────

export type ColumnKey =
  | 'appraisalNumber'
  | 'customerName'
  | 'taskType'
  | 'purpose'
  | 'propertyType'
  | 'status'
  | 'appointmentDateTime'
  | 'requestedAt'
  | 'requestedBy'
  | 'reportReceivedAt'
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
    render: task => {
      const display = task.appraisalNumber ?? task.requestNumber;
      const isReq = !task.appraisalNumber && !!task.requestNumber;
      return (
        <Link
          to={`/tasks/${task.id}/opening`}
          onClick={e => e.stopPropagation()}
          className="font-medium text-primary hover:underline inline-flex items-center gap-1.5"
        >
          {display ?? '-'}
          {isReq && (
            <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
              REQ
            </span>
          )}
        </Link>
      );
    },
  },
  customerName: {
    label: 'Customer Name',
    sortField: 'customerName',
    render: task => task.customerName ?? '-',
  },
  taskType: {
    label: 'Task Type',
    sortField: 'taskType',
    render: task => task.taskDescription || task.taskType || '-',
  },
  purpose: {
    label: 'Purpose',
    sortField: 'purpose',
    render: task => <ParameterDisplay group="AppraisalPurpose" code={task.purpose} />,
  },
  propertyType: {
    label: 'Property Type',
    sortField: 'propertyType',
    render: task => <ParameterDisplay group="PropertyType" code={task.propertyType} />,
  },
  status: {
    label: 'Status',
    tdClassName: 'px-3 py-2.5',
    render: task => <Badge type="status" value={task.status} size="sm" />,
  },
  appointmentDateTime: {
    label: 'Appointment Date',
    sortField: 'appointmentDateTime',
    render: task => <AppointmentCell dateString={task.appointmentDateTime} />,
  },
  requestedAt: {
    label: 'Requested At',
    sortField: 'RequestedAt',
    render: task => formatDate(task.requestedAt),
  },
  requestedBy: {
    label: 'Requested By',
    render: task => <PersonCell name={task.requestedByName ?? task.requestedBy} />,
  },
  reportReceivedAt: {
    label: 'Report Received At',
    sortField: 'ReportReceivedAt',
    render: task => formatDate(task.reportReceivedAt),
  },
  requestReceivedDate: {
    label: 'Request Received Date',
    sortField: 'requestReceivedDate',
    render: task => <AppointmentCell dateString={task.requestReceivedDate} />,
  },
  internalFollowupStaff: {
    label: 'Internal Followup Staff',
    render: task => <PersonCell name={task.internalFollowupStaff} />,
  },
  appraiser: {
    label: 'Appraiser',
    render: task =>
      task.appraiser ? (
        <div className="flex items-center gap-2 min-w-0">
          <Icon style="regular" name="building" className="size-3.5 text-gray-400 flex-shrink-0" />
          <span className="truncate text-sm text-gray-700">{task.appraiser}</span>
        </div>
      ) : (
        '-'
      ),
  },
  assignedDate: {
    label: 'Assigned Date',
    sortField: 'assignedDate',
    render: task => <AppointmentCell dateString={task.assignedDate} />,
  },
  movement: {
    label: 'Movement',
    sortField: 'movement',
    render: task => <MovementCell value={task.movement} />,
  },
  dueAt: {
    label: 'SLA Due',
    sortField: 'dueAt',
    render: task => <DueDateCell dateString={task.dueAt} />,
  },
  elapsedHours: {
    label: 'Elapsed (hrs)',
    sortField: 'elapsedHours',
    render: task => <HoursCell hours={task.elapsedHours} type="elapsed" />,
  },
  remainingHours: {
    label: 'Remaining (hrs)',
    sortField: 'remainingHours',
    render: task => <HoursCell hours={task.remainingHours} type="remaining" />,
  },
  slaStatus: {
    label: 'SLA Status',
    tdClassName: 'px-3 py-2.5',
    render: task => <Badge type="status" value={task.slaStatus} size="sm" />,
  },
  priority: {
    label: 'Priority',
    sortField: 'priority',
    tdClassName: 'px-3 py-2.5',
    render: task => <Badge type="priority" value={task.priority} size="sm" />,
  },
};

/** Columns that are always visible and cannot be toggled off by the user. */
export const ALWAYS_VISIBLE_COLUMNS: ColumnKey[] = ['appraisalNumber'];

/** All columns in display order — used by TaskListingPage (shows everything). */
export const ALL_COLUMNS: ColumnKey[] = [
  'appraisalNumber',
  'customerName',
  'taskType',
  'purpose',
  'propertyType',
  'status',
  'appointmentDateTime',
  'requestedAt',
  'requestedBy',
  'reportReceivedAt',
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
