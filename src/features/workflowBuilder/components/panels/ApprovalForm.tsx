import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { makeApprovalFormSchema, type ApprovalFormValues } from '../../schemas';
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
    thresholds: (props?.memberSource?.thresholds ?? []).map(threshold => ({
      committeeCode: threshold.committeeCode,
      maxValue: threshold.maxValue != null ? String(threshold.maxValue) : '',
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
  const { t } = useTranslation('workflowBuilder');
  const nodes = useWorkflowStore(s => s.nodes);
  const updateActivityData = useWorkflowStore(s => s.updateActivityData);

  const node = nodes.find(n => n.id === nodeId);
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
    resolver: zodResolver(makeApprovalFormSchema(t)),
    defaultValues: buildDefaults(data, props),
  });

  const {
    fields: decisionFields,
    append: appendDecision,
    remove: removeDecision,
  } = useFieldArray({ control, name: 'decisionConditions' });

  const {
    fields: voteMovementFields,
    append: appendVoteMovement,
    remove: removeVoteMovement,
  } = useFieldArray({ control, name: 'voteMovements' });

  const {
    fields: thresholdFields,
    append: appendThreshold,
    remove: removeThreshold,
  } = useFieldArray({ control, name: 'thresholds' });

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
            thresholds: values.thresholds.map(threshold => ({
              committeeCode: threshold.committeeCode,
              maxValue: threshold.maxValue !== '' ? Number(threshold.maxValue) : null,
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
        voteMovements:
          Object.keys(voteMovementsRecord).length > 0 ? voteMovementsRecord : undefined,
        decisionConditions: arrayToRecord(values.decisionConditions),
        timeoutDuration: values.timeoutDuration,
      } satisfies ApprovalProperties,
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-success gap-1 text-xs">{t('forms.badges.approvalActivity')}</div>

      {/* Name */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.name')}</span>
        </label>
        <input {...register('name')} className="input input-bordered input-sm w-full" />
        {errors.name && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.name.message}</span>
          </label>
        )}
      </div>

      {/* Description */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.description')}</span>
        </label>
        <textarea
          {...register('description')}
          className="textarea textarea-bordered textarea-sm w-full"
          rows={2}
        />
      </div>

      {/* Activity Name */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.activityName')}</span>
        </label>
        <input
          {...register('activityName')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.activityNameHint')}
        />
      </div>

      <div className="divider text-xs">{t('forms.sections.memberSource')}</div>

      {/* Source Type */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">
            {t('forms.fields.memberSourceType')}
          </span>
        </label>
        <select
          {...register('memberSourceType')}
          className="select select-bordered select-sm w-full"
        >
          <option value="inline">{t('forms.memberSourceTypes.inline')}</option>
          <option value="committee">{t('forms.memberSourceTypes.committee')}</option>
          <option value="threshold">{t('forms.memberSourceTypes.threshold')}</option>
        </select>
      </div>

      {/* Threshold-specific fields */}
      {memberSourceType === 'threshold' && (
        <>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs font-medium">
                {t('forms.fields.valueExpression')}
              </span>
            </label>
            <input
              {...register('valueExpression')}
              className="input input-bordered input-sm w-full"
              placeholder={t('forms.placeholders.expressionHint')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium">{t('forms.thresholds.title')}</span>
            {thresholdFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                <input
                  {...register(`thresholds.${index}.committeeCode`)}
                  className="input input-bordered input-xs flex-[2]"
                  placeholder={t('forms.placeholders.committeeCodeHint')}
                  onBlur={handleSubmit(onSubmit)}
                />
                <input
                  {...register(`thresholds.${index}.maxValue`)}
                  className="input input-bordered input-xs flex-1"
                  placeholder={t('forms.placeholders.maxValueHint')}
                  type="number"
                />
                <button
                  type="button"
                  onClick={() => {
                    removeThreshold(index);
                    handleSubmit(onSubmit)();
                  }}
                  className="btn btn-ghost btn-xs text-error"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                appendThreshold({ committeeCode: '', maxValue: '' });
                setTimeout(() => handleSubmit(onSubmit)(), 0);
              }}
              className="btn btn-ghost btn-xs text-primary"
            >
              {t('forms.buttons.addThreshold')}
            </button>
          </div>
        </>
      )}

      <div className="divider text-xs">{t('forms.sections.quorumMajority')}</div>

      <div className="grid grid-cols-2 gap-2">
        <div className="form-control">
          <label className="label">
            <span className="label-text text-xs font-medium">{t('forms.fields.quorumType')}</span>
          </label>
          <select {...register('quorumType')} className="select select-bordered select-sm w-full">
            <option value="count">{t('forms.quorumTypes.count')}</option>
            <option value="percent">{t('forms.quorumTypes.percent')}</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text text-xs font-medium">{t('forms.fields.quorumValue')}</span>
          </label>
          <input
            type="number"
            {...register('quorumValue')}
            className="input input-bordered input-sm w-full"
            min={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="form-control">
          <label className="label">
            <span className="label-text text-xs font-medium">{t('forms.fields.majorityType')}</span>
          </label>
          <select {...register('majorityType')} className="select select-bordered select-sm w-full">
            <option value="count">{t('forms.quorumTypes.count')}</option>
            <option value="percent">{t('forms.quorumTypes.percent')}</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text text-xs font-medium">
              {t('forms.fields.majorityValue')}
            </span>
          </label>
          <input
            type="number"
            {...register('majorityValue')}
            className="input input-bordered input-sm w-full"
            min={1}
          />
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">
            {t('forms.fields.timeoutDurationApproval')}
          </span>
        </label>
        <input
          {...register('timeoutDuration')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.timeoutDurationHint')}
        />
      </div>

      <div className="divider text-xs">{t('forms.sections.voteMovements')}</div>

      <div className="flex flex-col gap-2">
        {voteMovementFields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`voteMovements.${index}.key`)}
              className="input input-bordered input-xs flex-1"
              placeholder={t('forms.placeholders.voteOptionHint')}
              onBlur={handleSubmit(onSubmit)}
            />
            <input
              {...register(`voteMovements.${index}.value`)}
              className="input input-bordered input-xs w-16"
              placeholder={t('forms.placeholders.voteMovementHint')}
            />
            <button
              type="button"
              onClick={() => {
                removeVoteMovement(index);
                handleSubmit(onSubmit)();
              }}
              className="btn btn-ghost btn-xs text-error"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            appendVoteMovement({ key: '', value: '' });
            setTimeout(() => handleSubmit(onSubmit)(), 0);
          }}
          className="btn btn-ghost btn-xs text-primary"
        >
          {t('forms.buttons.addVoteMovement')}
        </button>
      </div>

      <div className="divider text-xs">{t('forms.sections.decisionConditions')}</div>

      <div className="flex flex-col gap-2">
        {decisionFields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`decisionConditions.${index}.key`)}
              className="input input-bordered input-xs flex-1"
              placeholder={t('forms.placeholders.decisionNameHint')}
              onBlur={handleSubmit(onSubmit)}
            />
            <input
              {...register(`decisionConditions.${index}.value`)}
              className="input input-bordered input-xs flex-[2]"
              placeholder={t('forms.placeholders.conditionHint')}
            />
            <button
              type="button"
              onClick={() => {
                removeDecision(index);
                handleSubmit(onSubmit)();
              }}
              className="btn btn-ghost btn-xs text-error"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            appendDecision({ key: '', value: '' });
            setTimeout(() => handleSubmit(onSubmit)(), 0);
          }}
          className="btn btn-ghost btn-xs text-primary"
        >
          {t('forms.buttons.addDecision')}
        </button>
      </div>
    </form>
  );
}
