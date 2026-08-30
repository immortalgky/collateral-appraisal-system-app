import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  format,
  startOfISOWeek,
  addDays,
  differenceInCalendarDays,
  eachMonthOfInterval,
  eachDayOfInterval,
} from 'date-fns';

import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import { Skeleton } from '@shared/components/Skeleton';
import WidgetWrapper from './WidgetWrapper';
import PeriodSelect from './PeriodSelect';
import SegmentSelect from './SegmentSelect';
import ChartTooltip from './ChartTooltip';
import WidgetError from './WidgetError';
import WidgetDateRangeBadge from './WidgetDateRangeBadge';
import { formatDistanceToNow } from 'date-fns';
import { useAppraisalCounts } from '../api';
import { useDashboardStore } from '../store';
import {
  getPresetRange,
  toIsoDate,
  fromIsoDate,
  type PeriodPresetKey,
} from '../utils/periodPresets';
import { computePace } from '../utils/computePace';
import { APPRAISAL_SEARCH_ROUTE } from '@shared/constants/search';

type DataPoint = {
  key: string; // ISO bucket key
  label: string; // display label
  created: number;
  completed: number;
  prevCreated: number; // last year / prior period
  bucketFrom: string; // ISO date range for drilldown
  bucketTo: string;
};

type WidgetMode = 'overview' | 'byType';
type MetricKey = 'created' | 'completed';

type TotalAppraisalsSettings = {
  period?: PeriodPresetKey;
  from?: string;
  to?: string;
  mode?: WidgetMode;
  metric?: MetricKey;
  bankingSegment?: string;
  hidden?: string[]; // series keys toggled off via the legend
};

const WIDGET_ID = 'total-appraisals';

const EMPTY_SETTINGS: TotalAppraisalsSettings = Object.freeze({}) as TotalAppraisalsSettings;

// Known appraisal types get a stable order + color and a translated label.
// Must match the backend AppraisalType values (Modules/Appraisal .../AppraisalTypes.cs).
// The actual set plotted is derived from the API response (see typeKeys) so any
// extra/legacy value still shows (as an "extra" series) rather than being silently
// dropped — otherwise the by-type totals would not reconcile with overview.
const APPRAISAL_TYPES = ['New', 'ReAppraisal', 'Progressive', 'PreAppraisal'] as const;
type AppraisalTypeKey = (typeof APPRAISAL_TYPES)[number];
const TYPE_COLORS: Record<AppraisalTypeKey, string> = {
  New: '#3b82f6',
  ReAppraisal: '#10b981',
  Progressive: '#f59e0b',
  PreAppraisal: '#8b5cf6',
};
// Colors for any type not in APPRAISAL_TYPES (assigned by position).
const EXTRA_TYPE_COLORS = ['#ec4899', '#14b8a6', '#a855f7', '#f97316', '#64748b'];

const isKnownType = (type: string): type is AppraisalTypeKey =>
  (APPRAISAL_TYPES as readonly string[]).includes(type);

type ByTypePoint = {
  key: string;
  label: string;
  bucketFrom: string;
  bucketTo: string;
  counts: Record<string, number>;
};

const getBackendPeriod = (granularity: 'day' | 'week' | 'month'): string =>
  granularity === 'day' ? 'daily' : granularity === 'week' ? 'daily' : 'monthly';

const bucketKeyForDate = (d: Date, granularity: 'day' | 'week' | 'month'): string => {
  if (granularity === 'day') return format(d, 'yyyy-MM-dd');
  if (granularity === 'week') return format(startOfISOWeek(d), 'yyyy-MM-dd');
  return format(d, 'yyyy-MM');
};

const parseApiPeriod = (period: string): Date | null => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return new Date(`${period}T00:00:00`);
  if (/^\d{4}-\d{2}$/.test(period)) return new Date(`${period}-01T00:00:00`);
  return null;
};

const buildBuckets = (
  from: Date,
  to: Date,
  granularity: 'day' | 'week' | 'month',
): Array<{ key: string; label: string; bucketFrom: Date; bucketTo: Date }> => {
  if (granularity === 'month') {
    return eachMonthOfInterval({ start: from, end: to }).map(m => {
      const last = new Date(m.getFullYear(), m.getMonth() + 1, 0);
      return {
        key: format(m, 'yyyy-MM'),
        label: format(m, 'MMM'),
        bucketFrom: m,
        bucketTo: last > to ? to : last,
      };
    });
  }
  if (granularity === 'day') {
    return eachDayOfInterval({ start: from, end: to }).map(d => ({
      key: format(d, 'yyyy-MM-dd'),
      label: format(d, 'd MMM'),
      bucketFrom: d,
      bucketTo: d,
    }));
  }
  // weekly: ISO weeks starting Monday
  const buckets: Array<{ key: string; label: string; bucketFrom: Date; bucketTo: Date }> = [];
  let cursor = startOfISOWeek(from);
  while (cursor <= to) {
    const weekEnd = addDays(cursor, 6);
    buckets.push({
      key: format(cursor, 'yyyy-MM-dd'),
      label: `W${format(cursor, 'I')}`,
      bucketFrom: cursor < from ? from : cursor,
      bucketTo: weekEnd > to ? to : weekEnd,
    });
    cursor = addDays(cursor, 7);
  }
  return buckets;
};

function TotalAppraisalsWidget() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const settings = useDashboardStore(
    s =>
      (s.widgets.find(w => w.id === WIDGET_ID)?.settings as TotalAppraisalsSettings | undefined) ??
      EMPTY_SETTINGS,
  );
  const updateSettings = useDashboardStore(s => s.updateWidgetSettings);
  const [expanded, setExpanded] = useState(false);
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
  const apiPeriod = getBackendPeriod(range.granularity);
  const mode: WidgetMode = settings.mode ?? 'overview';
  const metric: MetricKey = settings.metric ?? 'created';
  const bankingSegment = settings.bankingSegment;
  const isByType = mode === 'byType';

  const current = useAppraisalCounts(
    apiPeriod,
    toIsoDate(range.from),
    toIsoDate(range.to),
    false,
    bankingSegment,
    { enabled: !isByType },
  );
  const prior = useAppraisalCounts(
    apiPeriod,
    toIsoDate(range.prevFrom),
    toIsoDate(range.prevTo),
    false,
    bankingSegment,
    { enabled: !isByType },
  );
  const byType = useAppraisalCounts(
    apiPeriod,
    toIsoDate(range.from),
    toIsoDate(range.to),
    true,
    bankingSegment,
    { enabled: isByType },
  );
  const activeUpdatedAt = isByType ? byType.dataUpdatedAt : current.dataUpdatedAt;
  const updatedLabel = activeUpdatedAt
    ? formatDistanceToNow(activeUpdatedAt, { addSuffix: false })
    : null;

  const data: DataPoint[] = useMemo(() => {
    const buckets = buildBuckets(range.from, range.to, range.granularity);
    const currentMap = new Map<string, { created: number; completed: number }>();
    const priorMap = new Map<string, number>();

    for (const item of current.data?.items ?? []) {
      if (!item.period) continue;
      const d = parseApiPeriod(item.period);
      if (!d) continue;
      const k = bucketKeyForDate(d, range.granularity);
      const existing = currentMap.get(k) ?? { created: 0, completed: 0 };
      existing.created += item.createdCount;
      existing.completed += item.completedCount;
      currentMap.set(k, existing);
    }

    // For prior period comparison, align by bucket-index (not calendar key).
    const priorBuckets = buildBuckets(range.prevFrom, range.prevTo, range.granularity);
    const priorKeys: string[] = [];
    for (const item of prior.data?.items ?? []) {
      if (!item.period) continue;
      const d = parseApiPeriod(item.period);
      if (!d) continue;
      const k = bucketKeyForDate(d, range.granularity);
      priorMap.set(k, (priorMap.get(k) ?? 0) + item.createdCount);
    }
    for (const b of priorBuckets) priorKeys.push(b.key);

    return buckets.map((b, idx) => {
      const c = currentMap.get(b.key) ?? { created: 0, completed: 0 };
      const priorKey = priorKeys[idx];
      const prevCreated = priorKey ? (priorMap.get(priorKey) ?? 0) : 0;
      return {
        key: b.key,
        label: b.label,
        created: c.created,
        completed: c.completed,
        prevCreated,
        bucketFrom: toIsoDate(b.bucketFrom),
        bucketTo: toIsoDate(b.bucketTo),
      };
    });
  }, [current.data, prior.data, range]);

  const totals = useMemo(() => {
    const created = data.reduce((s, d) => s + d.created, 0);
    const completed = data.reduce((s, d) => s + d.completed, 0);
    const prevCreated = data.reduce((s, d) => s + d.prevCreated, 0);
    const prevCompleted = (prior.data?.items ?? []).reduce((s, i) => s + i.completedCount, 0);
    const completionRate = created > 0 ? (completed / created) * 100 : 0;
    const prevCompletionRate = prevCreated > 0 ? (prevCompleted / prevCreated) * 100 : 0;
    return {
      created,
      completed,
      prevCreated,
      prevCompleted,
      completionRate,
      completionRateDeltaPp: completionRate - prevCompletionRate,
      createdYoY:
        prevCreated > 0 ? ((created - prevCreated) / prevCreated) * 100 : created > 0 ? 100 : 0,
      completedYoY:
        prevCompleted > 0
          ? ((completed - prevCompleted) / prevCompleted) * 100
          : completed > 0
            ? 100
            : 0,
    };
  }, [data, prior.data]);

  const pace = useMemo(
    () =>
      computePace({
        currentTotal: totals.created,
        rangeStart: range.from,
        rangeEnd: range.to,
        today,
      }),
    [totals.created, range.from, range.to, today],
  );

  // Series to plot: the four known types (stable order) plus any extra/legacy
  // AppraisalType returned by the API, so by-type totals always reconcile with
  // overview instead of silently dropping unknown values.
  const typeKeys = useMemo(() => {
    const extra: string[] = [];
    for (const item of byType.data?.items ?? []) {
      const type = item.appraisalType;
      if (type && !isKnownType(type) && !extra.includes(type)) extra.push(type);
    }
    extra.sort();
    return [...APPRAISAL_TYPES, ...extra];
  }, [byType.data]);

  const byTypeData: ByTypePoint[] = useMemo(() => {
    const buckets = buildBuckets(range.from, range.to, range.granularity);
    const map = new Map<string, Record<string, number>>();
    for (const item of byType.data?.items ?? []) {
      if (!item.period || !item.appraisalType) continue;
      const d = parseApiPeriod(item.period);
      if (!d) continue;
      const k = bucketKeyForDate(d, range.granularity);
      const row = map.get(k) ?? {};
      const value = metric === 'created' ? item.createdCount : item.completedCount;
      row[item.appraisalType] = (row[item.appraisalType] ?? 0) + value;
      map.set(k, row);
    }
    return buckets.map(b => {
      const row = map.get(b.key) ?? {};
      const counts: Record<string, number> = {};
      for (const type of typeKeys) counts[type] = row[type] ?? 0;
      return {
        key: b.key,
        label: b.label,
        bucketFrom: toIsoDate(b.bucketFrom),
        bucketTo: toIsoDate(b.bucketTo),
        counts,
      };
    });
  }, [byType.data, range, metric, typeKeys]);

  const byTypeTotals = useMemo(() => {
    const totals: Record<string, number> = Object.fromEntries(typeKeys.map(type => [type, 0]));
    for (const point of byTypeData) {
      for (const type of typeKeys) totals[type] += point.counts[type];
    }
    return totals;
  }, [byTypeData, typeKeys]);

  const typeColor = (type: string, idx: number): string =>
    isKnownType(type) ? TYPE_COLORS[type] : EXTRA_TYPE_COLORS[idx % EXTRA_TYPE_COLORS.length];
  const typeLabel = (type: string): string =>
    isKnownType(type) ? t(`totalAppraisals.types.${type}`) : type;

  // Legend-driven series hiding. Overview and by-type use distinct, stable keys
  // (prevCreated/created/completed vs. appraisal-type names) so one persisted set serves both.
  const hidden = useMemo(() => new Set(settings.hidden ?? []), [settings.hidden]);
  const toggleSeries = (key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateSettings(WIDGET_ID, { hidden: Array.from(next) } as TotalAppraisalsSettings);
  };

  const overviewSeries = [
    { key: 'prevCreated', color: '#f59e0b', label: t('totalAppraisals.chart.prevPeriod') },
    { key: 'created', color: '#3b82f6', label: t('totalAppraisals.chart.created') },
    { key: 'completed', color: '#10b981', label: t('totalAppraisals.chart.completed') },
  ];
  const byTypeSeries = typeKeys.map((type, idx) => ({
    key: type,
    color: typeColor(type, idx),
    label: typeLabel(type),
  }));

  // Clickable legend (recharts `content`) — stays inside the chart so it also shows in
  // the expanded modal; items remain visible when hidden so they can be toggled back.
  const renderLineLegend = (series: { key: string; color: string; label: string }[]) => (
    <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
      {series.map(s => {
        const isHidden = hidden.has(s.key);
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => toggleSeries(s.key)}
            aria-pressed={!isHidden}
            aria-label={t('totalAppraisals.aria.toggleSeries', { label: s.label })}
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
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  const isLoading = isByType ? byType.isLoading : current.isLoading || prior.isLoading;
  const isError = isByType ? byType.isError : current.isError || prior.isError;

  const handlePeriodChange = (key: PeriodPresetKey, custom?: { from: Date; to: Date }) => {
    updateSettings(WIDGET_ID, {
      period: key,
      from: custom ? toIsoDate(custom.from) : undefined,
      to: custom ? toIsoDate(custom.to) : undefined,
    } as TotalAppraisalsSettings);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'appraisal-counts'] });
    setMenuOpen(false);
  };

  const handleReset = () => {
    updateSettings(WIDGET_ID, {
      period: undefined,
      from: undefined,
      to: undefined,
      mode: undefined,
      metric: undefined,
      bankingSegment: undefined,
      hidden: undefined, // restore legend series toggled off, so reset is a true default view
    });
    setMenuOpen(false);
  };

  const handleModeChange = (next: WidgetMode) => {
    updateSettings(WIDGET_ID, { mode: next } as TotalAppraisalsSettings);
  };

  const handleMetricChange = (next: MetricKey) => {
    updateSettings(WIDGET_ID, { metric: next } as TotalAppraisalsSettings);
  };

  const handleSegmentChange = (segment?: string) => {
    updateSettings(WIDGET_ID, { bankingSegment: segment } as TotalAppraisalsSettings);
  };

  const navigateToBucket = (bucketFrom?: string, bucketTo?: string) => {
    if (!bucketFrom || !bucketTo) return;
    const params = new URLSearchParams({ createdFrom: bucketFrom, createdTo: bucketTo });
    // Close expand modal before navigating so it doesn't sit open behind the new route.
    setExpanded(false);
    navigate(`${APPRAISAL_SEARCH_ROUTE}?${params}`);
  };

  const handleDotClick = (point: DataPoint | undefined) => {
    if (!point) return;
    navigateToBucket(point.bucketFrom, point.bucketTo);
  };

  const renderKpi = (
    label: string,
    value: number | string,
    deltaPct: number | null,
    isPp = false,
  ) => {
    const up = (deltaPct ?? 0) >= 0;
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-bold text-gray-800 tabular-nums">{value}</p>
          {deltaPct !== null && (
            <div
              className={`flex items-center gap-0.5 text-xs font-medium mb-1 ${up ? 'text-emerald-500' : 'text-red-500'}`}
            >
              <Icon name={up ? 'arrow-up' : 'arrow-down'} style="solid" className="size-3" />
              <span>
                {Math.abs(deltaPct).toFixed(1)}
                {isPp ? 'pp' : '%'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const chartContent = (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
        onClick={state => {
          const idx = state?.activeIndex;
          if (typeof idx === 'number' && data[idx]) handleDotClick(data[idx]);
        }}
      >
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip cursor={{ stroke: '#e5e7eb' }} content={<ChartTooltip />} />
        <Legend content={() => renderLineLegend(overviewSeries)} />
        <Line
          type="monotone"
          dataKey="prevCreated"
          name={t('totalAppraisals.chart.prevPeriod')}
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
          hide={hidden.has('prevCreated')}
        />
        <Line
          type="monotone"
          dataKey="created"
          name={t('totalAppraisals.chart.created')}
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#3b82f6' }}
          activeDot={{ r: 5, cursor: 'pointer' }}
          hide={hidden.has('created')}
        />
        <Line
          type="monotone"
          dataKey="completed"
          name={t('totalAppraisals.chart.completed')}
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#10b981' }}
          activeDot={{ r: 5, cursor: 'pointer' }}
          hide={hidden.has('completed')}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const byTypeChartContent = (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={byTypeData}
        margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
        onClick={state => {
          const idx = state?.activeIndex;
          if (typeof idx === 'number' && byTypeData[idx]) {
            const p = byTypeData[idx];
            navigateToBucket(p.bucketFrom, p.bucketTo);
          }
        }}
      >
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} />
        <Tooltip cursor={{ stroke: '#e5e7eb' }} content={<ChartTooltip />} />
        <Legend content={() => renderLineLegend(byTypeSeries)} />
        {typeKeys.map((type, idx) => (
          <Line
            key={type}
            type="monotone"
            dataKey={(p: ByTypePoint) => p.counts[type]}
            name={typeLabel(type)}
            stroke={typeColor(type, idx)}
            strokeWidth={2}
            dot={{ r: 2, fill: typeColor(type, idx) }}
            activeDot={{ r: 5, cursor: 'pointer' }}
            hide={hidden.has(type)}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );

  return (
    <WidgetWrapper id={WIDGET_ID}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-800">{t('totalAppraisals.title')}</h3>
              <PeriodSelect value={presetKey} custom={customRange} onChange={handlePeriodChange} />
              <SegmentSelect value={bankingSegment} onChange={handleSegmentChange} />
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs">
                {(['overview', 'byType'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModeChange(m)}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      mode === m
                        ? 'bg-gray-100 text-gray-800 font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t(`totalAppraisals.mode.${m}`)}
                  </button>
                ))}
              </div>
              {isByType && (
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs">
                  {(['created', 'completed'] as const).map(mk => (
                    <button
                      key={mk}
                      type="button"
                      onClick={() => handleMetricChange(mk)}
                      className={`px-2 py-1 rounded-md transition-colors ${
                        metric === mk
                          ? 'bg-gray-100 text-gray-800 font-medium'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t(`totalAppraisals.metric.${mk}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <WidgetDateRangeBadge from={range.from} to={range.to} />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={t('totalAppraisals.aria.expand')}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Icon name="expand" style="solid" className="size-4" />
            </button>
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                aria-label={t('totalAppraisals.aria.menu')}
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
                    {t('totalAppraisals.menu.refresh')}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Icon name="rotate-left" style="solid" className="size-3 text-gray-400" />
                    {t('totalAppraisals.menu.reset')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {isError ? (
            <WidgetError
              message={t('totalAppraisals.error')}
              onRetry={() => {
                current.refetch();
                prior.refetch();
              }}
            />
          ) : isLoading ? (
            <div className="space-y-4">
              <div className="flex gap-8">
                <Skeleton variant="text" width={90} height={44} />
                <Skeleton variant="text" width={90} height={44} />
                <Skeleton variant="text" width={90} height={44} />
              </div>
              <Skeleton variant="rectangular" height={220} />
            </div>
          ) : (
            <>
              {isByType ? (
                <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
                  {typeKeys.map((type, idx) => (
                    <div key={type} className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: typeColor(type, idx) }}
                      />
                      <span className="text-xs text-gray-500">{typeLabel(type)}</span>
                      <span className="text-sm font-semibold text-gray-800 tabular-nums">
                        {byTypeTotals[type].toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {renderKpi(
                    t('totalAppraisals.kpi.created'),
                    totals.created.toLocaleString(),
                    totals.createdYoY,
                  )}
                  {renderKpi(
                    t('totalAppraisals.kpi.completed'),
                    totals.completed.toLocaleString(),
                    totals.completedYoY,
                  )}
                  {renderKpi(
                    t('totalAppraisals.kpi.completionRate'),
                    `${totals.completionRate.toFixed(1)}%`,
                    totals.completionRateDeltaPp,
                    true,
                  )}
                </div>
              )}

              {pace.isFutureRange && totals.created > 0 && (
                <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                  <Icon name="forward" style="solid" className="size-3 text-gray-400" />
                  <span>
                    {t('totalAppraisals.pace')}{' '}
                    <span className="font-medium text-gray-700 tabular-nums">
                      {pace.projectedTotal.toLocaleString()}
                    </span>{' '}
                    {t('totalAppraisals.paceByPeriodEnd')}
                    {totals.prevCreated > 0 && (
                      <>
                        {' '}
                        <span
                          className={
                            pace.projectedTotal >= totals.prevCreated
                              ? 'text-emerald-600'
                              : 'text-red-500'
                          }
                        >
                          ({pace.projectedTotal >= totals.prevCreated ? '+' : ''}
                          {(pace.projectedTotal - totals.prevCreated).toLocaleString()}{' '}
                          {t('totalAppraisals.paceVsPrior')})
                        </span>
                      </>
                    )}
                  </span>
                </div>
              )}

              <div className="h-56">
                {isByType ? (
                  byTypeData.every(p => typeKeys.every(type => p.counts[type] === 0)) ? (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">
                      {t('totalAppraisals.noData')}
                    </div>
                  ) : (
                    byTypeChartContent
                  )
                ) : data.every(d => d.created === 0 && d.completed === 0) ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    {t('totalAppraisals.noData')}
                  </div>
                ) : (
                  chartContent
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={expanded}
        onClose={() => setExpanded(false)}
        title={t('totalAppraisals.detailedView')}
        size="2xl"
      >
        <div className="space-y-4">
          <div className="h-80">{isByType ? byTypeChartContent : chartContent}</div>
          <div className="overflow-auto max-h-72 border border-gray-100 rounded-lg">
            {isByType ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('totalAppraisals.table.period')}</th>
                    {typeKeys.map(type => (
                      <th key={type} className="px-3 py-2 text-right">
                        {typeLabel(type)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byTypeData.map(p => (
                    <tr key={p.key} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{p.label}</td>
                      {typeKeys.map(type => (
                        <td key={type} className="px-3 py-2 text-right tabular-nums">
                          {p.counts[type]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">{t('totalAppraisals.table.period')}</th>
                    <th className="px-3 py-2 text-right">{t('totalAppraisals.table.created')}</th>
                    <th className="px-3 py-2 text-right">{t('totalAppraisals.table.completed')}</th>
                    <th className="px-3 py-2 text-right">
                      {t('totalAppraisals.table.completionPct')}
                    </th>
                    <th className="px-3 py-2 text-right">{t('totalAppraisals.table.prior')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map(d => {
                    const rate = d.created > 0 ? (d.completed / d.created) * 100 : 0;
                    return (
                      <tr key={d.key} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700">{d.label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{d.created}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{d.completed}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                          {rate.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-400">
                          {d.prevCreated}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {t('totalAppraisals.table.period')}: {format(range.from, 'd MMM yyyy')} –{' '}
            {format(range.to, 'd MMM yyyy')}
            {' · '}
            {data.length} bucket{data.length === 1 ? '' : 's'}
            {' · '}
            {differenceInCalendarDays(range.to, range.from) + 1} days
          </p>
        </div>
      </Modal>
    </WidgetWrapper>
  );
}

export default TotalAppraisalsWidget;
