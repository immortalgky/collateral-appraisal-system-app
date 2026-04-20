import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';
import { useCalendarEvents } from '../api/hooks';
import type { CalendarItem, CalendarLinkEntityType } from '../api/types';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Dot colors keyed by calendar item type
const TYPE_DOT_CLASS: Record<CalendarItem['type'], string> = {
  meeting: 'bg-blue-500',
  task_due: 'bg-amber-400',
  sla_deadline: 'bg-red-500',
};

const TYPE_LABEL: Record<CalendarItem['type'], string> = {
  meeting: 'Meeting',
  task_due: 'Task due',
  sla_deadline: 'SLA deadline',
};

// Compact human-readable summary: "3 events · 2 tasks, 1 meeting"
function buildDaySummary(items: CalendarItem[]): string {
  if (items.length === 0) return '';
  const counts: Record<CalendarItem['type'], number> = {
    meeting: 0,
    task_due: 0,
    sla_deadline: 0,
  };
  for (const i of items) counts[i.type]++;
  const parts: string[] = [];
  if (counts.sla_deadline) parts.push(`${counts.sla_deadline} SLA`);
  if (counts.task_due) parts.push(`${counts.task_due} task${counts.task_due === 1 ? '' : 's'}`);
  if (counts.meeting) parts.push(`${counts.meeting} meeting${counts.meeting === 1 ? '' : 's'}`);
  return `${items.length} event${items.length === 1 ? '' : 's'} · ${parts.join(', ')}`;
}

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

// Derive a compact dot color set (up to 3 distinct types) for a day
function getDayDotColors(items: CalendarItem[]): string[] {
  const seen = new Set<CalendarItem['type']>();
  const colors: string[] = [];
  for (const item of items) {
    if (!seen.has(item.type)) {
      seen.add(item.type);
      colors.push(TYPE_DOT_CLASS[item.type]);
    }
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
  // Horizontal alignment relative to the anchor cell: 'center' by default,
  // 'end' pins the popover's right edge to the cell's right edge (use near the
  // right edge of the viewport), 'start' pins the left edges together.
  const [align, setAlign] = useState<'center' | 'start' | 'end'>('center');

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: globalThis.MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  // Pick an alignment based on available viewport space before paint so the
  // popover never overflows the right edge of the widget/viewport.
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

    if (centerRight > viewportW - margin) {
      setAlign('end');
    } else if (centerLeft < margin) {
      setAlign('start');
    } else {
      setAlign('center');
    }
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
      {items.map((item, idx) => (
        <button
          key={idx}
          type="button"
          title={`${TYPE_LABEL[item.type]}${item.time ? ` at ${item.time.slice(0, 5)}` : ''}${item.appraisalNumber ? ` · ${item.appraisalNumber}` : ''} — ${item.title}`}
          onClick={() => {
            navigate(buildEntityUrl(item.linkEntityType, item.linkEntityId));
            onClose();
          }}
          className="w-full flex items-start gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
        >
          <span className={`mt-1.5 size-2 rounded-full shrink-0 ${TYPE_DOT_CLASS[item.type]}`} />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm text-gray-800 leading-snug break-words">{item.title}</span>
            <span className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{TYPE_LABEL[item.type]}</span>
              {item.time && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>{item.time.slice(0, 5)}</span>
                </>
              )}
              {item.appraisalNumber && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="font-medium text-gray-600 tabular-nums">
                    {item.appraisalNumber}
                  </span>
                </>
              )}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // YYYY-MM-DD
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  // Derive YYYY-MM string for the query
  const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`;

  const { data: calendarData } = useCalendarEvents(monthParam);

  // Build lookup map: YYYY-MM-DD -> CalendarItem[]
  const eventMap = new Map<string, CalendarItem[]>();
  for (const day of calendarData?.items ?? []) {
    eventMap.set(day.date, day.items);
  }

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  // Generate calendar cells: prev-month padding, current month, next-month padding
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayWeekday; i++) {
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    days.push(prevMonthLastDay - firstDayWeekday + i + 1);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(i);
  }

  const isTodayCell = (day: number, index: number) => {
    const inCurrentMonth = index >= firstDayWeekday && index < firstDayWeekday + daysInMonth;
    return (
      inCurrentMonth &&
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isCurrentMonthCell = (index: number) =>
    index >= firstDayWeekday && index < firstDayWeekday + daysInMonth;

  const getDateKey = (day: number, index: number): string | null => {
    if (!isCurrentMonthCell(index)) return null;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const selectedItems = selectedDay ? (eventMap.get(selectedDay) ?? []) : [];
  const selectedDateLabel = selectedDay
    ? format(new Date(selectedDay + 'T00:00:00'), 'MMM d, yyyy')
    : '';

  return (
    <WidgetWrapper id="calendar">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Calendar</h3>
          <Link
            to="/calendar"
            className="text-blue-500 text-sm font-medium hover:text-blue-600 flex items-center gap-1.5 transition-colors"
          >
            View Calendar
            <Icon name="arrow-up-right-from-square" style="solid" className="size-3" />
          </Link>
        </div>

        <div className="p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Icon name="chevron-left" style="solid" className="size-4" />
            </button>
            <span className="font-semibold text-gray-800">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Icon name="chevron-right" style="solid" className="size-4" />
            </button>
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
              // Guard against dateKey === null — otherwise selectedDay === null === dateKey
              // marks every padding cell as "selected" when nothing is picked.
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
                      if (!items || items.length === 0) {
                        setSelectedDay(null);
                        return;
                      }
                      if (selectedDay === dateKey) {
                        setSelectedDay(null);
                      } else {
                        activeBtnRef.current = e.currentTarget;
                        setSelectedDay(dateKey);
                      }
                    }}
                    className={`
                      w-full aspect-square flex flex-col items-center justify-center text-sm rounded-lg transition-all pb-0.5
                      ${
                        isTodayCell(day as number, index)
                          ? 'bg-blue-500 text-white font-semibold shadow-sm'
                          : isSelected
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : isCurrentMonthCell(index)
                              ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                              : 'text-gray-300'
                      }
                    `}
                  >
                    <span>{day}</span>
                    {/* Event dots */}
                    {dotColors.length > 0 && (
                      <span className="flex gap-0.5 mt-0.5">
                        {dotColors.map((color, di) => (
                          <span key={di} className={`size-1 rounded-full ${color}`} />
                        ))}
                      </span>
                    )}
                  </button>

                  {/* Popover for selected day */}
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
