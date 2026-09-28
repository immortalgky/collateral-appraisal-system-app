import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import MetricLineChart from './MetricLineChart';
import CompactMetricTooltip from './CompactMetricTooltip';
import { formatBucketWindow } from '../utils/formatBucketWindow';
import { colorForMachineIndex } from '../utils/machineColors';
import { dedupeRestartMarkers, hasAnyMetricData, shapeSeries } from '../utils/seriesShaping';
import { METRIC_DEFINITIONS, STRIP_METRIC_COUNT } from '../utils/metricDefinitions';
import type { SystemMetricsResult } from '../types/metrics';

interface MetricsStripProps {
  systemMetrics: SystemMetricsResult | undefined;
  /** Same range as the log histogram — clamps the last bucket's window in the tooltip. */
  rangeTo: Date;
  onPointClick: (bucketStart: string, bucketSeconds: number) => void;
  wideAxis: boolean;
  onViewHealth: () => void;
  /** The canonical, sorted machine-name registry (see machineColors.unionMachineNames) — colour
   * indexes come from position in THIS array, not from this strip's own machine list, so a colour
   * still means the same machine on the health tab even when the two windows' machine sets differ. */
  machineNames: string[];
}

const STRIP_METRICS = METRIC_DEFINITIONS.slice(0, STRIP_METRIC_COUNT);

/** Collapsible strip under the log histogram — CPU/memory/queue/p95 for the same window,
 * one machine-colour per line, restart markers, a bad-threshold line, and a shared legend.
 * All 4 mini-charts share a syncId (crosshair stays synced), but only the one actually under
 * the pointer shows a tooltip, merging every metric into one compact box — see
 * `MetricLineChart`'s `onHoverChange`/`renderTooltip`/`showTooltip`. */
const MetricsStrip = ({
  systemMetrics,
  rangeTo,
  onPointClick,
  wideAxis,
  onViewHealth,
  machineNames,
}: MetricsStripProps) => {
  const { t } = useTranslation('logAdmin');
  const [expanded, setExpanded] = useState(true);
  const [hoveredKey, setHoveredKey] = useState<(typeof STRIP_METRICS)[number]['key'] | null>(null);

  const machines = useMemo(() => systemMetrics?.machines ?? [], [systemMetrics]);
  const rowsByMetric = useMemo(
    () =>
      Object.fromEntries(
        STRIP_METRICS.map(metric => [metric.key, shapeSeries(machines, metric.field)]),
      ) as Record<(typeof STRIP_METRICS)[number]['key'], ReturnType<typeof shapeSeries>>,
    [machines],
  );

  const renderMergedTooltip = (bucketStart: string) => (
    <CompactMetricTooltip
      time={formatBucketWindow(bucketStart, systemMetrics?.bucketSeconds ?? 0, rangeTo)}
      rows={STRIP_METRICS.map(metric => {
        const row = rowsByMetric[metric.key].find(r => r.start === bucketStart);
        return {
          label: t(`metrics.${metric.key}Label`),
          values: machineNames.map((name, index) => {
            const value = row?.[name];
            return {
              machineName: name,
              color: colorForMachineIndex(index),
              value: typeof value === 'number' ? metric.format(value) : '—',
            };
          }),
        };
      })}
    />
  );

  if (!systemMetrics || !hasAnyMetricData(machines)) return null;

  return (
    <div className="flex flex-col gap-2 pt-2 mt-1 border-t border-dashed border-gray-200">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary self-start"
        >
          <Icon
            name={expanded ? 'chevron-down' : 'chevron-up'}
            style="regular"
            className="size-2.5"
          />
          {t('metrics.stripTitle')}
        </button>
        <button
          type="button"
          onClick={onViewHealth}
          className="inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-colors"
        >
          <Icon name="heart-pulse" style="solid" className="size-3" />
          {t('metrics.viewHealth')}
          <Icon name="arrow-right" style="solid" className="size-3" />
        </button>
      </div>

      {expanded && (
        <>
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            {machineNames.map((name, index) => (
              <span key={name} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: colorForMachineIndex(index) }}
                />
                {name}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-t border-dashed border-gray-400" />
              {t('metrics.legendRestart')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-t border-dotted border-red-400" />
              {t('metrics.legendThreshold')}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STRIP_METRICS.map(metric => {
              const rows = rowsByMetric[metric.key];
              const restartMarkers = dedupeRestartMarkers(rows, systemMetrics.restarts);
              return (
                <div key={metric.key} className="flex flex-col gap-1 min-w-0">
                  <span className="text-[11px] text-gray-500">
                    {t(`metrics.${metric.key}Label`)}
                  </span>
                  <MetricLineChart
                    rows={rows}
                    machineNames={machineNames}
                    formatValue={metric.format}
                    metricLabel={t(`metrics.${metric.key}Label`)}
                    bucketSeconds={systemMetrics.bucketSeconds}
                    rangeTo={rangeTo}
                    yDomain={metric.domain}
                    badThreshold={metric.threshold}
                    restartMarkers={restartMarkers}
                    syncId="metrics-strip"
                    height={80}
                    onPointClick={start => onPointClick(start, systemMetrics.bucketSeconds)}
                    wideAxis={wideAxis}
                    onHoverChange={hovering => setHoveredKey(hovering ? metric.key : null)}
                    renderTooltip={renderMergedTooltip}
                    showTooltip={hoveredKey === metric.key}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MetricsStrip;
