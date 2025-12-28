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
}: RescheduleModalProps) {
  const methods = useForm<RescheduleFormData>({
    resolver: zodResolver(RescheduleFormSchema),
    defaultValues: {
      dateTime: defaultValues?.dateTime || '',
      location: defaultValues?.location || '',
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = methods;

  const dateTime = watch('dateTime');

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = (data: RescheduleFormData) => {
    onSubmit(data);
    handleClose();
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {submitButtonText}
            </Button>
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
}
