import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { PoolTask } from '../types';
import { useAuthStore } from '@features/auth/store';
import { useClaimTask, useLockTask } from '../api';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import { format, isToday, isYesterday } from 'date-fns';
import { getActivityConfig } from '../config/activityConfig';
import { getKanbanCardConfig, type CardFieldKey } from '../config/kanbanCardConfig';
import { avatarColor } from '../config/columnDefs';
import {
  SlaStatusBadge,
  bucketForSlaStatus,
} from '@features/common/monitoring/components/SlaCells';
import { MovementBadgeFromTaskDto } from '@features/common/monitoring/components/MovementBadge';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';

interface PoolTaskKanbanCardProps {
  task: PoolTask;
  /** Fired on card-body click — mirrors clicking the appraisal-number link in the pool table. */
  onClick?: () => void;
}

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const time = format(date, 'h.mm a');

  if (isToday(date)) return `Today ${time}`;
  if (isYesterday(date)) return `Yesterday ${time}`;
  return format(date, 'dd MMM yyyy');
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map(n => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function remainingLabel(hours: number | null): string | null {
  if (hours == null) return null;
  return hours < 0 ? `${Math.abs(hours)}h late` : `${hours}h left`;
}

/**
 * `task.appraiser` covers both internal staff and external companies.
 * `appraiserCompanyNameLocal` is only ever populated on external-assignment rows, so
 * internal rows (null local) fall through to `appraiser` unchanged.
 */
function AppraiserSpan({ task }: { task: PoolTask }) {
  const localizeCompanyName = useLocalizedCompanyName();
  return (
    <span className="truncate">
      {task.appraiser ? localizeCompanyName(task.appraiser, task.appraiserCompanyNameLocal) : '-'}
    </span>
  );
}

// Detail-grid field renderers — same field set/behavior as TaskKanbanCard's FIELD_META.
const FIELD_META: Record<
  CardFieldKey,
  { icon: string; label: string; render: (task: PoolTask) => ReactNode }
> = {
  requestNumber: {
    icon: 'file-lines',
    label: 'Request Number',
    render: task => <span className="truncate">{task.requestNumber ?? '-'}</span>,
  },
  propertyType: {
    icon: 'building',
    label: 'Property Type',
    render: task => (
      <ParameterDisplay group="PropertyType" code={task.propertyType} className="truncate" />
    ),
  },
  appraiser: {
    icon: 'user-tie',
    label: 'Appraiser',
    render: task => <AppraiserSpan task={task} />,
  },
  appointment: {
    icon: 'clock',
    label: 'Appointment Date',
    render: task => (
      <span className="truncate">
        {task.appointmentDateTime ? formatDateTime(task.appointmentDateTime) : '-'}
      </span>
    ),
  },
  priority: {
    icon: 'flag',
    label: 'Priority',
    render: task =>
      task.priority ? <Badge type="priority" value={task.priority} size="sm" /> : <span>-</span>,
  },
  movement: {
    icon: 'share',
    label: 'Movement',
    render: task => <MovementBadgeFromTaskDto value={task.movement} />,
  },
  requestedBy: {
    icon: 'user',
    label: 'Requested By',
    render: task => (
      <span className="truncate">{task.requestedByName ?? task.requestedBy ?? '-'}</span>
    ),
  },
  reportReceived: {
    icon: 'file-circle-check',
    label: 'Report Received Date',
    render: task => (
      <span className="truncate">
        {task.reportReceivedAt ? formatDateTime(task.reportReceivedAt) : '-'}
      </span>
    ),
  },
  purpose: {
    icon: 'tag',
    label: 'Purpose',
    render: task => (
      <ParameterDisplay group="AppraisalPurpose" code={task.purpose} className="truncate" />
    ),
  },
  assignedDate: {
    icon: 'calendar-check',
    label: 'Assigned Date',
    render: task => (
      <span className="truncate">
        {task.assignedDate ? formatDateTime(task.assignedDate) : '-'}
      </span>
    ),
  },
};

const BORDER_ACCENT: Record<'breached' | 'atRisk' | 'none', string> = {
  breached: 'border-l-4 border-l-red-500',
  atRisk: 'border-l-4 border-l-amber-500',
  none: 'border-l-4 border-l-transparent',
};

const PROGRESS_STRIPE: Record<'breached' | 'atRisk' | 'healthy' | 'none', [string, string]> = {
  breached: ['#ef4444', '#fca5a5'],
  atRisk: ['#f59e0b', '#fcd34d'],
  healthy: ['#10b981', '#6ee7b7'],
  none: ['#d1d5db', '#e5e7eb'],
};

function stripeBackground(bucket: 'breached' | 'atRisk' | 'healthy' | 'none'): string {
  const [a, b] = PROGRESS_STRIPE[bucket];
  return `repeating-linear-gradient(45deg, ${a} 0, ${a} 5px, ${b} 5px, ${b} 10px)`;
}

/**
 * Kanban-card counterpart to the Pool table row in PoolTaskListPage — same
 * lock semantics and actions (Edit/Continue/View + Take Out), reimplemented
 * per-card so each card's mutation-pending state is independent.
 */
export const PoolTaskKanbanCard = ({ task, onClick }: PoolTaskKanbanCardProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUsername = useAuthStore(s => s.user?.username);
  const localizeCompanyName = useLocalizedCompanyName();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { mutate: lockTask, isPending: isLocking } = useLockTask();
  const { mutate: claimTask, isPending: isClaiming } = useClaimTask();
  const isActing = isLocking || isClaiming;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  const isLockedBySelf = task.workingBy === currentUsername;
  const isLockedByOther = !!task.workingBy && task.workingBy !== currentUsername;

  // Mirrors PoolTaskListPage.handleEditInPool exactly: locked-by-other → view the
  // appraisal read-only; locked-by-self → resume editing; unlocked → lock then open.
  const handleEditInPool = () => {
    if (task.workingBy && task.workingBy !== currentUsername) {
      if (task.appraisalId) navigate(`/appraisals/${task.appraisalId}`);
      return;
    }
    if (task.workingBy === currentUsername) {
      navigate(`/tasks/${task.id}/opening`);
      return;
    }
    lockTask(task.id, {
      onSuccess: () => {
        navigate(`/tasks/${task.id}/opening`, { state: { lockedTaskId: task.id } });
      },
      onError: (err: unknown) => {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
        toast.error(
          message
            ? `Task is currently being edited by ${message}`
            : 'Could not lock task. Try again.',
        );
        queryClient.invalidateQueries({ queryKey: ['pool-tasks'] });
        if (task.appraisalId) navigate(`/appraisals/${task.appraisalId}`);
      },
    });
  };

  // Mirrors PoolTaskListPage.handleTakeOut exactly — claims the task regardless of lock state.
  const handleTakeOut = () => {
    claimTask(task.id, {
      onSuccess: () => toast.success('Task moved to your tasks'),
      onError: () => toast.error('Could not claim task. Try again.'),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  const activityConfig = getActivityConfig(task.activityId);
  const bucket = bucketForSlaStatus(task.slaStatus) ?? 'none';
  const progressPct = Math.min(
    Math.max(((task.elapsedHours ?? 0) / (task.slaDurationHours || 1)) * 100, 0),
    100,
  );
  const remaining = remainingLabel(task.remainingHours);
  const assigneeName = task.appraiser
    ? localizeCompanyName(task.appraiser, task.appraiserCompanyNameLocal)
    : task.requestedByName;
  const fields = getKanbanCardConfig(task.activityId);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 ${BORDER_ACCENT[bucket === 'healthy' ? 'none' : bucket]} ${
        isLockedBySelf ? 'ring-1 ring-blue-200 bg-blue-50/30' : isLockedByOther ? 'ring-1 ring-amber-200 bg-amber-50/30' : ''
      }`}
    >
      {/* Activity header */}
      <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 max-w-[180px]">
            {activityConfig ? (
              <>
                <Icon style="solid" name={activityConfig.icon} className="size-3 flex-shrink-0" />
                <span className="truncate">{activityConfig.title}</span>
              </>
            ) : (
              <span className="truncate">{task.taskType ?? '-'}</span>
            )}
          </span>
          <Badge type="status" value={task.status} size="sm" />
          {task.priority && <Badge type="priority" value={task.priority} size="sm" />}
        </div>

        {/* Menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            disabled={isActing}
            onClick={e => {
              e.stopPropagation();
              setMenuOpen(o => !o);
            }}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isActing ? (
              <Icon style="solid" name="spinner" className="size-4 animate-spin" />
            ) : (
              <Icon style="solid" name="ellipsis-vertical" className="size-4" />
            )}
          </button>
          {menuOpen && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-20 min-w-[160px]"
            >
              {isLockedByOther ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleEditInPool();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Icon style="solid" name="eye" className="size-3 text-gray-400" />
                  View
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleEditInPool();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Icon style="solid" name="pencil" className="size-3 text-primary" />
                  {isLockedBySelf ? 'Continue' : 'Edit'}
                </button>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleTakeOut();
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Icon
                  style="solid"
                  name="arrow-right-from-bracket"
                  className="size-3 text-gray-500"
                />
                Take Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lock indicator */}
      {(isLockedBySelf || isLockedByOther) && (
        <div className="px-3 pb-1.5">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              isLockedBySelf ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${isLockedBySelf ? 'bg-blue-500' : 'bg-amber-500'} animate-pulse`}
            />
            {isLockedBySelf ? "You're editing" : `Working by ${task.workingBy}`}
          </span>
        </div>
      )}

      {/* Customer Name & Number */}
      <div className="px-3 pb-2">
        <h3
          title={`Customer Name: ${task.customerName ?? '-'}`}
          className="text-base font-semibold text-gray-900 line-clamp-1"
        >
          {task.customerName}
        </h3>
        <p
          title={task.appraisalNumber ? 'Appraisal Number' : 'Request Number'}
          className="text-xs text-gray-500 mt-0.5 truncate"
        >
          {task.appraisalNumber ?? task.requestNumber ?? '-'}
        </p>
      </div>

      {/* SLA strip */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <SlaStatusBadge sla={task.slaStatus} />
          <div className="flex items-center gap-2 text-gray-500">
            {task.dueAt && <span>{formatDateTime(task.dueAt)}</span>}
            {remaining && (
              <span
                className={
                  task.remainingHours != null && task.remainingHours < 0
                    ? 'text-red-600 font-medium'
                    : ''
                }
              >
                {remaining}
              </span>
            )}
          </div>
        </div>
        <div className="mt-1.5 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${progressPct}%`, backgroundImage: stripeBackground(bucket) }}
          />
        </div>
      </div>

      {/* Details Grid */}
      <div className="px-3 pb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {fields.map(key => {
          const meta = FIELD_META[key];
          return (
            <div
              key={key}
              title={meta.label}
              className="flex items-center gap-1.5 text-gray-600"
            >
              <Icon
                style="regular"
                name={meta.icon}
                className="size-3.5 text-gray-400 flex-shrink-0"
              />
              {meta.render(task)}
            </div>
          );
        })}
      </div>

      {/* Footer with assignee */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between">
        {assigneeName ? (
          <span
            className={`inline-flex items-center justify-center size-6 rounded-full text-[10px] font-bold flex-shrink-0 ${avatarColor(assigneeName)}`}
            title={assigneeName}
          >
            {initials(assigneeName)}
          </span>
        ) : (
          <div className="size-6" />
        )}
      </div>
    </div>
  );
};
