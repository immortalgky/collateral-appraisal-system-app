import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import WidgetError from './WidgetError';
import { useAppraisalCounts } from '../api';
import { useDashboardStore } from '../store';
import {
  getPresetRange,
  toIsoDate,
  fromIsoDate,
  type PeriodPresetKey,
} from '../utils/periodPresets';
import { computePace } from '../utils/computePace';

type DataPoint = {
  key: string; // ISO bucket key
  label: string; // display label
  created: number;
  completed: number;
  prevCreated: number; // last year / prior period
  bucketFrom: string; // ISO date range for drilldown
  bucketTo: string;
};

type TotalAppraisalsSettings = {
  period?: PeriodPresetKey;
  from?: string;
  to?: string;
};

const WIDGET_ID = 'total-appraisals';

const EMPTY_SETTINGS: TotalAppraisalsSettings = Object.freeze({}) as TotalAppraisalsSettings;

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

  const current = useAppraisalCounts(apiPeriod, toIsoDate(range.from), toIsoDate(range.to));
  const prior = useAppraisalCounts(apiPeriod, toIsoDate(range.prevFrom), toIsoDate(range.prevTo));

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

  const isLoading = current.isLoading || prior.isLoading;
  const isError = current.isError || prior.isError;

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
    updateSettings(WIDGET_ID, { period: undefined, from: undefined, to: undefined });
    setMenuOpen(false);
  };

  const handleDotClick = (point: DataPoint | undefined) => {
    if (!point) return;
    const params = new URLSearchParams({
      createdFrom: point.bucketFrom,
      createdTo: point.bucketTo,
    });
    // Close expand modal before navigating so it doesn't sit open behind the new route.
    setExpanded(false);
    navigate(`/appraisals/list?${params}`);
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
        <Tooltip
          cursor={{ stroke: '#e5e7eb' }}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 12,
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line
          type="monotone"
          dataKey="prevCreated"
          name="Prior period"
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
        />
        <Line
          type="monotone"
          dataKey="created"
          name="Created"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#3b82f6' }}
          activeDot={{ r: 5, cursor: 'pointer' }}
        />
        <Line
          type="monotone"
          dataKey="completed"
          name="Completed"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#10b981' }}
          activeDot={{ r: 5, cursor: 'pointer' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  return (
    <WidgetWrapper id={WIDGET_ID}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800">Total Appraisals</h3>
            <PeriodSelect value={presetKey} custom={customRange} onChange={handlePeriodChange} />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label="Expand widget"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Icon name="expand" style="solid" className="size-4" />
            </button>
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Widget menu"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <Icon name="ellipsis-vertical" style="solid" className="size-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-sm">
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
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Icon name="rotate-left" style="solid" className="size-3 text-gray-400" />
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {isError ? (
            <WidgetError
              message="Unable to load appraisal trends"
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
              <div className="grid grid-cols-3 gap-4 mb-4">
                {renderKpi('Created', totals.created.toLocaleString(), totals.createdYoY)}
                {renderKpi('Completed', totals.completed.toLocaleString(), totals.completedYoY)}
                {renderKpi(
                  'Completion rate',
                  `${totals.completionRate.toFixed(1)}%`,
                  totals.completionRateDeltaPp,
                  true,
                )}
              </div>

              {pace.isFutureRange && totals.created > 0 && (
                <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                  <Icon name="forward" style="solid" className="size-3 text-gray-400" />
                  <span>
                    At current pace:{' '}
                    <span className="font-medium text-gray-700 tabular-nums">
                      {pace.projectedTotal.toLocaleString()}
                    </span>{' '}
                    by period end
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
                          {(pace.projectedTotal - totals.prevCreated).toLocaleString()} vs prior)
                        </span>
                      </>
                    )}
                  </span>
                </div>
              )}

              <div className="h-56">
                {data.every(d => d.created === 0 && d.completed === 0) ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    No appraisals in this range
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
        title="Total Appraisals — Detailed view"
        size="2xl"
      >
        <div className="space-y-4">
          <div className="h-80">{chartContent}</div>
          <div className="overflow-auto max-h-72 border border-gray-100 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-right">Created</th>
                  <th className="px-3 py-2 text-right">Completed</th>
                  <th className="px-3 py-2 text-right">Completion %</th>
                  <th className="px-3 py-2 text-right">Prior</th>
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
          </div>
          <p className="text-xs text-gray-500">
            Range: {format(range.from, 'd MMM yyyy')} – {format(range.to, 'd MMM yyyy')}
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
