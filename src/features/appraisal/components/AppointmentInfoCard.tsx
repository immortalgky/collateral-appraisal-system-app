import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import type { AppointmentDto2Type } from '@shared/schemas/v1';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

interface AppointmentInfoCardProps {
  appointment: AppointmentDto2Type | null;
  onReschedule: () => void;
  onCancel?: () => void;
  /** When true, shows "Needs approval" badge on the appointment */
  approvalDraft?: boolean;
  /** When true, shows "Pending approval" badge and disables reschedule */
  approvalSubmitted?: boolean;
  /** Opens the history drawer */
  onViewHistory?: () => void;
  /** Total event count for the badge on the View History button */
  historyEventCount?: number;
}

/**
 * Displays appointment information with date/time, location, and contact details
 * Shows empty state with "Schedule" button when no appointment exists
 */
export default function AppointmentInfoCard({
  appointment,
  onReschedule,
  onCancel,
  approvalDraft = false,
  approvalSubmitted = false,
  onViewHistory,
  historyEventCount,
}: AppointmentInfoCardProps) {
  const { t } = useTranslation('appraisal');
  const readOnly = usePageReadOnly();
  const hasAppointment = Boolean(appointment);

  // Format date/time display (calendar-tile parts + readable line). Parse once.
  const formattedDate = appointment?.appointmentDateTime
    ? (() => {
        const d = parseISO(appointment.appointmentDateTime);
        return {
          month: format(d, 'MMM'),
          day: format(d, 'd'),
          weekday: format(d, 'EEE'),
          dayName: format(d, 'EEEE'),
          fullDate: format(d, 'MMMM d, yyyy'),
          time: format(d, 'h:mm a'),
        };
      })()
    : null;

  // Previous (pre-reschedule) date — shown struck-through next to the proposed date while the
  // reschedule awaits approval. Arrives via .passthrough(); only set when approval is pending.
  const pendingApproval = approvalDraft || approvalSubmitted;
  const previousDate =
    (appointment as (AppointmentDto2Type & { previousDate?: string | null }) | null)
      ?.previousDate ?? null;
  const formattedPreviousDate =
    pendingApproval && previousDate
      ? {
          dayName: format(parseISO(previousDate), 'EEEE'),
          fullDate: format(parseISO(previousDate), 'MMMM d, yyyy'),
          time: format(parseISO(previousDate), 'h:mm a'),
        }
      : null;

  // Empty state when no appointment scheduled
  if (!hasAppointment || !appointment) {
    return (
      <div className="bg-gradient-to-br from-orange-50/50 to-white border border-orange-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          {/* Left Section - Empty State */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
              <Icon name="calendar-plus" style="regular" className="w-7 h-7 text-orange-500" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-base font-medium text-gray-800">
                {t('appointment.noAppointment')}
              </span>
              <span className="text-sm text-gray-500">{t('appointment.noAppointmentHint')}</span>
            </div>
          </div>

          {/* Right Section - Schedule Button */}
          {!readOnly && (
            <button
              type="button"
              onClick={onReschedule}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
            >
              <Icon name="calendar-plus" style="solid" className="w-5 h-5" />
              <span className="text-sm font-medium">{t('appointment.scheduleButton')}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const status = (appointment.status ?? '').toLowerCase();
  const rescheduleCount = appointment.rescheduleCount ?? 0;
  const isCancelled = status === 'cancelled';

  // Status pill — approval-pending states take precedence, otherwise reflect the appointment status.
  const statusPill = approvalSubmitted
    ? { label: t('approval.badge.awaiting'), cls: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' }
    : approvalDraft
      ? { label: t('approval.badge.needsApproval'), cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' }
      : (() => {
          switch (status) {
            case 'appointed':
              return { label: t('history.status.Appointed'), cls: 'bg-green-50 text-green-700', dot: 'bg-green-500' };
            case 'pending':
              return { label: t('history.status.Pending'), cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
            case 'rejected':
              return { label: t('history.status.Rejected'), cls: 'bg-red-50 text-red-700', dot: 'bg-red-500' };
            case 'cancelled':
              return { label: t('history.status.Cancelled'), cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
            default:
              return appointment.status
                ? { label: appointment.status, cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
                : null;
          }
        })();

  // Initials for the contact avatar (e.g. "John Doe" → "JD").
  const initials =
    (appointment.contactPerson || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '—';

  return (
    <div
      className={`rounded-xl shadow-sm overflow-hidden border bg-white ${
        pendingApproval ? 'border-amber-200' : 'border-gray-200'
      }`}
    >
      {/* ── Header bar: title + status · view history ── */}
      <div
        className={`flex items-center justify-between gap-3 px-5 py-3 border-b ${
          pendingApproval ? 'border-amber-100 bg-amber-50/50' : 'border-gray-100 bg-gray-50/70'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('history.chips.appointment')}
          </span>
          {statusPill && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusPill.cls}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusPill.dot}`} />
              {statusPill.label}
            </span>
          )}
        </div>
        {onViewHistory && (
          <button
            type="button"
            onClick={onViewHistory}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary transition-colors"
          >
            <Icon name="clock-rotate-left" style="regular" className="w-3.5 h-3.5" />
            {t('history.viewHistory')}
            {historyEventCount !== undefined && historyEventCount > 0 && ` (${historyEventCount})`}
          </button>
        )}
      </div>

      {/* ── Body: date · details · actions ── */}
      <div className="flex items-center gap-5 px-5 py-4">
        {/* Date column */}
        <div className="flex-shrink-0">
          {formattedPreviousDate && (
            <div className="text-[11px] text-gray-400 line-through decoration-red-300 mb-0.5">
              {formattedPreviousDate.fullDate} · {formattedPreviousDate.time}
            </div>
          )}
          <div className={`text-xs font-semibold ${pendingApproval ? 'text-amber-500' : 'text-orange-500'}`}>
            {formattedDate?.dayName}
          </div>
          <div className="text-xl font-bold text-gray-900 leading-tight">
            {formattedDate?.fullDate}
          </div>
          <div className="text-sm text-gray-500">{formattedDate?.time}</div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          {/* Location */}
          <div className="flex items-center gap-2">
            <Icon name="location-dot" style="light" className="w-4 h-4 text-gray-400 shrink-0" />
            <span
              className={`text-sm line-clamp-1 break-words ${
                appointment.locationDetail ? 'text-gray-700' : 'text-gray-400'
              }`}
            >
              {appointment.locationDetail || t('appointment.locationNotSpecified')}
            </span>
          </div>

          {/* Contact */}
          <div className="flex items-center gap-2 mt-2">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-gray-600">{initials}</span>
            </div>
            <span className="text-sm text-gray-700">
              {appointment.contactPerson || t('appointment.contactNotSpecified')}
              {appointment.contactPhone && (
                <span className="text-gray-400"> · {appointment.contactPhone}</span>
              )}
            </span>
          </div>

          {/* Reschedule count */}
          {rescheduleCount > 0 && (
            <div className="text-xs text-gray-400 mt-2 ml-9">
              {t('appointment.rescheduledCount', { n: rescheduleCount })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!readOnly && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {onCancel && !isCancelled && (
              <button
                type="button"
                onClick={!approvalSubmitted ? onCancel : undefined}
                disabled={approvalSubmitted}
                title={approvalSubmitted ? t('approval.banner.awaiting') : undefined}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-50"
              >
                <Icon name="xmark" style="solid" className="w-4 h-4" />
                <span className="text-sm font-medium">{t('appointment.cancelButton')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={!approvalSubmitted ? onReschedule : undefined}
              disabled={approvalSubmitted}
              title={approvalSubmitted ? t('approval.banner.awaiting') : undefined}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
            >
              <Icon name="clock-rotate-left" style="solid" className="w-4 h-4" />
              <span className="text-sm font-medium">{t('appointment.rescheduleButton')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
