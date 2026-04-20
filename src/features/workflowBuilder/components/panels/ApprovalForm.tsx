import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { approvalFormSchema, type ApprovalFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { ApprovalProperties } from '../../types';

interface Props {
  nodeId: string;
}

function recordToArray(record: Record<string, string>): { key: string; value: string }[] {
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}

function arrayToRecord(arr: { key: string; value: string }[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const { key, value } of arr) {
    if (key) record[key] = value;
  }
  return record;
}

export function ApprovalForm({ nodeId }: Props) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as ApprovalProperties | undefined;

  const { register, handleSubmit, reset, control, formState: { errors } } =
    useForm<ApprovalFormValues>({
      resolver: zodResolver(approvalFormSchema),
      defaultValues: buildDefaults(data, props),
    });

  const { fields: decisionFields, append: appendDecision, remove: removeDecision } =
    useFieldArray({ control, name: 'decisionConditions' });

  useEffect(() => {
    reset(buildDefaults(data, props));
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: ApprovalFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        memberSource: { type: values.memberSourceType, parameters: props?.memberSource?.parameters ?? {} },
        quorum: { type: values.quorumType, value: values.quorumValue },
        majority: { type: values.majorityType, value: values.majorityValue },
        voteOptions: values.voteOptions,
        decisionConditions: arrayToRecord(values.decisionConditions),
        timeoutDuration: values.timeoutDuration,
      } satisfies ApprovalProperties,
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-success gap-1 text-xs">Approval Activity</div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Name</span></label>
        <input {...register('name')} className="input input-bordered input-sm w-full" />
        {errors.name && <label className="label"><span className="label-text-alt text-error">{errors.name.message}</span></label>}
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Description</span></label>
        <textarea {...register('description')} className="textarea textarea-bordered textarea-sm w-full" rows={2} />
      </div>

      <div className="divider text-xs">Member Source</div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Source Type</span></label>
        <select {...register('memberSourceType')} className="select select-bordered select-sm w-full">
          <option value="inline">Inline</option>
          <option value="committee">Committee</option>
          <option value="threshold">Threshold</option>
        </select>
      </div>

      <div className="divider text-xs">Quorum &amp; Majority</div>

      <div className="grid grid-cols-2 gap-2">
        <div className="form-control">
          <label className="label"><span className="label-text text-xs font-medium">Quorum Type</span></label>
          <select {...register('quorumType')} className="select select-bordered select-sm w-full">
            <option value="count">Count</option>
            <option value="percent">Percent</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text text-xs font-medium">Quorum Value</span></label>
          <input type="number" {...register('quorumValue')} className="input input-bordered input-sm w-full" min={1} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="form-control">
          <label className="label"><span className="label-text text-xs font-medium">Majority Type</span></label>
          <select {...register('majorityType')} className="select select-bordered select-sm w-full">
            <option value="count">Count</option>
            <option value="percent">Percent</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text text-xs font-medium">Majority Value</span></label>
          <input type="number" {...register('majorityValue')} className="input input-bordered input-sm w-full" min={1} />
        </div>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Timeout Duration (ISO 8601)</span></label>
        <input {...register('timeoutDuration')} className="input input-bordered input-sm w-full" placeholder="PT72H" />
      </div>

      <div className="divider text-xs">Decision Conditions</div>

      <div className="flex flex-col gap-2">
        {decisionFields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`decisionConditions.${index}.key`)}
              className="input input-bordered input-xs flex-1"
              placeholder="Decision name"
              onBlur={handleSubmit(onSubmit)}
            />
            <input
              {...register(`decisionConditions.${index}.value`)}
              className="input input-bordered input-xs flex-[2]"
              placeholder="Condition expression"
            />
            <button
              type="button"
              onClick={() => { removeDecision(index); handleSubmit(onSubmit)(); }}
              className="btn btn-ghost btn-xs text-error"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => { appendDecision({ key: '', value: '' }); setTimeout(() => handleSubmit(onSubmit)(), 0); }}
          className="btn btn-ghost btn-xs text-primary"
        >
          + Add Decision
        </button>
      </div>
    </form>
  );
}

function buildDefaults(
  data: ActivityNodeData | undefined,
  props: ApprovalProperties | undefined,
): ApprovalFormValues {
  return {
    name: data?.name ?? '',
    description: data?.description ?? '',
    memberSourceType: props?.memberSource?.type ?? 'inline',
    quorumType: props?.quorum?.type ?? 'count',
    quorumValue: props?.quorum?.value ?? 1,
    majorityType: props?.majority?.type ?? 'count',
    majorityValue: props?.majority?.value ?? 1,
    voteOptions: props?.voteOptions ?? ['approve', 'reject', 'route_back'],
    decisionConditions: recordToArray(props?.decisionConditions ?? {}),
    timeoutDuration: props?.timeoutDuration ?? 'PT72H',
  };
}
