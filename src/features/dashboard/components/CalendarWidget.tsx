import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';
import WidgetDateRangeBadge from './WidgetDateRangeBadge';
import { useCalendarEvents } from '../api/hooks';
import { useDashboardStore } from '../store';
import { toIsoDate } from '../utils/periodPresets';
import type { CalendarItem, CalendarItemType, CalendarLinkEntityType } from '../api/types';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WIDGET_ID = 'calendar';

type CalendarWidgetSettings = {
  topicFilter?: CalendarItemType[];
};

const EMPTY_SETTINGS: CalendarWidgetSettings = Object.freeze({}) as CalendarWidgetSettings;

// Visual category derived from (type + isSlaCritical). Used for dot color,
// legend, and aggregated day counts. Distinct from CalendarItemType because
// the SLA-critical state is no longer its own backend type.
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

function buildDaySummary(items: CalendarItem[]): string {
  if (items.length === 0) return '';
  const counts: Record<VisualCategory, number> = { meeting: 0, sla: 0, task: 0 };
  for (const i of items) counts[categoryOf(i)]++;
  const parts: string[] = [];
  if (counts.sla) parts.push(`${counts.sla} SLA`);
  if (counts.task) parts.push(`${counts.task} task${counts.task === 1 ? '' : 's'}`);
  if (counts.meeting) parts.push(`${counts.meeting} meeting${counts.meeting === 1 ? '' : 's'}`);
  return `${items.length} event${items.length === 1 ? '' : 's'} · ${parts.join(', ')}`;
}

function buildEntityUrl(entityType: CalendarLinkEntityType, entityId: string): string {
  switch (entityType) {
    case 'appraisal': return `/appraisals/${entityId}`;
    case 'request': return `/requests/${entityId}`;
    case 'task': return `/tasks/${entityId}/opening`;
    case 'meeting': return `/meetings/${entityId}`;
  }
}

function getDayDotColors(items: CalendarItem[]): string[] {
  const seen = new Set<VisualCategory>();
  const colors: string[] = [];
  for (const item of items) {
    const cat = categoryOf(item);
    if (!seen.has(cat)) { seen.add(cat); colors.push(CATEGORY_DOT_CLASS[cat]); }
    if (colors.length === 3) break;
  }
  return colors;
}

type PopoverProps = {
  items: CalendarItem[];
  dateLabel: string;
  onClose: () => void;
  anchorRef: { current: HTMLButtonElement | null };
};

function DayPopover({ items, dateLabel, onClose, anchorRef }: PopoverProps) {
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [align, setAlign] = useState<'center' | 'start' | 'end'>('center');

  useEffect(() => {
    function handleClick(e: globalThis.MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const pop = popoverRef.current;
    if (!anchor || !pop) return;
    const anchorRect = anchor.getBoundingClientRect();
    const popoverWidth = pop.offsetWidth;
    const viewportW = window.innerWidth;
    const margin = 8;
    const centerLeft = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
    const centerRight = centerLeft + popoverWidth;
    if (centerRight > viewportW - margin) setAlign('end');
    else if (centerLeft < margin) setAlign('start');
    else setAlign('center');
  }, [anchorRef, items]);

  const alignClasses =
    align === 'center' ? 'left-1/2 -translate-x-1/2' : align === 'end' ? 'right-0' : 'left-0';

  return (
    <div
      ref={popoverRef}
      className={`absolute z-50 ${alignClasses} mt-1 w-72 max-h-80 overflow-auto bg-white rounded-xl shadow-lg border border-gray-100 py-2`}
      style={{ top: '100%' }}
    >
      <p className="px-3 pb-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1">
        {dateLabel}
        <span className="ml-2 font-normal text-gray-400">
          · {items.length} event{items.length === 1 ? '' : 's'}
        </span>
      </p>
      {items.map((item, idx) => {
        const cat = categoryOf(item);
        return (
        <button
          key={idx}
          type="button"
          title={`${CATEGORY_LABEL[cat]}${item.time ? ` at ${item.time.slice(0, 5)}` : ''}${item.appraisalNumber ? ` · ${item.appraisalNumber}` : ''} — ${item.title}`}
          onClick={() => { navigate(buildEntityUrl(item.linkEntityType, item.linkEntityId)); onClose(); }}
          className="w-full flex items-start gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
        >
          <span className={`mt-1.5 size-2 rounded-full shrink-0 ${CATEGORY_DOT_CLASS[cat]}`} />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm text-gray-800 leading-snug break-words">{item.title}</span>
            <span className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{CATEGORY_LABEL[cat]}</span>
              {item.time && (<><span className="text-gray-300">·</span><span>{item.time.slice(0, 5)}</span></>)}
              {item.appraisalNumber && (<><span className="text-gray-300">·</span><span className="font-medium text-gray-600 tabular-nums">{item.appraisalNumber}</span></>)}
            </span>
          </div>
        </button>
        );
      })}
    </div>
  );
}

const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => THIS_YEAR - 5 + i);

function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [topicOpen, setTopicOpen] = useState(false);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);
  const topicRef = useRef<HTMLDivElement>(null);

  const settings = useDashboardStore(
    s => (s.widgets.find(w => w.id === WIDGET_ID)?.settings as CalendarWidgetSettings | undefined) ?? EMPTY_SETTINGS,
  );
  const updateSettings = useDashboardStore(s => s.updateWidgetSettings);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  useEffect(() => {
    if (!topicOpen) return;
    const handler = (e: MouseEvent) => {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) setTopicOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [topicOpen]);

  // Active type filter: undefined = all
  const activeTypes: CalendarItemType[] | undefined =
    settings.topicFilter && settings.topicFilter.length > 0 ? settings.topicFilter : undefined;

  const from = toIsoDate(startOfMonth(currentDate));
  const to = toIsoDate(endOfMonth(currentDate));

  const { data: calendarData } = useCalendarEvents({
    from,
    to,
    types: activeTypes,
  });

  const eventMap = new Map<string, CalendarItem[]>();
  for (const day of calendarData?.items ?? []) eventMap.set(day.date, day.items);

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayWeekday; i++) {
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    days.push(prevMonthLastDay - firstDayWeekday + i + 1);
  }
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) days.push(i);

  const isTodayCell = (day: number, index: number) => {
    const inCurrent = index >= firstDayWeekday && index < firstDayWeekday + daysInMonth;
    return inCurrent && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const isCurrentMonthCell = (index: number) => index >= firstDayWeekday && index < firstDayWeekday + daysInMonth;

  const getDateKey = (day: number, index: number): string | null => {
    if (!isCurrentMonthCell(index)) return null;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const selectedItems = selectedDay ? (eventMap.get(selectedDay) ?? []) : [];
  const selectedDateLabel = selectedDay ? format(new Date(selectedDay + 'T00:00:00'), 'MMM d, yyyy') : '';

  const toggleTopic = (type: CalendarItemType) => {
    // Empty filter means "all visible"; expand it before removing the clicked type
    // so the UI matches the checkboxes (which render as all-checked when empty).
    const current = settings.topicFilter?.length ? settings.topicFilter : ALL_TYPES;
    const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    updateSettings(WIDGET_ID, { topicFilter: next.length === ALL_TYPES.length ? [] : next });
  };

  const activeFilterCount = (settings.topicFilter ?? []).length;

  return (
    <WidgetWrapper id={WIDGET_ID}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-semibold text-gray-800">Calendar</h3>
            <WidgetDateRangeBadge
              label={`${MONTH_SHORT[month]} ${year}`}
            />
          </div>
          <Link
            to="/calendar"
            className="text-blue-500 text-sm font-medium hover:text-blue-600 flex items-center gap-1.5 transition-colors"
          >
            View Calendar
            <Icon name="arrow-up-right-from-square" style="solid" className="size-3" />
          </Link>
        </div>

        <div className="p-5">
          {/* Month navigation with jump picker */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Icon name="chevron-left" style="solid" className="size-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={month}
                onChange={e => setCurrentDate(new Date(year, Number(e.target.value), 1))}
                className="text-sm font-semibold text-gray-800 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded cursor-pointer pr-1"
                aria-label="Select month"
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                value={year}
                onChange={e => setCurrentDate(new Date(Number(e.target.value), month, 1))}
                className="text-sm font-semibold text-gray-800 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded cursor-pointer"
                aria-label="Select year"
              >
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1">
              {/* Topic filter */}
              <div ref={topicRef} className="relative">
                <button
                  type="button"
                  onClick={() => setTopicOpen(o => !o)}
                  aria-label="Filter by topic"
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors relative ${
                    activeFilterCount > 0 ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                  }`}
                >
                  <Icon name="filter" style="solid" className="size-3.5" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 size-3.5 text-[9px] font-bold rounded-full bg-blue-600 text-white flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {topicOpen && (
                  <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg p-2">
                    <p className="text-xs font-semibold text-gray-500 px-1 mb-1">Topics</p>
                    {ALL_TYPES.map(type => {
                      const checked = !(settings.topicFilter?.length) || settings.topicFilter.includes(type);
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
              <button
                type="button"
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <Icon name="chevron-right" style="solid" className="size-4" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {DAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const dateKey = getDateKey(day as number, index);
              const dayItems = dateKey ? (eventMap.get(dateKey) ?? []) : [];
              const dotColors = getDayDotColors(dayItems);
              const isSelected = dateKey !== null && selectedDay === dateKey;
              const daySummary = buildDaySummary(dayItems);

              return (
                <div key={index} className="relative">
                  <button
                    type="button"
                    title={daySummary || undefined}
                    onClick={e => {
                      if (!dateKey) return;
                      const items = eventMap.get(dateKey);
                      if (!items || items.length === 0) { setSelectedDay(null); return; }
                      if (selectedDay === dateKey) { setSelectedDay(null); }
                      else { activeBtnRef.current = e.currentTarget; setSelectedDay(dateKey); }
                    }}
                    className={`w-full aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition-all pb-0.5 ${
                      isTodayCell(day as number, index)
                        ? 'bg-blue-500 text-white font-semibold shadow-sm'
                        : isSelected
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : isCurrentMonthCell(index)
                            ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                            : 'text-gray-300'
                    }`}
                  >
                    <span>{day}</span>
                    {dotColors.length > 0 && (
                      <span className="flex gap-0.5 mt-0.5">
                        {dotColors.map((color, di) => (
                          <span key={di} className={`size-1 rounded-full ${color}`} />
                        ))}
                      </span>
                    )}
                  </button>
                  {isSelected && selectedItems.length > 0 && (
                    <DayPopover
                      items={selectedItems}
                      dateLabel={selectedDateLabel}
                      onClose={() => setSelectedDay(null)}
                      anchorRef={activeBtnRef}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default CalendarWidget;
