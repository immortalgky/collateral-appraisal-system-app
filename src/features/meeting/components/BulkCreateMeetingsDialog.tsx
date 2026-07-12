import { useMemo, useState } from 'react';
import { DayPicker, type DayButtonProps } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useBulkCreateMeetings, useGetMeetings } from '../api/meetings';

interface BulkCreateMeetingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (meetingIds: string[]) => void;
}

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const BulkCreateMeetingsDialog = ({
  isOpen,
  onClose,
  onSuccess,
}: BulkCreateMeetingsDialogProps) => {
  const { t, i18n } = useTranslation('meeting');
  const bulkCreate = useBulkCreateMeetings();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => new Date());

  // Query existing meetings for the visible month so we can show counts and
  // block re-booking days that already have at least one meeting.
  const monthRange = useMemo(() => {
    const from = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const to = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
    return {
      fromDate: format(from, "yyyy-MM-dd'T'00:00:00"),
      toDate: format(to, "yyyy-MM-dd'T'23:59:59"),
    };
  }, [visibleMonth]);

  const { data: existingMeetings } = useGetMeetings({
    fromDate: monthRange.fromDate,
    toDate: monthRange.toDate,
    pageNumber: 0,
    pageSize: 200,
  });

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of existingMeetings?.items ?? []) {
      if (!m.startAt || m.status === 'Cancelled') continue;
      const d = new Date(m.startAt);
      const key = dateKey(d);
      const list = map.get(key) ?? [];
      list.push(m.meetingNo);
      map.set(key, list);
    }
    return map;
  }, [existingMeetings]);

  const datesWithMeetings = useMemo(
    () =>
      Array.from(meetingsByDate.keys()).map(k => {
        const [y, mo, d] = k.split('-').map(Number);
        return new Date(y, mo - 1, d);
      }),
    [meetingsByDate],
  );

  const handleClose = () => {
    if (bulkCreate.isPending) return;
    setSelectedDates([]);
    onClose();
  };

  // A day can be picked if it is not in the past and does not already have a meeting.
  const isSelectable = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return false;
    return !meetingsByDate.has(dateKey(d));
  };

  // Add every selectable day of the visible month matching the predicate to the
  // current selection (union — existing manual picks are preserved).
  const addMatchingDays = (matches: (d: Date) => boolean) => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const picks: Date[] = [];
    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, month, day);
      if (matches(d) && isSelectable(d)) picks.push(d);
    }
    setSelectedDates(prev => {
      const merged = new Map(prev.map(d => [d.getTime(), d]));
      for (const d of picks) merged.set(d.getTime(), d);
      return Array.from(merged.values());
    });
  };

  const goToToday = () => setVisibleMonth(new Date());

  // Mon..Fri quick-pick buttons, short weekday names localized to the current language.
  const weekdayButtons = useMemo(() => {
    const monday = new Date(2024, 0, 8); // a known Monday
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { day: i + 1, label: d.toLocaleDateString(i18n.language, { weekday: 'short' }) };
    });
  }, [i18n.language]);

  const handleSubmit = () => {
    if (selectedDates.length === 0) {
      toast.error(t('toasts.pickAtLeastOneDate'));
      return;
    }

    // Send each picked day as application-local noon, no TZ offset, so the backend
    // parses it as Kind=Unspecified and stores in application time.
    const dates = selectedDates.map(d => {
      const noon = new Date(d);
      noon.setHours(12, 0, 0, 0);
      return format(noon, "yyyy-MM-dd'T'HH:mm:ss");
    });

    bulkCreate.mutate(
      { dates },
      {
        onSuccess: data => {
          const count = data.meetingIds.length;
          const key = count === 1 ? 'toasts.bulkCreated' : 'toasts.bulkCreatedPlural';
          toast.success(t(key, { count }));
          onSuccess?.(data.meetingIds);
          handleClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.bulkCreateFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('dialogs.bulkCreateMeetings')} size="2xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{t('bulkCreateDialog.description')}</p>

        {/* Quick-select helpers */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" type="button" onClick={goToToday}>
            <Icon name="calendar-days" style="solid" className="size-3.5 mr-1.5" />
            {t('bulkCreateDialog.today')}
          </Button>
          <span className="h-5 w-px bg-gray-200" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('bulkCreateDialog.everyWeekday')}</span>
            <div className="flex items-center gap-1.5">
              {weekdayButtons.map(w => (
                <button
                  key={w.day}
                  type="button"
                  onClick={() => addMatchingDays(d => d.getDay() === w.day)}
                  title={t('bulkCreateDialog.everyDayTooltip', { day: w.label })}
                  className="inline-flex items-center justify-center size-9 rounded-full border border-gray-300 text-xs font-medium text-gray-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date picker */}
        <div
          className="flex justify-center border border-gray-200 rounded-lg p-4"
          style={
            {
              '--rdp-day-width': '140px',
              '--rdp-day-height': '88px',
              '--rdp-day_button-width': '140px',
              '--rdp-day_button-height': '88px',
              '--rdp-day_button-border-radius': '8px',
              '--rdp-day_button-padding': '0',
            } as React.CSSProperties
          }
        >
          <DayPicker
            className="react-day-picker bulk-meetings-calendar"
            // Set the accent on the rdp root itself (inline beats the stylesheet default),
            // so the selected-day ring is the brand green instead of the default blue.
            style={{ '--rdp-accent-color': 'var(--color-primary)' } as React.CSSProperties}
            mode="multiple"
            selected={selectedDates}
            onSelect={dates => setSelectedDates(dates ?? [])}
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            disabled={[{ before: new Date() }, ...datesWithMeetings]}
            styles={{
              caption_label: { fontSize: '18px' },
              weekday: { fontSize: '14px', width: '140px' },
            }}
            components={{
              DayButton: (props: DayButtonProps) => {
                const { day, modifiers, children, className: rdpClass, ...buttonProps } = props;
                const meetingNos = meetingsByDate.get(dateKey(day.date)) ?? [];
                const visible = meetingNos.slice(0, 2);
                const overflow = meetingNos.length - visible.length;
                const selected = modifiers.selected;
                const dayTitle =
                  meetingNos.length > 0
                    ? t('bulkCreateDialog.tooltipHasMeeting', { no: meetingNos.join(', ') })
                    : modifiers.disabled
                      ? t('bulkCreateDialog.tooltipPast')
                      : undefined;
                return (
                  <button {...buttonProps} title={dayTitle} className={rdpClass}>
                    <span className="flex h-full w-full flex-col items-center justify-start gap-0.5 py-1 leading-tight">
                      <span
                        className={clsx(
                          'text-sm',
                          selected ? 'font-semibold text-primary' : 'font-medium',
                        )}
                      >
                        {children}
                      </span>
                      {meetingNos.length > 0 && (
                        <span className="flex flex-col items-stretch gap-0.5 w-full px-2">
                          {visible.map(no => (
                            <span
                              key={no}
                              className={`whitespace-nowrap text-center text-[11px] font-semibold px-1 py-0.5 rounded ${
                                modifiers.disabled
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                              title={no}
                            >
                              {no}
                            </span>
                          ))}
                          {overflow > 0 && (
                            <span
                              className="text-[10px] text-amber-700"
                              title={meetingNos.slice(2).join(', ')}
                            >
                              {t('bulkCreateDialog.overflow', { n: overflow })}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </button>
                );
              },
            }}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-primary" />
            {t('bulkCreateDialog.legendSelected')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-amber-100 border border-amber-300" />
            {t('bulkCreateDialog.legendHasMeeting')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-gray-100 border border-gray-300" />
            {t('bulkCreateDialog.legendPast')}
          </span>
        </div>

        {selectedDates.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedDates
              .slice()
              .sort((a, b) => a.getTime() - b.getTime())
              .map(d => (
                <span
                  key={d.toISOString()}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 shadow-sm"
                >
                  <Icon name="calendar-days" style="solid" className="size-3 text-primary" />
                  {formatDate(d)}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDates(prev => prev.filter(x => x.getTime() !== d.getTime()))
                    }
                    className="hover:text-primary/70 focus:outline-none"
                    aria-label={t('aria.removeDate', { date: formatDate(d) })}
                  >
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>
              {selectedDates.length === 1
                ? t('bulkCreateDialog.willCreate', { n: selectedDates.length })
                : t('bulkCreateDialog.willCreatePlural', { n: selectedDates.length })}
            </span>
            {selectedDates.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedDates([])}
                className="text-primary hover:underline focus:outline-none"
              >
                {t('buttons.clear')}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={handleClose}
              disabled={bulkCreate.isPending}
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={selectedDates.length === 0 || bulkCreate.isPending}
            >
              {bulkCreate.isPending
                ? t('bulkCreateDialog.creating')
                : `${t('buttons.create')}${selectedDates.length > 0 ? ` (${selectedDates.length})` : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BulkCreateMeetingsDialog;
