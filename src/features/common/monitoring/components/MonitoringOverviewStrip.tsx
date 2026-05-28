import { useTranslation } from 'react-i18next';

import Icon from '@shared/components/Icon';

import type { MonitoringTabCounts } from '../api/monitoringApi';
import LastUpdatedIndicator from './LastUpdatedIndicator';

interface MonitoringOverviewStripProps {
  counts: MonitoringTabCounts;
}

function sum(...values: Array<number | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

/**
 * Aggregated KPI band rendered at the top of the monitoring page.
 *
 * - Total pending — sum of all section totals.
 * - Total breached — sum of breached across the three OLA sections.
 * - SLA health % — 1 − breached / total-OLA. Coloured pill (red <65, amber 65-85, green ≥85).
 */
function MonitoringOverviewStrip({ counts }: MonitoringOverviewStripProps) {
  const { t } = useTranslation('monitoring');

  const totalPending = sum(
    counts.pendingQuotation,
    counts.pendingInternal,
    counts.pendingExternal,
    counts.pendingFollowup,
    counts.pendingEvaluation,
    counts.meetingFollowup,
  );

  const totalOla = sum(counts.pendingInternal, counts.pendingExternal, counts.pendingFollowup);
  const totalBreached = sum(
    counts.pendingInternalBreached,
    counts.pendingExternalBreached,
    counts.pendingFollowupBreached,
  );

  const healthPct = totalOla > 0 ? Math.round(((totalOla - totalBreached) / totalOla) * 100) : 100;

  const healthVariant: 'good' | 'warn' | 'bad' =
    healthPct >= 85 ? 'good' : healthPct >= 65 ? 'warn' : 'bad';

  const healthPillCls = {
    good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    bad: 'bg-red-50 text-red-700 border-red-200',
  }[healthVariant];

  const healthIconCls = {
    good: 'bg-emerald-50 text-emerald-600',
    warn: 'bg-amber-50 text-amber-600',
    bad: 'bg-red-50 text-red-600',
  }[healthVariant];

  return (
    <div className="flex items-center gap-6 px-4 py-3 rounded-lg border border-gray-200 bg-white shadow-sm">
      <Stat
        icon="layer-group"
        iconCls="text-gray-500 bg-gray-100"
        label={t('overview.totalPending')}
        value={totalPending}
      />
      <Divider />
      <Stat
        icon="triangle-exclamation"
        iconCls="text-red-600 bg-red-50"
        label={t('overview.totalBreached')}
        value={totalBreached}
        valueCls={totalBreached > 0 ? 'text-red-600' : undefined}
      />
      <Divider />
      <div className="flex items-center gap-3">
        <span
          className={[
            'inline-flex items-center justify-center size-9 rounded-md',
            healthIconCls,
          ].join(' ')}
        >
          <Icon style="solid" name="shield-halved" className="size-4" />
        </span>
        <div className="flex flex-col">
          <span className="text-[11px] text-gray-500 leading-none">{t('overview.slaHealth')}</span>
          <span
            className={[
              'mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border tabular-nums w-fit',
              healthPillCls,
            ].join(' ')}
          >
            {healthPct}%
          </span>
        </div>
      </div>
      <div className="ml-auto">
        <LastUpdatedIndicator
          dataUpdatedAt={counts.dataUpdatedAt}
          onRefresh={counts.refetchAll}
          isRefetching={counts.isRefetching}
        />
      </div>
    </div>
  );
}

interface StatProps {
  icon: string;
  iconCls: string;
  label: string;
  value: number;
  valueCls?: string;
}

function Stat({ icon, iconCls, label, value, valueCls }: StatProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={['inline-flex items-center justify-center size-9 rounded-md', iconCls].join(' ')}
      >
        <Icon style="solid" name={icon} className="size-4" />
      </span>
      <div className="flex flex-col">
        <span className="text-[11px] text-gray-500 leading-none">{label}</span>
        <span
          className={[
            'mt-1 text-xl font-bold tabular-nums leading-none',
            valueCls ?? 'text-gray-900',
          ].join(' ')}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="h-8 w-px bg-gray-200 shrink-0" aria-hidden />;
}

export default MonitoringOverviewStrip;
