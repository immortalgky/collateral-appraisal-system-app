import { format, parseISO } from 'date-fns';
import Icon from '@shared/components/Icon';
import type { AppointmentDto2Type } from '@shared/schemas/v1';

interface AppointmentInfoCardProps {
  appointment: AppointmentDto2Type | null;
  onReschedule: () => void;
  onCancel?: () => void;
}

/**
 * Displays appointment information with date/time, location, and contact details
 * Shows empty state with "Schedule" button when no appointment exists
 */
export default function AppointmentInfoCard({
  appointment,
  onReschedule,
  onCancel,
}: AppointmentInfoCardProps) {
  const hasAppointment = Boolean(appointment);

  // Format date/time display
  const formattedDate = appointment
    ? {
        dayName: format(parseISO(appointment.appointmentDateTime), 'EEEE'),
        fullDate: format(parseISO(appointment.appointmentDateTime), 'MMMM d, yyyy'),
        time: format(parseISO(appointment.appointmentDateTime), 'h:mm a'),
      }
    : null;

  // Status badge colors
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-success/10 text-success border-success';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning';
      case 'cancelled':
        return 'bg-danger/10 text-danger border-danger';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

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
              <span className="text-base font-medium text-gray-800">No appointment scheduled</span>
              <span className="text-sm text-gray-500">
                Schedule an appointment to proceed with the appraisal
              </span>
            </div>
          </div>

          {/* Right Section - Schedule Button */}
          <button
            type="button"
            onClick={onReschedule}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
          >
            <Icon name="calendar-plus" style="solid" className="w-5 h-5" />
            <span className="text-sm font-medium">Schedule Appointment</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        {/* Left Section - Date/Time and Details */}
        <div className="flex items-center gap-6">
          {/* Date Time Display */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-accent font-normal">{formattedDate?.dayName}</span>
            <span className="text-lg font-medium text-gray-800">{formattedDate?.fullDate}</span>
            <span className="text-xs text-gray-800">{formattedDate?.time}</span>
          </div>

          {/* Vertical Divider */}
          <div className="h-10 w-px bg-gray-200" />

          {/* Location and Contact Details */}
          <div className="flex flex-col gap-1">
            {/* Location */}
            <div className="flex items-center gap-2">
              <Icon name="location-dot" style="light" className="w-5 h-5 text-gray-800" />
              <span className="text-xs text-gray-800">
                {appointment.locationDetail || 'Location not specified'}
              </span>
            </div>

            {/* Contact Person */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <Icon name="user" style="solid" className="w-3 h-3 text-gray-500" />
              </div>
              <span className="text-xs text-gray-800">
                {appointment.contactPerson || 'Contact not specified'}
                {appointment.contactPhone && ` (${appointment.contactPhone})`}
              </span>
            </div>

            {/* Status & Reschedule Count */}
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(appointment.status)}`}
              >
                {appointment.status}
              </span>
              {appointment.rescheduleCount > 0 && (
                <span className="text-xs text-gray-400">
                  Rescheduled {appointment.rescheduleCount}x
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section - Action Buttons */}
        <div className="flex items-center gap-2">
          {onCancel && appointment.status.toLowerCase() !== 'cancelled' && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
            >
              <Icon name="xmark" style="solid" className="w-4 h-4" />
              <span className="text-sm font-medium">Cancel</span>
            </button>
          )}
          <button
            type="button"
            onClick={onReschedule}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary bg-secondary/20 text-secondary hover:bg-secondary/30 transition-colors"
          >
            <Icon name="clock-rotate-left" style="solid" className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wider">Re-Schedule</span>
          </button>
        </div>
      </div>
    </div>
  );
}
