import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import { useGetCurrentSystemMetrics, useGetHealthSystemMetrics } from '../api/useGetSystemMetrics';
import MachineHealthCard from './MachineHealthCard';
import MachineEventsList from './MachineEventsList';
import MetricLineChart from './MetricLineChart';
import { deriveMachineEvents } from '../utils/machineEvents';
import { METRIC_DEFINITIONS } from '../utils/metricDefinitions';
import { colorForMachineName, sortMachineNames, unionMachineNames } from '../utils/machineColors';
import { dedupeRestartMarkers, hasAnyMetricData, shapeSeries } from '../utils/seriesShaping';
import { bucketWindow } from '../utils/formatBucketWindow';
import { presetRange, toApiDateTime, validateRange } from '../utils/range';

interface MachineHealthViewProps {
  onGoToLogs: (from: string, to: string) => void;
  onBack: () => void;
}

const HEALTH_RANGE_HOURS = [1, 24, 168, 720] as const;
type HealthRangeHours = (typeof HEALTH_RANGE_HOURS)[number];
const HEALTH_RANGE_LABEL_KEY = {
  1: 'range.1h',
  24: 'range.24h',
  168: 'range.7d',
  720: 'range.30d',
} as const satisfies Record<HealthRangeHours, string>;

const HEALTH_CHART_METRICS = METRIC_DEFINITIONS;

/** The "สุขภาพเครื่อง" in-page tab: per-machine status cards, 6 history charts, and a derived
 * events list — everything a machine's own range (1h/24h/7d/30d), independent of the Logs
 * search's range. */
const MachineHealthView = ({ onGoToLogs, onBack }: MachineHealthViewProps) => {
  const { t } = useTranslation('logAdmin');
  const [hours, setHours] = useState<HealthRangeHours>(24);

  const wideAxis = hours > 48;

  const { data: current, isLoading: isCurrentLoading } = useGetCurrentSystemMetrics({
    refetchInterval: 60_000,
  });
  // `presetRange` resolves `now` fresh inside the query function on every 60s refetch (see
  // useGetHealthSystemMetrics), so the window actually slides forward — a plain `useMemo` keyed
  // only on `hours` would freeze `now` at whatever it was on the first render for that `hours`.
  const { data: history } = useGetHealthSystemMetrics(hours, 60, { refetchInterval: 60_000 });
  // Local display range for axis formatting / click-clamping / event filtering — re-resolved
  // whenever `hours` changes or a fresh `history` tick lands, so it tracks the query above.
  // `history` isn't read inside the callback — it's a deliberate extra dependency purely to force
  // recomputation on each new tick, not an omission.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const range = useMemo(() => presetRange(hours), [hours, history]);

  const sortedCurrent = useMemo(() => {
    const list = current ?? [];
    const order = sortMachineNames(list.map(m => m.machineName));
    return order.map(name => list.find(m => m.machineName === name)!);
  }, [current]);
  const machines = useMemo(() => history?.machines ?? [], [history]);
  // Canonical registry for this view: the union of /current's and /system-metrics' machine names,
  // so a colour means the same machine on the cards above AND the charts below even when one
  // source's window happens to be missing a machine the other one has.
  const allMachineNames = useMemo(
    () =>
      unionMachineNames(
        sortedCurrent.map(m => m.machineName),
        machines.map(m => m.machineName),
      ),
    [sortedCurrent, machines],
  );

  // No client-side from/to re-filter here — `history` is already bounded to the queried window
  // server-side, and re-checking against the render-time `range` (computed at a slightly
  // different moment than the actual query) could wrongly drop an event right at the start of
  // the first bucket.
  const events = useMemo(() => {
    if (!history) return [];
    return deriveMachineEvents(history.machines, history.restarts, history.bucketSeconds);
  }, [history]);

  const handleChartClick = (bucketStart: string) => {
    if (!history) return;
    // Same trailing-bucket guard as the Logs view's zoom — the fixed 60-bucket window can start a
    // bucket at/after `range.to` when the span doesn't divide evenly; ignore that click rather
    // than zoom into an empty or invalid range.
    if (new Date(bucketStart).getTime() >= range.to.getTime()) return;
    const { to } = bucketWindow(bucketStart, history.bucketSeconds, range.to);
    if (validateRange(new Date(bucketStart), to)) return;
    onGoToLogs(bucketStart, toApiDateTime(to));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Doubles as the page header when this view is active — the Logs title block is hidden. */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{t('health.title')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('health.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {HEALTH_RANGE_HOURS.map(h => (
              <button
                key={h}
                type="button"
                aria-pressed={hours === h}
                onClick={() => setHours(h)}
                className={clsx(
                  'rounded-md px-2.5 h-7 text-xs font-medium transition-all',
                  hours === h
                    ? 'bg-white shadow-sm text-primary'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {t(HEALTH_RANGE_LABEL_KEY[h])}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={onBack}>
            <Icon name="arrow-left" style="solid" className="size-3.5 mr-1.5" />
            {t('page.backToLogs')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isCurrentLoading ? (
          <p className="text-sm text-gray-400">{t('drawer.loading')}</p>
        ) : sortedCurrent.length === 0 ? (
          <p className="text-sm text-gray-400">{t('health.noMachines')}</p>
        ) : (
          sortedCurrent.map(metric => (
            <MachineHealthCard
              key={metric.machineName}
              metric={metric}
              color={colorForMachineName(metric.machineName, allMachineNames)}
            />
          ))
        )}
      </div>

      {history && hasAnyMetricData(machines) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-900">{t('health.historyTitle')}</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
              {allMachineNames.map(name => (
                <span key={name} className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-sm"
                    style={{ background: colorForMachineName(name, allMachineNames) }}
                  />
                  {name}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {HEALTH_CHART_METRICS.map(metric => {
              const rows = shapeSeries(machines, metric.field);
              const restartMarkers = dedupeRestartMarkers(rows, history.restarts);
              return (
                <div key={metric.key} className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">{t(`metrics.${metric.key}Label`)}</span>
                  <MetricLineChart
                    rows={rows}
                    machineNames={allMachineNames}
                    formatValue={metric.format}
                    metricLabel={t(`metrics.${metric.key}Label`)}
                    bucketSeconds={history.bucketSeconds}
                    rangeTo={range.to}
                    yDomain={metric.domain}
                    badThreshold={metric.threshold}
                    restartMarkers={restartMarkers}
                    syncId="health-charts"
                    height={160}
                    onPointClick={handleChartClick}
                    wideAxis={wideAxis}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">{t('health.eventsTitle')}</h2>
        <p className="text-xs text-gray-500 mb-2">{t('health.eventsSubtitle')}</p>
        <MachineEventsList events={events} onViewLogs={onGoToLogs} showDate={hours > 24} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">{t('health.notesTitle')}</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1 text-xs text-gray-600">
          {(t('health.notes', { returnObjects: true }) as string[]).map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MachineHealthView;
