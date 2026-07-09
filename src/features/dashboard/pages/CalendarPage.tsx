import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import type {
  CalendarDay,
  CalendarItem,
  CalendarItemType,
  CalendarLinkEntityType,
} from '../api/types';
import { toIsoDate } from '../utils/periodPresets';
import WidgetDateRangeBadge from '../components/WidgetDateRangeBadge';

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

const ALL_TYPES: CalendarItemType[] = ['meeting', 'task_due'];

function buildEntityUrl(entityType: CalendarLinkEntityType, entityId: string): string {
  switch (entityType) {
    case 'appraisal':
      return `/appraisals/${entityId}`;
    case 'request':
      return `/requests/${entityId}`;
    case 'task':
      return `/tasks/${entityId}/opening`;
    case 'meeting':
      return `/meetings/${entityId}`;
  }
}

const dateKeyOf = (d: Date) => format(d, 'yyyy-MM-dd');

// Navigate to a calendar entity while passing the calendar page as `returnPath`,
// so the appraisal read-only shell's Exit button returns here instead of the
// hardcoded /appraisals/search fallback.
function useEntityNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  return (entityType: CalendarLinkEntityType, entityId: string) => {
    const returnPath = location.pathname + location.search;
    navigate(buildEntityUrl(entityType, entityId), { state: { returnPath } });
  };
}

type EventItemProps = {
  item: CalendarItem;
  categoryLabel: (cat: VisualCategory) => string;
};

function EventItem({ item, categoryLabel }: EventItemProps) {
  const goToEntity = useEntityNavigate();
  const cat = categoryOf(item);
  return (
    <button
      type="button"
      title={`${categoryLabel(cat)}${item.time ? ` at ${item.time.slice(0, 5)}` : ''}${item.appraisalNumber ? ` · ${item.appraisalNumber}` : ''} — ${item.title}`}
      onClick={() => goToEntity(item.linkEntityType, item.linkEntityId)}
      className={`w-full text-left text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate ${CATEGORY_TEXT_CLASS[cat]} hover:brightness-95`}
    >
      {item.time && <span className="font-medium mr-1">{item.time.slice(0, 5)}</span>}
      {item.appraisalNumber && (
        <span className="font-semibold mr-1 tabular-nums">{item.appraisalNumber}</span>
      )}
      {item.title}
    </button>
  );
}

// ── Day view ────────────────────────────────────────────────────────────────

type DayViewProps = {
  date: Date;
  eventMap: Map<string, CalendarItem[]>;
  isLoading: boolean;
  noEventsLabel: string;
  categoryLabel: (cat: VisualCategory) => string;
};

function DayView({ date, eventMap, isLoading, noEventsLabel, categoryLabel }: DayViewProps) {
  const goToEntity = useEntityNavigate();
  const items = eventMap.get(dateKeyOf(date)) ?? [];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          {format(date, 'EEEE, MMMM d, yyyy')}
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <div className="size-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Icon name="calendar-check" style="regular" className="size-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">{noEventsLabel}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => {
              const cat = categoryOf(item);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => goToEntity(item.linkEntityType, item.linkEntityId)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-left transition-colors"
                  >
                    <span
                      className={`mt-1.5 size-2.5 rounded-full shrink-0 ${CATEGORY_DOT_CLASS[cat]}`}
                    />
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
                        <span>{categoryLabel(cat)}</span>
                        {item.time && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span>{item.time.slice(0, 5)}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <Icon
                      name="arrow-right"
                      style="solid"
                      className="size-3 text-gray-300 mt-1.5 shrink-0"
                    />
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
  dayLabels: string[];
  categoryLabel: (cat: VisualCategory) => string;
};

function WeekView({
  weekStart,
  eventMap,
  isLoading,
  today,
  dayLabels,
  categoryLabel,
}: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <div className="grid grid-cols-7 border-b border-gray-100 shrink-0">
        {days.map((d, di) => (
          <div
            key={dateKeyOf(d)}
            className={`px-2 py-2 text-center text-xs font-medium border-r last:border-r-0 border-gray-100 ${
              isSameDay(d, today) ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <div>{dayLabels[di]}</div>
            <div
              className={`mt-0.5 w-6 h-6 mx-auto rounded-full flex items-center justify-center text-sm font-semibold ${
                isSameDay(d, today) ? 'bg-blue-500 text-white' : 'text-gray-700'
              }`}
            >
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
            <div
              key={key}
              className="border-r last:border-r-0 border-gray-100 p-1 min-h-[120px] flex flex-col gap-0.5"
            >
              {isLoading ? (
                <>
                  <Skeleton variant="rounded" height={14} />
                  <Skeleton variant="rounded" height={14} />
                </>
              ) : (
                items.map((item, i) => (
                  <EventItem key={i} item={item} categoryLabel={categoryLabel} />
                ))
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
  dayLabels: string[];
  categoryLabel: (cat: VisualCategory) => string;
  eventsCountLabel: (n: number) => string;
  closeLabel: string;
};

function MonthView({
  currentDate,
  eventMap,
  isLoading,
  today,
  dayLabels,
  categoryLabel,
  eventsCountLabel,
  closeLabel,
}: MonthViewProps) {
  const goToEntity = useEntityNavigate();
  const [dayPopover, setDayPopover] = useState<{
    date: Date;
    items: CalendarItem[];
    rect: DOMRect;
  } | null>(null);

  const openDay = (date: Date, dayItems: CalendarItem[], rect: DOMRect) => {
    if (dayItems.length === 0) return;
    setDayPopover({ date, items: dayItems, rect });
  };

  // Close the day popover on Escape.
  useEffect(() => {
    if (!dayPopover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDayPopover(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dayPopover]);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstOfMonth = startOfMonth(currentDate);
  const lastOfMonth = endOfMonth(currentDate);
  const firstDayWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastOfMonth.getDate();

  const gridCells: Array<{ date: Date; inMonth: boolean }> = [];
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = 0; i < firstDayWeekday; i++) {
    gridCells.push({
      date: new Date(year, month - 1, prevMonthLastDay - firstDayWeekday + i + 1),
      inMonth: false,
    });
  }
  for (let i = 1; i <= daysInMonth; i++)
    gridCells.push({ date: new Date(year, month, i), inMonth: true });
  const trailing = 42 - gridCells.length;
  for (let i = 1; i <= trailing; i++)
    gridCells.push({ date: new Date(year, month + 1, i), inMonth: false });

  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-2 shrink-0">
        {dayLabels.map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 auto-rows-[minmax(7rem,1fr)] gap-1 min-h-0 overflow-y-auto">
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
                isToday
                  ? 'border-blue-500 bg-blue-50/40'
                  : cell.inMonth
                    ? 'border-gray-100 bg-white hover:border-gray-200'
                    : 'border-gray-50 bg-gray-50/40'
              }`}
            >
              <div
                className={`px-2 pt-1.5 text-xs font-medium flex items-center justify-between ${
                  isToday ? 'text-blue-700' : cell.inMonth ? 'text-gray-600' : 'text-gray-300'
                }`}
              >
                <span>{format(cell.date, 'd')}</span>
                {items.length > 0 && cell.inMonth && (
                  <span className="text-[10px] text-gray-400 tabular-nums">{items.length}</span>
                )}
              </div>
              <div className="flex-1 px-1 pb-1 flex flex-col gap-0.5 min-h-0">
                <div className="flex-1 flex flex-col gap-0.5 overflow-hidden min-h-0">
                  {isLoading && cell.inMonth ? (
                    <>
                      <Skeleton variant="rounded" height={14} />
                      <Skeleton variant="rounded" height={14} />
                    </>
                  ) : (
                    visible.map((item, i) => {
                      const cat = categoryOf(item);
                      return (
                        <button
                          key={i}
                          type="button"
                          title={`${categoryLabel(cat)}${item.time ? ` at ${item.time.slice(0, 5)}` : ''}${item.appraisalNumber ? ` · ${item.appraisalNumber}` : ''} — ${item.title}`}
                          onClick={e => {
                            e.stopPropagation();
                            goToEntity(item.linkEntityType, item.linkEntityId);
                          }}
                          className={`shrink-0 text-left text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate ${CATEGORY_TEXT_CLASS[cat]} hover:brightness-95`}
                        >
                          {item.time && (
                            <span className="font-medium mr-1">{item.time.slice(0, 5)}</span>
                          )}
                          <span className="font-semibold tabular-nums">
                            {item.appraisalNumber ?? item.title}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={e =>
                      openDay(cell.date, items, e.currentTarget.getBoundingClientRect())
                    }
                    className="shrink-0 text-left text-[10px] text-gray-500 px-1 pt-0.5 font-medium hover:text-gray-700"
                  >
                    +{hidden} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {dayPopover &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDayPopover(null)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              className="fixed z-50 w-64 max-h-80 flex flex-col bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
              style={{
                left: Math.max(8, Math.min(dayPopover.rect.left, window.innerWidth - 256 - 8)),
                top: Math.max(8, Math.min(dayPopover.rect.top, window.innerHeight - 320 - 8)),
              }}
            >
              <div className="shrink-0 px-3 py-2 border-b border-gray-100 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-800">
                    {format(dayPopover.date, 'EEEE, d MMM yyyy')}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {eventsCountLabel(dayPopover.items.length)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDayPopover(null)}
                  aria-label={closeLabel}
                  className="shrink-0 -mr-1 size-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  <Icon name="xmark" style="solid" className="size-3" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {dayPopover.items.map((item, i) => {
                  const cat = categoryOf(item);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setDayPopover(null);
                        goToEntity(item.linkEntityType, item.linkEntityId);
                      }}
                      className="w-full flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 text-left transition-colors group"
                    >
                      <span
                        className={`mt-1 size-2 rounded-full shrink-0 ${CATEGORY_DOT_CLASS[cat]}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">
                          {item.appraisalNumber && (
                            <span className="font-semibold tabular-nums mr-1">
                              {item.appraisalNumber}
                            </span>
                          )}
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                          <span>{categoryLabel(cat)}</span>
                          {item.time && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span>{item.time.slice(0, 5)}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Icon
                        name="arrow-right"
                        style="solid"
                        className="size-3 text-gray-300 mt-1 shrink-0 group-hover:text-gray-500"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

// ── Next 7 days panel ─────────────────────────────────────────────────────────

type NextSevenDaysPanelProps = {
  today: Date;
  days: CalendarDay[];
  isLoading: boolean;
  categoryLabel: (cat: VisualCategory) => string;
  title: string;
  eventsCountLabel: (n: number) => string;
  todayLabel: string;
  emptyLabel: string;
};

function NextSevenDaysPanel({
  today,
  days,
  isLoading,
  categoryLabel,
  title,
  eventsCountLabel,
  todayLabel,
  emptyLabel,
}: NextSevenDaysPanelProps) {
  const goToEntity = useEntityNavigate();
  const withEvents = days.filter(d => d.items.length > 0);
  const total = withEvents.reduce((sum, d) => sum + d.items.length, 0);

  return (
    <aside className="hidden lg:flex flex-col w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {!isLoading && <span className="text-xs text-gray-400">{eventsCountLabel(total)}</span>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={40} />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <div className="size-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Icon name="calendar-check" style="regular" className="size-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">{emptyLabel}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {withEvents.map(day => {
              const date = new Date(day.date);
              const isToday = isSameDay(date, today);
              return (
                <div key={day.date}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5">
                    <span className={isToday ? 'text-blue-600' : 'text-gray-500'}>
                      {isToday ? todayLabel : format(date, 'EEE, d MMM')}
                    </span>
                    {!isToday && (
                      <span className="text-gray-300 font-normal"> {format(date, 'yyyy')}</span>
                    )}
                  </p>
                  <ul className="space-y-1">
                    {day.items.map((item, i) => {
                      const cat = categoryOf(item);
                      return (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => goToEntity(item.linkEntityType, item.linkEntityId)}
                            className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 text-left transition-colors group"
                          >
                            <span
                              className={`mt-1 size-2 rounded-full shrink-0 ${CATEGORY_DOT_CLASS[cat]}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 truncate">
                                {item.appraisalNumber && (
                                  <span className="font-semibold tabular-nums mr-1">
                                    {item.appraisalNumber}
                                  </span>
                                )}
                                {item.title}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                                <span>{categoryLabel(cat)}</span>
                                {item.time && (
                                  <>
                                    <span className="text-gray-300">·</span>
                                    <span>{item.time.slice(0, 5)}</span>
                                  </>
                                )}
                              </p>
                            </div>
                            <Icon
                              name="arrow-right"
                              style="solid"
                              className="size-3 text-gray-300 mt-1 shrink-0 group-hover:text-gray-500"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Date picker (MS Teams-style dual pane) ───────────────────────────────────

// Build a Monday-first 6-week grid (leading/trailing days from adjacent months).
function buildMiniGrid(viewDate: Date): Date[] {
  const first = startOfMonth(viewDate);
  const firstWeekday = (first.getDay() + 6) % 7;
  const cells: Date[] = [];
  for (let i = firstWeekday; i > 0; i--) cells.push(addDays(first, -i));
  const daysInMonth = endOfMonth(viewDate).getDate();
  for (let i = 0; i < daysInMonth; i++) cells.push(addDays(first, i));
  while (cells.length % 7 !== 0) cells.push(addDays(cells[cells.length - 1], 1));
  return cells;
}

type TeamsDatePickerProps = {
  mode: 'day' | 'week' | 'month';
  selected: Date;
  today: Date;
  dayLabels: string[]; // Monday-first; first letter is shown
  months: string[]; // full month names (left-pane header)
  monthsShort: string[]; // short month names (right-pane grid)
  onSelect: (d: Date) => void; // final pick — updates the date and closes the popover
  onNavigate: (d: Date) => void; // live navigation (Month mode) — updates without closing
  todayLabel: string;
  prevAria: string;
  nextAria: string;
};

// A two-pane picker like MS Teams: a day grid on the left (hidden in Month mode)
// and a year + month quick-jump on the right. Picking a month in Month mode
// commits immediately; in Day/Week mode it just navigates the left grid.
function TeamsDatePicker({
  mode,
  selected,
  today,
  dayLabels,
  months,
  monthsShort,
  onSelect,
  onNavigate,
  todayLabel,
  prevAria,
  nextAria,
}: TeamsDatePickerProps) {
  const [viewDate, setViewDate] = useState(() => startOfMonth(selected));
  const cells = useMemo(() => buildMiniGrid(viewDate), [viewDate]);
  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();
  const showDays = mode !== 'month';

  // Move the visible view. In Month mode this also updates the calendar live, so a
  // year/month change takes effect immediately without needing a second month click.
  const goToView = (d: Date) => {
    setViewDate(d);
    if (mode === 'month') onNavigate(d);
  };

  // Right pane can flip to a 12-year grid when the year header is clicked.
  const [yearGridOpen, setYearGridOpen] = useState(false);
  const [yearBase, setYearBase] = useState(() => viewYear - 6);
  const openYearGrid = () => {
    setYearBase(viewYear - 6);
    setYearGridOpen(v => !v);
  };

  // In Week mode the whole week of the selected date is highlighted as a band.
  const selWeekStart = startOfWeek(selected, { weekStartsOn: 1 });
  const selWeekEnd = endOfWeek(selected, { weekStartsOn: 1 });

  const arrowBtn =
    'size-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600';

  return (
    <div className="flex">
      {showDays && (
        <div className="w-60 p-3 border-r border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-800">
              {months[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                aria-label={prevAria}
                onClick={() => setViewDate(new Date(viewYear, viewMonth - 1, 1))}
                className={arrowBtn}
              >
                <Icon name="chevron-up" style="solid" className="size-3" />
              </button>
              <button
                type="button"
                aria-label={nextAria}
                onClick={() => setViewDate(new Date(viewYear, viewMonth + 1, 1))}
                className={arrowBtn}
              >
                <Icon name="chevron-down" style="solid" className="size-3" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {dayLabels.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-medium text-gray-400">
                {d.charAt(0)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === viewMonth;
              const isToday = isSameDay(d, today);
              const inWeekBand = mode === 'week' && d >= selWeekStart && d <= selWeekEnd;
              const isSel = mode === 'day' && isSameDay(d, selected);

              let cls: string;
              if (isSel) cls = 'bg-blue-600 text-white font-semibold';
              else if (inWeekBand && isToday) cls = 'bg-blue-600 text-white font-semibold';
              else if (inWeekBand) cls = 'bg-blue-100 text-blue-700';
              else if (isToday)
                cls = 'ring-1 ring-blue-500 text-blue-600 font-semibold hover:bg-blue-50';
              else if (inMonth) cls = 'text-gray-700 hover:bg-gray-100';
              else cls = 'text-gray-300 hover:bg-gray-50';

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelect(d)}
                  className={`h-8 rounded-lg text-sm flex items-center justify-center ${cls}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-56 p-3 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={openYearGrid}
            className="text-sm font-semibold text-gray-800 hover:text-blue-600 rounded px-1 -ml-1"
          >
            {yearGridOpen ? `${yearBase}–${yearBase + 11}` : viewYear}
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={prevAria}
              onClick={() =>
                yearGridOpen
                  ? setYearBase(b => b - 12)
                  : goToView(new Date(viewYear - 1, viewMonth, 1))
              }
              className={arrowBtn}
            >
              <Icon name="chevron-up" style="solid" className="size-3" />
            </button>
            <button
              type="button"
              aria-label={nextAria}
              onClick={() =>
                yearGridOpen
                  ? setYearBase(b => b + 12)
                  : goToView(new Date(viewYear + 1, viewMonth, 1))
              }
              className={arrowBtn}
            >
              <Icon name="chevron-down" style="solid" className="size-3" />
            </button>
          </div>
        </div>
        {yearGridOpen ? (
          <div className="grid grid-cols-4 gap-x-1 gap-y-3">
            {Array.from({ length: 12 }, (_, k) => yearBase + k).map(y => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  goToView(new Date(y, viewMonth, 1));
                  setYearGridOpen(false);
                }}
                className={`h-9 rounded-lg text-sm flex items-center justify-center ${
                  y === viewYear
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-x-1 gap-y-3">
            {monthsShort.map((m, mi) => {
              // Highlight the month currently shown by the left grid so it follows navigation.
              const isViewMonth = mi === viewMonth;
              return (
                <button
                  key={mi}
                  type="button"
                  onClick={() =>
                    mode === 'month'
                      ? onSelect(new Date(viewYear, mi, 1))
                      : goToView(new Date(viewYear, mi, 1))
                  }
                  className={`h-9 rounded-lg text-sm flex items-center justify-center ${
                    isViewMonth
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-auto pt-3 text-right">
          <button
            type="button"
            onClick={() =>
              onSelect(
                mode === 'month' ? new Date(today.getFullYear(), today.getMonth(), 1) : today,
              )
            }
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {todayLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CalendarPage ─────────────────────────────────────────────────────────────

function CalendarPage() {
  const { t } = useTranslation('dashboard');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [topicFilter, setTopicFilter] = useState<CalendarItemType[]>([]);
  const [topicOpen, setTopicOpen] = useState(false);
  const topicRef = useRef<HTMLDivElement>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);

  const prefs = useDashboardStore(s => s.prefs);
  const updatePrefs = useDashboardStore(s => s.updatePrefs);

  const viewMode = prefs.calendarViewMode ?? 'month';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Arrays derived from translation keys (inside component)
  const DAYS = [
    t('calendar.days.MON'),
    t('calendar.days.TUE'),
    t('calendar.days.WED'),
    t('calendar.days.THU'),
    t('calendar.days.FRI'),
    t('calendar.days.SAT'),
    t('calendar.days.SUN'),
  ];

  const MONTHS = Array.from({ length: 12 }, (_, i) =>
    t(
      `calendar.months.${i}` as `calendar.months.${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11}`,
    ),
  );

  const MONTHS_SHORT = Array.from({ length: 12 }, (_, i) =>
    t(
      `calendar.monthsShort.${i}` as `calendar.monthsShort.${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11}`,
    ),
  );

  const CATEGORY_LABEL: Record<VisualCategory, string> = {
    meeting: t('calendar.categoryLabels.meeting'),
    sla: t('calendar.categoryLabels.sla'),
    task: t('calendar.categoryLabels.task'),
  };

  const TOPIC_LABELS: Record<CalendarItemType, string> = {
    meeting: t('calendar.topicLabels.meeting'),
    task_due: t('calendar.topicLabels.task_due'),
  };

  const VIEW_MODES = [
    { key: 'day' as const, label: t('calendarPage.viewModes.day') },
    { key: 'week' as const, label: t('calendarPage.viewModes.week') },
    { key: 'month' as const, label: t('calendarPage.viewModes.month') },
  ];

  useEffect(() => {
    if (!topicOpen) return;
    const handler = (e: MouseEvent) => {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) setTopicOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [topicOpen]);

  useEffect(() => {
    if (!datePickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node))
        setDatePickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [datePickerOpen]);

  // Derive from/to based on view mode
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Trigger label adapts to the active view: full date / week range / month + year.
  const pickerLabel = (() => {
    if (viewMode === 'day') return `${MONTHS[month]} ${currentDate.getDate()}, ${year}`;
    if (viewMode === 'month') return `${MONTHS[month]} ${year}`;
    const s = weekStart;
    const e = weekEnd;
    if (s.getMonth() === e.getMonth())
      return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
    if (s.getFullYear() === e.getFullYear())
      return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`;
    return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()}, ${s.getFullYear()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  })();

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

  // "Next 7 days" sidebar (Month view only) — a rolling window from today, driven
  // by the same hook and honouring the active Topics filter.
  const upcomingRange = useMemo(
    () => ({ from: toIsoDate(today), to: toIsoDate(addDays(today, 6)) }),
    [today],
  );
  const { data: upcomingData, isLoading: upcomingLoading } = useCalendarEvents({
    from: upcomingRange.from,
    to: upcomingRange.to,
    types: activeTypes,
  });
  const upcomingDays: CalendarDay[] = upcomingData?.items ?? [];

  const goToday = () => setCurrentDate(new Date());

  const stepDate = (dir: -1 | 1) => {
    if (viewMode === 'day') setCurrentDate(d => addDays(d, dir));
    else if (viewMode === 'week') setCurrentDate(d => addDays(d, dir * 7));
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  };

  const toggleTopic = (type: CalendarItemType) => {
    setTopicFilter(prev => {
      const current = prev.length ? prev : ALL_TYPES;
      const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
      return next.length === ALL_TYPES.length ? [] : next;
    });
  };

  // Date range badge label per mode
  const badgeDateFrom =
    viewMode === 'week' ? weekStart : viewMode === 'day' ? currentDate : startOfMonth(currentDate);
  const badgeDateTo =
    viewMode === 'week' ? weekEnd : viewMode === 'day' ? currentDate : endOfMonth(currentDate);

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      {/* Page header */}
      <div className="shrink-0 mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link to="/" className="hover:text-gray-600">
              {t('calendarPage.breadcrumbDashboard')}
            </Link>
            <Icon name="chevron-right" style="solid" className="size-2.5" />
            <span>{t('calendarPage.breadcrumbCalendar')}</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{t('calendarPage.title')}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('calendarPage.subtitle')}</p>
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
                  viewMode === m.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
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
            {t('calendarPage.today')}
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
            aria-label={t('calendar.aria.previous')}
          >
            <Icon name="chevron-left" style="solid" className="size-4" />
          </button>

          {/* Date picker (MS Teams-style dual pane), adapts per view */}
          <div ref={datePickerRef} className="relative">
            <button
              type="button"
              onClick={() => setDatePickerOpen(o => !o)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={t('calendar.aria.selectDate')}
            >
              {pickerLabel}
              <Icon name="chevron-down" style="solid" className="size-3 text-gray-400" />
            </button>
            {datePickerOpen && (
              <div className="absolute left-0 z-20 mt-1 rounded-lg border border-gray-200 bg-white shadow-xl">
                <TeamsDatePicker
                  mode={viewMode}
                  selected={currentDate}
                  today={today}
                  dayLabels={DAYS}
                  months={MONTHS}
                  monthsShort={MONTHS_SHORT}
                  todayLabel={t('calendarPage.today')}
                  onSelect={d => {
                    setCurrentDate(d);
                    setDatePickerOpen(false);
                  }}
                  onNavigate={d => setCurrentDate(d)}
                  prevAria={t('calendar.aria.previous')}
                  nextAria={t('calendar.aria.next')}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => stepDate(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={t('calendar.aria.next')}
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
              {t('calendarPage.topicsLabel')}
              {topicFilter.length > 0 && (
                <span className="text-[11px] font-bold bg-blue-600 text-white rounded-full size-4 flex items-center justify-center">
                  {topicFilter.length}
                </span>
              )}
            </button>
            {topicOpen && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg p-2">
                <p className="text-xs font-semibold text-gray-500 px-1 mb-1">
                  {t('calendarPage.topicsLabel')}
                </p>
                {ALL_TYPES.map(type => {
                  const checked = topicFilter.length === 0 || topicFilter.includes(type);
                  return (
                    <label
                      key={type}
                      className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                    >
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
          <p className="text-gray-600">{t('calendarPage.error')}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-blue-600 hover:text-blue-700"
          >
            {t('widgetError.retry')}
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex gap-4">
          <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col">
            {viewMode === 'day' && (
              <DayView
                date={currentDate}
                eventMap={eventMap}
                isLoading={isLoading}
                noEventsLabel={t('calendarPage.noEventsForDay')}
                categoryLabel={cat => CATEGORY_LABEL[cat]}
              />
            )}
            {viewMode === 'week' && (
              <WeekView
                weekStart={weekStart}
                eventMap={eventMap}
                isLoading={isLoading}
                today={today}
                dayLabels={DAYS}
                categoryLabel={cat => CATEGORY_LABEL[cat]}
              />
            )}
            {viewMode === 'month' && (
              <MonthView
                currentDate={currentDate}
                eventMap={eventMap}
                isLoading={isLoading}
                today={today}
                dayLabels={DAYS}
                categoryLabel={cat => CATEGORY_LABEL[cat]}
                eventsCountLabel={n => t('calendarPage.eventsCount', { count: n })}
                closeLabel={t('calendarPage.close')}
              />
            )}

            {/* Legend */}
            <div className="mt-3 flex items-center gap-4 shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_DOT_CLASS.meeting}`} />
                <span className="text-xs text-gray-500">{t('calendar.legend.meeting')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center -space-x-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${CATEGORY_DOT_CLASS.task} ring-1 ring-white`}
                  />
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${CATEGORY_DOT_CLASS.sla} ring-1 ring-white`}
                  />
                </span>
                <span className="text-xs text-gray-500">
                  {t('calendar.legend.taskDue')}{' '}
                  <span className="text-gray-400">({t('calendar.legend.slaCritical')})</span>
                </span>
              </div>
            </div>
          </div>

          {viewMode === 'month' && (
            <NextSevenDaysPanel
              today={today}
              days={upcomingDays}
              isLoading={upcomingLoading}
              categoryLabel={cat => CATEGORY_LABEL[cat]}
              title={t('calendarPage.next7Days')}
              eventsCountLabel={n => t('calendarPage.eventsCount', { count: n })}
              todayLabel={t('calendarPage.todayGroupLabel')}
              emptyLabel={t('calendarPage.noUpcoming')}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
