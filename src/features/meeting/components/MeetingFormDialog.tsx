import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import { meetingFormSchema, type MeetingFormValues } from '../schemas/meeting';
import { useCreateMeeting, useUpdateMeeting } from '../api/meetings';

interface MeetingFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided the dialog operates in edit mode against this meeting id. */
  meetingId?: string;
  /** Pre-fill values when editing. */
  defaultValues?: MeetingFormValues;
  /** Called with the meeting id on successful create / update. */
  onSuccess?: (meetingId: string) => void;
}

const EMPTY_VALUES: MeetingFormValues = { title: '', location: '', notes: '' };

const MeetingFormDialog = ({
  isOpen,
  onClose,
  meetingId,
  defaultValues,
  onSuccess,
}: MeetingFormDialogProps) => {
  const isEditMode = Boolean(meetingId);
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const isPending = createMeeting.isPending || updateMeeting.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: defaultValues ?? EMPTY_VALUES,
  });

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues ?? EMPTY_VALUES);
    }
  }, [isOpen, defaultValues, reset]);

  const handleClose = () => {
    if (!isPending) onClose();
  };

  const onSubmit = (values: MeetingFormValues) => {
    const payload = {
      title: values.title.trim(),
      location: values.location?.trim() ? values.location.trim() : null,
      notes: values.notes?.trim() ? values.notes.trim() : null,
    };

    if (isEditMode && meetingId) {
      updateMeeting.mutate(
        { id: meetingId, body: payload },
        {
          onSuccess: () => {
            toast.success('Meeting updated');
            onSuccess?.(meetingId);
            onClose();
          },
          onError: (error: unknown) => {
            const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
            toast.error(detail || 'Failed to update meeting');
          },
        },
      );
    } else {
      createMeeting.mutate(
        { title: payload.title, notes: payload.notes },
        {
          onSuccess: data => {
            toast.success('Meeting created');
            onSuccess?.(data.id);
            onClose();
          },
          onError: (error: unknown) => {
            const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
            toast.error(detail || 'Failed to create meeting');
          },
        },
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit Meeting' : 'New Meeting'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="meeting-title" className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="meeting-title"
            type="text"
            {...register('title')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Committee meeting — Week 14"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>

        {isEditMode && (
          <div>
            <label
              htmlFor="meeting-location"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Location
            </label>
            <input
              id="meeting-location"
              type="text"
              {...register('location')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Optional"
            />
            {errors.location && (
              <p className="mt-1 text-xs text-red-600">{errors.location.message}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="meeting-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="meeting-notes"
            rows={3}
            {...register('notes')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Optional"
          />
          {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Meeting'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MeetingFormDialog;
