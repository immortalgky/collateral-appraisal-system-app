import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { cancelMeetingSchema, type CancelMeetingFormValues } from '../schemas/meeting';
import { useCancelMeeting } from '../api/meetings';

interface CancelMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
}

const CancelMeetingDialog = ({ isOpen, onClose, meetingId }: CancelMeetingDialogProps) => {
  const cancelMeeting = useCancelMeeting();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CancelMeetingFormValues>({
    resolver: zodResolver(cancelMeetingSchema),
    defaultValues: { reason: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) reset({ reason: '' });
  }, [isOpen, reset]);

  const handleClose = () => {
    if (!cancelMeeting.isPending) onClose();
  };

  const onSubmit = (values: CancelMeetingFormValues) => {
    cancelMeeting.mutate(
      {
        id: meetingId,
        body: { reason: values.reason.trim() },
      },
      {
        onSuccess: () => {
          toast.success('Meeting cancelled. Items returned to the queue.');
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to cancel meeting');
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cancel Meeting" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-600">
          Cancelling will return all assigned appraisals back to the queue. The original workflows
          remain paused and can be re-assigned to a new meeting.
        </p>

        <div>
          <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            {...register('reason')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Why is this meeting being cancelled?"
          />
          {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={cancelMeeting.isPending}
          >
            Keep Meeting
          </Button>
          <Button
            variant="danger"
            type="submit"
            disabled={!isValid || cancelMeeting.isPending}
          >
            {cancelMeeting.isPending ? 'Cancelling...' : 'Cancel Meeting'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CancelMeetingDialog;
