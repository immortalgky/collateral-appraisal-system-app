import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { makeStartFormSchema, type StartFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';

interface StartFormProps {
  nodeId: string;
}

export function StartForm({ nodeId }: StartFormProps) {
  const { t } = useTranslation('workflowBuilder');
  const nodes = useWorkflowStore(s => s.nodes);
  const updateActivityData = useWorkflowStore(s => s.updateActivityData);

  const node = nodes.find(n => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StartFormValues>({
    resolver: zodResolver(makeStartFormSchema(t)),
    defaultValues: {
      name: data?.name ?? '',
      description: data?.description ?? '',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        description: data.description,
      });
    }
  }, [nodeId, data, reset]);

  const onSubmit = (values: StartFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-success gap-1 text-xs">{t('forms.badges.startActivity')}</div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.name')}</span>
        </label>
        <input
          {...register('name')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.workflowStart')}
        />
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
          placeholder={t('forms.placeholders.describeStartPoint')}
        />
      </div>
    </form>
  );
}
