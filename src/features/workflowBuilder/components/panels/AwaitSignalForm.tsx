import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { makeAwaitSignalFormSchema, type AwaitSignalFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { AwaitSignalProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function AwaitSignalForm({ nodeId }: Props) {
  const { t } = useTranslation('workflowBuilder');
  const nodes = useWorkflowStore(s => s.nodes);
  const updateActivityData = useWorkflowStore(s => s.updateActivityData);

  const node = nodes.find(n => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as AwaitSignalProperties | undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AwaitSignalFormValues>({
    resolver: zodResolver(makeAwaitSignalFormSchema(t)),
    defaultValues: {
      name: data?.name ?? '',
      description: data?.description ?? '',
      signalName: props?.signalName ?? '',
      correlationKey: props?.correlationKey ?? '',
      completionVariable: props?.completionVariable ?? '',
    },
  });

  useEffect(() => {
    reset({
      name: data?.name ?? '',
      description: data?.description ?? '',
      signalName: props?.signalName ?? '',
      correlationKey: props?.correlationKey ?? '',
      completionVariable: props?.completionVariable ?? '',
    });
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: AwaitSignalFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        signalName: values.signalName,
        correlationKey: values.correlationKey,
        completionVariable: values.completionVariable,
      } satisfies AwaitSignalProperties,
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-info gap-1 text-xs">{t('forms.badges.awaitSignalActivity')}</div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.name')}</span>
        </label>
        <input {...register('name')} className="input input-bordered input-sm w-full" />
        {errors.name && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.name.message}</span>
          </label>
        )}
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.description')}</span>
        </label>
        <textarea
          {...register('description')}
          className="textarea textarea-bordered textarea-sm w-full"
          rows={2}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.signalName')}</span>
        </label>
        <input
          {...register('signalName')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.signalNameHint')}
        />
        {errors.signalName && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.signalName.message}</span>
          </label>
        )}
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.correlationKey')}</span>
        </label>
        <input
          {...register('correlationKey')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.correlationKeyHint')}
        />
        {errors.correlationKey && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.correlationKey.message}</span>
          </label>
        )}
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">
            {t('forms.fields.completionVariable')}
          </span>
        </label>
        <input
          {...register('completionVariable')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.completionVariableHint')}
        />
        <label className="label">
          <span className="label-text-alt text-base-content/50">
            {t('forms.hints.completionVariableHint')}
          </span>
        </label>
      </div>
    </form>
  );
}
