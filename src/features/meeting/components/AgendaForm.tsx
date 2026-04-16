import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import Button from '@/shared/components/Button';
import { updateAgendaSchema, type UpdateAgendaFormValues } from '../schemas/meeting';
import { useUpdateMeetingAgenda } from '../api/meetings';

interface AgendaFormProps {
  meetingId: string;
  initialValues: UpdateAgendaFormValues;
  editable: boolean;
}

const AgendaForm = ({ meetingId, initialValues, editable }: AgendaFormProps) => {
  const updateAgenda = useUpdateMeetingAgenda();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateAgendaFormValues>({
    resolver: zodResolver(updateAgendaSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const onSubmit = (values: UpdateAgendaFormValues) => {
    updateAgenda.mutate(
      { meetingId, body: values },
      {
        onSuccess: () => {
          toast.success('Agenda saved');
          reset(values);
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || 'Failed to save agenda');
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="agenda-fromText" className="block text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <input
            id="agenda-fromText"
            type="text"
            {...register('fromText')}
            disabled={!editable}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="e.g. President"
          />
          {errors.fromText && (
            <p className="mt-1 text-xs text-red-600">{errors.fromText.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="agenda-toText" className="block text-sm font-medium text-gray-700 mb-1">
            To
          </label>
          <input
            id="agenda-toText"
            type="text"
            {...register('toText')}
            disabled={!editable}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="e.g. Committee Members"
          />
          {errors.toText && <p className="mt-1 text-xs text-red-600">{errors.toText.message}</p>}
        </div>
      </div>

      <div>
        <label
          htmlFor="agenda-certifyMinutes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Certify Minutes
        </label>
        <textarea
          id="agenda-certifyMinutes"
          rows={3}
          {...register('agendaCertifyMinutes')}
          disabled={!editable}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder="Minutes certification text..."
        />
        {errors.agendaCertifyMinutes && (
          <p className="mt-1 text-xs text-red-600">{errors.agendaCertifyMinutes.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="agenda-chairmanInformed"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Chairman Informed
        </label>
        <textarea
          id="agenda-chairmanInformed"
          rows={3}
          {...register('agendaChairmanInformed')}
          disabled={!editable}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder="Information to chairman..."
        />
        {errors.agendaChairmanInformed && (
          <p className="mt-1 text-xs text-red-600">{errors.agendaChairmanInformed.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="agenda-others" className="block text-sm font-medium text-gray-700 mb-1">
          Other Matters
        </label>
        <textarea
          id="agenda-others"
          rows={3}
          {...register('agendaOthers')}
          disabled={!editable}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder="Any other agenda items..."
        />
        {errors.agendaOthers && (
          <p className="mt-1 text-xs text-red-600">{errors.agendaOthers.message}</p>
        )}
      </div>

      {editable && (
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="sm"
            disabled={!isDirty || updateAgenda.isPending}
          >
            {updateAgenda.isPending ? 'Saving...' : 'Save Agenda'}
          </Button>
        </div>
      )}
    </form>
  );
};

export default AgendaForm;
