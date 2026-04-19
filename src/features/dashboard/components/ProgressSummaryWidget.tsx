import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import WidgetWrapper from './WidgetWrapper';
import PeriodSelect from './PeriodSelect';
import WidgetError from './WidgetError';
import { useAppraisalStatusSummary, type AppraisalStatusSummaryFilters } from '../api';
import { useDashboardStore } from '../store';
import {
  getPresetRange,
  toIsoDate,
  fromIsoDate,
  type PeriodPresetKey,
} from '../utils/periodPresets';

const WIDGET_ID = 'progress-summary';

const STATUS_ORDER = ['Pending', 'InProgress', 'UnderReview', 'Completed', 'Cancelled'] as const;
type StatusKey = (typeof STATUS_ORDER)[number];

const STATUS_LABELS: Record<StatusKey, string> = {
  Pending: 'Pending',
  InProgress: 'In Progress',
  UnderReview: 'Under Review',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<StatusKey, string> = {
  Pending: '#6b7280',
  InProgress: '#3b82f6',
  UnderReview: '#f59e0b',
  Completed: '#10b981',
  Cancelled: '#ef4444',
};

type ProgressSettings = {
  period?: PeriodPresetKey;
  from?: string;
  to?: string;
  assigneeId?: string;
  bankingSegment?: string;
  compare?: boolean;
  hiddenStatuses?: StatusKey[];
};

const EMPTY_SETTINGS: ProgressSettings = Object.freeze({}) as ProgressSettings;

function ProgressSummaryWidget() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const settings = useDashboardStore(
    s =>
      (s.widgets.find(w => w.id === WIDGET_ID)?.settings as ProgressSettings | undefined) ??
      EMPTY_SETTINGS,
  );
  const updateSettings = useDashboardStore(s => s.updateWidgetSettings);

  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  const [assigneeInput, setAssigneeInput] = useState(settings.assigneeId ?? '');
  const [bankingInput, setBankingInput] = useState(settings.bankingSegment ?? '');

  useEffect(() => {
    setAssigneeInput(settings.assigneeId ?? '');
    setBankingInput(settings.bankingSegment ?? '');
  }, [settings.assigneeId, settings.bankingSegment]);

  useEffect(() => {
    if (!menuOpen && !filtersOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (filtersOpen && filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, filtersOpen]);

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

  const baseFilters: AppraisalStatusSummaryFilters = useMemo(
    () => ({
      from: toIsoDate(range.from),
      to: toIsoDate(range.to),
      assigneeId: settings.assigneeId || undefined,
      bankingSegment: settings.bankingSegment || undefined,
    }),
    [range.from, range.to, settings.assigneeId, settings.bankingSegment],
  );
  const priorFilters: AppraisalStatusSummaryFilters = useMemo(
    () => ({
      ...baseFilters,
      from: toIsoDate(range.prevFrom),
      to: toIsoDate(range.prevTo),
    }),
    [baseFilters, range.prevFrom, range.prevTo],
  );

  const current = useAppraisalStatusSummary(baseFilters);
  const prior = useAppraisalStatusSummary(priorFilters, { enabled: settings.compare === true });

  const hiddenSet = useMemo(
    () => new Set(settings.hiddenStatuses ?? []),
    [settings.hiddenStatuses],
  );

  const rows = useMemo(() => {
    const currentCounts = new Map<string, number>();
    for (const item of current.data?.items ?? []) {
      currentCounts.set(item.status, item.count);
    }
    const priorCounts = new Map<string, number>();
    for (const item of prior.data?.items ?? []) {
      priorCounts.set(item.status, item.count);
    }
    const allRows = STATUS_ORDER.map(status => {
      const count = currentCounts.get(status) ?? 0;
      const prevCount = priorCounts.get(status) ?? 0;
      return {
        status,
        label: STATUS_LABELS[status],
        color: STATUS_COLORS[status],
        count,
        prevCount,
        delta: count - prevCount,
        hidden: hiddenSet.has(status),
      };
    });
    const visibleTotal = allRows.filter(r => !r.hidden).reduce((s, r) => s + r.count, 0);
    const priorTotal = allRows.reduce((s, r) => s + r.prevCount, 0);
    const total = allRows.reduce((s, r) => s + r.count, 0);
    return { allRows, visibleTotal, priorTotal, total };
  }, [current.data, prior.data, hiddenSet]);

  const chartSlices = rows.allRows
    .filter(r => !r.hidden && r.count > 0)
    .map(r => ({ name: r.label, value: r.count, color: r.color, status: r.status }));

  const hasActiveFilters = Boolean(settings.assigneeId || settings.bankingSegment);

  const isLoading = current.isLoading || (settings.compare && prior.isLoading);
  const isError = current.isError;

  const handlePeriodChange = (key: PeriodPresetKey, custom?: { from: Date; to: Date }) => {
    updateSettings(WIDGET_ID, {
      period: key,
      from: custom ? toIsoDate(custom.from) : undefined,
      to: custom ? toIsoDate(custom.to) : undefined,
    } as ProgressSettings);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'appraisal-status-summary'] });
    setMenuOpen(false);
  };

  const handleClearFilters = () => {
    updateSettings(WIDGET_ID, { assigneeId: undefined, bankingSegment: undefined });
    setMenuOpen(false);
  };

  const handleReset = () => {
    updateSettings(WIDGET_ID, {
      period: undefined,
      from: undefined,
      to: undefined,
      assigneeId: undefined,
      bankingSegment: undefined,
      compare: false,
      hiddenStatuses: [],
    });
    setMenuOpen(false);
  };

  const applyFilters = () => {
    updateSettings(WIDGET_ID, {
      assigneeId: assigneeInput.trim() || undefined,
      bankingSegment: bankingInput.trim() || undefined,
    });
    setFiltersOpen(false);
  };

  const toggleStatusVisibility = (status: StatusKey) => {
    const next = hiddenSet.has(status)
      ? (settings.hiddenStatuses ?? []).filter(s => s !== status)
      : [...(settings.hiddenStatuses ?? []), status];
    updateSettings(WIDGET_ID, { hiddenStatuses: next });
  };

  const drillDown = (status?: StatusKey) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('createdFrom', toIsoDate(range.from));
    params.set('createdTo', toIsoDate(range.to));
    // Note: list page doesn't currently support assigneeId/bankingSegment filters;
    // those stay scoped to the widget query and don't flow into the URL.
    navigate(`/appraisals/list?${params}`);
  };

  const renderDelta = (delta: number) => {
    if (delta === 0) return <span className="text-gray-400 text-xs">→0</span>;
    const up = delta > 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs ${up ? 'text-emerald-600' : 'text-red-500'}`}
      >
        <Icon name={up ? 'arrow-up' : 'arrow-down'} style="solid" className="size-2.5" />
        {Math.abs(delta)}
      </span>
    );
  };

  const activeFilterCount = (settings.assigneeId ? 1 : 0) + (settings.bankingSegment ? 1 : 0);
  const totalDelta = rows.total - rows.priorTotal;

  return (
    <WidgetWrapper id={WIDGET_ID}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800">Appraisal Progress Summary</h3>
            <PeriodSelect value={presetKey} custom={customRange} onChange={handlePeriodChange} />
          </div>
          <div className="flex items-center gap-1">
            <div ref={filtersRef} className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen(o => !o)}
                className="inline-flex items-center gap-1 px-2 h-8 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Filters"
              >
                <Icon name="filter" style="solid" className="size-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center text-[10px] font-semibold rounded-full bg-blue-600 text-white min-w-4 h-4 px-1">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filtersOpen && (
                <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg p-3">
                  <div className="space-y-3">
                    <label className="flex flex-col gap-1 text-xs text-gray-500">
                      Assignee username
                      <input
                        type="text"
                        value={assigneeInput}
                        onChange={e => setAssigneeInput(e.target.value)}
                        placeholder="e.g. P5229"
                        className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {/* TODO: wire to a shared users/assignees autocomplete hook when available */}
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-gray-500">
                      Banking segment
                      <input
                        type="text"
                        value={bankingInput}
                        onChange={e => setBankingInput(e.target.value)}
                        placeholder="e.g. SME, Corporate"
                        className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={settings.compare === true}
                          onChange={e => updateSettings(WIDGET_ID, { compare: e.target.checked })}
                          className="rounded"
                        />
                        Compare to prior period
                      </label>
                      <button
                        type="button"
                        onClick={applyFilters}
                        className="text-sm font-medium rounded bg-blue-600 text-white px-3 py-1 hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-sm">
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
                    onClick={handleClearFilters}
                    disabled={!hasActiveFilters}
                    className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent flex items-center gap-2"
                  >
                    <Icon name="eraser" style="solid" className="size-3 text-gray-400" />
                    Clear filters
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
              message="Unable to load progress summary"
              onRetry={() => current.refetch()}
            />
          ) : isLoading ? (
            <div className="flex items-center gap-8">
              <Skeleton variant="circular" width={200} height={200} />
              <div className="flex-1 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} variant="text" height={24} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-8">
              {/* Donut */}
              <div className="relative shrink-0 w-[200px] h-[200px]">
                {rows.visibleTotal === 0 ? (
                  <div className="absolute inset-0 rounded-full border-[24px] border-gray-100" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartSlices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={1}
                        stroke="none"
                        isAnimationActive={false}
                        onClick={data => {
                          // Recharts passes slice data directly; `payload` may exist as a wrapper
                          // in some versions. Read `status` from either shape.
                          const direct = (data as { status?: StatusKey }).status;
                          const nested = (data as { payload?: { status?: StatusKey } }).payload
                            ?.status;
                          const status = direct ?? nested;
                          if (status) drillDown(status);
                        }}
                        cursor="pointer"
                      >
                        {chartSlices.map(slice => (
                          <Cell key={slice.status} fill={slice.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-gray-800 tabular-nums">
                    {rows.total.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400">Total</span>
                  {settings.compare && rows.priorTotal > 0 && (
                    <span
                      className={`text-[11px] mt-0.5 tabular-nums ${
                        totalDelta > 0
                          ? 'text-emerald-600'
                          : totalDelta < 0
                            ? 'text-red-500'
                            : 'text-gray-400'
                      }`}
                    >
                      {totalDelta > 0 ? '↑' : totalDelta < 0 ? '↓' : '→'}
                      {Math.abs(totalDelta)} vs prior
                    </span>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 grid grid-cols-1 gap-1.5">
                {rows.allRows.map(r => {
                  const pct =
                    rows.visibleTotal > 0 && !r.hidden ? (r.count / rows.visibleTotal) * 100 : 0;
                  return (
                    <div
                      key={r.status}
                      className={`group flex items-center justify-between py-1 rounded cursor-pointer hover:bg-gray-50 ${
                        r.hidden ? 'opacity-50' : ''
                      }`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${r.label}: ${r.count}, ${pct.toFixed(1)} percent${r.hidden ? ', hidden' : ''}. Press Enter to open filtered list, Space to toggle visibility.`}
                      onClick={() => drillDown(r.status)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') drillDown(r.status);
                        if (e.key === ' ') {
                          e.preventDefault();
                          toggleStatusVisibility(r.status);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            toggleStatusVisibility(r.status);
                          }}
                          onKeyDown={e => e.stopPropagation()}
                          aria-label={`${r.hidden ? 'Show' : 'Hide'} ${r.label} segment`}
                          aria-pressed={!r.hidden}
                          className="shrink-0"
                        >
                          <span
                            className={`block w-3 h-3 rounded-full transition-all ${
                              r.hidden ? 'ring-2 ring-inset' : ''
                            }`}
                            style={{
                              backgroundColor: r.hidden ? 'transparent' : r.color,
                              borderColor: r.color,
                              boxShadow: r.hidden ? `inset 0 0 0 2px ${r.color}` : 'none',
                            }}
                          />
                        </button>
                        <span
                          className={`text-sm truncate ${r.hidden ? 'text-gray-400 line-through' : 'text-gray-600'}`}
                        >
                          {r.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {settings.compare && renderDelta(r.delta)}
                        <span className="text-xs text-gray-400 tabular-nums">{r.count}</span>
                        <span className="text-sm font-medium text-gray-800 tabular-nums w-12 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isLoading && !isError && rows.total === 0 && (
            <div className="mt-4 text-center text-sm text-gray-400">
              No appraisals match these filters.
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="ml-1 text-blue-600 hover:text-blue-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default ProgressSummaryWidget;
