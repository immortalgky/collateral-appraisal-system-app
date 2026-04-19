import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { timerFormSchema, type TimerFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { TimerProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function TimerForm({ nodeId }: Props) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as TimerProperties | undefined;

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<TimerFormValues>({
      resolver: zodResolver(timerFormSchema),
      defaultValues: buildDefaults(data, props),
    });

  useEffect(() => {
    reset(buildDefaults(data, props));
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: TimerFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        duration: values.duration,
        scheduledTime: values.scheduledTime,
        timerName: values.timerName,
        allowEarlyCancellation: values.allowEarlyCancellation,
      } satisfies TimerProperties,
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-warning gap-1 text-xs">Timer Activity</div>

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
        <label className="label"><span className="label-text text-xs font-medium">Timer Name</span></label>
        <input {...register('timerName')} className="input input-bordered input-sm w-full" placeholder="e.g. review-window" />
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Duration (ISO 8601)</span></label>
        <input {...register('duration')} className="input input-bordered input-sm w-full" placeholder="PT24H" />
        {errors.duration && <label className="label"><span className="label-text-alt text-error">{errors.duration.message}</span></label>}
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Scheduled Time (optional)</span></label>
        <input {...register('scheduledTime')} className="input input-bordered input-sm w-full" placeholder="ISO 8601 datetime" />
        <label className="label"><span className="label-text-alt text-base-content/50">Leave blank to use duration from trigger time</span></label>
      </div>

      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" {...register('allowEarlyCancellation')} className="checkbox checkbox-warning checkbox-sm" />
          <span className="label-text text-xs font-medium">Allow Early Cancellation</span>
        </label>
      </div>
    </form>
  );
}

function buildDefaults(
  data: ActivityNodeData | undefined,
  props: TimerProperties | undefined,
): TimerFormValues {
  return {
    name: data?.name ?? '',
    description: data?.description ?? '',
    duration: props?.duration ?? 'PT24H',
    scheduledTime: props?.scheduledTime ?? '',
    timerName: props?.timerName ?? '',
    allowEarlyCancellation: props?.allowEarlyCancellation ?? false,
  };
}
