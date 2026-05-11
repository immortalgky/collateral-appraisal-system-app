import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
} from 'date-fns';

import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import { useCalendarEvents } from '../api/hooks';
import { useDashboardStore } from '../store';
import type { CalendarItem, CalendarItemType, CalendarLinkEntityType } from '../api/types';
import { toIsoDate } from '../utils/periodPresets';
import WidgetDateRangeBadge from '../components/WidgetDateRangeBadge';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => THIS_YEAR - 5 + i);

type VisualCategory = 'meeting' | 'sla' | 'task';

function categoryOf(item: CalendarItem): VisualCategory {
  if (item.type === 'meeting') return 'meeting';
  return item.isSlaCritical ? 'sla' : 'task';
}

const CATEGORY_DOT_CLASS: Record<VisualCategory, string> = {
  meeting: 'bg-blue-500',
  sla: 'bg-red-500',
  task: 'bg-amber-400',
};

const CATEGORY_TEXT_CLASS: Record<VisualCategory, string> = {
  meeting: 'text-blue-700 bg-blue-50 border-blue-100',
  sla: 'text-red-700 bg-red-50 border-red-100',
  task: 'text-amber-700 bg-amber-50 border-amber-100',
};

const CATEGORY_LABEL: Record<VisualCategory, string> = {
  meeting: 'Meeting',
  sla: 'SLA critical',
  task: 'Task due',
};

const ALL_TYPES: CalendarItemType[] = ['meeting', 'task_due'];
const TOPIC_LABELS: Record<CalendarItemType, string> = {
  meeting: 'Meetings',
  task_due: 'Task Due',
};

function buildEntityUrl(entityType: CalendarLinkEntityType, entityId: string): string {
  switch (entityType) {
    case 'appraisal': return `/appraisals/${entityId}`;
    case 'request': return `/requests/${entityId}`;
    case 'task': return `/tasks/${entityId}/opening`;
    case 'meeting': return `/meetings/${entityId}`;
  }
}

const dateKeyOf = (d: Date) => format(d, 'yyyy-MM-dd');

type EventItemProps = { item: CalendarItem };

function EventItem({ item }: EventItemProps) {
  const navigate = useNavigate();
  const cat = categoryOf(item);
  return (
    <button
      type="button"
      title={`${CATEGORY_LABEL[cat]}${item.time ? ` at ${item.time.slice(0, 5)}` : ''}${item.appraisalNumber ? ` · ${item.appraisalNumber}` : ''} — ${item.title}`}
      onClick={() => navigate(buildEntityUrl(item.linkEntityType, item.linkEntityId))}
      className={`w-full text-left text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate ${CATEGORY_TEXT_CLASS[cat]} hover:brightness-95`}
    >
      {item.time && <span className="font-medium mr-1">{item.time.slice(0, 5)}</span>}
      {item.appraisalNumber && <span className="font-semibold mr-1 tabular-nums">{item.appraisalNumber}</span>}
      {item.title}
    </button>
  );
}

// ── Day view ────────────────────────────────────────────────────────────────

type DayViewProps = {
  date: Date;
  eventMap: Map<string, CalendarItem[]>;
  isLoading: boolean;
};

function DayView({ date, eventMap, isLoading }: DayViewProps) {
  const navigate = useNavigate();
  const items = eventMap.get(dateKeyOf(date)) ?? [];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          {format(date, 'EEEE, MMMM d, yyyy')}
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={48} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <div className="size-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Icon name="calendar-check" style="regular" className="size-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No events for this day.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => {
              const cat = categoryOf(item);
              return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => navigate(buildEntityUrl(item.linkEntityType, item.linkEntityId))}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-left transition-colors"
                >
                  <span className={`mt-1.5 size-2.5 rounded-full shrink-0 ${CATEGORY_DOT_CLASS[cat]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.appraisalNumber && (
                        <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded tabular-nums shrink-0">
                          {item.appraisalNumber}
                        </span>
                      )}
                      <p className="text-sm text-gray-800 break-words">{item.title}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                      <span>{CATEGORY_LABEL[cat]}</span>
                      {item.time && (<><span className="text-gray-300">·</span><span>{item.time.slice(0, 5)}</span></>)}
                    </p>
                  </div>
                  <Icon name="arrow-right" style="solid" className="size-3 text-gray-300 mt-1.5 shrink-0" />
                </button>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Week view ───────────────────────────────────────────────────────────────

type WeekViewProps = {
  weekStart: Date;
  eventMap: Map<string, CalendarItem[]>;
  isLoading: boolean;
  today: Date;
};

function WeekView({ weekStart, eventMap, isLoading, today }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <div className="grid grid-cols-7 border-b border-gray-100 shrink-0">
        {days.map(d => (
          <div
            key={dateKeyOf(d)}
            className={`px-2 py-2 text-center text-xs font-medium border-r last:border-r-0 border-gray-100 ${
              isSameDay(d, today) ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <div>{DAYS[(d.getDay() + 6) % 7]}</div>
            <div className={`mt-0.5 w-6 h-6 mx-auto rounded-full flex items-center justify-center text-sm font-semibold ${
              isSameDay(d, today) ? 'bg-blue-500 text-white' : 'text-gray-700'
            }`}>
              {format(d, 'd')}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 min-h-0">
        {days.map(d => {
          const key = dateKeyOf(d);
          const items = eventMap.get(key) ?? [];
          return (
            <div key={key} className="border-r last:border-r-0 border-gray-100 p-1 min-h-[120px] flex flex-col gap-0.5">
              {isLoading ? (
                <>
                  <Skeleton variant="rounded" height={14} />
                  <Skeleton variant="rounded" height={14} />
                </>
              ) : (
                items.map((item, i) => <EventItem key={i} item={item} />)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Month view ──────────────────────────────────────────────────────────────

type MonthViewProps = {
  currentDate: Date;
  eventMap: Map<string, CalendarItem[]>;
  isLoading: boolean;
  today: Date;
};

function MonthView({ currentDate, eventMap, isLoading, today }: MonthViewProps) {
  const navigate = useNavigate();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstOfMonth = startOfMonth(currentDate);
  const lastOfMonth = endOfMonth(currentDate);
  const firstDayWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastOfMonth.getDate();

  const gridCells: Array<{ date: Date; inMonth: boolean }> = [];
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = 0; i < firstDayWeekday; i++) {
    gridCells.push({ date: new Date(year, month - 1, prevMonthLastDay - firstDayWeekday + i + 1), inMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) gridCells.push({ date: new Date(year, month, i), inMonth: true });
  const trailing = 42 - gridCells.length;
  for (let i = 1; i <= trailing; i++) gridCells.push({ date: new Date(year, month + 1, i), inMonth: false });

  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-2 shrink-0">
        {DAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">{day}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1 min-h-0">
        {gridCells.map((cell, idx) => {
          const key = dateKeyOf(cell.date);
          const items = cell.inMonth ? (eventMap.get(key) ?? []) : [];
          const isToday = isSameDay(cell.date, today);
          const maxVisible = 3;
          const visible = items.slice(0, maxVisible);
          const hidden = items.length - visible.length;

          return (
            <div
              key={idx}
              className={`flex flex-col rounded-lg border min-h-0 overflow-hidden ${
                isToday ? 'border-blue-500 bg-blue-50/40'
                  : cell.inMonth ? 'border-gray-100 bg-white hover:border-gray-200'
                  : 'border-gray-50 bg-gray-50/40'
              }`}
            >
              <div className={`px-2 pt-1.5 text-xs font-medium flex items-center justify-between ${
                isToday ? 'text-blue-700' : cell.inMonth ? 'text-gray-600' : 'text-gray-300'
              }`}>
                <span>{format(cell.date, 'd')}</span>
                {items.length > 0 && cell.inMonth && (
                  <span className="text-[10px] text-gray-400 tabular-nums">{items.length}</span>
                )}
              </div>
              <div className="flex-1 px-1 pb-1 flex flex-col gap-0.5 overflow-hidden">
                {isLoading && cell.inMonth ? (
                  <><Skeleton variant="rounded" height={14} /><Skeleton variant="rounded" height={14} /></>
                ) : (
                  visible.map((item, i) => {
                    const cat = categoryOf(item);
                    return (
                    <button
                      key={i}
                      type="button"
                      title={`${CATEGORY_LABEL[cat]}${item.time ? ` at ${item.time.slice(0, 5)}` : ''}${item.appraisalNumber ? ` · ${item.appraisalNumber}` : ''} — ${item.title}`}
                      onClick={() => navigate(buildEntityUrl(item.linkEntityType, item.linkEntityId))}
                      className={`text-left text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate ${CATEGORY_TEXT_CLASS[cat]} hover:brightness-95`}
                    >
                      {item.time && <span className="font-medium mr-1">{item.time.slice(0, 5)}</span>}
                      {item.appraisalNumber && <span className="font-semibold mr-1 tabular-nums">{item.appraisalNumber}</span>}
                      {item.title}
                    </button>
                    );
                  })
                )}
                {hidden > 0 && <span className="text-[10px] text-gray-400 px-1">+{hidden} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── CalendarPage ─────────────────────────────────────────────────────────────

function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [topicFilter, setTopicFilter] = useState<CalendarItemType[]>([]);
  const [topicOpen, setTopicOpen] = useState(false);
  const topicRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);

  const prefs = useDashboardStore(s => s.prefs);
  const updatePrefs = useDashboardStore(s => s.updatePrefs);

  const viewMode = prefs.calendarViewMode ?? 'month';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    if (!topicOpen) return;
    const handler = (e: MouseEvent) => {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) setTopicOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [topicOpen]);

  // Derive from/to based on view mode
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { from, to } = useMemo(() => {
    if (viewMode === 'day') {
      const d = toIsoDate(currentDate);
      return { from: d, to: d };
    }
    if (viewMode === 'week') {
      return { from: toIsoDate(weekStart), to: toIsoDate(weekEnd) };
    }
    return { from: toIsoDate(startOfMonth(currentDate)), to: toIsoDate(endOfMonth(currentDate)) };
  }, [viewMode, currentDate, weekStart, weekEnd]);

  const activeTypes = topicFilter.length > 0 ? topicFilter : undefined;

  const { data, isLoading, isError, refetch } = useCalendarEvents({ from, to, types: activeTypes });

  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const d of data?.items ?? []) map.set(d.date, d.items);
    return map;
  }, [data]);

  const goToday = () => setCurrentDate(new Date());

  const stepDate = (dir: -1 | 1) => {
    if (viewMode === 'day') setCurrentDate(d => addDays(d, dir));
    else if (viewMode === 'week') setCurrentDate(d => addDays(d, dir * 7));
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  };

  const toggleTopic = (type: CalendarItemType) => {
    setTopicFilter(prev => {
      // Empty = "all visible". Expand before removing so checkbox state stays consistent.
      const current = prev.length ? prev : ALL_TYPES;
      const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
      return next.length === ALL_TYPES.length ? [] : next;
    });
  };

  // Date range badge label per mode
  const badgeDateFrom = viewMode === 'week' ? weekStart : (viewMode === 'day' ? currentDate : startOfMonth(currentDate));
  const badgeDateTo = viewMode === 'week' ? weekEnd : (viewMode === 'day' ? currentDate : endOfMonth(currentDate));

  const VIEW_MODES = [
    { key: 'day' as const, label: 'Day' },
    { key: 'week' as const, label: 'Week' },
    { key: 'month' as const, label: 'Month' },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* Page header */}
      <div className="shrink-0 mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link to="/" className="hover:text-gray-600">Dashboard</Link>
            <Icon name="chevron-right" style="solid" className="size-2.5" />
            <span>Calendar</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Calendar</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Meetings, task due dates and SLA deadlines assigned to you
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode tabs */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            {VIEW_MODES.map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => updatePrefs({ calendarViewMode: m.key })}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === m.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Today button */}
          <button
            type="button"
            onClick={goToday}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Today
          </button>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="shrink-0 flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => stepDate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Previous"
          >
            <Icon name="chevron-left" style="solid" className="size-4" />
          </button>

          {/* Month/year jump picker (always visible for nav context) */}
          <div className="flex items-center gap-1.5">
            <select
              value={month}
              onChange={e => setCurrentDate(new Date(year, Number(e.target.value), currentDate.getDate()))}
              className="text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label="Select month"
            >
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={e => setCurrentDate(new Date(Number(e.target.value), month, currentDate.getDate()))}
              className="text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label="Select year"
            >
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button
            type="button"
            onClick={() => stepDate(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Next"
          >
            <Icon name="chevron-right" style="solid" className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <WidgetDateRangeBadge from={badgeDateFrom} to={badgeDateTo} />

          {/* Topic filter */}
          <div ref={topicRef} className="relative">
            <button
              type="button"
              onClick={() => setTopicOpen(o => !o)}
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-lg transition-colors ${
                topicFilter.length > 0
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon name="filter" style="solid" className="size-3.5" />
              Topics
              {topicFilter.length > 0 && (
                <span className="text-[11px] font-bold bg-blue-600 text-white rounded-full size-4 flex items-center justify-center">
                  {topicFilter.length}
                </span>
              )}
            </button>
            {topicOpen && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg p-2">
                <p className="text-xs font-semibold text-gray-500 px-1 mb-1">Topics</p>
                {ALL_TYPES.map(type => {
                  const checked = topicFilter.length === 0 || topicFilter.includes(type);
                  return (
                    <label key={type} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTopic(type)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      {TOPIC_LABELS[type]}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {isError ? (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 text-sm p-8">
          <Icon name="triangle-exclamation" style="solid" className="size-5 text-red-500" />
          <p className="text-gray-600">Unable to load calendar events</p>
          <button type="button" onClick={() => refetch()} className="text-blue-600 hover:text-blue-700">
            Retry
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col">
          {viewMode === 'day' && (
            <DayView date={currentDate} eventMap={eventMap} isLoading={isLoading} />
          )}
          {viewMode === 'week' && (
            <WeekView weekStart={weekStart} eventMap={eventMap} isLoading={isLoading} today={today} />
          )}
          {viewMode === 'month' && (
            <MonthView currentDate={currentDate} eventMap={eventMap} isLoading={isLoading} today={today} />
          )}

          {/* Legend — mirrors the topic filter (Meetings / Task Due);
              the red dot inline explains SLA-critical urgency. */}
          <div className="mt-3 flex items-center gap-4 shrink-0 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_DOT_CLASS.meeting}`} />
              <span className="text-xs text-gray-500">Meeting</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center -space-x-1">
                <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_DOT_CLASS.task} ring-1 ring-white`} />
                <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_DOT_CLASS.sla} ring-1 ring-white`} />
              </span>
              <span className="text-xs text-gray-500">
                Task due <span className="text-gray-400">(red = SLA critical)</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
