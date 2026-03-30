import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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

  const casesArray = Object.entries(props?.cases ?? {}).map(([key, value]) => ({ key, value }));

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<SwitchFormValues>({
    resolver: zodResolver(switchFormSchema),
    defaultValues: {
      name: data?.name ?? '',
      description: data?.description ?? '',
      expression: props?.expression ?? '',
      cases: casesArray.length > 0 ? casesArray : [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'cases' });

  useEffect(() => {
    if (data) {
      const ca = Object.entries(props?.cases ?? {}).map(([key, value]) => ({ key, value }));
      reset({
        name: data.name,
        description: data.description,
        expression: props?.expression ?? '',
        cases: ca.length > 0 ? ca : [],
      });
    }
  }, [nodeId, data, reset]);

  const onSubmit = (values: SwitchFormValues) => {
    const casesObj: Record<string, string> = {};
    values.cases.forEach((c) => { casesObj[c.key] = c.value; });

    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: { ...props, expression: values.expression, cases: casesObj },
    });
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
        <input {...register('expression')} className="input input-bordered input-sm w-full font-mono text-xs" placeholder="e.g. decision" />
        {errors.expression && <label className="label"><span className="label-text-alt text-error">{errors.expression.message}</span></label>}
      </div>

      <div className="divider text-xs">Cases</div>

      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <input {...register(`cases.${index}.key`)} className="input input-bordered input-sm flex-1" placeholder="Case name" />
          <input {...register(`cases.${index}.value`)} className="input input-bordered input-sm flex-1" placeholder="Condition" />
          <button type="button" onClick={() => { remove(index); handleSubmit(onSubmit)(); }} className="btn btn-ghost btn-sm text-error">x</button>
        </div>
      ))}

      <button type="button" onClick={() => append({ key: '', value: '' })} className="btn btn-ghost btn-sm">
        + Add Case
      </button>
    </form>
  );
}
