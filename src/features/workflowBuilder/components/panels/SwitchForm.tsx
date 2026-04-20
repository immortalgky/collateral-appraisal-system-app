import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { switchFormSchema, type SwitchFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { SwitchProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function SwitchForm({ nodeId }: Props) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as SwitchProperties | undefined;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SwitchFormValues>({
    resolver: zodResolver(switchFormSchema),
    defaultValues: {
      name: data?.name ?? '',
      description: data?.description ?? '',
      expression: props?.expression ?? '',
      cases: props?.cases ?? [],
    },
  });

  const cases = watch('cases') ?? [];

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        description: data.description,
        expression: props?.expression ?? '',
        cases: props?.cases ?? [],
      });
    }
  }, [nodeId, data, reset]);

  const onSubmit = (values: SwitchFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: { ...props, expression: values.expression, cases: values.cases },
    });
  };

  const appendCase = () => {
    setValue('cases', [...cases, ''], { shouldDirty: true });
  };

  const removeCase = (index: number) => {
    const next = cases.filter((_, i) => i !== index);
    setValue('cases', next, { shouldDirty: true });
    handleSubmit(onSubmit)();
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-secondary gap-1 text-xs">Switch</div>

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
        <label className="label"><span className="label-text text-xs font-medium">Expression</span></label>
        <input {...register('expression')} className="input input-bordered input-sm w-full font-mono text-xs" placeholder="e.g. facilityLimit" />
        {errors.expression && <label className="label"><span className="label-text-alt text-error">{errors.expression.message}</span></label>}
      </div>

      <div className="divider text-xs">Cases</div>
      <p className="-mt-2 text-[11px] text-base-content/60">
        Each case becomes a labeled output handle. A <code>default</code> handle is always added for unmatched values.
      </p>

      {cases.map((_, index) => (
        <div key={index} className="flex gap-2">
          <input
            {...register(`cases.${index}` as const)}
            className="input input-bordered input-sm flex-1 font-mono text-xs"
            placeholder="e.g. > 30000000"
          />
          <button
            type="button"
            onClick={() => removeCase(index)}
            className="btn btn-ghost btn-sm text-error"
          >
            x
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={appendCase}
        className="btn btn-ghost btn-sm"
      >
        + Add Case
      </button>
    </form>
  );
}
