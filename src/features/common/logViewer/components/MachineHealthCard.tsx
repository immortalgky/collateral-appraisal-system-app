import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import type { CurrentMachineMetric } from '../types/metrics';
import { levelFor, worstLevel, type MetricLevel } from '../utils/metricThresholds';
import {
  formatCount,
  formatMb,
  formatP95,
  formatPercent,
  formatRate,
  uptimeBreakdown,
} from '../utils/formatMetric';

interface MachineHealthCardProps {
  metric: CurrentMachineMetric;
  color: string;
}

const STATUS_ICON: Record<MetricLevel, string> = {
  ok: 'circle-check',
  warn: 'triangle-exclamation',
  bad: 'circle-xmark',
};
const STATUS_CLASS: Record<MetricLevel, string> = {
  ok: 'text-green-700 bg-green-50',
  warn: 'text-amber-700 bg-amber-50',
  bad: 'text-red-700 bg-red-50',
};
const KPI_BORDER_CLASS: Record<MetricLevel, string> = {
  ok: 'border-gray-200',
  warn: 'border-amber-300',
  bad: 'border-red-300',
};

/** Icon + label, never colour alone — the pill also carries the status in text. */
const StatusPill = ({ level }: { level: MetricLevel }) => {
  const { t } = useTranslation('logAdmin');
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap',
        STATUS_CLASS[level],
      )}
    >
      <Icon name={STATUS_ICON[level]} style="solid" className="size-3" />
      {t(`health.status.${level}`)}
    </span>
  );
};

const Kpi = ({ label, value, level }: { label: string; value: string; level: MetricLevel }) => (
  <div
    className={clsx(
      'rounded-lg border px-2.5 py-2 flex flex-col gap-1 min-w-0',
      KPI_BORDER_CLASS[level],
    )}
  >
    <span className="text-[11px] text-gray-500 truncate">{label}</span>
    <span className="text-base font-semibold tabular-nums text-gray-900">{value}</span>
    {level !== 'ok' && <StatusPill level={level} />}
  </div>
);

const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex justify-between gap-2">
    <dt className="text-gray-500">{label}</dt>
    <dd className="font-medium tabular-nums">{value}</dd>
  </div>
);

const MachineHealthCard = ({ metric, color }: MachineHealthCardProps) => {
  const { t } = useTranslation('logAdmin');
  const now = new Date();

  const cpuLevel = levelFor('cpu', metric.cpuPercent);
  const memoryLevel = levelFor('memory', metric.machineMemoryPercent);
  const queueLevel = levelFor('queue', metric.threadPoolQueue);
  const p95Level = levelFor('p95', metric.p95Ms);
  const http5xxLevel = levelFor('http5xx', metric.http5xxPerMin);
  const overall = worstLevel([cpuLevel, memoryLevel, queueLevel, p95Level, http5xxLevel]);

  const uptime = uptimeBreakdown(metric.processStartedAt, now);
  const isStale = now.getTime() - new Date(metric.timeStamp).getTime() > 3 * 60_000;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <span className="size-2.5 rounded-sm shrink-0" style={{ background: color }} />
            {metric.machineName}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('health.startedAt', {
              time: format(new Date(metric.processStartedAt), 'd/M HH:mm'),
            })}
            {' · '}
            {uptime.days > 0
              ? t('health.uptimeDays', { days: uptime.days, hours: uptime.hours })
              : t('health.uptimeHours', { hours: uptime.hours, minutes: uptime.minutes })}
          </p>
          {isStale && (
            <p className="text-xs text-amber-600 mt-1">
              {t('health.staleWarning', { time: format(new Date(metric.timeStamp), 'HH:mm:ss') })}
            </p>
          )}
        </div>
        <StatusPill level={overall} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Kpi
          label={t('metrics.cpuLabel')}
          value={formatPercent(metric.cpuPercent)}
          level={cpuLevel}
        />
        <Kpi
          label={t('metrics.memoryLabel')}
          value={formatPercent(metric.machineMemoryPercent)}
          level={memoryLevel}
        />
        <Kpi
          label={t('metrics.queueLabel')}
          value={formatCount(metric.threadPoolQueue)}
          level={queueLevel}
        />
        <Kpi label={t('metrics.p95Label')} value={formatP95(metric.p95Ms)} level={p95Level} />
        <Kpi
          label={t('metrics.http5xxLabel')}
          value={formatCount(metric.http5xxPerMin)}
          level={http5xxLevel}
        />
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs border-t border-dashed border-gray-200 pt-2">
        <Stat label={t('health.extra.workingSet')} value={formatMb(metric.workingSetMb)} />
        <Stat label={t('health.extra.gcHeap')} value={formatMb(metric.gcHeapMb)} />
        <Stat label={t('health.extra.gen2')} value={formatRate(metric.gen2PerHour)} />
        <Stat label={t('health.extra.threads')} value={formatCount(metric.threadCount)} />
        <Stat label={t('health.extra.requestsPerMin')} value={formatCount(metric.requestsPerMin)} />
        <Stat
          label={t('health.extra.exceptionsPerMin')}
          value={formatRate(metric.exceptionsPerMin)}
        />
      </dl>
    </div>
  );
};

export default MachineHealthCard;
