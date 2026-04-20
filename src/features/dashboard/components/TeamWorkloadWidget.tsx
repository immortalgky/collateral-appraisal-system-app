import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import WidgetWrapper from './WidgetWrapper';
import PeriodSelect from './PeriodSelect';
import WidgetError from './WidgetError';
import { useTeamWorkload } from '../api';
import { useDashboardStore } from '../store';
import {
  getPresetRange,
  toIsoDate,
  fromIsoDate,
  type PeriodPresetKey,
} from '../utils/periodPresets';

const WIDGET_ID = 'team-workload';

type TeamWorkloadSettings = {
  period?: PeriodPresetKey;
  from?: string;
  to?: string;
};

const EMPTY_SETTINGS: TeamWorkloadSettings = Object.freeze({}) as TeamWorkloadSettings;

type Row = {
  username: string;
  // Display label embeds the overdue badge into the Y-axis tick text indirectly via lookup.
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
  // total excludes overdue on purpose — overdue is an overlapping flag, not a distinct bucket.
  total: number;
};

type StackedKey = 'notStarted' | 'inProgress' | 'completed';

const LEGEND: Array<{ key: StackedKey; label: string; color: string }> = [
  { key: 'notStarted', label: 'Not Started', color: '#3b82f6' },
  { key: 'inProgress', label: 'In Progress', color: '#f59e0b' },
  { key: 'completed', label: 'Completed', color: '#10b981' },
];

const OVERDUE_COLOR = '#ef4444';

function TeamWorkloadWidget() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const settings = useDashboardStore(
    s =>
      (s.widgets.find(w => w.id === WIDGET_ID)?.settings as TeamWorkloadSettings | undefined) ??
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

  const { data, isLoading, isError, refetch } = useTeamWorkload({
    from: toIsoDate(range.from),
    to: toIsoDate(range.to),
  });

  const rows: Row[] = useMemo(() => {
    return (data?.items ?? [])
      .map(m => ({
        username: m.username,
        notStarted: m.notStarted ?? 0,
        inProgress: m.inProgress ?? 0,
        completed: m.completed ?? 0,
        overdue: m.overdue ?? 0,
        // Overdue is an overlapping flag on active tasks (see vw_UserTaskSummary) —
        // exclude it from the stacked total so the bar widths aren't inflated.
        total: (m.notStarted ?? 0) + (m.inProgress ?? 0) + (m.completed ?? 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  // Overdue lookup keyed by username — used by the custom Y-axis tick to draw a red badge.
  const overdueByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.username, r.overdue);
    return map;
  }, [rows]);

  const handlePeriodChange = (key: PeriodPresetKey, custom?: { from: Date; to: Date }) => {
    updateSettings(WIDGET_ID, {
      period: key,
      from: custom ? toIsoDate(custom.from) : undefined,
      to: custom ? toIsoDate(custom.to) : undefined,
    } as TeamWorkloadSettings);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'team-workload'] });
    setMenuOpen(false);
  };

  const handleReset = () => {
    updateSettings(WIDGET_ID, { period: undefined, from: undefined, to: undefined });
    setMenuOpen(false);
  };

  const drillDown = (username: string) => {
    const params = new URLSearchParams({
      assigneeUserId: username,
      dateType: 'assigned',
      dateFrom: toIsoDate(range.from),
      dateTo: toIsoDate(range.to),
    });
    navigate(`/tasks?${params}`);
  };

  // Height scales with row count so bars stay readable.
  const chartHeight = Math.max(160, rows.length * 44);

  return (
    <WidgetWrapper id={WIDGET_ID}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800">Team Workload</h3>
            <PeriodSelect value={presetKey} custom={customRange} onChange={handlePeriodChange} />
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
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-sm">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Icon name="arrow-rotate-right" style="solid" className="size-3 text-gray-400" />
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

        <div className="p-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {LEGEND.map(l => (
              <div key={l.key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-xs text-gray-500">{l.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: OVERDUE_COLOR }} />
              <span className="text-xs text-gray-500">Overdue (overlap)</span>
            </div>
            <span className="text-xs text-gray-400 ml-auto">Click a row to view tasks</span>
          </div>

          {isError ? (
            <WidgetError message="Unable to load team workload" onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="text" width={120} height={14} />
                  <Skeleton variant="rectangular" height={20} className="flex-1" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No team workload data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
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
                  dataKey="username"
                  width={140}
                  axisLine={false}
                  tickLine={false}
                  tick={props => {
                    const { x, y, payload } = props as {
                      x: number;
                      y: number;
                      payload: { value: string };
                    };
                    const overdue = overdueByUser.get(payload.value) ?? 0;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={-8} y={0} dy={4} textAnchor="end" fontSize={12} fill="#4b5563">
                          {payload.value}
                        </text>
                        {overdue > 0 && (
                          <g
                            transform={`translate(${-8 - 8 * String(payload.value).length - 22},-9)`}
                          >
                            <title>{`${overdue} overdue`}</title>
                            <rect
                              width={22}
                              height={18}
                              rx={9}
                              fill={OVERDUE_COLOR}
                              opacity={0.12}
                            />
                            <text
                              x={11}
                              y={13}
                              textAnchor="middle"
                              fontSize={10}
                              fontWeight={600}
                              fill={OVERDUE_COLOR}
                            >
                              {overdue}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 12,
                  }}
                />
                {/* onClick on each Bar — Recharts v3's BarChart.onClick misses direct bar clicks. */}
                {LEGEND.map(l => (
                  <Bar
                    key={l.key}
                    dataKey={l.key}
                    stackId="workload"
                    name={l.label}
                    cursor="pointer"
                    onClick={data => {
                      const row = (data as { payload?: Row }).payload;
                      if (row) drillDown(row.username);
                    }}
                  >
                    {rows.map(r => (
                      <Cell key={r.username} fill={l.color} />
                    ))}
                  </Bar>
                ))}
                {/* Overdue is NOT stacked — it overlaps the other buckets. Rendered as a
                    separate badge on the Y-axis tick + included in the tooltip payload. */}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default TeamWorkloadWidget;
