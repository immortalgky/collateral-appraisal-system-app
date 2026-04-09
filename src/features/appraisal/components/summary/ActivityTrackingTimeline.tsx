import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';

export interface ActivityStep {
  stepName: string;
  taskDescription: string | null;
  role: string;
  assigneeName: string | null;
  assigneeDisplayName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: 'completed' | 'in_progress' | 'pending';
  remark: string | null;
}

interface ActivityTrackingTimelineProps {
  activities: ActivityStep[];
}

/** Format an ISO datetime string to "DD/MM/YYYY HH:mm" */
const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Calculate human-readable duration between two ISO datetime strings */
const formatDuration = (start: string, end: string): string => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return '';
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

const statusConfig = {
  completed: {
    dotBg: 'bg-emerald-500',
    ringBg: '',
    lineBorder: 'border-emerald-200',
    lineStyle: 'border-solid',
  },
  in_progress: {
    dotBg: 'bg-cyan-500',
    ringBg: 'ring-4 ring-cyan-500/20 animate-pulse',
    lineBorder: 'border-cyan-200',
    lineStyle: 'border-solid',
  },
  pending: {
    dotBg: 'bg-gray-300',
    ringBg: '',
    lineBorder: 'border-gray-200',
    lineStyle: 'border-dashed',
  },
};

const statusToBadge: Record<ActivityStep['status'], string> = {
  completed: 'completed',
  in_progress: 'inprogress',
  pending: 'pending',
};

const ActivityTrackingTimeline = ({ activities }: ActivityTrackingTimelineProps) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <Icon name="clock-rotate-left" style="regular" className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No activity history available yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {activities.map((step, index) => {
        const isLast = index === activities.length - 1;
        const config = statusConfig[step.status];

        return (
          <div key={`${step.stepName}-${index}`} className="relative flex gap-4">
            {/* Timeline column: dot + line */}
            <div className="flex flex-col items-center">
              {/* Dot */}
              <div
                className={clsx(
                  'w-3 h-3 rounded-full shrink-0 mt-1.5',
                  config.dotBg,
                  config.ringBg,
                )}
              />
              {/* Connecting line */}
              {!isLast && (
                <div
                  className={clsx(
                    'w-0 flex-1 border-l-2 my-1',
                    config.lineBorder,
                    config.lineStyle,
                  )}
                />
              )}
            </div>

            {/* Content card */}
            <div className={clsx('pb-5 flex-1 min-w-0', isLast && 'pb-0')}>
              {/* Header: step name + status badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={clsx(
                    'text-sm font-semibold',
                    step.status === 'pending' ? 'text-gray-400' : 'text-gray-800',
                  )}
                >
                  {step.taskDescription || step.stepName}
                </span>
                <Badge type="status" value={statusToBadge[step.status]} size="xs" dot={false} />
              </div>

              {/* Assignee */}
              {step.assigneeName && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Icon name="user" style="regular" className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600">{step.assigneeName}</span>
                  {step.assigneeDisplayName && (
                    <span className="text-xs text-gray-400">({step.assigneeDisplayName})</span>
                  )}
                </div>
              )}
              {!step.assigneeName && step.status === 'pending' && (
                <p className="text-xs text-gray-400 mt-1">Not assigned yet</p>
              )}

              {/* Time range + duration */}
              {step.startedAt && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                  <Icon name="clock" style="regular" className="w-3 h-3 text-gray-400" />
                  <span>{formatDateTime(step.startedAt)}</span>
                  <span className="text-gray-300">-</span>
                  <span>
                    {step.completedAt ? formatDateTime(step.completedAt) : 'In progress...'}
                  </span>
                  {step.startedAt && step.completedAt && (
                    <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">
                      {formatDuration(step.startedAt, step.completedAt)}
                    </span>
                  )}
                </div>
              )}

              {/* Remark */}
              {step.remark && (
                <div className="mt-1.5 flex items-start gap-1.5 min-w-0">
                  <Icon name="message" style="regular" className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-500 italic break-words whitespace-pre-wrap min-w-0 flex-1">
                    {step.remark}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityTrackingTimeline;
