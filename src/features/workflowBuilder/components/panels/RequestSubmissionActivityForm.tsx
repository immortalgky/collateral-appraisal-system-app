import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { requestSubmissionActivityFormSchema, type RequestSubmissionActivityFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { RequestSubmissionActivityProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function RequestSubmissionActivityForm({ nodeId }: Props) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as RequestSubmissionActivityProperties | undefined;

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<RequestSubmissionActivityFormValues>({
      resolver: zodResolver(requestSubmissionActivityFormSchema),
      defaultValues: buildDefaults(data, props),
    });

  useEffect(() => {
    reset(buildDefaults(data, props));
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: RequestSubmissionActivityFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        propertyType: values.propertyType,
        propertyAddress: values.propertyAddress,
        estimatedValue: values.estimatedValue,
        purpose: values.purpose,
        requestorId: values.requestorId,
      } satisfies RequestSubmissionActivityProperties,
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-primary gap-1 text-xs">Request Submission</div>

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
        <label className="label"><span className="label-text text-xs font-medium">Property Type</span></label>
        <select {...register('propertyType')} className="select select-bordered select-sm w-full">
          <option value="">Select type</option>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
          <option value="Industrial">Industrial</option>
          <option value="Land">Land</option>
        </select>
        {errors.propertyType && <label className="label"><span className="label-text-alt text-error">{errors.propertyType.message}</span></label>}
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Property Address</span></label>
        <input {...register('propertyAddress')} className="input input-bordered input-sm w-full" />
        {errors.propertyAddress && <label className="label"><span className="label-text-alt text-error">{errors.propertyAddress.message}</span></label>}
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Estimated Value</span></label>
        <input type="number" {...register('estimatedValue')} className="input input-bordered input-sm w-full" min={0} />
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Purpose</span></label>
        <select {...register('purpose')} className="select select-bordered select-sm w-full">
          <option value="">Select purpose</option>
          <option value="Mortgage">Mortgage</option>
          <option value="Insurance">Insurance</option>
          <option value="Tax Assessment">Tax Assessment</option>
          <option value="Sale">Sale</option>
        </select>
        {errors.purpose && <label className="label"><span className="label-text-alt text-error">{errors.purpose.message}</span></label>}
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Requestor ID (optional)</span></label>
        <input {...register('requestorId')} className="input input-bordered input-sm w-full" />
      </div>
    </form>
  );
}

function buildDefaults(
  data: ActivityNodeData | undefined,
  props: RequestSubmissionActivityProperties | undefined,
): RequestSubmissionActivityFormValues {
  return {
    name: data?.name ?? '',
    description: data?.description ?? '',
    propertyType: props?.propertyType ?? '',
    propertyAddress: props?.propertyAddress ?? '',
    estimatedValue: props?.estimatedValue ?? 0,
    purpose: props?.purpose ?? '',
    requestorId: props?.requestorId ?? '',
  };
}
