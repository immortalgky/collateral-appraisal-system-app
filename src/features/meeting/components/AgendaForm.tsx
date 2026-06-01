import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Button from '@/shared/components/Button';
import { type UpdateAgendaFormValues, useUpdateAgendaSchema } from '../schemas/meeting';
import { useUpdateMeetingAgenda } from '../api/meetings';

interface AgendaFormProps {
  meetingId: string;
  initialValues: UpdateAgendaFormValues;
  editable: boolean;
  /** Meeting number of the most recently Ended meeting; substitutes into the certify-minutes label. */
  previousEndedMeetingNo: string | null;
}

const AgendaForm = ({
  meetingId,
  initialValues,
  editable,
  previousEndedMeetingNo,
}: AgendaFormProps) => {
  const { t } = useTranslation(['meeting', 'common']);
  const updateAgenda = useUpdateMeetingAgenda();
  const schema = useUpdateAgendaSchema();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateAgendaFormValues>({
    resolver: zodResolver(schema),
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
          toast.success(t('toasts.agendaSaved'));
          reset(values);
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.agendaSaveFailed'));
        },
      },
    );
  };

  const certifyLabel = previousEndedMeetingNo
    ? t('fields.agendaCertifyMinutesWithNo', { no: previousEndedMeetingNo })
    : t('fields.agendaCertifyMinutes');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="agenda-certifyMinutes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {certifyLabel}
        </label>
        <textarea
          id="agenda-certifyMinutes"
          rows={3}
          {...register('agendaCertifyMinutes')}
          disabled={!editable}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder={t('fields.agendaCertifyMinutesPlaceholder')}
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
          {t('fields.agendaChairmanInformed')}
        </label>
        <textarea
          id="agenda-chairmanInformed"
          rows={3}
          {...register('agendaChairmanInformed')}
          disabled={!editable}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder={t('fields.agendaChairmanInformedPlaceholder')}
        />
        {errors.agendaChairmanInformed && (
          <p className="mt-1 text-xs text-red-600">{errors.agendaChairmanInformed.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="agenda-others" className="block text-sm font-medium text-gray-700 mb-1">
          {t('fields.agendaOthers')}
        </label>
        <textarea
          id="agenda-others"
          rows={3}
          {...register('agendaOthers')}
          disabled={!editable}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder={t('fields.agendaOthersPlaceholder')}
        />
        {errors.agendaOthers && (
          <p className="mt-1 text-xs text-red-600">{errors.agendaOthers.message}</p>
        )}
      </div>

      {editable && (
        <div className="flex justify-end pt-2">
          <Button type="submit" size="sm" disabled={!isDirty || updateAgenda.isPending}>
            {updateAgenda.isPending ? t('common:status.saving') : t('buttons.saveAgenda')}
          </Button>
        </div>
      )}
    </form>
  );
};

export default AgendaForm;
