import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { makeIfElseFormSchema, type IfElseFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { IfElseProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function IfElseForm({ nodeId }: Props) {
  const { t } = useTranslation('workflowBuilder');
  const nodes = useWorkflowStore(s => s.nodes);
  const updateActivityData = useWorkflowStore(s => s.updateActivityData);

  const node = nodes.find(n => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as IfElseProperties | undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IfElseFormValues>({
    resolver: zodResolver(makeIfElseFormSchema(t)),
    defaultValues: {
      name: data?.name ?? '',
      description: data?.description ?? '',
      condition: props?.condition ?? '',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        description: data.description,
        condition: props?.condition ?? '',
      });
    }
  }, [nodeId, data, reset]);

  const onSubmit = (values: IfElseFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: { ...props, condition: values.condition },
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-warning gap-1 text-xs">{t('forms.badges.ifElse')}</div>

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
          <span className="label-text text-xs font-medium">
            {t('forms.fields.conditionExpression')}
          </span>
        </label>
        <textarea
          {...register('condition')}
          className="textarea textarea-bordered textarea-sm w-full font-mono text-xs"
          rows={3}
          placeholder={t('forms.placeholders.conditionExpressionHint')}
        />
        {errors.condition && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.condition.message}</span>
          </label>
        )}
        <p className="mt-1 text-[10px] text-base-content/50">{t('forms.hints.conditionRouting')}</p>
      </div>
    </form>
  );
}
