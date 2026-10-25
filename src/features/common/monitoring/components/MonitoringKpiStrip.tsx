import { useTranslation } from 'react-i18next';
import type { MonitoringSummary, SlaBucket } from '../api/types';

// ─── Accent strip color map ───────────────────────────────────────────────────

const BUCKET_CONFIG = {
  total: {
    border: 'border-l-(--palette-line-strong)',
    activeBackground: 'bg-(--palette-surface-2)',
    activeText: 'text-(--palette-ink)',
    defaultText: 'text-(--palette-ink)',
  },
  breached: {
    border: 'border-l-red-500',
    activeBackground: 'bg-(--palette-req-wash)',
    activeText: 'text-(--palette-danger)',
    defaultText: 'text-(--palette-ink)',
  },
  atRisk: {
    border: 'border-l-amber-500',
    activeBackground: 'bg-(--palette-warn-wash)',
    activeText: 'text-amber-600 dark:text-amber-400',
    defaultText: 'text-(--palette-ink)',
  },
  healthy: {
    border: 'border-l-emerald-500',
    activeBackground: 'bg-emerald-50 dark:bg-emerald-500/10',
    activeText: 'text-emerald-600 dark:text-emerald-400',
    defaultText: 'text-(--palette-ink)',
  },
} as const;

// ─── Small chip ───────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  value: number | undefined;
  isLoading: boolean;
  bucket: keyof typeof BUCKET_CONFIG;
  isActive: boolean;
  onClick?: () => void;
}

function KpiChip({ label, value, isLoading, bucket, isActive, onClick }: ChipProps) {
  const cfg = BUCKET_CONFIG[bucket];
  const background = isActive ? cfg.activeBackground : 'bg-(--palette-surface)';
  const textColor = isActive ? cfg.activeText : 'text-(--palette-gray-600)';
  const borderColor = isActive
    ? cfg.border.replace('border-l-', 'border-')
    : 'border-(--palette-line)';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors select-none',
        background,
        textColor,
        borderColor,
        onClick ? 'cursor-pointer hover:bg-(--palette-surface-2)' : 'cursor-default',
      ].join(' ')}
    >
      {isLoading ? (
        <span className="bg-(--palette-line) animate-pulse h-3 w-5 rounded" />
      ) : (
        <span className="tabular-nums font-semibold">{value ?? 0}</span>
      )}
      <span>{label}</span>
    </button>
  );
}

// ─── Hero KPI (OLA tabs) ──────────────────────────────────────────────────────

interface HeroKpiProps {
  summary: MonitoringSummary;
  isLoading: boolean;
  onBucketClick?: (bucket: SlaBucket) => void;
  activeBuckets?: SlaBucket[];
}

function HeroKpi({ summary, isLoading, onBucketClick, activeBuckets = [] }: HeroKpiProps) {
  const { t } = useTranslation('monitoring');

  const total = summary.total ?? 0;
  const breached = summary.breached ?? 0;
  const atRisk = summary.atRisk ?? 0;
  const healthy = summary.healthy ?? 0;

  const pct = total > 0 ? Math.round((breached / total) * 100) : 0;
  const barWidth = total > 0 ? `${(breached / total) * 100}%` : '0%';

  const pctColor =
    pct >= 50
      ? 'text-(--palette-danger)'
      : pct >= 25
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400';

  const handleBreached = onBucketClick ? () => onBucketClick('breached') : undefined;
  const handleAtRisk = onBucketClick ? () => onBucketClick('atRisk') : undefined;
  const handleHealthy = onBucketClick ? () => onBucketClick('healthy') : undefined;

  return (
    <div className="shrink-0 mb-2 flex items-center gap-3 flex-wrap">
      {isLoading ? (
        <span className="bg-(--palette-surface-3) animate-pulse h-5 w-10 rounded" />
      ) : (
        <span className={`text-xl font-bold tabular-nums leading-none ${pctColor}`}>{pct}%</span>
      )}
      <span className="text-[11px] text-(--palette-gray-500) leading-none">
        {t('common.kpi.percentBreached')}
      </span>
      <div className="h-1 w-24 bg-(--palette-surface-3) rounded-full overflow-hidden">
        <div
          className="h-full bg-red-500 rounded-full transition-all duration-500"
          style={{ width: barWidth }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <KpiChip
          label={t('common.kpi.total')}
          value={total}
          isLoading={isLoading}
          bucket="total"
          isActive={!!onBucketClick && activeBuckets.length === 0}
          onClick={undefined}
        />
        <KpiChip
          label={t('common.kpi.breached')}
          value={breached}
          isLoading={isLoading}
          bucket="breached"
          isActive={activeBuckets.includes('breached')}
          onClick={handleBreached}
        />
        <KpiChip
          label={t('common.kpi.atRisk')}
          value={atRisk}
          isLoading={isLoading}
          bucket="atRisk"
          isActive={activeBuckets.includes('atRisk')}
          onClick={handleAtRisk}
        />
        <KpiChip
          label={t('common.kpi.healthy')}
          value={healthy}
          isLoading={isLoading}
          bucket="healthy"
          isActive={activeBuckets.includes('healthy')}
          onClick={handleHealthy}
        />
      </div>
    </div>
  );
}

// ─── Strip ────────────────────────────────────────────────────────────────────

interface MonitoringKpiStripProps {
  summary?: MonitoringSummary;
  isLoading: boolean;
  onBucketClick?: (bucket: SlaBucket) => void;
  activeBuckets?: SlaBucket[];
}

function MonitoringKpiStrip({
  summary,
  isLoading,
  onBucketClick,
  activeBuckets,
}: MonitoringKpiStripProps) {
  const { t } = useTranslation('monitoring');

  const hasOla =
    summary != null &&
    (summary.breached != null || summary.atRisk != null || summary.healthy != null);

  // OLA tabs → hero layout
  if (hasOla && summary != null) {
    return (
      <HeroKpi
        summary={summary}
        isLoading={isLoading}
        onBucketClick={onBucketClick}
        activeBuckets={activeBuckets}
      />
    );
  }

  // Non-OLA tabs → single compact Total chip (tab badge already shows the count)
  return (
    <div className="shrink-0 mb-2 flex items-center gap-2 flex-wrap">
      <KpiChip
        label={t('common.kpi.total')}
        value={summary?.total}
        isLoading={isLoading}
        bucket="total"
        isActive={false}
        onClick={undefined}
      />
    </div>
  );
}

export default MonitoringKpiStrip;
