import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { startFormSchema, type StartFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';

interface StartFormProps {
  nodeId: string;
}

export function StartForm({ nodeId }: StartFormProps) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StartFormValues>({
    resolver: zodResolver(startFormSchema),
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
      <div className="badge badge-success gap-1 text-xs">Start Activity</div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Name</span>
        </label>
        <input
          {...register('name')}
          className="input input-bordered input-sm w-full"
          placeholder="Workflow Start"
        />
        {errors.name && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.name.message}</span>
          </label>
        )}
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Description</span>
        </label>
        <textarea
          {...register('description')}
          className="textarea textarea-bordered textarea-sm w-full"
          rows={2}
          placeholder="Describe this start point..."
        />
      </div>
    </form>
  );
}
