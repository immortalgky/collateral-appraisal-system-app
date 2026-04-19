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
  Legend,
} from 'recharts';

import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import WidgetWrapper from './WidgetWrapper';
import PeriodSelect from './PeriodSelect';
import WidgetError from './WidgetError';
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
};

const EMPTY_SETTINGS: ExternalTaskSettings = Object.freeze({}) as ExternalTaskSettings;

type Row = {
  companyId: string;
  name: string;
  assigned: number;
  completed: number;
};

function ExternalTaskSummaryWidget() {
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

  const { data, isLoading, isError, refetch } = useCompanyAppraisalSummary({
    from: toIsoDate(range.from),
    to: toIsoDate(range.to),
  });

  const allRows: Row[] = useMemo(() => {
    return (data?.items ?? [])
      .map(item => ({
        companyId: item.companyId,
        name: item.companyName || 'Unknown',
        assigned: item.assignedCount,
        completed: item.completedCount,
      }))
      .sort((a, b) => b.assigned + b.completed - (a.assigned + a.completed));
  }, [data]);

  const rows = useMemo(
    () => (settings.companyId ? allRows.filter(r => r.companyId === settings.companyId) : allRows),
    [allRows, settings.companyId],
  );

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
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="font-semibold text-gray-800 truncate">External Appraisal Summary</h3>
            <PeriodSelect value={presetKey} custom={customRange} onChange={handlePeriodChange} />
          </div>
          <div className="flex items-center gap-2">
            {allRows.length > 0 && (
              <select
                value={settings.companyId ?? ''}
                onChange={e =>
                  updateSettings(WIDGET_ID, { companyId: e.target.value || undefined })
                }
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[160px]"
                aria-label="Filter by company"
              >
                <option value="">All companies</option>
                {allRows.map(r => (
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
            <WidgetError message="Unable to load company summary" onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={24} />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No company data for this period
              {settings.companyId && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => updateSettings(WIDGET_ID, { companyId: undefined })}
                  >
                    Clear company filter
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-2">
                Click a bar to view that company&apos;s appraisals
              </p>
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
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 12, fill: '#4b5563' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 12,
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  {/* onClick lives on each Bar — Recharts v3's BarChart.onClick is unreliable
                      when the click lands directly on a bar rectangle. */}
                  <Bar
                    dataKey="assigned"
                    name="Assigned"
                    fill="#3b82f6"
                    cursor="pointer"
                    onClick={data => {
                      const row = (data as { payload?: Row }).payload;
                      if (row) drillDown(row.companyId);
                    }}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="#10b981"
                    cursor="pointer"
                    onClick={data => {
                      const row = (data as { payload?: Row }).payload;
                      if (row) drillDown(row.companyId);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default ExternalTaskSummaryWidget;
