import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import {
  createMeetingFormSchema,
  type CreateMeetingFormValues,
  updateMeetingFormSchema,
  type UpdateMeetingFormValues,
} from '../schemas/meeting';
import { useCreateMeeting, useUpdateMeeting } from '../api/meetings';
import DateTimePickerInput from '@shared/components/inputs/DateTimePickerInput.tsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sensible defaults: today at 09:00 / 17:00 as local times. */
const todayAt = (hour: number): Date => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
};

/**
 * Wire format for meeting datetimes: the user's picked wall-clock time without a
 * timezone offset (e.g. "2026-04-28T09:00:00"). The backend parses this as a
 * Kind=Unspecified DateTime and treats it as application time, so it lines up
 * with IDateTimeProvider.ApplicationNow comparisons.
 *
 * If we sent an ISO string with offset (the picker's default `formatISO` shape),
 * System.Text.Json would convert it to the server's local TZ — which on Docker
 * defaults to UTC, putting StartAt 7 hours behind ApplicationNow.
 */
const toAppLocalIso = (value: string | Date): string => {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, "yyyy-MM-dd'T'HH:mm:ss");
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface MeetingFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided the dialog operates in edit mode against this meeting id. */
  meetingId?: string;
  /** Pre-fill values when editing (UpdateMeetingFormValues shape). */
  defaultValues?: Partial<UpdateMeetingFormValues>;
  /** Called with the meeting id on successful create / update. */
  onSuccess?: (meetingId: string) => void;
}

const buildCreateDefaults = (): CreateMeetingFormValues => ({
  startAt: toAppLocalIso(todayAt(9)),
  endAt: toAppLocalIso(todayAt(17)),
});

const buildUpdateDefaults = (): UpdateMeetingFormValues => ({
  title: '',
  location: '',
  fromText: '',
  toText: '',
  startAt: toAppLocalIso(todayAt(9)),
  endAt: toAppLocalIso(todayAt(17)),
});

const sharedInputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

// ── Create sub-form ───────────────────────────────────────────────────────────

interface CreateFormProps {
  onClose: () => void;
  onSuccess?: (id: string) => void;
}

const CreateForm = ({ onClose, onSuccess }: CreateFormProps) => {
  const createMeeting = useCreateMeeting();

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateMeetingFormValues>({
    resolver: zodResolver(createMeetingFormSchema),
    defaultValues: buildCreateDefaults(),
  });

  const startAtValue = watch('startAt');
  const endAtValue = watch('endAt');

  const onSubmit = (values: CreateMeetingFormValues) => {
    createMeeting.mutate(
      { startAt: toAppLocalIso(values.startAt), endAt: toAppLocalIso(values.endAt) },
      {
        onSuccess: data => {
          toast.success(`Meeting ${data.meetingNo} created`);
          onSuccess?.(data.id);
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to create meeting');
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Start / End */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DateTimePickerInput
          label="Start"
          required
          value={startAtValue}
          onChange={iso => setValue('startAt', iso ?? '', { shouldValidate: true })}
          error={errors.startAt?.message}
          disablePastDates
        />
        <DateTimePickerInput
          label="End"
          required
          value={endAtValue}
          onChange={iso => setValue('endAt', iso ?? '', { shouldValidate: true })}
          error={errors.endAt?.message}
          disablePastDates
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onClose} disabled={createMeeting.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMeeting.isPending}>
          {createMeeting.isPending ? 'Saving...' : 'Create Meeting'}
        </Button>
      </div>
    </form>
  );
};

// ── Edit sub-form ─────────────────────────────────────────────────────────────

interface EditFormProps {
  onClose: () => void;
  initialValues: UpdateMeetingFormValues;
  meetingId: string;
  onSuccess?: (meetingId: string) => void;
}

const EditForm = ({ onClose, initialValues, meetingId, onSuccess }: EditFormProps) => {
  const updateMeeting = useUpdateMeeting();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UpdateMeetingFormValues>({
    resolver: zodResolver(updateMeetingFormSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const startAtValue = watch('startAt');
  const endAtValue = watch('endAt');

  const onSubmit = (values: UpdateMeetingFormValues) => {
    updateMeeting.mutate(
      {
        id: meetingId,
        body: {
          title: values.title.trim(),
          location: values.location?.trim() || null,
          fromText: values.fromText?.trim() || null,
          toText: values.toText?.trim() || null,
          startAt: toAppLocalIso(values.startAt),
          endAt: toAppLocalIso(values.endAt),
        },
      },
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
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="meeting-title" className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="meeting-title"
          type="text"
          {...register('title')}
          className={sharedInputClass}
          placeholder="e.g. Committee meeting — Week 14"
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
      </div>

      {/* Start / End */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DateTimePickerInput
          label="Start"
          required
          value={startAtValue}
          onChange={iso => setValue('startAt', iso ?? '', { shouldValidate: true })}
          error={errors.startAt?.message}
          disablePastDates
        />
        <DateTimePickerInput
          label="End"
          required
          value={endAtValue}
          onChange={iso => setValue('endAt', iso ?? '', { shouldValidate: true })}
          error={errors.endAt?.message}
          disablePastDates
        />
      </div>

      {/* From / To */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="meeting-fromText"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            From
          </label>
          <input
            id="meeting-fromText"
            type="text"
            {...register('fromText')}
            className={sharedInputClass}
            placeholder="Optional"
          />
          {errors.fromText && (
            <p className="mt-1 text-xs text-red-600">{errors.fromText.message}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="meeting-toText"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            To
          </label>
          <input
            id="meeting-toText"
            type="text"
            {...register('toText')}
            className={sharedInputClass}
            placeholder="Optional"
          />
          {errors.toText && <p className="mt-1 text-xs text-red-600">{errors.toText.message}</p>}
        </div>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="meeting-location" className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <input
          id="meeting-location"
          type="text"
          {...register('location')}
          className={sharedInputClass}
          placeholder="Optional"
        />
        {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location.message}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onClose} disabled={updateMeeting.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateMeeting.isPending}>
          {updateMeeting.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

// ── Orchestrator ──────────────────────────────────────────────────────────────

const MeetingFormDialog = ({
  isOpen,
  onClose,
  meetingId,
  defaultValues,
  onSuccess,
}: MeetingFormDialogProps) => {
  const isEditMode = Boolean(meetingId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Meeting' : 'New Meeting'}
      size="md"
    >
      {isEditMode && meetingId ? (
        <EditForm
          onClose={onClose}
          initialValues={{ ...buildUpdateDefaults(), ...defaultValues }}
          meetingId={meetingId}
          onSuccess={onSuccess}
        />
      ) : (
        <CreateForm onClose={onClose} onSuccess={onSuccess} />
      )}
    </Modal>
  );
};

export default MeetingFormDialog;
