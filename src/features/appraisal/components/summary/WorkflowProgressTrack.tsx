import clsx from 'clsx';
import {
  useFloating,
  useHover,
  useInteractions,
  flip,
  offset,
  shift,
  FloatingPortal,
  autoUpdate,
} from '@floating-ui/react';
import { useState } from 'react';
import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import type { ActivityLogItemDto, PhaseStepDto } from '@/features/appraisal/api/workflow';

interface WorkflowProgressTrackProps {
  steps: PhaseStepDto[];
  routeType: string;
  activityLog: ActivityLogItemDto[];
}

const routeTypeBadgeValue: Record<string, string> = {
  External: 'info',
  Internal: 'inprogress',
  Unknown: 'pending',
};

/** Same format as ActivityLogTable */
const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

/**
 * Only populate tooltip items for the Current step.
 * Completed and Pending steps show no tooltip.
 * All pending items for the current group are shown (no deduplication).
 */
const buildStepItemMap = (
  steps: PhaseStepDto[],
  activityLog: ActivityLogItemDto[],
): Record<string, ActivityLogItemDto[]> => {
  const map: Record<string, ActivityLogItemDto[]> = {};

  for (const step of steps) {
    if (step.status !== 'Current') continue;
    const items = activityLog.filter((i) => i.group === step.group && i.status !== 'Completed');
    if (items.length > 0) map[step.group] = items;
  }

  return map;
};

// ── Per-step tooltip component ──────────────────────────────────────────────

interface StepCircleProps {
  step: PhaseStepDto;
  items: ActivityLogItemDto[] | undefined;
}

const StepCircle = ({ step, items }: StepCircleProps) => {
  const isCompleted = step.status === 'Completed';
  const isCurrent = step.status === 'Current';
  const isPending = step.status === 'Pending';

  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [
      offset(8),
      flip({ fallbackPlacements: ['bottom'] }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { enabled: !!items });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  return (
    <div className="flex flex-col items-center shrink-0">
      {/* Circle */}
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
          isCompleted && 'bg-emerald-500 border-emerald-500',
          isCurrent && 'bg-white border-blue-500 ring-4 ring-blue-100',
          isPending && 'bg-white border-gray-300',
          items && 'cursor-pointer',
        )}
      >
        {isCompleted && <Icon name="check" style="solid" className="w-4 h-4 text-white" />}
        {isCurrent && <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
        {isPending && <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />}
      </div>

      {/* Label */}
      <span
        className={clsx(
          'mt-2 text-center text-xs font-medium leading-tight px-1',
          isCompleted && 'text-emerald-600',
          isCurrent && 'text-blue-600',
          isPending && 'text-gray-400',
        )}
      >
        {step.group}
      </span>

      {/* Floating tooltip — rendered in a portal so it escapes overflow:hidden parents */}
      {open && items && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50 w-56 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-normal leading-relaxed pointer-events-none"
          >
            {items.map((item, i) => (
              <div key={i} className={clsx(i > 0 && 'mt-1.5 pt-1.5 border-t border-gray-600')}>
                <div className="font-medium truncate">
                  {item.taskDescription ?? item.activityName}
                </div>
                <div className="text-gray-300 mt-0.5 truncate">
                  {item.assignedToDisplayName ?? item.assignedTo ?? '—'}
                </div>
                {item.companyName && (
                  <div className="text-gray-400 mt-0.5 truncate">{item.companyName}</div>
                )}
                <div className="text-gray-400 mt-0.5">{formatDateTime(item.startDate)}</div>
                {item.actionTaken && (
                  <div className="text-gray-300 mt-0.5">Action: {item.actionTaken}</div>
                )}
              </div>
            ))}
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

const WorkflowProgressTrack = ({ steps, routeType, activityLog }: WorkflowProgressTrackProps) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <Icon name="diagram-project" style="regular" className="w-8 h-8 text-gray-300" />
        <p className="text-sm text-gray-400">No workflow steps available</p>
      </div>
    );
  }

  const stepItemMap = buildStepItemMap(steps, activityLog);

  return (
    <div className="relative">
      {/* Route type badge */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Route:</span>
          <Badge
            type="status"
            value={routeTypeBadgeValue[routeType] ?? 'pending'}
            size="xs"
            dot={false}
          >
            {routeType}
          </Badge>
        </div>
      </div>

      {/* Stepper track */}
      <div className="flex items-start pb-2">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isCompleted = step.status === 'Completed';

          return (
            <div key={`${step.group}-${index}`} className="flex items-start flex-1 min-w-[80px]">
              <StepCircle step={step} items={stepItemMap[step.group]} />

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={clsx(
                    'flex-1 h-0.5 mt-5',
                    isCompleted ? 'bg-emerald-400' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowProgressTrack;
