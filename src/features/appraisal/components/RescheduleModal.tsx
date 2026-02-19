import { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import DateTimeInput from '@shared/components/inputs/DateTimeInput';
import Textarea from '@shared/components/inputs/Textarea';
import { RescheduleFormSchema } from '../schemas/appointmentAndFee';

type RescheduleFormData = z.infer<typeof RescheduleFormSchema>;

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RescheduleFormData) => void;
  defaultValues?: {
    dateTime: string | null;
    location: string | null;
  };
  /** Whether this is a new appointment (not a reschedule) */
  isNewAppointment?: boolean;
  isLoading?: boolean;
}

/**
 * Modal for scheduling or rescheduling an appointment
 */
export default function RescheduleModal({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  isNewAppointment = false,
  isLoading = false,
}: RescheduleModalProps) {
  const methods = useForm<RescheduleFormData>({
    resolver: zodResolver(RescheduleFormSchema),
    defaultValues: {
      dateTime: defaultValues?.dateTime || '',
      location: defaultValues?.location || '',
      reason: '',
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = methods;

  useEffect(() => {
    if (isOpen) {
      reset({
        dateTime: defaultValues?.dateTime || '',
        location: defaultValues?.location || '',
        reason: '',
      });
    }
    // Only reset when modal opens, not when defaultValues reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const dateTime = watch('dateTime');

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = (data: RescheduleFormData) => {
    onSubmit(data);
  };

  const modalTitle = isNewAppointment ? 'Schedule Appointment' : 'Reschedule Appointment';
  const submitButtonText = isNewAppointment ? 'Schedule' : 'Save';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="md">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          {/* Date Time Input */}
          <DateTimeInput
            label="Appointment Date & Time"
            required
            value={dateTime}
            onChange={value => setValue('dateTime', value || '')}
            error={errors.dateTime?.message}
          />

          {/* Location Input */}
          <Textarea
            label="Location"
            required
            rows={3}
            placeholder="Enter appointment location details"
            {...register('location')}
            error={errors.location?.message}
          />

          {/* Reason Input - only shown when rescheduling */}
          {!isNewAppointment && (
            <Textarea
              label="Reason for Rescheduling"
              rows={2}
              placeholder="Enter reason for rescheduling (optional)"
              {...register('reason')}
              error={errors.reason?.message}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {submitButtonText}
            </Button>
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
}
