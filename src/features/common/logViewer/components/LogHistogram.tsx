import { useMemo, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { format } from 'date-fns';
import { logLevelBarColor, type LogSummaryBucket } from '../types';
import CompactMetricTooltip from './CompactMetricTooltip';
import { formatBucketWindow } from '../utils/formatBucketWindow';
import { resolveClickedBucket } from '../utils/resolveClickedBucket';

interface LogHistogramProps {
  buckets: LogSummaryBucket[];
  bucketSeconds: number;
  /** The overall range's end — clamps the last bucket's window in the tooltip, which can be
   * shorter than a full `bucketSeconds` when the range doesn't divide evenly. */
  rangeTo: Date;
  /** Zooms the active range to this one bucket. */
  onBucketClick: (bucketStart: string, bucketSeconds: number) => void;
  /** Show d/M instead of HH:mm on the axis — the range spans more than a day or two. */
  wideAxis: boolean;
}

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="size-2 rounded-sm" style={{ backgroundColor: color }} />
    {label}
  </span>
);

const LogHistogram = ({
  buckets,
  bucketSeconds,
  rangeTo,
  onBucketClick,
  wideAxis,
}: LogHistogramProps) => {
  const { t } = useTranslation('logAdmin');
  const tickFormatter = (value: string) => format(new Date(value), wideAxis ? 'd/M' : 'HH:mm');

  // The BE divides the range into a fixed 48 buckets of ceil(span/48)s each — on a short range
  // that doesn't divide evenly, the trailing bucket(s) can start at/after `rangeTo`. Drop those
  // from the chart entirely when they're also empty, rather than show an interactive-looking bar
  // for a window that doesn't really exist.
  const visibleBuckets = useMemo(
    () =>
      buckets.filter(
        b =>
          !(
            new Date(b.start).getTime() >= rangeTo.getTime() &&
            b.information + b.warning + b.error === 0
          ),
      ),
    [buckets, rangeTo],
  );

  // Chart-level click, resolved from activeLabel — never from a per-<Bar> index, which in
  // recharts 3 counts only rendered (non-zero-height) rectangles and drifts when empty buckets
  // precede the clicked one. This also makes clicking the empty space above a short bar work.
  const handleChartClick: ComponentProps<typeof BarChart>['onClick'] = state => {
    const bucket = resolveClickedBucket(visibleBuckets, state?.activeLabel);
    if (bucket) onBucketClick(bucket.start, bucketSeconds);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-3">
          <LegendDot color={logLevelBarColor.information} label={t('levels.Information')} />
          <LegendDot color={logLevelBarColor.warning} label={t('levels.Warning')} />
          <LegendDot color={logLevelBarColor.error} label={t('histogram.errorFatalLabel')} />
        </span>
        <span className="text-gray-400">{t('histogram.clickHint')}</span>
      </div>
      <ResponsiveContainer width="100%" height={90}>
        <BarChart
          data={visibleBuckets}
          margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
          barCategoryGap={1}
          onClick={handleChartClick}
          style={{ cursor: 'pointer' }}
        >
          <XAxis
            dataKey="start"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 11, fill: '#94a3a2' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <Tooltip
            isAnimationActive={false}
            cursor={{ fill: 'rgba(148, 163, 162, 0.12)' }}
            wrapperStyle={{ pointerEvents: 'none' }}
            content={props => {
              const label = props?.label;
              if (!props?.active || typeof label !== 'string') return null;
              const bucket = visibleBuckets.find(b => b.start === label);
              if (!bucket) return null;
              // Error/Fatal, Warning, Info — worst first.
              return (
                <CompactMetricTooltip
                  time={formatBucketWindow(label, bucketSeconds, rangeTo)}
                  rows={[
                    {
                      label: t('histogram.errorFatalLabel'),
                      values: [
                        {
                          machineName: 'error',
                          color: logLevelBarColor.error,
                          value: String(bucket.error),
                        },
                      ],
                    },
                    {
                      label: t('levels.Warning'),
                      values: [
                        {
                          machineName: 'warning',
                          color: logLevelBarColor.warning,
                          value: String(bucket.warning),
                        },
                      ],
                    },
                    {
                      label: t('levels.Information'),
                      values: [
                        {
                          machineName: 'information',
                          color: logLevelBarColor.information,
                          value: String(bucket.information),
                        },
                      ],
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="information" stackId="a" fill={logLevelBarColor.information} />
          <Bar dataKey="warning" stackId="a" fill={logLevelBarColor.warning} />
          <Bar dataKey="error" stackId="a" fill={logLevelBarColor.error} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LogHistogram;
