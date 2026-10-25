import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { Task } from '../types';
import Badge from '@/shared/components/Badge';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import Icon from '@/shared/components/Icon';
import {
  SlaStatusBadge,
  bucketForSlaStatus,
} from '@features/common/monitoring/components/SlaCells';
import { MovementBadgeFromTaskDto } from '@features/common/monitoring/components/MovementBadge';
import { DateCell } from '@features/common/monitoring/components/DateCell';
import { useLocalizedCompanyName } from '@shared/utils/companyName';
import { useRelativeTime } from '@shared/hooks/useFormatters';
import { useAuthStore } from '@features/auth/store';
import { isSameUser } from '../utils/isSameUser';
import type { ColumnLayoutConfig } from '@/shared/components/columnLayout';

// ── Helpers ────────────────────────────────────────────────────────────────

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

export function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map(n => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** An empty value is an em dash, grey (DESIGN.md section 10). */
export function Dash() {
  return <span className="text-gray-400">—</span>;
}

export function PersonCell({ name: raw }: { name: string | null | undefined }) {
  // Blank is as empty as null: a name of spaces made an avatar with no letter in it
  const name = raw?.trim();
  if (!name) return <Dash />;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`inline-flex items-center justify-center size-7 rounded-full text-xs font-bold flex-shrink-0 ${avatarColor(name)}`}
      >
        {initials(name)}
      </span>
      <span className="truncate text-gray-700">{name}</span>
    </div>
  );
}

/**
 * `task.appraiser` is a plain display string covering BOTH internal staff and external
 * companies. `appraiserCompanyNameLocal` is only ever populated on external-assignment
 * rows, so it's safe to feed straight into the resolver: internal rows (null local)
 * fall through to `appraiser` unchanged.
 */
function AppraiserCell({
  appraiser,
  companyNameLocal,
}: {
  appraiser: string | null;
  companyNameLocal: string | null;
}) {
  const localizeCompanyName = useLocalizedCompanyName();
  if (!appraiser) return <Dash />;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon style="regular" name="building" className="size-3.5 text-gray-400 flex-shrink-0" />
      <span className="truncate text-gray-700">
        {localizeCompanyName(appraiser, companyNameLocal)}
      </span>
    </div>
  );
}

function DueDateCell({
  dateString,
  slaStatus,
  slaDurationHours,
}: {
  dateString: string | null | undefined;
  slaStatus: string | null;
  slaDurationHours?: number | null;
}) {
  // Independent of dateString: an appointment-anchored task can have a known
  // SLA budget before a due date is computed.
  const durationChip =
    slaDurationHours != null ? (
      <span className="text-xs text-gray-400 mt-0.5">{slaDurationHours}h</span>
    ) : null;

  if (!dateString) {
    if (!durationChip) return <Dash />;
    return (
      <div className="flex flex-col">
        <Dash />
        {durationChip}
      </div>
    );
  }
  try {
    const formatted = format(new Date(dateString), 'dd/MM/yyyy');
    // Drive icon/color from the backend slaStatus so this cell agrees with the
    // SLA Status badge and the row tint (proportional 75%-of-window rule), rather
    // than a fixed client-side day threshold.
    const bucket = bucketForSlaStatus(slaStatus);
    let dateLine: ReactNode;
    if (bucket === 'breached')
      dateLine = (
        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
          <Icon style="solid" name="circle-exclamation" className="size-3 flex-shrink-0" />
          {formatted}
        </span>
      );
    else if (bucket === 'atRisk')
      dateLine = (
        <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
          <Icon style="solid" name="clock" className="size-3 flex-shrink-0" />
          {formatted}
        </span>
      );
    else if (bucket === 'healthy')
      dateLine = (
        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
          <Icon style="solid" name="circle-check" className="size-3 flex-shrink-0" />
          {formatted}
        </span>
      );
    else dateLine = <>{formatted}</>;

    if (!durationChip) return dateLine;
    return (
      <div className="flex flex-col">
        {dateLine}
        {durationChip}
      </div>
    );
  } catch {
    return <>{dateString}</>;
  }
}

/** Pool only: who holds the task (free, you, or someone else) and since when. */
function LockStateCell({ task }: { task: Task }) {
  const { t } = useTranslation('task');
  const currentUsername = useAuthStore(s => s.user?.username);
  const relativeTime = useRelativeTime();
  const free = !task.workingBy;
  const self = isSameUser(task.workingBy, currentUsername);
  // A free task waits since it was assigned to the Pool; a locked one since it was locked
  const since = free ? task.assignedDate : task.lockedAt;
  const ago = since ? relativeTime(since).relative : null;
  return (
    <div className="min-w-0">
      {free ? (
        <span className="flex items-center gap-1.5 font-medium text-green-700">
          <span className="inline-block size-2 shrink-0 rounded-full bg-green-600" />
          {t('pool.state.free')}
        </span>
      ) : (
        <span
          className={clsx(
            'flex items-center gap-1.5 font-medium',
            self ? 'text-blue-600' : 'text-amber-600',
          )}
        >
          <Icon style="solid" name="lock" className="shrink-0 text-xs" />
          <span className="truncate">
            {self ? t('pool.state.byYou') : t('pool.state.byName', { name: task.workingBy })}
          </span>
        </span>
      )}
      {ago && (
        <span className="block truncate text-xs text-gray-400">
          {t(free ? 'pool.state.waiting' : 'pool.state.lockedAgo', { ago })}
        </span>
      )}
    </div>
  );
}

function HoursCell({
  hours,
  type,
}: {
  hours: number | null | undefined;
  type: 'elapsed' | 'remaining';
}) {
  if (hours == null) return <Dash />;
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
  return <span className={cls}>{label}</span>;
}

// ── Column definitions ─────────────────────────────────────────────────────

export type ColumnKey =
  | 'appraisalNumber'
  | 'lockState'
  | 'requestNumber'
  | 'channel'
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
  /** td className override. Defaults to 'px-3 py-1.5 text-gray-600 text-table' when not set. */
  tdClassName?: string;
  /** Default column width in px AT THE 14px ROOT. Falls back to DEFAULT_COLUMN_WIDTH when not set. */
  width?: number;
  render: (task: Task) => ReactNode;
};

// Re-exported so the many task modules that already import these keep one import path. The
// values live in the shared toolkit — a screen must be able to size its columns without importing
// this feature.
export {
  DEFAULT_COLUMN_WIDTH,
  MAX_AUTOFIT_WIDTH,
  MIN_COLUMN_WIDTH,
} from '@/shared/components/columnLayout';

export const columnDefs: Record<ColumnKey, ColumnDef> = {
  appraisalNumber: {
    label: 'Appraisal Number',
    sortField: 'appraisalNumber',
    width: 190,
    render: task => {
      const display = task.appraisalNumber;
      return (
        <Link
          to={`/tasks/${task.id}/opening`}
          onClick={e => e.stopPropagation()}
          className="font-medium text-primary hover:underline"
        >
          {display ?? <Dash />}
        </Link>
      );
    },
  },
  lockState: {
    label: 'Pickup',
    width: 200,
    render: task => <LockStateCell task={task} />,
  },
  requestNumber: {
    label: 'Request Number',
    sortField: 'requestNumber',
    width: 160,
    render: task => (
      <Link
        to={`/tasks/${task.id}/opening`}
        onClick={e => e.stopPropagation()}
        className="font-medium text-primary hover:underline inline-flex items-center gap-1.5"
      >
        {task.requestNumber ?? <Dash />}
      </Link>
    ),
  },
  channel: {
    label: 'Channel',
    sortField: 'channel',
    width: 120,
    render: task =>
      task.channel ? <ParameterDisplay group="Channel" code={task.channel} /> : <Dash />,
  },
  customerName: {
    label: 'Customer Name',
    sortField: 'customerName',
    width: 200,
    render: task => <PersonCell name={task.customerName} />,
  },
  taskType: {
    label: 'Task Type',
    sortField: 'taskType',
    // "Internal Appraisal Execution" is the longest task name; narrower cuts it mid-word
    width: 240,
    render: task => task.taskDescription || task.taskType || <Dash />,
  },
  purpose: {
    label: 'Purpose',
    sortField: 'purpose',
    width: 200,
    render: task =>
      task.purpose ? <ParameterDisplay group="AppraisalPurpose" code={task.purpose} /> : <Dash />,
  },
  propertyType: {
    label: 'Property Type',
    sortField: 'propertyType',
    width: 150,
    render: task =>
      task.propertyType ? (
        <ParameterDisplay group="PropertyType" code={task.propertyType} />
      ) : (
        <Dash />
      ),
  },
  status: {
    label: 'Status',
    tdClassName: 'px-3 py-1.5',
    width: 150,
    render: task => <Badge type="status" value={task.status} size="sm" />,
  },
  appointmentDateTime: {
    label: 'Appointment Date',
    sortField: 'appointmentDateTime',
    width: 150,
    render: task => <DateCell value={task.appointmentDateTime} withTime withAgo />,
  },
  requestedAt: {
    label: 'Requested At',
    sortField: 'RequestedAt',
    width: 150,
    render: task => <DateCell value={task.requestedAt} withTime withAgo />,
  },
  requestedBy: {
    label: 'Requested By',
    width: 150,
    render: task => <PersonCell name={task.requestedByName || task.requestedBy} />,
  },
  reportReceivedAt: {
    label: 'Report Received Date',
    sortField: 'ReportReceivedAt',
    width: 150,
    render: task => <DateCell value={task.reportReceivedAt} withTime withAgo />,
  },
  requestReceivedDate: {
    label: 'Request Received Date',
    sortField: 'requestReceivedDate',
    width: 150,
    render: task => <DateCell value={task.requestReceivedDate} withTime withAgo />,
  },
  internalFollowupStaff: {
    label: 'Internal Followup Staff',
    width: 160,
    render: task => <PersonCell name={task.internalFollowupStaff} />,
  },
  appraiser: {
    label: 'Appraiser',
    width: 160,
    render: task => (
      <AppraiserCell appraiser={task.appraiser} companyNameLocal={task.appraiserCompanyNameLocal} />
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
    render: task => (
      <DueDateCell
        dateString={task.dueAt}
        slaStatus={task.slaStatus}
        slaDurationHours={task.slaDurationHours}
      />
    ),
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

/** A sortable column, projected for reuse by non-table views (e.g. the Kanban grid). */
export type SortableField = { key: ColumnKey; label: string; sortField: string };

/**
 * Single source of truth for sortable task fields, in column declaration order.
 * Derived from the same `columnDefs.sortField` set the table headers use, so the
 * table and grid views can never drift.
 */
export const SORTABLE_FIELDS: SortableField[] = (
  Object.entries(columnDefs) as [ColumnKey, ColumnDef][]
)
  .filter(([, def]) => def.sortField)
  .map(([key, def]) => ({ key, label: def.label, sortField: def.sortField! }));

// ── Activity column config ─────────────────────────────────────────────────

/**
 * The task screens' column config. An alias of the shared type pinned to this feature's key
 * union, so existing call sites and their inferred types are unchanged.
 */
export type ActivityColumnConfig = ColumnLayoutConfig<ColumnKey>;

/**
 * Display label per column key, for the column-picker dropdown. Derived from the registry so a
 * renamed column cannot end up with two different names on screen.
 */
export const COLUMN_LABELS: Record<ColumnKey, string> = Object.fromEntries(
  (Object.entries(columnDefs) as [ColumnKey, ColumnDef][]).map(([key, def]) => [key, def.label]),
) as Record<ColumnKey, string>;

/**
 * Per-column default widths, read by useColumnWidths. Derived from the column registry rather
 * than duplicated, so a width added to a column def is picked up here automatically.
 */
export const DEFAULT_WIDTHS: Partial<Record<ColumnKey, number>> = Object.fromEntries(
  (Object.entries(columnDefs) as [ColumnKey, ColumnDef][])
    .filter(([, def]) => def.width !== undefined)
    .map(([key, def]) => [key, def.width!]),
) as Partial<Record<ColumnKey, number>>;

const DEFAULT_COLUMNS: ColumnKey[] = [
  'appraisalNumber',
  'requestNumber',
  'channel',
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
  pinnedColumn: 'appraisalNumber',
  defaultWidths: DEFAULT_WIDTHS,
};

/**
 * The task list page's (My and Pool) layout: pinnable columns, with the customer name off by
 * default because it already sits under the appraisal number in the first column.
 */
const LIST_CONFIG: ActivityColumnConfig = {
  ...DEFAULT_CONFIG,
  pinnable: true,
  defaultHidden: ['customerName'],
};

/** The Pool tab's layout: the same, with who holds the task right after the appraisal number. */
const POOL_LIST_CONFIG: ActivityColumnConfig = {
  ...LIST_CONFIG,
  columns: [DEFAULT_COLUMNS[0], 'lockState', ...DEFAULT_COLUMNS.slice(1)],
};

/**
 * Version of the saved column order, visibility and pins of the task list (`task-columns-all` and
 * `task-columns-pool`). Bump (any new random code) whenever a change to the default columns should
 * reset everyone's saved layout: every toggle in the column picker saves the whole order, so without
 * a new key the new defaults would never reach anyone who has touched it.
 * Only order/visibility/pins use it. Widths keep the plain keys, so a width the user dragged to
 * survives a reset.
 */
export const TASK_COLUMN_LAYOUT_VERSION = 'b27e41d9';

const INITIATION_CONFIG: ActivityColumnConfig = {
  columns: [...DEFAULT_COLUMNS.filter(c => c !== 'appraisalNumber')],
  pinnedColumn: 'requestNumber',
  defaultWidths: DEFAULT_WIDTHS,
};

const ACTIVITY_COLUMN_CONFIG: Record<string, ActivityColumnConfig> = {
  'appraisal-initiation': INITIATION_CONFIG,
  'appraisal-initiation-check': INITIATION_CONFIG,
};

export function getActivityColumnConfig(activityId: string): ActivityColumnConfig {
  return ACTIVITY_COLUMN_CONFIG[activityId] ?? DEFAULT_CONFIG;
}

export { DEFAULT_CONFIG, DEFAULT_COLUMNS, LIST_CONFIG, POOL_LIST_CONFIG };
