import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, addDays, addMonths, startOfMonth, endOfMonth, isSameDay } from 'date-fns';

import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import { useCalendarEvents } from '../api/hooks';
import type { CalendarItem, CalendarLinkEntityType } from '../api/types';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const TYPE_DOT_CLASS: Record<CalendarItem['type'], string> = {
  meeting: 'bg-blue-500',
  task_due: 'bg-amber-400',
  sla_deadline: 'bg-red-500',
};

const TYPE_TEXT_CLASS: Record<CalendarItem['type'], string> = {
  meeting: 'text-blue-700 bg-blue-50 border-blue-100',
  task_due: 'text-amber-700 bg-amber-50 border-amber-100',
  sla_deadline: 'text-red-700 bg-red-50 border-red-100',
};

const TYPE_LABEL: Record<CalendarItem['type'], string> = {
  meeting: 'Meeting',
  task_due: 'Task due',
  sla_deadline: 'SLA deadline',
};

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

const monthParamOf = (d: Date) => format(d, 'yyyy-MM');
const dateKeyOf = (d: Date) => format(d, 'yyyy-MM-dd');

const AGENDA_DAYS = 7;

function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const today = useMemo(() => new Date(), []);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch the visible month
  const currentMonthParam = monthParamOf(currentDate);
  const current = useCalendarEvents(currentMonthParam);

  // Agenda = today + next 7 days. May span into next month; fetch it too when needed.
  const agendaEnd = addDays(today, AGENDA_DAYS - 1);
  const agendaSpansNextMonth = agendaEnd.getMonth() !== today.getMonth();
  const nextMonthParam = monthParamOf(addMonths(today, 1));
  const next = useCalendarEvents(agendaSpansNextMonth ? nextMonthParam : currentMonthParam);

  // Merge event maps from whichever responses cover the agenda window.
  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const d of current.data?.items ?? []) map.set(d.date, d.items);
    if (agendaSpansNextMonth) {
      for (const d of next.data?.items ?? []) {
        const existing = map.get(d.date);
        map.set(d.date, existing ? [...existing, ...d.items] : d.items);
      }
    }
    return map;
  }, [current.data, next.data, agendaSpansNextMonth]);

  // Grid cell layout
  const firstOfMonth = startOfMonth(currentDate);
  const lastOfMonth = endOfMonth(currentDate);
  const firstDayWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastOfMonth.getDate();

  const gridCells: Array<{ date: Date; inMonth: boolean }> = [];
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = 0; i < firstDayWeekday; i++) {
    gridCells.push({
      date: new Date(year, month - 1, prevMonthLastDay - firstDayWeekday + i + 1),
      inMonth: false,
    });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    gridCells.push({ date: new Date(year, month, i), inMonth: true });
  }
  const trailing = 42 - gridCells.length;
  for (let i = 1; i <= trailing; i++) {
    gridCells.push({ date: new Date(year, month + 1, i), inMonth: false });
  }

  // Agenda data: today → today+6
  const agendaDays = useMemo(() => {
    const out: Array<{ date: Date; items: CalendarItem[] }> = [];
    for (let i = 0; i < AGENDA_DAYS; i++) {
      const d = addDays(today, i);
      out.push({ date: d, items: eventMap.get(dateKeyOf(d)) ?? [] });
    }
    return out;
  }, [today, eventMap]);

  const totalAgendaCount = agendaDays.reduce((s, d) => s + d.items.length, 0);

  const isLoading = current.isLoading || (agendaSpansNextMonth && next.isLoading);
  const isError = current.isError || (agendaSpansNextMonth && next.isError);

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <div className="shrink-0 mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Link to="/" className="hover:text-gray-600">
              Dashboard
            </Link>
            <Icon name="chevron-right" style="solid" className="size-2.5" />
            <span>Calendar</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Calendar</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Meetings, task due dates and SLA deadlines assigned to you
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCurrentDate(new Date())}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
        >
          Today
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Month grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <button
              type="button"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Previous month"
            >
              <Icon name="chevron-left" style="solid" className="size-4" />
            </button>
            <span className="font-semibold text-gray-800">{format(currentDate, 'MMMM yyyy')}</span>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Next month"
            >
              <Icon name="chevron-right" style="solid" className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2 shrink-0">
            {DAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {isError ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm">
              <Icon name="triangle-exclamation" style="solid" className="size-5 text-red-500" />
              <p className="text-gray-600">Unable to load calendar events</p>
              <button
                type="button"
                onClick={() => current.refetch()}
                className="text-blue-600 hover:text-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1 min-h-0">
              {gridCells.map((cell, idx) => {
                const key = dateKeyOf(cell.date);
                // Only surface events on in-month cells; padding days from neighbouring months
                // stay visually quiet so they don't compete with the real month's content.
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
                        <span className="text-[10px] text-gray-400 tabular-nums">
                          {items.length}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 px-1 pb-1 flex flex-col gap-0.5 overflow-hidden">
                      {isLoading && cell.inMonth ? (
                        <>
                          <Skeleton variant="rounded" height={14} />
                          <Skeleton variant="rounded" height={14} />
                        </>
                      ) : (
                        visible.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            title={`${TYPE_LABEL[item.type]}${item.time ? ` at ${item.time.slice(0, 5)}` : ''}${item.appraisalNumber ? ` · ${item.appraisalNumber}` : ''} — ${item.title}`}
                            onClick={() =>
                              navigate(buildEntityUrl(item.linkEntityType, item.linkEntityId))
                            }
                            className={`text-left text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate ${TYPE_TEXT_CLASS[item.type]} hover:brightness-95`}
                          >
                            {item.time && (
                              <span className="font-medium mr-1">{item.time.slice(0, 5)}</span>
                            )}
                            {item.appraisalNumber && (
                              <span className="font-semibold mr-1 tabular-nums">
                                {item.appraisalNumber}
                              </span>
                            )}
                            {item.title}
                          </button>
                        ))
                      )}
                      {hidden > 0 && (
                        <span className="text-[10px] text-gray-400 px-1">+{hidden} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 shrink-0 flex-wrap">
            {(['meeting', 'task_due', 'sla_deadline'] as const).map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${TYPE_DOT_CLASS[t]}`} />
                <span className="text-xs text-gray-500">{TYPE_LABEL[t]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Agenda panel */}
        <aside className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="font-semibold text-gray-800">Next {AGENDA_DAYS} days</h3>
            {!isLoading && (
              <span className="text-xs text-gray-400 tabular-nums">
                {totalAgendaCount} event{totalAgendaCount === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto -mx-2 px-2">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={48} />
                ))}
              </div>
            ) : totalAgendaCount === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-12">
                <div className="size-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <Icon name="calendar-check" style="regular" className="size-5 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">You&apos;re clear for the next week</p>
              </div>
            ) : (
              <div className="space-y-4">
                {agendaDays.map(day => {
                  const isTodayDay = isSameDay(day.date, today);
                  if (day.items.length === 0) return null;
                  return (
                    <section key={dateKeyOf(day.date)}>
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span
                          className={`text-xs font-semibold uppercase tracking-wide ${isTodayDay ? 'text-blue-600' : 'text-gray-500'}`}
                        >
                          {isTodayDay ? 'Today' : format(day.date, 'EEE, d MMM')}
                        </span>
                        {!isTodayDay && (
                          <span className="text-xs text-gray-300">{format(day.date, 'yyyy')}</span>
                        )}
                      </div>
                      <ul className="space-y-1.5">
                        {day.items.map((item, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              title={`${TYPE_LABEL[item.type]}${item.appraisalNumber ? ` · ${item.appraisalNumber}` : ''} — ${item.title}`}
                              onClick={() =>
                                navigate(buildEntityUrl(item.linkEntityType, item.linkEntityId))
                              }
                              className="w-full flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 text-left transition-colors"
                            >
                              <span
                                className={`mt-1 size-2 rounded-full shrink-0 ${TYPE_DOT_CLASS[item.type]}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {item.appraisalNumber && (
                                    <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded tabular-nums shrink-0">
                                      {item.appraisalNumber}
                                    </span>
                                  )}
                                  <p className="text-sm text-gray-800 leading-snug break-words">
                                    {item.title}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                                  <span>{TYPE_LABEL[item.type]}</span>
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
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default CalendarPage;
