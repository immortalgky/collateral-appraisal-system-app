import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { dynamicPropertyFormSchema, type DynamicPropertyFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import { useGetActivityTypes } from '../../api';

interface Props {
  nodeId: string;
}

export function DynamicPropertyForm({ nodeId }: Props) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);
  const { data: activityTypes } = useGetActivityTypes();

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;

  const typeDef = activityTypes?.find((at) => at.type === data?.type);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DynamicPropertyFormValues>({
    resolver: zodResolver(dynamicPropertyFormSchema),
    defaultValues: {
      name: data?.name ?? '',
      description: data?.description ?? '',
    },
  });

  useEffect(() => {
    if (data) {
      reset({ name: data.name, description: data.description });
    }
  }, [nodeId, data, reset]);

  const onSubmit = (values: DynamicPropertyFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-neutral gap-1 text-xs">
        {typeDef?.name || data.type}
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Name</span></label>
        <input {...register('name')} className="input input-bordered input-sm w-full" />
        {errors.name && <label className="label"><span className="label-text-alt text-error">{errors.name.message}</span></label>}
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Description</span></label>
        <textarea {...register('description')} className="textarea textarea-bordered textarea-sm w-full" rows={2} />
      </div>

      {typeDef && typeDef.properties.length > 0 && (
        <>
          <div className="divider text-xs">Properties</div>
          <p className="text-[10px] text-base-content/50">
            This activity type has {typeDef.properties.length} configurable properties.
            Edit them via the raw JSON schema for now.
          </p>
          <div className="rounded-lg bg-base-200 p-3">
            <pre className="text-[10px] text-base-content/70">
              {JSON.stringify(data.properties, null, 2)}
            </pre>
          </div>
        </>
      )}
    </form>
  );
}
