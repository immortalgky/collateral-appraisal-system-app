import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatDistanceToNow,
  formatDistanceToNowStrict,
  format,
  parseISO,
  differenceInHours,
} from 'date-fns';
import Icon from '@shared/components/Icon';
import { Skeleton } from '@shared/components/Skeleton';
import WidgetWrapper from './WidgetWrapper';
import WidgetDateRangeBadge from './WidgetDateRangeBadge';
import { useReminders } from '../api/hooks';
import type { ReminderItem, ReminderItemType } from '../api/types';

type ChipKey = 'all' | 'overdue' | ReminderItemType;

function formatDueLabel(dueAt: string | null, overdue: boolean): string {
  if (!dueAt) return '';
  const date = parseISO(dueAt);
  if (overdue) return `Overdue · ${format(date, 'MMM d, h:mm a')}`;
  const hoursUntilDue = differenceInHours(date, new Date());
  if (hoursUntilDue < 6) return `in ${formatDistanceToNowStrict(date, { addSuffix: false })}`;
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
  const { t } = useTranslation('dashboard');
  const { data, isLoading, dataUpdatedAt } = useReminders();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeChip, setActiveChip] = useState<ChipKey>('all');

  // Built inside component so t() is in scope
  const CHIPS: Array<{ key: ChipKey; label: string }> = [
    { key: 'all', label: t('reminders.chips.all') },
    { key: 'overdue', label: t('reminders.chips.overdue') },
    { key: 'task_due', label: t('reminders.chips.task_due') },
    { key: 'followup', label: t('reminders.chips.followup') },
  ];

  const allVisible: ReminderItem[] = (data?.items ?? []).filter(item => !dismissed.has(item.id));

  const filtered = allVisible.filter(item => {
    if (activeChip === 'all') return true;
    if (activeChip === 'overdue') return item.overdue;
    return item.type === activeChip;
  });

  const updatedLabel = dataUpdatedAt
    ? formatDistanceToNow(dataUpdatedAt, { addSuffix: false })
    : null;

  return (
    <WidgetWrapper id="reminders">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-0.5 px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-semibold text-gray-800">
            {t('reminders.title')}
            {!isLoading && allVisible.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">· {allVisible.length}</span>
            )}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
            <WidgetDateRangeBadge asOf={new Date()} />
            {updatedLabel && (
              <>
                <span aria-hidden>·</span>
                <span>{t('updatedAgo', { n: updatedLabel })}</span>
              </>
            )}
          </div>
        </div>

        {/* Chip filter strip */}
        {!isLoading && allVisible.length > 0 && (
          <div className="flex items-center gap-1.5 px-5 py-2 border-b border-gray-50 flex-wrap shrink-0">
            {CHIPS.map(chip => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setActiveChip(chip.key)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  activeChip === chip.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {isLoading ? (
            <>
              <ReminderRowSkeleton />
              <ReminderRowSkeleton />
              <ReminderRowSkeleton />
            </>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-5 gap-2">
              <div className="p-3 rounded-full bg-green-50">
                <Icon name="check" style="solid" className="size-5 text-green-500" />
              </div>
              <p className="text-sm text-gray-500 text-center">
                {allVisible.length === 0
                  ? t('reminders.noneAll')
                  : t('reminders.noneFiltered', {
                      filter:
                        activeChip === 'all'
                          ? ''
                          : CHIPS.find(c => c.key === activeChip)?.label.toLowerCase() + ' ',
                    })}
              </p>
            </div>
          ) : (
            filtered.map(item => {
              const dueLabel = formatDueLabel(item.dueAt, item.overdue);
              return (
                <div key={item.id} className="flex items-center gap-3 px-5 py-4 group">
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
                    {item.appraisalNumber && (
                      <span className="text-xs font-semibold text-blue-600">
                        {item.appraisalNumber}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-800 truncate">{item.title}</span>
                    {dueLabel && <span className="text-xs text-gray-400">{dueLabel}</span>}
                  </div>

                  {item.overdue && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full shrink-0 bg-red-50 text-red-600">
                      {t('reminders.overdueLabel')}
                    </span>
                  )}

                  {/* Dismiss */}
                  <button
                    type="button"
                    onClick={() => setDismissed(prev => new Set([...prev, item.id]))}
                    aria-label={t('reminders.aria.dismiss')}
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
