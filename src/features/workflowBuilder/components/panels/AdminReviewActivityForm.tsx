import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { adminReviewActivityFormSchema, type AdminReviewActivityFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { AdminReviewActivityProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function AdminReviewActivityForm({ nodeId }: Props) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as AdminReviewActivityProperties | undefined;

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<AdminReviewActivityFormValues>({
      resolver: zodResolver(adminReviewActivityFormSchema),
      defaultValues: {
        name: data?.name ?? '',
        description: data?.description ?? '',
        reviewDeadline: props?.reviewDeadline ?? '',
        autoApprovalThreshold: props?.autoApprovalThreshold ?? 0,
      },
    });

  useEffect(() => {
    reset({
      name: data?.name ?? '',
      description: data?.description ?? '',
      reviewDeadline: props?.reviewDeadline ?? '',
      autoApprovalThreshold: props?.autoApprovalThreshold ?? 0,
    });
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: AdminReviewActivityFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        reviewDeadline: values.reviewDeadline,
        autoApprovalThreshold: values.autoApprovalThreshold,
      } satisfies AdminReviewActivityProperties,
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-primary gap-1 text-xs">Admin Review Activity</div>

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
        <label className="label"><span className="label-text text-xs font-medium">Review Deadline (ISO 8601)</span></label>
        <input {...register('reviewDeadline')} className="input input-bordered input-sm w-full" placeholder="e.g. 2025-12-31T00:00:00Z" />
        <label className="label"><span className="label-text-alt text-base-content/50">Optional — ISO date string</span></label>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Auto-Approval Threshold</span></label>
        <input type="number" {...register('autoApprovalThreshold')} className="input input-bordered input-sm w-full" min={0} />
        <label className="label"><span className="label-text-alt text-base-content/50">Requests below this value are auto-approved. 0 = disabled.</span></label>
      </div>
    </form>
  );
}
