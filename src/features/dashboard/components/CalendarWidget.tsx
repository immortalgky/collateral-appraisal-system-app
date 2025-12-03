import { useState } from 'react';
import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar days
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

  const isToday = (day: number, index: number) => {
    const isCurrentMonth = index >= firstDayWeekday && index < firstDayWeekday + daysInMonth;
    return (
      isCurrentMonth &&
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isCurrentMonth = (index: number) => {
    return index >= firstDayWeekday && index < firstDayWeekday + daysInMonth;
  };

  return (
    <WidgetWrapper id="calendar">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Calendar</h3>
          <a href="/calendar" className="text-blue-500 text-sm font-medium hover:text-blue-600 flex items-center gap-1.5 transition-colors">
            View Calendar
            <Icon name="arrow-up-right-from-square" style="solid" className="size-3" />
          </a>
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
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <button
                key={index}
                type="button"
                className={`
                  aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                  ${isToday(day as number, index)
                    ? 'bg-blue-500 text-white font-semibold shadow-sm'
                    : isCurrentMonth(index)
                      ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      : 'text-gray-300'
                  }
                `}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default CalendarWidget;
