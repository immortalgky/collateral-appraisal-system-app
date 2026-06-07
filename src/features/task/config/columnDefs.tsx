import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { Task } from '../types';
import Badge from '@/shared/components/Badge';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import Icon from '@/shared/components/Icon';
import { SlaStatusBadge, bucketForSlaStatus } from '@features/common/monitoring/components/SlaCells';
import { MovementBadgeFromTaskDto } from '@features/common/monitoring/components/MovementBadge';
import { DateCell } from '@features/common/monitoring/components/DateCell';

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


function DueDateCell({
  dateString,
  slaStatus,
}: {
  dateString: string | null | undefined;
  slaStatus: string | null;
}) {
  if (!dateString) return <>-</>;
  try {
    const formatted = format(new Date(dateString), 'dd/MM/yyyy');
    // Drive icon/color from the backend slaStatus so this cell agrees with the
    // SLA Status badge and the row tint (proportional 75%-of-window rule), rather
    // than a fixed client-side day threshold.
    const bucket = bucketForSlaStatus(slaStatus);
    if (bucket === 'breached')
      return (
        <span className="inline-flex items-center gap-1 text-red-600 font-medium text-sm">
          <Icon style="solid" name="circle-exclamation" className="size-3 flex-shrink-0" />
          {formatted}
        </span>
      );
    if (bucket === 'atRisk')
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 font-medium text-sm">
          <Icon style="solid" name="clock" className="size-3 flex-shrink-0" />
          {formatted}
        </span>
      );
    if (bucket === 'healthy')
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-sm">
          <Icon style="solid" name="circle-check" className="size-3 flex-shrink-0" />
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
  | 'requestNumber'
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
  /** td className override. Defaults to 'px-3 py-1.5 text-gray-600 text-xs' when not set. */
  tdClassName?: string;
  /** Default column width in px. Falls back to DEFAULT_COLUMN_WIDTH when not set. */
  width?: number;
  render: (task: Task) => ReactNode;
};

export const DEFAULT_COLUMN_WIDTH = 150;
export const MIN_COLUMN_WIDTH = 60;
export const MAX_AUTOFIT_WIDTH = 480;

export const columnDefs: Record<ColumnKey, ColumnDef> = {
  appraisalNumber: {
    label: 'Appraisal Number',
    sortField: 'appraisalNumber',
    width: 130,
    render: task => {
      const display = task.appraisalNumber;
      return (
        <Link
          to={`/tasks/${task.id}/opening`}
          onClick={e => e.stopPropagation()}
          className="font-medium text-primary hover:underline"
        >
          {display ?? '-'}
        </Link>
      );
    },
  },
  requestNumber: {
    label: 'Request Number',
    sortField: 'requestNumber',
    width: 130,
    render: task => (
      <Link
        to={`/tasks/${task.id}/opening`}
        onClick={e => e.stopPropagation()}
        className="font-medium text-primary hover:underline inline-flex items-center gap-1.5"
      >
        {task.requestNumber ?? '-'}
        <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
          REQ
        </span>
      </Link>
    ),
  },
  customerName: {
    label: 'Customer Name',
    sortField: 'customerName',
    width: 170,
    render: task => task.customerName ?? '-',
  },
  taskType: {
    label: 'Task Type',
    sortField: 'taskType',
    width: 150,
    render: task => task.taskDescription || task.taskType || '-',
  },
  purpose: {
    label: 'Purpose',
    sortField: 'purpose',
    width: 200,
    render: task => <ParameterDisplay group="AppraisalPurpose" code={task.purpose} />,
  },
  propertyType: {
    label: 'Property Type',
    sortField: 'propertyType',
    width: 150,
    render: task => <ParameterDisplay group="PropertyType" code={task.propertyType} />,
  },
  status: {
    label: 'Status',
    tdClassName: 'px-3 py-1.5',
    width: 120,
    render: task => <Badge type="status" value={task.status} size="sm" />,
  },
  appointmentDateTime: {
    label: 'Appointment Date',
    sortField: 'appointmentDateTime',
    width: 150,
    render: task => <AppointmentCell dateString={task.appointmentDateTime} />,
  },
  requestedAt: {
    label: 'Requested At',
    sortField: 'RequestedAt',
    width: 140,
    render: task => formatDate(task.requestedAt),
  },
  requestedBy: {
    label: 'Requested By',
    width: 150,
    render: task => <PersonCell name={task.requestedByName ?? task.requestedBy} />,
  },
  reportReceivedAt: {
    label: 'Report Received At',
    sortField: 'ReportReceivedAt',
    width: 150,
    render: task => formatDate(task.reportReceivedAt),
  },
  requestReceivedDate: {
    label: 'Request Received Date',
    sortField: 'requestReceivedDate',
    width: 150,
    render: task => <AppointmentCell dateString={task.requestReceivedDate} />,
  },
  internalFollowupStaff: {
    label: 'Internal Followup Staff',
    width: 160,
    render: task => <PersonCell name={task.internalFollowupStaff} />,
  },
  appraiser: {
    label: 'Appraiser',
    width: 160,
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
    width: 150,
    render: task => <DateCell value={task.assignedDate} withTime withAgo />,
  },
  movement: {
    label: 'Movement',
    sortField: 'movement',
    width: 120,
    render: task => <MovementBadgeFromTaskDto value={task.movement} />,
  },
  dueAt: {
    label: 'SLA Due',
    sortField: 'dueAt',
    width: 140,
    render: task => <DueDateCell dateString={task.dueAt} slaStatus={task.slaStatus} />,
  },
  elapsedHours: {
    label: 'Elapsed (hrs)',
    sortField: 'elapsedHours',
    width: 110,
    render: task => <HoursCell hours={task.elapsedHours} type="elapsed" />,
  },
  remainingHours: {
    label: 'Remaining (hrs)',
    sortField: 'remainingHours',
    width: 120,
    render: task => <HoursCell hours={task.remainingHours} type="remaining" />,
  },
  slaStatus: {
    label: 'SLA Status',
    sortField: 'slaStatus',
    tdClassName: 'px-3 py-1.5',
    width: 120,
    render: task => <SlaStatusBadge sla={task.slaStatus} />,
  },
  priority: {
    label: 'Priority',
    sortField: 'priority',
    tdClassName: 'px-3 py-1.5',
    width: 110,
    render: task => <Badge type="priority" value={task.priority} size="sm" />,
  },
};

// ── Activity column config ─────────────────────────────────────────────────

export type ActivityColumnConfig = {
  /** Columns in display order, default visible set. */
  columns: ColumnKey[];
  /** The single left-pinned column (cannot be hidden). */
  stickyColumn: ColumnKey;
  /** Additional columns the user cannot toggle off. Sticky is always implicitly always-visible. */
  alwaysVisible?: ColumnKey[];
};

const DEFAULT_COLUMNS: ColumnKey[] = [
  'appraisalNumber',
  'requestNumber',
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

const DEFAULT_CONFIG: ActivityColumnConfig = {
  columns: DEFAULT_COLUMNS,
  stickyColumn: 'appraisalNumber',
};

const INITIATION_CONFIG: ActivityColumnConfig = {
  columns: [...DEFAULT_COLUMNS.filter(c => c !== 'appraisalNumber')],
  stickyColumn: 'requestNumber',
};

const ACTIVITY_COLUMN_CONFIG: Record<string, ActivityColumnConfig> = {
  'appraisal-initiation': INITIATION_CONFIG,
  'appraisal-initiation-check': INITIATION_CONFIG,
};

export function getActivityColumnConfig(activityId: string): ActivityColumnConfig {
  return ACTIVITY_COLUMN_CONFIG[activityId] ?? DEFAULT_CONFIG;
}

export { DEFAULT_CONFIG, DEFAULT_COLUMNS };
