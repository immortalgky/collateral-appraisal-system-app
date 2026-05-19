import { format, parseISO } from 'date-fns';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Icon from '@shared/components/Icon';
import SortableTh from './SortableTh';
import type { MonitoredTask, SlaStatus, SortDir } from '../types';

// ─── SLA badge ───────────────────────────────────────────────────────────────

// Task-layer emits "OnTime" for newly-assigned tasks while the Appraisal layer uses
// "OnTrack" for the same concept — accept both so we don't crash when either appears.
const SLA_BADGE: Record<string, { label: string; className: string }> = {
  OnTrack: { label: 'On Track', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  OnTime: { label: 'On Time', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  AtRisk: { label: 'At Risk', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Breached: { label: 'Breached', className: 'bg-red-50 text-red-700 border-red-200' },
};

function SlaBadge({ sla }: { sla: SlaStatus | string | null }) {
  if (!sla) return <span className="text-gray-400 text-xs">—</span>;
  const cfg = SLA_BADGE[sla] ?? {
    label: sla.replace(/([a-z])([A-Z])/g, '$1 $2'),
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── Appraisal status badge ──────────────────────────────────────────────────

const APPRAISAL_STATUS_STYLES: Record<string, string> = {
  InProgress: 'bg-blue-50 text-blue-700 border-blue-200',
  PendingApproval: 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

function AppraisalStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>;
  const cls = APPRAISAL_STATUS_STYLES[status] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  // Split PascalCase into spaced words for display: "PendingApproval" -> "Pending Approval"
  const label = status.replace(/([a-z])([A-Z])/g, '$1 $2');
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── Date cell ────────────────────────────────────────────────────────────────

function DateCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>;
  try {
    return (
      <span className="text-xs text-gray-600 tabular-nums">
        {format(parseISO(value), 'dd MMM yyyy HH:mm')}
      </span>
    );
  } catch {
    return <span className="text-gray-400 text-xs">—</span>;
  }
}

// ─── Amount formatter ────────────────────────────────────────────────────────

function formatAmount(amount: number | null): string {
  if (amount == null) return '';
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Table ────────────────────────────────────────────────────────────────────

interface TaskMonitorTableProps {
  tasks: MonitoredTask[];
  isLoading: boolean;
  onReassign: (task: MonitoredTask) => void;
  sortBy?: string;
  sortDir?: SortDir;
  onSortChange?: (sortKey: string | undefined, sortDir: SortDir | undefined) => void;
}

const COLUMNS: { key: string; label: string; sortKey?: string }[] = [
  { key: 'appraisalNumber', label: 'Appraisal Number', sortKey: 'AppraisalNumber' },
  { key: 'customerName', label: 'Customer Name', sortKey: 'CustomerName' },
  { key: 'taskType', label: 'Task Type', sortKey: 'TaskName' },
  { key: 'purpose', label: 'Purpose', sortKey: 'Purpose' },
  { key: 'appraisalStatus', label: 'Status', sortKey: 'AppraisalStatus' },
  { key: 'slaStatus', label: 'SLA', sortKey: 'SlaStatus' },
  { key: 'assignedAt', label: 'Assigned', sortKey: 'AssignedAt' },
  { key: 'dueAt', label: 'Due At', sortKey: 'DueAt' },
  { key: 'actions', label: '' },
];

function TaskMonitorTable({
  tasks,
  isLoading,
  onReassign,
  sortBy,
  sortDir,
  onSortChange,
}: TaskMonitorTableProps) {
  if (!isLoading && tasks.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-24 gap-4">
        <div className="size-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
          <Icon style="regular" name="inbox" className="size-7 text-gray-300" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">No monitored tasks</p>
          <p className="text-xs text-gray-400 mt-1">
            No tasks found in the groups you monitor, or all tasks are in a non-reassignable state.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full min-w-max text-sm">
        <thead className="sticky top-0 z-20">
          <tr className="bg-gray-50 border-b border-gray-200">
            {COLUMNS.map(col => (
              <SortableTh
                key={col.key}
                label={col.label}
                sortKey={col.sortKey}
                activeSortKey={sortBy}
                activeSortDir={sortDir}
                onSortChange={onSortChange}
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading ? (
            <TableRowSkeleton columns={COLUMNS.map(() => ({ width: 'w-24' }))} rows={8} />
          ) : (
            tasks.map(task => (
              <tr key={task.taskId} className="group hover:bg-gray-50 transition-colors">
                {/* Appraisal Number (with optional Ref sub-line) */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs text-gray-900 font-mono">
                    {task.appraisalNumber ?? '—'}
                  </span>
                  {task.prevAppraisalNumber && (
                    <span className="block text-[11px] text-gray-400 font-mono">
                      (Ref. {task.prevAppraisalNumber})
                    </span>
                  )}
                </td>
                {/* Customer Name */}
                <td className="px-4 py-3 text-xs text-gray-700 max-w-[180px] truncate">
                  {task.customerName ?? '—'}
                </td>
                {/* Task Type — prefer human-readable description, fall back to TaskName */}
                <td className="px-4 py-3 text-gray-900 text-sm font-medium max-w-[220px] truncate">
                  {task.taskDescription || task.taskName || '—'}
                </td>
                {/* Purpose (with optional amount sub-line) */}
                <td className="px-4 py-3 max-w-[200px]">
                  <span className="text-xs text-gray-700 block truncate">
                    {task.purpose ?? '—'}
                  </span>
                  {task.facilityLimit != null && (
                    <span className="block text-[11px] text-gray-400 tabular-nums">
                      {formatAmount(task.facilityLimit)}
                    </span>
                  )}
                </td>
                {/* Status = Appraisal status (authoritative on Appraisals.Status) */}
                <td className="px-4 py-3">
                  <AppraisalStatusBadge status={task.appraisalStatus} />
                </td>
                <td className="px-4 py-3">
                  <SlaBadge sla={task.slaStatus} />
                </td>
                <td className="px-4 py-3">
                  <DateCell value={task.assignedAt} />
                </td>
                <td className="px-4 py-3">
                  <DateCell value={task.dueAt} />
                </td>
                <td className="px-4 py-3 w-24">
                  <button
                    type="button"
                    onClick={() => onReassign(task)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <Icon style="solid" name="arrow-right-arrow-left" className="size-3" />
                    Reassign
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TaskMonitorTable;
