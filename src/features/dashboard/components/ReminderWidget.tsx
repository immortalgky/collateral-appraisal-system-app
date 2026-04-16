import { useState } from 'react';
import { formatDistanceToNowStrict, format, parseISO, differenceInHours } from 'date-fns';
import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import WidgetWrapper from './WidgetWrapper';
import { useReminders } from '../api/hooks';
import type { ReminderItem } from '../api/types';

function formatDueLabel(dueAt: string | null, overdue: boolean): string {
  if (!dueAt) return '';
  const date = parseISO(dueAt);
  if (overdue) {
    return `Overdue · ${format(date, 'MMM d, h:mm a')}`;
  }
  const hoursUntilDue = differenceInHours(date, new Date());
  if (hoursUntilDue < 6) {
    return `in ${formatDistanceToNowStrict(date, { addSuffix: false })}`;
  }
  return format(date, 'MMM d, h:mm a');
}

function ReminderRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Skeleton variant="circular" className="size-8 shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

function ReminderWidget() {
  const { data, isLoading } = useReminders();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleItems: ReminderItem[] = (data?.items ?? []).filter(
    (item) => !dismissed.has(item.id)
  );

  return (
    <WidgetWrapper id="reminders">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-semibold text-gray-800">Reminders</h3>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Icon name="ellipsis-vertical" style="solid" className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {isLoading ? (
            <>
              <ReminderRowSkeleton />
              <ReminderRowSkeleton />
              <ReminderRowSkeleton />
            </>
          ) : visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-5 gap-2">
              <div className="p-3 rounded-full bg-green-50">
                <Icon name="check" style="solid" className="size-5 text-green-500" />
              </div>
              <p className="text-sm text-gray-500 text-center">
                No reminders — you're all caught up.
              </p>
            </div>
          ) : (
            visibleItems.map((item) => {
              const dueLabel = formatDueLabel(item.dueAt, item.overdue);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-4 group"
                >
                  <div
                    className={`p-2 rounded-full shrink-0 ${item.overdue ? 'bg-red-50' : 'bg-blue-50'}`}
                  >
                    <Icon
                      name="bell"
                      style="solid"
                      className={`size-4 ${item.overdue ? 'text-red-500' : 'text-blue-500'}`}
                    />
                  </div>

                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {item.title}
                    </span>
                    <div className="flex items-center gap-2">
                      {item.appraisalNumber && (
                        <span className="text-xs font-medium text-blue-600">
                          {item.appraisalNumber}
                        </span>
                      )}
                      {dueLabel && (
                        <span className="text-xs text-gray-400">{dueLabel}</span>
                      )}
                    </div>
                  </div>

                  {item.overdue && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full shrink-0 bg-red-50 text-red-600">
                      Overdue
                    </span>
                  )}

                  {/* Dismiss — visible on row hover */}
                  <button
                    type="button"
                    onClick={() =>
                      setDismissed((prev) => new Set([...prev, item.id]))
                    }
                    aria-label="Dismiss reminder"
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <Icon name="xmark" style="solid" className="size-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default ReminderWidget;
