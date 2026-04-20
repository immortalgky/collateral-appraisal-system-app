import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { meetingFormSchema, type MeetingFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { MeetingProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function MeetingForm({ nodeId }: Props) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as MeetingProperties | undefined;

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<MeetingFormValues>({
      resolver: zodResolver(meetingFormSchema),
      defaultValues: {
        name: data?.name ?? '',
        description: data?.description ?? '',
        meetingName: props?.meetingName ?? '',
        notes: props?.notes ?? '',
      },
    });

  useEffect(() => {
    reset({
      name: data?.name ?? '',
      description: data?.description ?? '',
      meetingName: props?.meetingName ?? '',
      notes: props?.notes ?? '',
    });
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: MeetingFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        meetingName: values.meetingName,
        notes: values.notes,
      } satisfies MeetingProperties,
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-info gap-1 text-xs">Meeting Activity</div>

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
        <label className="label"><span className="label-text text-xs font-medium">Meeting Name</span></label>
        <input {...register('meetingName')} className="input input-bordered input-sm w-full" placeholder="e.g. Committee Approval Meeting" />
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Notes</span></label>
        <textarea {...register('notes')} className="textarea textarea-bordered textarea-sm w-full" rows={3} placeholder="Optional meeting notes" />
      </div>
    </form>
  );
}
