import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { formatDistanceToNow } from 'date-fns';
import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import WidgetWrapper from './WidgetWrapper';
import PeriodSelect from './PeriodSelect';
import WidgetError from './WidgetError';
import WidgetDateRangeBadge from './WidgetDateRangeBadge';
import { useCompanyAppraisalSummary } from '../api';
import { useDashboardStore } from '../store';
import {
  getPresetRange,
  toIsoDate,
  fromIsoDate,
  type PeriodPresetKey,
} from '../utils/periodPresets';

const WIDGET_ID = 'external-task-summary';

type ExternalTaskSettings = {
  period?: PeriodPresetKey;
  from?: string;
  to?: string;
  companyId?: string;
  hidden?: string[]; // segment keys toggled off via the legend
};

const EMPTY_SETTINGS: ExternalTaskSettings = Object.freeze({}) as ExternalTaskSettings;

type Row = {
  companyId: string;
  name: string;
  assigned: number;
  overdue: number;
  inProgress: number;
  completed: number;
};

// Backend fallback label for an AssigneeCompanyId with no auth.Companies match
// (COALESCE(..., N'(pending)') in the summary query).
const PENDING = '(pending)';

const SEGMENT_COLORS = {
  overdue: '#ef4444',
  inProgress: '#3b82f6',
  completed: '#10b981',
} as const;

type SeriesKey = 'overdue' | 'inProgress' | 'completed';

// Render/legend order. `bar` is the (possibly zeroed-when-hidden) key the chart plots.
const SERIES = [
  { key: 'overdue', bar: 'barOverdue', color: SEGMENT_COLORS.overdue, labelKey: 'externalSummary.chart.overdue' },
  { key: 'inProgress', bar: 'barInProgress', color: SEGMENT_COLORS.inProgress, labelKey: 'externalSummary.chart.inProgress' },
  { key: 'completed', bar: 'barCompleted', color: SEGMENT_COLORS.completed, labelKey: 'externalSummary.chart.completed' },
] as const;

// Row augmented with per-segment bar values (0 when that series is hidden) and their sum.
type ChartRow = Row & {
  barOverdue: number;
  barInProgress: number;
  barCompleted: number;
  visible: number;
};

type SummaryTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
};

function SummaryTooltip({ active, payload }: SummaryTooltipProps) {
  const { t } = useTranslation('dashboard');
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  // Only the currently-visible (non-hidden, non-zero) segments; total matches the bar.
  const segments = [
    { color: SEGMENT_COLORS.overdue, label: t('externalSummary.chart.overdue'), value: row.barOverdue },
    { color: SEGMENT_COLORS.inProgress, label: t('externalSummary.chart.inProgress'), value: row.barInProgress },
    { color: SEGMENT_COLORS.completed, label: t('externalSummary.chart.completed'), value: row.barCompleted },
  ].filter(s => s.value > 0);
  const pct = row.visible > 0 ? Math.round((row.barCompleted / row.visible) * 100) : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm px-3 py-2 text-xs min-w-[168px]">
      <p className="font-semibold text-gray-800 mb-1.5">{row.name}</p>
      <div className="space-y-1">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600">{s.label}</span>
            <span className="ml-auto font-medium text-gray-800 tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center gap-2">
        <span className="text-gray-600">{t('externalSummary.chart.assigned')}</span>
        <span className="ml-auto font-semibold text-gray-800 tabular-nums">{row.visible}</span>
      </div>
      {row.barCompleted > 0 && (
        <p className="text-gray-400 mt-0.5">{t('externalSummary.chart.delivered', { pct })}</p>
      )}
    </div>
  );
}

function ExternalTaskSummaryWidget() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const settings = useDashboardStore(
    s =>
      (s.widgets.find(w => w.id === WIDGET_ID)?.settings as ExternalTaskSettings | undefined) ??
      EMPTY_SETTINGS,
  );
  const updateSettings = useDashboardStore(s => s.updateWidgetSettings);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const today = useMemo(() => new Date(), []);
  const presetKey = settings.period ?? 'YTD';
  const customRange = useMemo(
    () =>
      settings.from && settings.to
        ? { from: fromIsoDate(settings.from), to: fromIsoDate(settings.to) }
        : undefined,
    [settings.from, settings.to],
  );
  const range = useMemo(
    () => getPresetRange(presetKey, today, customRange),
    [presetKey, today, customRange],
  );

  const { data, isLoading, isError, refetch, dataUpdatedAt } = useCompanyAppraisalSummary({
    from: toIsoDate(range.from),
    to: toIsoDate(range.to),
  });
  const updatedLabel = dataUpdatedAt
    ? formatDistanceToNow(dataUpdatedAt, { addSuffix: false })
    : null;

  // Named companies (sorted by volume). Companies the backend couldn't resolve
  // (name === PENDING) are excluded here and rolled up into a single Unknown row below.
  const namedRows: Row[] = useMemo(() => {
    return (data?.items ?? [])
      .filter(item => item.companyName && item.companyName !== PENDING)
      .map(item => ({
        companyId: item.companyId,
        name: item.companyName,
        // buckets are mutually exclusive and sum to assigned (server-computed live)
        assigned: item.assignedCount,
        overdue: item.overdueCount,
        inProgress: item.inProgressCount,
        completed: item.completedCount,
      }))
      .sort((a, b) => b.assigned - a.assigned);
  }, [data]);

  // One de-emphasized aggregate row (companyId '' = sentinel: non-clickable, greyed).
  const allRows: Row[] = useMemo(() => {
    const pending = (data?.items ?? []).filter(
      item => !item.companyName || item.companyName === PENDING,
    );
    if (pending.length === 0) return namedRows;
    const unknown: Row = {
      companyId: '',
      name: t('externalSummary.unknownCompany', { count: pending.length }),
      assigned: pending.reduce((s, i) => s + i.assignedCount, 0),
      overdue: pending.reduce((s, i) => s + i.overdueCount, 0),
      inProgress: pending.reduce((s, i) => s + i.inProgressCount, 0),
      completed: pending.reduce((s, i) => s + i.completedCount, 0),
    };
    return [...namedRows, unknown];
  }, [data, namedRows, t]);

  const hidden = useMemo(() => new Set(settings.hidden ?? []), [settings.hidden]);

  const toggleSeries = (key: SeriesKey) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateSettings(WIDGET_ID, { hidden: Array.from(next) } as ExternalTaskSettings);
  };

  // Zero out hidden segments, then sort by the visible sum (desc) so the ranking follows
  // whatever series are currently shown. The Unknown aggregate stays pinned to the bottom.
  const rows: ChartRow[] = useMemo(() => {
    const filtered = settings.companyId
      ? allRows.filter(r => r.companyId === settings.companyId)
      : allRows;
    return filtered
      .map(r => {
        const barOverdue = hidden.has('overdue') ? 0 : r.overdue;
        const barInProgress = hidden.has('inProgress') ? 0 : r.inProgress;
        const barCompleted = hidden.has('completed') ? 0 : r.completed;
        return {
          ...r,
          barOverdue,
          barInProgress,
          barCompleted,
          visible: barOverdue + barInProgress + barCompleted,
        };
      })
      .sort((a, b) => {
        if (!a.companyId !== !b.companyId) return a.companyId ? -1 : 1;
        return b.visible - a.visible;
      });
  }, [allRows, settings.companyId, hidden]);

  const handlePeriodChange = (key: PeriodPresetKey, custom?: { from: Date; to: Date }) => {
    updateSettings(WIDGET_ID, {
      period: key,
      from: custom ? toIsoDate(custom.from) : undefined,
      to: custom ? toIsoDate(custom.to) : undefined,
    } as ExternalTaskSettings);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'company-appraisal-summary'] });
    setMenuOpen(false);
  };

  const handleReset = () => {
    updateSettings(WIDGET_ID, {
      period: undefined,
      from: undefined,
      to: undefined,
      companyId: undefined,
      hidden: undefined, // restore legend series toggled off, so reset is a true default view
    });
    setMenuOpen(false);
  };

  const drillDown = (companyId: string) => {
    const params = new URLSearchParams({
      assigneeCompanyId: companyId,
      createdFrom: toIsoDate(range.from),
      createdTo: toIsoDate(range.to),
    });
    navigate(`/appraisals/list?${params}`);
  };

  const chartHeight = Math.max(200, rows.length * 36);

  return (
    <WidgetWrapper id={WIDGET_ID}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-800">{t('externalSummary.title')}</h3>
              <PeriodSelect value={presetKey} custom={customRange} onChange={handlePeriodChange} />
            </div>
            <WidgetDateRangeBadge from={range.from} to={range.to} />
          </div>
          <div className="flex items-center gap-2">
            {namedRows.length > 0 && (
              <select
                value={settings.companyId ?? ''}
                onChange={e =>
                  updateSettings(WIDGET_ID, { companyId: e.target.value || undefined })
                }
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[160px]"
                aria-label={t('externalSummary.aria.filterByCompany')}
              >
                <option value="">{t('externalSummary.allCompanies')}</option>
                {namedRows.map(r => (
                  <option key={r.companyId} value={r.companyId}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                aria-label={t('externalSummary.aria.menu')}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <Icon name="ellipsis-vertical" style="solid" className="size-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-sm">
                  {updatedLabel && (
                    <p className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100">
                      {t('updatedAgo', { n: updatedLabel })}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Icon
                      name="arrow-rotate-right"
                      style="solid"
                      className="size-3 text-gray-400"
                    />
                    {t('externalSummary.menu.refresh')}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Icon name="rotate-left" style="solid" className="size-3 text-gray-400" />
                    {t('externalSummary.menu.reset')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {isError ? (
            <WidgetError message={t('externalSummary.error')} onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={24} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {t('externalSummary.noData')}
              {settings.companyId && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => updateSettings(WIDGET_ID, { companyId: undefined })}
                  >
                    {t('externalSummary.clearCompanyFilter')}
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-2">{t('externalSummary.clickBarHint')}</p>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 0, bottom: 0 }}
                  barCategoryGap={8}
                >
                  <CartesianGrid horizontal={false} stroke="#f3f4f6" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={118}
                    tick={{ fontSize: 12, fill: '#4b5563' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} content={<SummaryTooltip />} />
                  {/* Single stack whose total length == the visible sum. Segments are
                      mutually exclusive; overdue anchors at the axis origin so every company
                      shares a baseline, then in-progress, then completed. Hidden series are
                      zeroed (bar* keys). The Unknown aggregate (companyId '') is greyed via
                      per-row Cell opacity and is not clickable. `completed` carries the total
                      label at the stack's right end (minPointSize keeps the cap present even
                      when its value is 0; the cap is made invisible in that case). */}
                  <Bar
                    dataKey="barOverdue"
                    stackId="assigned"
                    fill={SEGMENT_COLORS.overdue}
                    cursor="pointer"
                    onClick={data => {
                      const row = (data as { payload?: ChartRow }).payload;
                      if (row?.companyId) drillDown(row.companyId);
                    }}
                  >
                    {rows.map(r => (
                      <Cell
                        key={r.companyId || r.name}
                        fill={SEGMENT_COLORS.overdue}
                        fillOpacity={r.companyId ? 1 : 0.35}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="barInProgress"
                    stackId="assigned"
                    fill={SEGMENT_COLORS.inProgress}
                    cursor="pointer"
                    onClick={data => {
                      const row = (data as { payload?: ChartRow }).payload;
                      if (row?.companyId) drillDown(row.companyId);
                    }}
                  >
                    {rows.map(r => (
                      <Cell
                        key={r.companyId || r.name}
                        fill={SEGMENT_COLORS.inProgress}
                        fillOpacity={r.companyId ? 1 : 0.35}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="barCompleted"
                    stackId="assigned"
                    fill={SEGMENT_COLORS.completed}
                    cursor="pointer"
                    minPointSize={2}
                    onClick={data => {
                      const row = (data as { payload?: ChartRow }).payload;
                      if (row?.companyId) drillDown(row.companyId);
                    }}
                  >
                    {rows.map(r => (
                      <Cell
                        key={r.companyId || r.name}
                        fill={SEGMENT_COLORS.completed}
                        fillOpacity={r.barCompleted === 0 ? 0 : r.companyId ? 1 : 0.35}
                      />
                    ))}
                    <LabelList
                      dataKey="visible"
                      position="right"
                      style={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Clickable legend — toggle a series off to drop it from the bars and
                  re-rank companies by the remaining (visible) total. */}
              <div className="flex items-center justify-center gap-4 pt-3 flex-wrap">
                {SERIES.map(s => {
                  const isHidden = hidden.has(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSeries(s.key)}
                      aria-pressed={!isHidden}
                      aria-label={t('externalSummary.aria.toggleSeries', { label: t(s.labelKey) })}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: isHidden ? 'transparent' : s.color,
                          boxShadow: `inset 0 0 0 2px ${s.color}`,
                        }}
                      />
                      <span className={isHidden ? 'text-gray-400 line-through' : 'text-gray-600'}>
                        {t(s.labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default ExternalTaskSummaryWidget;
