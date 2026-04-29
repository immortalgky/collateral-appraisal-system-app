import { useMemo, useState } from 'react';
import { DayPicker, type DayButtonProps } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
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
    () => Array.from(meetingsByDate.keys()).map(k => {
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

  const handleSubmit = () => {
    if (selectedDates.length === 0) {
      toast.error('Pick at least one date');
      return;
    }

    // Send each picked day as application-local noon, no TZ offset, so the backend
    // parses it as Kind=Unspecified and stores in application time (lines up with
    // IDateTimeProvider.ApplicationNow). UTC ISO would skew StartAt by the TZ offset.
    const dates = selectedDates.map(d => {
      const noon = new Date(d);
      noon.setHours(12, 0, 0, 0);
      return format(noon, "yyyy-MM-dd'T'HH:mm:ss");
    });

    bulkCreate.mutate(
      {
        dates,
      },
      {
        onSuccess: data => {
          toast.success(
            `${data.meetingIds.length} meeting draft${data.meetingIds.length === 1 ? '' : 's'} created`,
          );
          onSuccess?.(data.meetingIds);
          handleClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to create meetings');
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Create Meetings" size="2xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select one or more dates. A New meeting will be created for each selected date. Members
          can be added to each meeting afterwards.
        </p>

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
                const { day, modifiers, children, ...buttonProps } = props;
                const meetingNos = meetingsByDate.get(dateKey(day.date)) ?? [];
                const visible = meetingNos.slice(0, 2);
                const overflow = meetingNos.length - visible.length;
                return (
                  <button {...buttonProps}>
                    <span className="flex h-full w-full flex-col items-center justify-start gap-0.5 py-1 leading-tight">
                      <span className="text-sm font-medium">{children}</span>
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
                              +{overflow} more
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

        {selectedDates.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedDates
              .slice()
              .sort((a, b) => a.getTime() - b.getTime())
              .map(d => (
                <span
                  key={d.toISOString()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                >
                  {formatDate(d)}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDates(prev => prev.filter(x => x.getTime() !== d.getTime()))
                    }
                    className="hover:text-blue-900 focus:outline-none"
                    aria-label={`Remove ${formatDate(d)}`}
                  >
                    ×
                  </button>
                </span>
              ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-gray-500">
            {selectedDates.length} date{selectedDates.length === 1 ? '' : 's'} selected
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={handleClose}
              disabled={bulkCreate.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={selectedDates.length === 0 || bulkCreate.isPending}
            >
              {bulkCreate.isPending
                ? 'Creating...'
                : `Create ${selectedDates.length > 0 ? selectedDates.length : ''}`.trim()}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BulkCreateMeetingsDialog;
