import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import SlideOverPanel from '@shared/components/SlideOverPanel';
import Icon from '@shared/components/Icon';
import { formatLocaleDateTime, formatLocaleDate } from '@shared/utils/dateUtils';
import { useGetAppointmentHistory, type AppointmentHistoryEvent } from '../api/appointmentHistory';

interface AppointmentHistoryDrawerProps {
  appraisalId: string;
  open: boolean;
  onClose: () => void;
}

type FilterChip = 'all' | 'appointment' | 'fees';

function isAppointmentEvent(eventType: string): boolean {
  return eventType.startsWith('Appointment');
}

function isFeeEvent(eventType: string): boolean {
  return eventType.startsWith('Fee') || eventType === 'Submitted';
}

/** Tailwind classes for the circular timeline node based on event type / status */
function nodeClasses(event: AppointmentHistoryEvent): string {
  if (event.status === 'Approved' || event.eventType === 'AppointmentApproved' || event.eventType === 'AppointmentAutoApplied' || event.eventType === 'FeeApproved') {
    return 'bg-green-600';
  }
  if (event.status === 'Rejected' || event.eventType === 'AppointmentRejected' || event.eventType === 'FeeRejected') {
    return 'bg-red-600';
  }
  // A user cancellation is neutral, visually distinct from an approver rejection.
  if (event.status === 'Cancelled' || event.eventType === 'AppointmentCancelled') {
    return 'bg-gray-400';
  }
  if (isFeeEvent(event.eventType)) {
    return 'bg-purple-600';
  }
  // Appointment-related pending / rescheduled
  return 'bg-blue-600';
}

/** Status pill styling */
function statusPillClasses(status: string | null): string {
  switch (status) {
    case 'Approved': return 'bg-green-50 text-green-700 border border-green-200';
    case 'Rejected': return 'bg-red-50 text-red-700 border border-red-200';
    case 'Pending': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'Auto': return 'bg-gray-100 text-gray-500 border border-gray-200';
    case 'Cancelled': return 'bg-slate-100 text-slate-600 border border-slate-300';
    default: return 'bg-gray-100 text-gray-500 border border-gray-200';
  }
}

function NodeIcon({ event }: { event: AppointmentHistoryEvent }) {
  if (event.status === 'Approved' || event.eventType === 'AppointmentApproved' || event.eventType === 'AppointmentAutoApplied' || event.eventType === 'FeeApproved') {
    return <Icon name="check" style="solid" className="w-2.5 h-2.5 text-white" />;
  }
  if (event.status === 'Rejected' || event.eventType === 'AppointmentRejected' || event.eventType === 'FeeRejected') {
    return <Icon name="xmark" style="solid" className="w-2.5 h-2.5 text-white" />;
  }
  if (event.status === 'Cancelled' || event.eventType === 'AppointmentCancelled') {
    return <Icon name="ban" style="solid" className="w-2.5 h-2.5 text-white" />;
  }
  if (isFeeEvent(event.eventType)) {
    return <span className="text-[9px] font-bold text-white leading-none">฿</span>;
  }
  return <Icon name="clock-rotate-left" style="solid" className="w-2.5 h-2.5 text-white" />;
}

function TimelineItem({ event, isLast }: { event: AppointmentHistoryEvent; isLast: boolean }) {
  const { t, i18n } = useTranslation('appraisal');

  const showDateChange = (event.oldDate || event.newDate) && (event.eventType.includes('Reschedule') || event.eventType === 'AppointmentRescheduled' || event.eventType === 'AppointmentApproved' || event.eventType === 'AppointmentAutoApplied');
  const isRejection = event.status === 'Rejected' || event.eventType === 'AppointmentRejected' || event.eventType === 'FeeRejected';

  return (
    <div className="relative flex gap-3 pb-6">
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-[10px] top-[22px] bottom-0 w-0.5 bg-gray-200" />
      )}

      {/* Circle node */}
      <div
        className={clsx(
          'relative z-10 flex-shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center mt-0.5',
          nodeClasses(event),
        )}
      >
        <NodeIcon event={event} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* Title row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{event.title}</span>
          {event.status && (
            <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', statusPillClasses(event.status))}>
              {t(`history.status.${event.status}`, event.status)}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-[11px] text-gray-400 mt-0.5">
          {formatLocaleDateTime(event.occurredAt, i18n.language)}
        </div>

        {/* Body */}
        <div className="mt-1.5 space-y-1">
          {/* Date change: old → new */}
          {showDateChange && (event.oldDate || event.newDate) && (
            <div className="flex items-center gap-2 flex-wrap">
              {event.oldDate && (
                <span className="text-sm font-medium text-gray-400 line-through decoration-red-400">
                  {formatLocaleDate(event.oldDate, i18n.language)}
                </span>
              )}
              {event.oldDate && event.newDate && (
                <Icon name="arrow-right" style="solid" className="w-3 h-3 text-amber-500 flex-shrink-0" />
              )}
              {event.newDate && (
                <span className="text-sm font-semibold text-gray-800">
                  {formatLocaleDate(event.newDate, i18n.language)}
                </span>
              )}
            </div>
          )}

          {/* Fee description + amount */}
          {event.feeDescription && (
            <div className="text-sm text-gray-600">
              {event.feeDescription}
              {event.amount != null && (
                <> · <span className="font-semibold text-gray-800">฿ {event.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></>
              )}
            </div>
          )}

          {/* Actor */}
          {event.actorName && (
            <div className="text-[11px] text-gray-400">
              {event.actorName}
              {event.actorCode && ` (${event.actorCode})`}
            </div>
          )}

          {/* Reason quote */}
          {event.reason && (
            <blockquote
              className={clsx(
                'mt-2 pl-3 py-1.5 pr-2 rounded-r-lg border-l-2 text-sm italic',
                isRejection
                  ? 'bg-red-50 border-red-400 text-red-800'
                  : 'bg-gray-50 border-gray-300 text-gray-600',
              )}
            >
              "{event.reason}"
            </blockquote>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppointmentHistoryDrawer({
  appraisalId,
  open,
  onClose,
}: AppointmentHistoryDrawerProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');

  // Only fetch when the drawer is open (the page already fetches the count on mount via the
  // same queryKey, so an opened drawer reuses that cache).
  const { data: events = [], isLoading, isError } = useGetAppointmentHistory(appraisalId, {
    enabled: open,
  });

  const filteredEvents = events.filter(event => {
    if (activeFilter === 'appointment') return isAppointmentEvent(event.eventType);
    if (activeFilter === 'fees') return isFeeEvent(event.eventType);
    return true;
  });

  const eventCount = events.length;

  const chips: { key: FilterChip; label: string }[] = [
    { key: 'all', label: t('history.chips.all') },
    { key: 'appointment', label: t('history.chips.appointment') },
    { key: 'fees', label: t('history.chips.fees') },
  ];

  return (
    <SlideOverPanel
      isOpen={open}
      onClose={onClose}
      title={t('history.title')}
      subtitle={eventCount > 0 ? t('history.eventCount', { count: eventCount }) : undefined}
      width="md"
    >
      {/* Filter chips — sticky inside the scroll container */}
      <div className="flex gap-2 pb-4 border-b border-gray-100">
        {chips.map(chip => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setActiveFilter(chip.key)}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
              activeFilter === chip.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Timeline body */}
      <div className="mt-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
            <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin mr-2" />
            {t('common:status.loading')}
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-sm text-red-600">
            <Icon name="circle-exclamation" style="solid" className="w-5 h-5" />
            <span>{t('history.loadError')}</span>
          </div>
        )}

        {!isLoading && !isError && filteredEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-sm text-gray-400">
            <Icon name="clock-rotate-left" style="regular" className="w-8 h-8 text-gray-300" />
            <span>{t('history.emptyState')}</span>
          </div>
        )}

        {!isLoading && !isError && filteredEvents.length > 0 && (
          <div>
            {filteredEvents.map((event, idx) => (
              <TimelineItem
                key={`${event.eventType}-${event.occurredAt}-${idx}`}
                event={event}
                isLast={idx === filteredEvents.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </SlideOverPanel>
  );
}
