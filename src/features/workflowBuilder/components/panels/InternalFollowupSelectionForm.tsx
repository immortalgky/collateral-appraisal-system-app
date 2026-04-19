import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { internalFollowupSelectionFormSchema, type InternalFollowupSelectionFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';

interface Props {
  nodeId: string;
}

export function InternalFollowupSelectionForm({ nodeId }: Props) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<InternalFollowupSelectionFormValues>({
      resolver: zodResolver(internalFollowupSelectionFormSchema),
      defaultValues: {
        name: data?.name ?? '',
        description: data?.description ?? '',
      },
    });

  useEffect(() => {
    reset({
      name: data?.name ?? '',
      description: data?.description ?? '',
    });
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: InternalFollowupSelectionFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-info gap-1 text-xs">Internal Followup Selection</div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Name</span></label>
        <input {...register('name')} className="input input-bordered input-sm w-full" />
        {errors.name && <label className="label"><span className="label-text-alt text-error">{errors.name.message}</span></label>}
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Description</span></label>
        <textarea {...register('description')} className="textarea textarea-bordered textarea-sm w-full" rows={2} />
      </div>

      <div className="alert alert-info text-xs">
        Routes to <code>staff_selected</code> when internal followup staff is found, or <code>no_match</code> otherwise.
      </div>
    </form>
  );
}
