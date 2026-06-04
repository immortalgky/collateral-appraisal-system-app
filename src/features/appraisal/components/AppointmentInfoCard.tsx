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

  // Only surface the approval state — no badge for normal statuses (Approved/Pending/etc.).
  const status = (appointment.status ?? '').toLowerCase();
  const statusBadge = approvalSubmitted
    ? { label: t('approval.badge.awaiting'), cls: 'bg-blue-50 text-blue-700 border-blue-200' }
    : approvalDraft
      ? { label: t('approval.badge.needsApproval'), cls: 'bg-amber-50 text-amber-700 border-amber-200' }
      : null;

  const rescheduleCount = appointment.rescheduleCount ?? 0;
  const isCancelled = status === 'cancelled';
  const tileAccent = pendingApproval ? 'bg-amber-500' : 'bg-orange-500';

  return (
    <div
      className={`rounded-xl shadow-sm overflow-hidden border ${
        pendingApproval ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200 bg-white'
      }`}
    >
      {/* ── Top row: calendar tile · details · status + actions ── */}
      <div className="flex items-start gap-5 p-5">
        {/* Calendar date tile */}
        <div
          className={`flex-shrink-0 w-[76px] rounded-xl border overflow-hidden text-center bg-white ${
            pendingApproval ? 'border-amber-200' : 'border-gray-200'
          }`}
        >
          <div className={`text-[11px] font-bold uppercase tracking-wider text-white py-1 ${tileAccent}`}>
            {formattedDate?.month}
          </div>
          <div className="text-xl font-bold text-gray-800 leading-none pt-1.5">
            {formattedDate?.day}
          </div>
          <div className="text-[11px] text-gray-500 pb-1.5">{formattedDate?.weekday}</div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          {/* Time / pending old→new */}
          {formattedPreviousDate ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-400 line-through decoration-red-300">
                {formattedPreviousDate.fullDate} · {formattedPreviousDate.time}
              </span>
              <Icon name="arrow-right" style="solid" className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-sm font-semibold text-gray-800">
                {formattedDate?.fullDate} · {formattedDate?.time}
              </span>
            </div>
          ) : (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                <Icon name="clock" style="regular" className="w-3.5 h-3.5 text-gray-400" />
                {formattedDate?.time}
              </span>
              <span className="text-xs text-gray-400">
                · {formattedDate?.dayName}, {formattedDate?.fullDate}
              </span>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-2 mt-2.5">
            <Icon name="location-dot" style="light" className="w-4 h-4 text-gray-400 shrink-0" />
            <span
              className={`text-xs line-clamp-1 break-words ${
                appointment.locationDetail ? 'text-gray-700' : 'text-gray-400'
              }`}
            >
              {appointment.locationDetail || t('appointment.locationNotSpecified')}
            </span>
          </div>

          {/* Contact */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
              <Icon name="user" style="solid" className="w-2.5 h-2.5 text-gray-500" />
            </div>
            <span className="text-xs text-gray-700">
              {appointment.contactPerson || t('appointment.contactNotSpecified')}
              {appointment.contactPhone && (
                <span className="text-gray-400"> · {appointment.contactPhone}</span>
              )}
            </span>
          </div>
        </div>

        {/* Status + action buttons */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          {statusBadge && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.cls}`}
            >
              {statusBadge.label}
            </span>
          )}
          {!readOnly && (
            <div className="flex items-center gap-2">
              {onCancel && !isCancelled && (
                <button
                  type="button"
                  onClick={!approvalSubmitted ? onCancel : undefined}
                  disabled={approvalSubmitted}
                  title={approvalSubmitted ? t('approval.banner.awaiting') : undefined}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-danger/10"
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary bg-secondary/20 text-secondary hover:bg-secondary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-secondary/20"
              >
                <Icon name="clock-rotate-left" style="solid" className="w-5 h-5" />
                <span className="text-sm font-medium uppercase tracking-wider">
                  {t('appointment.rescheduleButton')}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer: reschedule count · history ── */}
      {(rescheduleCount > 0 || onViewHistory) && (
        <div
          className={`flex items-center gap-2 px-5 py-2.5 border-t text-xs ${
            pendingApproval ? 'border-amber-100 bg-amber-100/30' : 'border-gray-100 bg-gray-50/60'
          }`}
        >
          {rescheduleCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-gray-500">
              <Icon name="clock-rotate-left" style="solid" className="w-3 h-3 text-gray-400" />
              {t('appointment.rescheduledCount', { n: rescheduleCount })}
            </span>
          )}
          {rescheduleCount > 0 && onViewHistory && (
            <span className="text-gray-300" aria-hidden="true">·</span>
          )}
          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="inline-flex items-center gap-1.5 font-semibold text-gray-500 hover:text-primary transition-colors"
            >
              <Icon name="clock-rotate-left" style="solid" className="w-3 h-3" />
              {t('history.viewHistory')}
              {historyEventCount !== undefined && historyEventCount > 0 && ` (${historyEventCount})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
