import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type AxisDomainItem,
} from 'recharts';
import { isIsolatedPoint, type ChartRow, type RestartMarker } from '../utils/seriesShaping';
import { colorForMachineIndex } from '../utils/machineColors';
import { formatBucketWindow } from '../utils/formatBucketWindow';
import CompactMetricTooltip from './CompactMetricTooltip';

interface MetricLineChartProps {
  rows: ChartRow[];
  /** Sorted machine names — index order fixes the colour, see machineColors.ts. */
  machineNames: string[];
  formatValue: (value: number) => string;
  /** This chart's metric name, used as the row label in its own default (single-metric) tooltip. */
  metricLabel: string;
  /** Bucket width and the overall range's end — used only to show the full "start – end" window
   * in this chart's own default tooltip header (see formatBucketWindow). */
  bucketSeconds: number;
  rangeTo: Date;
  yDomain: readonly [AxisDomainItem, AxisDomainItem];
  badThreshold?: number;
  /** One per (bucket, machine) — see dedupeRestartMarkers; never one raw entry per restart, or
   * two restarts landing in the same bucket collide on the same React key. */
  restartMarkers?: RestartMarker[];
  /** Same syncId across charts synchronises their crosshair (recharts built-in) — tooltip
   * CONTENT is handled ourselves below, so only one box shows at a time when that matters. */
  syncId: string;
  height?: number;
  onPointClick?: (bucketStart: string) => void;
  showLegend?: boolean;
  /** Show d/M instead of HH:mm on the axis — the range spans more than a day or two. */
  wideAxis: boolean;
  /** Fires as the pointer enters/leaves this chart's plot area — a syncId group's siblings
   * don't get their own enter/leave (recharts only propagates the synced index, not real mouse
   * events), so this is how a parent learns which chart is physically under the cursor. */
  onHoverChange?: (hovering: boolean) => void;
  /** Strip-only override: replaces the default single-metric tooltip with one merging every
   * metric in the group. Still gated by `showTooltip` — the merged box is meant to appear on
   * whichever chart is actually hovered, not on every synced sibling at once. */
  renderTooltip?: (bucketStart: string) => ReactNode;
  /** Only meaningful together with `renderTooltip`: false suppresses this chart's tooltip
   * content entirely (a sibling chart in the group is showing the merged tooltip instead). */
  showTooltip?: boolean;
}

const MetricLineChart = ({
  rows,
  machineNames,
  formatValue,
  metricLabel,
  bucketSeconds,
  rangeTo,
  yDomain,
  badThreshold,
  restartMarkers = [],
  syncId,
  height = 90,
  onPointClick,
  showLegend = false,
  wideAxis,
  onHoverChange,
  renderTooltip,
  showTooltip = true,
}: MetricLineChartProps) => {
  const { t } = useTranslation('logAdmin');
  const tickFormatter = (value: string) => format(new Date(value), wideAxis ? 'd/M' : 'HH:mm');

  const defaultTooltip = (bucketStart: string): ReactNode => {
    const row = rows.find(r => r.start === bucketStart);
    return (
      <CompactMetricTooltip
        time={formatBucketWindow(bucketStart, bucketSeconds, rangeTo)}
        rows={[
          {
            label: metricLabel,
            values: machineNames.map((name, index) => {
              const value = row?.[name];
              return {
                machineName: name,
                color: colorForMachineIndex(index),
                value: typeof value === 'number' ? formatValue(value) : '—',
              };
            }),
          },
        ]}
      />
    );
  };

  return (
    <div style={{ cursor: onPointClick ? 'pointer' : undefined }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={rows}
          margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
          syncId={syncId}
          onClick={state => {
            const label = state?.activeLabel;
            if (onPointClick && typeof label === 'string') onPointClick(label);
          }}
          onMouseEnter={() => onHoverChange?.(true)}
          onMouseLeave={() => onHoverChange?.(false)}
        >
          <XAxis
            dataKey="start"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 11, fill: '#94a3a2' }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 11, fill: '#94a3a2' }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={value => formatValue(Number(value))}
          />
          <Tooltip
            isAnimationActive={false}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={12}
            wrapperStyle={{ pointerEvents: 'none', zIndex: 20 }}
            content={props => {
              const label = props?.label;
              if (!props?.active || typeof label !== 'string') return null;
              if (renderTooltip) return showTooltip ? renderTooltip(label) : null;
              return defaultTooltip(label);
            }}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {badThreshold != null && (
            <ReferenceLine
              y={badThreshold}
              stroke="#ef4444"
              strokeDasharray="2 3"
              ifOverflow="extendDomain"
            />
          )}
          {restartMarkers.map(marker => {
            const title = t('metrics.restartTitle', {
              machine: marker.machineName,
              times: marker.times.map(time => format(new Date(time), 'HH:mm:ss')).join(', '),
            });
            return (
              <ReferenceLine
                key={marker.key}
                x={marker.start}
                // A native SVG <title> child needs a custom shape — ReferenceLine's own
                // stroke/strokeDasharray props are ignored once `shape` takes over rendering.
                shape={(shapeProps: { x1?: number; y1?: number; x2?: number; y2?: number }) => (
                  <line
                    x1={shapeProps.x1}
                    y1={shapeProps.y1}
                    x2={shapeProps.x2}
                    y2={shapeProps.y2}
                    stroke="#94a3a2"
                    strokeDasharray="3 3"
                  >
                    <title>{title}</title>
                  </line>
                )}
              />
            );
          })}
          {machineNames.map((name, index) => {
            const color = colorForMachineIndex(index);
            return (
              <Line
                key={name}
                dataKey={name}
                name={name}
                stroke={color}
                strokeWidth={2}
                // A cluster can be a single sample surrounded by gaps (the app only wakes up now
                // and then, or a gap follows an outage) — connectNulls={false} then has no line
                // segment to draw at all, so that point needs its own dot or it's invisible.
                dot={(dotProps: { cx?: number; cy?: number; index?: number }) => {
                  const { cx, cy, index: pointIndex } = dotProps;
                  if (pointIndex == null || !isIsolatedPoint(rows, pointIndex, name)) return null;
                  return (
                    <circle key={`dot-${name}-${pointIndex}`} cx={cx} cy={cy} r={3} fill={color} />
                  );
                }}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricLineChart;
