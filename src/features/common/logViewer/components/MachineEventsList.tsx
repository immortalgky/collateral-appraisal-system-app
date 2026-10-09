import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { MachineEvent } from '../utils/machineEvents';
import { formatCount, formatP95, formatPercent } from '../utils/formatMetric';

interface MachineEventsListProps {
  events: MachineEvent[];
  onViewLogs: (from: string, to: string) => void;
  /** True once the health range spans more than 24h — a bare time-of-day is ambiguous once
   * events can span multiple days (the 7d/30d presets), so the date joins it. */
  showDate: boolean;
}

const formatBreachValue = (event: Extract<MachineEvent, { kind: 'breach' }>): string => {
  if (event.metric === 'cpu' || event.metric === 'memory') return formatPercent(event.peakValue);
  if (event.metric === 'p95') return formatP95(event.peakValue);
  return formatCount(event.peakValue);
};

const MachineEventsList = ({ events, onViewLogs, showDate }: MachineEventsListProps) => {
  const { t } = useTranslation('logAdmin');
  const shown = events.slice(0, 8);

  if (shown.length === 0) {
    return <p className="text-xs text-gray-400 py-3">{t('health.eventsEmpty')}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {shown.map(event => (
        <li
          key={event.id}
          className={clsx(
            'grid grid-cols-[80px_1fr_auto] gap-3 items-start rounded-lg px-3 py-2 border-l-4',
            event.kind === 'restart'
              ? 'border-l-blue-300 bg-blue-50/40'
              : 'border-l-red-400 bg-red-50/40',
          )}
        >
          <span className="font-mono text-[11px] text-gray-500 tabular-nums pt-0.5">
            {format(new Date(event.ts), showDate ? 'd/M HH:mm:ss' : 'HH:mm:ss')}
          </span>
          <p className="text-sm text-gray-800 min-w-0">
            <b>{event.machineName}</b>
            {' · '}
            {event.kind === 'restart'
              ? t('health.eventRestart')
              : t('health.eventBreach', {
                  metric: t(`metrics.${event.metric}Label`),
                  value: formatBreachValue(event),
                })}
          </p>
          <button
            type="button"
            onClick={() => onViewLogs(event.from, event.to)}
            className="text-xs px-2 py-1 rounded-lg border border-gray-200 hover:border-primary hover:text-primary whitespace-nowrap"
          >
            {t('health.viewLogs')}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default MachineEventsList;
