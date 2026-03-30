import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { joinFormSchema, type JoinFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { JoinProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function JoinForm({ nodeId }: Props) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as JoinProperties | undefined;

  // Get available fork nodes to populate forkId dropdown
  const forkNodes = nodes.filter((n) => (n.data as ActivityNodeData).type === 'ForkActivity');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<JoinFormValues>({
    resolver: zodResolver(joinFormSchema),
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
      <div className="badge badge-success gap-1 text-xs">Join</div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Name</span></label>
        <input {...register('name')} className="input input-bordered input-sm w-full" />
        {errors.name && <label className="label"><span className="label-text-alt text-error">{errors.name.message}</span></label>}
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Description</span></label>
        <textarea {...register('description')} className="textarea textarea-bordered textarea-sm w-full" rows={2} />
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Fork Node</span></label>
        <select {...register('forkId')} className="select select-bordered select-sm w-full">
          <option value="">Select fork node...</option>
          {forkNodes.map((fn) => (
            <option key={fn.id} value={fn.id}>
              {(fn.data as ActivityNodeData).name || fn.id}
            </option>
          ))}
        </select>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Join Type</span></label>
        <select {...register('joinType')} className="select select-bordered select-sm w-full">
          <option value="all">All (wait for all branches)</option>
          <option value="any">Any (first branch to complete)</option>
          <option value="n_of_m">N of M</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Timeout (minutes, 0 = none)</span></label>
        <input {...register('timeoutMinutes')} type="number" min={0} className="input input-bordered input-sm w-full" />
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Merge Strategy</span></label>
        <select {...register('mergeStrategy')} className="select select-bordered select-sm w-full">
          <option value="merge">Merge all outputs</option>
          <option value="first">Use first completed</option>
          <option value="last">Use last completed</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Timeout Action</span></label>
        <select {...register('timeoutAction')} className="select select-bordered select-sm w-full">
          <option value="continue">Continue</option>
          <option value="cancel">Cancel</option>
          <option value="error">Error</option>
        </select>
      </div>
    </form>
  );
}
