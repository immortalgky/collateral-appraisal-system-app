import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { makeJoinFormSchema, type JoinFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { JoinProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function JoinForm({ nodeId }: Props) {
  const { t } = useTranslation('workflowBuilder');
  const nodes = useWorkflowStore(s => s.nodes);
  const updateActivityData = useWorkflowStore(s => s.updateActivityData);

  const node = nodes.find(n => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as JoinProperties | undefined;

  // Get available fork nodes to populate forkId dropdown
  const forkNodes = nodes.filter(n => (n.data as ActivityNodeData).type === 'ForkActivity');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JoinFormValues>({
    resolver: zodResolver(makeJoinFormSchema(t)),
    defaultValues: {
      name: data?.name ?? '',
      description: data?.description ?? '',
      forkId: props?.forkId ?? '',
      joinType: props?.joinType ?? 'all',
      timeoutMinutes: props?.timeoutMinutes ?? 0,
      mergeStrategy: props?.mergeStrategy ?? 'merge',
      timeoutAction: props?.timeoutAction ?? 'continue',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        description: data.description,
        forkId: props?.forkId ?? '',
        joinType: props?.joinType ?? 'all',
        timeoutMinutes: props?.timeoutMinutes ?? 0,
        mergeStrategy: props?.mergeStrategy ?? 'merge',
        timeoutAction: props?.timeoutAction ?? 'continue',
      });
    }
  }, [nodeId, data, reset]);

  const onSubmit = (values: JoinFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        ...props,
        forkId: values.forkId,
        joinType: values.joinType,
        timeoutMinutes: values.timeoutMinutes,
        mergeStrategy: values.mergeStrategy,
        timeoutAction: values.timeoutAction,
      },
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-success gap-1 text-xs">{t('forms.badges.join')}</div>

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
          <span className="label-text text-xs font-medium">{t('forms.fields.forkNode')}</span>
        </label>
        <select {...register('forkId')} className="select select-bordered select-sm w-full">
          <option value="">{t('forms.placeholders.selectForkNode')}</option>
          {forkNodes.map(fn => (
            <option key={fn.id} value={fn.id}>
              {(fn.data as ActivityNodeData).name || fn.id}
            </option>
          ))}
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.joinType')}</span>
        </label>
        <select {...register('joinType')} className="select select-bordered select-sm w-full">
          <option value="all">{t('forms.joinTypes.all')}</option>
          <option value="any">{t('forms.joinTypes.any')}</option>
          <option value="n_of_m">{t('forms.joinTypes.nOfM')}</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.timeoutMinutes')}</span>
        </label>
        <input
          {...register('timeoutMinutes')}
          type="number"
          min={0}
          className="input input-bordered input-sm w-full"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.mergeStrategy')}</span>
        </label>
        <select {...register('mergeStrategy')} className="select select-bordered select-sm w-full">
          <option value="merge">{t('forms.mergeStrategies.merge')}</option>
          <option value="first">{t('forms.mergeStrategies.first')}</option>
          <option value="last">{t('forms.mergeStrategies.last')}</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.timeoutAction')}</span>
        </label>
        <select {...register('timeoutAction')} className="select select-bordered select-sm w-full">
          <option value="continue">{t('forms.timeoutActions.continue')}</option>
          <option value="cancel">{t('forms.timeoutActions.cancel')}</option>
          <option value="error">{t('forms.timeoutActions.error')}</option>
        </select>
      </div>
    </form>
  );
}
