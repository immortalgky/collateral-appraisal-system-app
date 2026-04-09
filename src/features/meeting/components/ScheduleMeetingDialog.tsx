import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { scheduleMeetingSchema, type ScheduleMeetingFormValues } from '../schemas/meeting';
import { useScheduleMeeting } from '../api/meetings';

interface ScheduleMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  defaultLocation?: string | null;
}

const ScheduleMeetingDialog = ({
  isOpen,
  onClose,
  meetingId,
  defaultLocation,
}: ScheduleMeetingDialogProps) => {
  const scheduleMeeting = useScheduleMeeting();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScheduleMeetingFormValues>({
    resolver: zodResolver(scheduleMeetingSchema),
    defaultValues: { scheduledAt: '', location: defaultLocation ?? '' },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ scheduledAt: '', location: defaultLocation ?? '' });
    }
  }, [isOpen, defaultLocation, reset]);

  const handleClose = () => {
    if (!scheduleMeeting.isPending) onClose();
  };

  const onSubmit = (values: ScheduleMeetingFormValues) => {
    scheduleMeeting.mutate(
      {
        id: meetingId,
        body: {
          scheduledAt: new Date(values.scheduledAt).toISOString(),
          location: values.location?.trim() ? values.location.trim() : null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Meeting scheduled');
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to schedule meeting');
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Schedule Meeting" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="schedule-datetime"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Scheduled date &amp; time <span className="text-red-500">*</span>
          </label>
          <input
            id="schedule-datetime"
            type="datetime-local"
            {...register('scheduledAt')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.scheduledAt && (
            <p className="mt-1 text-xs text-red-600">{errors.scheduledAt.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="schedule-location"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Location
          </label>
          <input
            id="schedule-location"
            type="text"
            {...register('location')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Optional"
          />
          {errors.location && (
            <p className="mt-1 text-xs text-red-600">{errors.location.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={scheduleMeeting.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={scheduleMeeting.isPending}>
            {scheduleMeeting.isPending ? 'Scheduling...' : 'Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleMeetingDialog;
