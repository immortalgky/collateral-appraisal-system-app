import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { makeForkFormSchema, type ForkFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { ForkProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function ForkForm({ nodeId }: Props) {
  const { t } = useTranslation('workflowBuilder');
  const nodes = useWorkflowStore(s => s.nodes);
  const updateActivityData = useWorkflowStore(s => s.updateActivityData);

  const node = nodes.find(n => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as ForkProperties | undefined;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ForkFormValues>({
    resolver: zodResolver(makeForkFormSchema(t)),
    defaultValues: {
      name: data?.name ?? '',
      description: data?.description ?? '',
      branches: props?.branches ?? [],
      forkType: props?.forkType ?? 'parallel',
      maxConcurrency: props?.maxConcurrency ?? 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'branches' as never,
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        description: data.description,
        branches: props?.branches ?? [],
        forkType: props?.forkType ?? 'parallel',
        maxConcurrency: props?.maxConcurrency ?? 0,
      });
    }
  }, [nodeId, data, reset]);

  const onSubmit = (values: ForkFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        ...props,
        branches: values.branches,
        forkType: values.forkType,
        maxConcurrency: values.maxConcurrency,
      },
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-secondary gap-1 text-xs">{t('forms.badges.fork')}</div>

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
          <span className="label-text text-xs font-medium">{t('forms.fields.forkType')}</span>
        </label>
        <select {...register('forkType')} className="select select-bordered select-sm w-full">
          <option value="parallel">{t('forms.forkTypes.parallel')}</option>
          <option value="inclusive">{t('forms.forkTypes.inclusive')}</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.maxConcurrency')}</span>
        </label>
        <input
          {...register('maxConcurrency')}
          type="number"
          min={0}
          className="input input-bordered input-sm w-full"
        />
      </div>

      <div className="divider text-xs">{t('forms.sections.branches')}</div>

      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <input
            {...register(`branches.${index}`)}
            className="input input-bordered input-sm flex-1"
            placeholder={t('forms.placeholders.branchNameHint')}
          />
          <button
            type="button"
            onClick={() => {
              remove(index);
              handleSubmit(onSubmit)();
            }}
            className="btn btn-ghost btn-sm text-error"
          >
            x
          </button>
        </div>
      ))}

      <button type="button" onClick={() => append('' as never)} className="btn btn-ghost btn-sm">
        {t('forms.buttons.addBranch')}
      </button>
    </form>
  );
}
