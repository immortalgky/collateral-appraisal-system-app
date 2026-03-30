import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { endFormSchema, type EndFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { EndProperties } from '../../types';

interface EndFormProps {
  nodeId: string;
}

export function EndForm({ nodeId }: EndFormProps) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as EndProperties | undefined;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EndFormValues>({
    resolver: zodResolver(endFormSchema),
    defaultValues: {
      name: data?.name ?? '',
      description: data?.description ?? '',
      completionMessage: props?.completionMessage ?? '',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        description: data.description,
        completionMessage: (data.properties as EndProperties)?.completionMessage ?? '',
      });
    }
  }, [nodeId, data, reset]);

  const onSubmit = (values: EndFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        completionMessage: values.completionMessage,
      },
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-error gap-1 text-xs">End Activity</div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Name</span>
        </label>
        <input
          {...register('name')}
          className="input input-bordered input-sm w-full"
          placeholder="Workflow End"
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
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Completion Message</span>
        </label>
        <textarea
          {...register('completionMessage')}
          className="textarea textarea-bordered textarea-sm w-full"
          rows={2}
          placeholder="Workflow completed successfully"
        />
      </div>
    </form>
  );
}
