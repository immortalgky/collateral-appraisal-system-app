import '@/features/feeApprovalConfig/i18n';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useGetAppointmentApprovalRule, useUpsertAppointmentApprovalRule } from '../api/feeApprovalConfig';

// ---- Schema ----

const ruleSchema = z.object({
  weekendHolidayEnabled: z.boolean(),
  weekdayEnabled: z.boolean(),
  leadTimeEnabled: z.boolean(),
  leadTimeDays: z.coerce.number().int().positive().nullable().optional(),
  rescheduleEnabled: z.boolean(),
  rescheduleThreshold: z.coerce.number().int().positive().nullable().optional(),
  appliesTo: z.enum(['Ext', 'Int', 'Both'] as const),
});

// Explicit type so RHF form values are well-typed (avoiding unknown from z.coerce input)
type RuleFormValues = {
  weekendHolidayEnabled: boolean;
  weekdayEnabled: boolean;
  leadTimeEnabled: boolean;
  leadTimeDays?: number | null;
  rescheduleEnabled: boolean;
  rescheduleThreshold?: number | null;
  appliesTo: 'Ext' | 'Int' | 'Both';
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

const AppointmentApprovalRulePage = () => {
  const { t } = useTranslation(['feeApprovalConfig', 'common']);
  const { data: rule, isLoading } = useGetAppointmentApprovalRule();
  const upsert = useUpsertAppointmentApprovalRule();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      weekendHolidayEnabled: false,
      weekdayEnabled: false,
      leadTimeEnabled: false,
      leadTimeDays: undefined,
      rescheduleEnabled: false,
      rescheduleThreshold: undefined,
      appliesTo: 'Ext',
    },
  });

  useEffect(() => {
    if (rule) {
      reset({
        weekendHolidayEnabled: rule.weekendHolidayEnabled,
        weekdayEnabled: rule.weekdayEnabled,
        leadTimeEnabled: rule.leadTimeEnabled,
        leadTimeDays: rule.leadTimeDays ?? undefined,
        rescheduleEnabled: rule.rescheduleEnabled,
        rescheduleThreshold: rule.rescheduleThreshold ?? undefined,
        appliesTo: rule.appliesTo,
      });
    }
  }, [rule, reset]);

  const leadTimeEnabled = watch('leadTimeEnabled');
  const rescheduleEnabled = watch('rescheduleEnabled');

  const onSubmit = (values: RuleFormValues) => {
    upsert.mutate(
      {
        weekendHolidayEnabled: values.weekendHolidayEnabled,
        weekdayEnabled: values.weekdayEnabled,
        leadTimeEnabled: values.leadTimeEnabled,
        leadTimeDays: values.leadTimeDays ?? null,
        rescheduleEnabled: values.rescheduleEnabled,
        rescheduleThreshold: values.rescheduleThreshold ?? null,
        appliesTo: values.appliesTo,
      },
      {
        onSuccess: () => toast.success(t('feeApprovalConfig:toasts.ruleSaved')),
        onError: (err: unknown) => {
          const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('feeApprovalConfig:toasts.ruleSaveFailed'));
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          {t('feeApprovalConfig:rulePage.title')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('feeApprovalConfig:rulePage.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border border-gray-200 p-4 space-y-5">
        {/* Weekend / Holiday */}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
          <input
            id="rule-weekend"
            type="checkbox"
            {...register('weekendHolidayEnabled')}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <div>
            <label htmlFor="rule-weekend" className="text-sm font-medium text-gray-700 cursor-pointer">
              {t('feeApprovalConfig:ruleFields.weekendHoliday')}
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('feeApprovalConfig:ruleFields.weekendHolidayHint')}
            </p>
          </div>
        </div>

        {/* Weekday */}
        <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
          <input
            id="rule-weekday"
            type="checkbox"
            {...register('weekdayEnabled')}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <div>
            <label htmlFor="rule-weekday" className="text-sm font-medium text-gray-700 cursor-pointer">
              {t('feeApprovalConfig:ruleFields.weekday')}
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('feeApprovalConfig:ruleFields.weekdayHint')}
            </p>
          </div>
        </div>

        {/* Lead Time */}
        <div className="p-3 rounded-lg border border-gray-100 bg-gray-50 space-y-3">
          <div className="flex items-start gap-3">
            <input
              id="rule-leadtime"
              type="checkbox"
              {...register('leadTimeEnabled')}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <div>
              <label htmlFor="rule-leadtime" className="text-sm font-medium text-gray-700 cursor-pointer">
                {t('feeApprovalConfig:ruleFields.leadTime')}
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('feeApprovalConfig:ruleFields.leadTimeHint')}
              </p>
            </div>
          </div>
          {leadTimeEnabled && (
            <div className="ml-7">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('feeApprovalConfig:ruleFields.leadTimeDays')}
              </label>
              <input
                type="number"
                min={1}
                {...register('leadTimeDays')}
                className={`${inputClass} max-w-xs`}
                placeholder="e.g. 3"
              />
              {errors.leadTimeDays && (
                <p className="mt-1 text-xs text-red-600">{errors.leadTimeDays.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Reschedule Count */}
        <div className="p-3 rounded-lg border border-gray-100 bg-gray-50 space-y-3">
          <div className="flex items-start gap-3">
            <input
              id="rule-reschedule"
              type="checkbox"
              {...register('rescheduleEnabled')}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <div>
              <label htmlFor="rule-reschedule" className="text-sm font-medium text-gray-700 cursor-pointer">
                {t('feeApprovalConfig:ruleFields.reschedule')}
              </label>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('feeApprovalConfig:ruleFields.rescheduleHint')}
              </p>
            </div>
          </div>
          {rescheduleEnabled && (
            <div className="ml-7">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('feeApprovalConfig:ruleFields.rescheduleThreshold')}
              </label>
              <input
                type="number"
                min={1}
                {...register('rescheduleThreshold')}
                className={`${inputClass} max-w-xs`}
                placeholder="e.g. 2"
              />
              {errors.rescheduleThreshold && (
                <p className="mt-1 text-xs text-red-600">{errors.rescheduleThreshold.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Applies To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('feeApprovalConfig:fields.appliesTo')}
          </label>
          <select {...register('appliesTo')} className={`${inputClass} max-w-xs`}>
            <option value="Ext">Ext</option>
            <option value="Int">Int</option>
            <option value="Both">Both</option>
          </select>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={upsert.isPending || !isDirty}>
            {upsert.isPending ? t('common:status.saving') : t('common:actions.save')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentApprovalRulePage;
