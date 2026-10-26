import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import Icon from '@shared/components/Icon';
import SortableTh from './SortableTh';
import type { MonitoredTask, SlaStatus, SortDir } from '../types';

// ─── SLA badge ───────────────────────────────────────────────────────────────

// Task-layer emits "OnTime" for newly-assigned tasks while the Appraisal layer uses
// "OnTrack" for the same concept — accept both so we don't crash when either appears.
const SLA_BADGE_CLASS: Record<string, string> = {
  OnTrack:
    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  OnTime:
    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  AtRisk:
    'bg-(--palette-warn-wash) text-(--palette-warn) border-amber-200 dark:border-amber-500/30',
  Breached: 'bg-(--palette-req-wash) text-(--palette-req) border-(--palette-req-line)',
};

// SLA code → i18n key under `sla.*`
const SLA_BADGE_KEY: Record<string, 'onTrack' | 'onTime' | 'atRisk' | 'breached'> = {
  OnTrack: 'onTrack',
  OnTime: 'onTime',
  AtRisk: 'atRisk',
  Breached: 'breached',
};

function SlaBadge({ sla }: { sla: SlaStatus | string | null }) {
  const { t } = useTranslation('taskMonitor');
  if (!sla) return <span className="text-(--palette-gray-400) text-xs">—</span>;
  const className =
    SLA_BADGE_CLASS[sla] ?? 'bg-(--palette-surface-2) text-(--palette-ink) border-(--palette-line)';
  const key = SLA_BADGE_KEY[sla];
  const label = key ? t(`sla.${key}`) : sla.replace(/([a-z])([A-Z])/g, '$1 $2');
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${className}`}
    >
      {label}
    </span>
  );
}

// ─── Appraisal status badge ──────────────────────────────────────────────────

const APPRAISAL_STATUS_STYLES: Record<string, string> = {
  InProgress:
    'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  PendingApproval:
    'bg-(--palette-warn-wash) text-(--palette-warn) border-amber-200 dark:border-amber-500/30',
  Completed:
    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  Cancelled: 'bg-(--palette-req-wash) text-(--palette-req) border-(--palette-req-line)',
  Rejected: 'bg-(--palette-req-wash) text-(--palette-req) border-(--palette-req-line)',
};

function AppraisalStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-(--palette-gray-400) text-xs">—</span>;
  const cls =
    APPRAISAL_STATUS_STYLES[status] ??
    'bg-(--palette-surface-2) text-(--palette-ink) border-(--palette-line)';
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
  if (!value) return <span className="text-(--palette-gray-400) text-xs">—</span>;
  try {
    return (
      <span className="text-xs text-(--palette-gray-600) tabular-nums">
        {format(parseISO(value), 'dd MMM yyyy HH:mm')}
      </span>
    );
  } catch {
    return <span className="text-(--palette-gray-400) text-xs">—</span>;
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

function TaskMonitorTable({
  tasks,
  isLoading,
  onReassign,
  sortBy,
  sortDir,
  onSortChange,
}: TaskMonitorTableProps) {
  const { t } = useTranslation('taskMonitor');

  const COLUMNS: { key: string; label: string; sortKey?: string }[] = [
    { key: 'appraisalNumber', label: t('columns.appraisalNumber'), sortKey: 'AppraisalNumber' },
    { key: 'customerName', label: t('columns.customerName'), sortKey: 'CustomerName' },
    { key: 'taskType', label: t('columns.taskType'), sortKey: 'TaskName' },
    { key: 'purpose', label: t('columns.purpose'), sortKey: 'Purpose' },
    { key: 'appraisalStatus', label: t('columns.status'), sortKey: 'AppraisalStatus' },
    { key: 'slaStatus', label: t('columns.sla'), sortKey: 'SlaStatus' },
    { key: 'assigneeAssignedAt', label: t('columns.assigned'), sortKey: 'AssigneeAssignedAt' },
    { key: 'dueAt', label: t('columns.dueAt'), sortKey: 'DueAt' },
    { key: 'actions', label: 'Action' },
  ];

  if (!isLoading && tasks.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-24 gap-4">
        <div className="size-16 rounded-2xl bg-(--palette-surface-2) border border-(--palette-line-soft) flex items-center justify-center">
          <Icon style="regular" name="inbox" className="size-7 text-(--palette-gray-300)" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-(--palette-ink)">{t('empty.tasksTitle')}</p>
          <p className="text-xs text-(--palette-gray-400) mt-1">{t('empty.tasksDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full min-w-max text-table">
        <thead className="sticky top-0 z-20">
          <tr className="bg-(--palette-surface-2) border-b border-(--palette-line)">
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
        <tbody className="divide-y divide-(--palette-line-soft)">
          {isLoading ? (
            <TableRowSkeleton columns={COLUMNS.map(() => ({ width: 'w-24' }))} rows={8} />
          ) : (
            tasks.map(task => (
              <tr
                key={task.taskId}
                className="group hover:bg-(--palette-surface-2) transition-colors"
              >
                {/* Appraisal Number (with optional Ref sub-line) */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs text-(--palette-ink) font-mono">
                    {task.appraisalNumber ?? '—'}
                  </span>
                  {task.prevAppraisalNumber && (
                    <span className="block text-[11px] text-(--palette-gray-400) font-mono">
                      {t('table.ref', { number: task.prevAppraisalNumber })}
                    </span>
                  )}
                </td>
                {/* Customer Name */}
                <td className="px-4 py-3 text-xs text-(--palette-ink) max-w-[180px] truncate">
                  {task.customerName ?? '—'}
                </td>
                {/* Task Type — prefer human-readable description, fall back to TaskName */}
                <td className="px-4 py-3 text-(--palette-ink) text-table font-medium max-w-[220px] truncate">
                  {task.taskDescription || task.taskName || '—'}
                </td>
                {/* Purpose (with optional amount sub-line) */}
                <td className="px-4 py-3 max-w-[200px]">
                  <span className="text-xs text-(--palette-ink) block truncate">
                    {task.purpose ?? '—'}
                  </span>
                  {task.facilityLimit != null && (
                    <span className="block text-[11px] text-(--palette-gray-400) tabular-nums">
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
                  <DateCell value={task.assigneeAssignedAt ?? task.assignedAt} />
                </td>
                <td className="px-4 py-3">
                  <DateCell value={task.dueAt} />
                </td>
                <td className="px-4 py-3 w-24">
                  <button
                    type="button"
                    onClick={() => onReassign(task)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-(--palette-primary-text) border border-primary/30 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <Icon style="solid" name="arrow-right-arrow-left" className="size-3" />
                    {t('table.reassign')}
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
