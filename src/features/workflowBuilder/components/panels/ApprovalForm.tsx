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

function buildDefaults(
  data: ActivityNodeData | undefined,
  props: ApprovalProperties | undefined,
): ApprovalFormValues {
  return {
    name: data?.name ?? '',
    description: data?.description ?? '',
    activityName: props?.activityName ?? '',
    memberSourceType: props?.memberSource?.type ?? 'inline',
    valueExpression: props?.memberSource?.valueExpression ?? '',
    thresholds: (props?.memberSource?.thresholds ?? []).map((t) => ({
      committeeCode: t.committeeCode,
      maxValue: t.maxValue != null ? String(t.maxValue) : '',
    })),
    quorumType: props?.quorum?.type ?? 'count',
    quorumValue: props?.quorum?.value ?? 1,
    majorityType: props?.majority?.type ?? 'count',
    majorityValue: props?.majority?.value ?? 1,
    voteOptions: props?.voteOptions ?? ['approve', 'reject', 'route_back'],
    voteMovements: recordToArray(props?.voteMovements ?? {}),
    decisionConditions: recordToArray(props?.decisionConditions ?? {}),
    timeoutDuration: props?.timeoutDuration ?? 'PT72H',
  };
}

export function ApprovalForm({ nodeId }: Props) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as ApprovalProperties | undefined;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<ApprovalFormValues>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: buildDefaults(data, props),
  });

  const { fields: decisionFields, append: appendDecision, remove: removeDecision } =
    useFieldArray({ control, name: 'decisionConditions' });

  const { fields: voteMovementFields, append: appendVoteMovement, remove: removeVoteMovement } =
    useFieldArray({ control, name: 'voteMovements' });

  const { fields: thresholdFields, append: appendThreshold, remove: removeThreshold } =
    useFieldArray({ control, name: 'thresholds' });

  useEffect(() => {
    reset(buildDefaults(data, props));
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const memberSourceType = watch('memberSourceType');

  const onSubmit = (values: ApprovalFormValues) => {
    const memberSource =
      values.memberSourceType === 'threshold'
        ? {
            type: 'threshold' as const,
            valueExpression: values.valueExpression,
            thresholds: values.thresholds.map((t) => ({
              committeeCode: t.committeeCode,
              maxValue: t.maxValue !== '' ? Number(t.maxValue) : null,
            })),
          }
        : {
            type: values.memberSourceType,
            parameters: props?.memberSource?.parameters ?? {},
          };

    const voteMovementsRecord = arrayToRecord(values.voteMovements);

    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        ...(props ?? {}),
        activityName: values.activityName || undefined,
        memberSource,
        quorum: props?.quorum,
        majority: props?.majority,
        voteOptions: values.voteOptions,
        voteMovements: Object.keys(voteMovementsRecord).length > 0 ? voteMovementsRecord : undefined,
        decisionConditions: arrayToRecord(values.decisionConditions),
        timeoutDuration: values.timeoutDuration,
      } satisfies ApprovalProperties,
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-success gap-1 text-xs">Approval Activity</div>

      {/* Name */}
      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Name</span></label>
        <input {...register('name')} className="input input-bordered input-sm w-full" />
        {errors.name && <label className="label"><span className="label-text-alt text-error">{errors.name.message}</span></label>}
      </div>

      {/* Description */}
      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Description</span></label>
        <textarea {...register('description')} className="textarea textarea-bordered textarea-sm w-full" rows={2} />
      </div>

      {/* Activity Name */}
      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Activity Name</span></label>
        <input {...register('activityName')} className="input input-bordered input-sm w-full" placeholder="e.g. PendingApproval" />
      </div>

      <div className="divider text-xs">Member Source</div>

      {/* Source Type */}
      <div className="form-control">
        <label className="label"><span className="label-text text-xs font-medium">Source Type</span></label>
        <select {...register('memberSourceType')} className="select select-bordered select-sm w-full">
          <option value="inline">Inline</option>
          <option value="committee">Committee</option>
          <option value="threshold">Threshold</option>
        </select>
      </div>

      {/* Threshold-specific fields */}
      {memberSourceType === 'threshold' && (
        <>
          <div className="form-control">
            <label className="label"><span className="label-text text-xs font-medium">Value Expression</span></label>
            <input
              {...register('valueExpression')}
              className="input input-bordered input-sm w-full"
              placeholder="e.g. facilityLimit"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">Thresholds</span>
            {thresholdFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                <input
                  {...register(`thresholds.${index}.committeeCode`)}
                  className="input input-bordered input-xs flex-[2]"
                  placeholder="Committee code"
                  onBlur={handleSubmit(onSubmit)}
                />
                <input
                  {...register(`thresholds.${index}.maxValue`)}
                  className="input input-bordered input-xs flex-1"
                  placeholder="Max value (blank = null)"
                  type="number"
                />
                <button
                  type="button"
                  onClick={() => { removeThreshold(index); handleSubmit(onSubmit)(); }}
                  className="btn btn-ghost btn-xs text-error"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => { appendThreshold({ committeeCode: '', maxValue: '' }); setTimeout(() => handleSubmit(onSubmit)(), 0); }}
              className="btn btn-ghost btn-xs text-primary"
            >
              + Add Threshold
            </button>
          </div>
        </>
      )}

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

      <div className="divider text-xs">Vote Movements</div>

      <div className="flex flex-col gap-2">
        {voteMovementFields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`voteMovements.${index}.key`)}
              className="input input-bordered input-xs flex-1"
              placeholder="Vote option (e.g. route_back)"
              onBlur={handleSubmit(onSubmit)}
            />
            <input
              {...register(`voteMovements.${index}.value`)}
              className="input input-bordered input-xs w-16"
              placeholder="F/B/C"
            />
            <button
              type="button"
              onClick={() => { removeVoteMovement(index); handleSubmit(onSubmit)(); }}
              className="btn btn-ghost btn-xs text-error"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => { appendVoteMovement({ key: '', value: '' }); setTimeout(() => handleSubmit(onSubmit)(), 0); }}
          className="btn btn-ghost btn-xs text-primary"
        >
          + Add Vote Movement
        </button>
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
