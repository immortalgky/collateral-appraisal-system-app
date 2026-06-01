import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { makeTaskFormSchema, type TaskFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { TaskProperties } from '../../types';
import { AssignmentStrategy } from '../../types';

interface TaskFormProps {
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

export function TaskForm({ nodeId }: TaskFormProps) {
  const { t } = useTranslation('workflowBuilder');
  const nodes = useWorkflowStore(s => s.nodes);
  const updateActivityData = useWorkflowStore(s => s.updateActivityData);

  const node = nodes.find(n => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as TaskProperties | undefined;

  const strategyOptions = [
    { value: AssignmentStrategy.STARTED_BY, label: t('forms.strategies.startedBy') },
    { value: AssignmentStrategy.ROUND_ROBIN, label: t('forms.strategies.roundRobin') },
    { value: AssignmentStrategy.PREVIOUS_OWNER, label: t('forms.strategies.previousOwner') },
    { value: 'pool', label: t('forms.strategies.pool') },
    { value: 'variable_assignee', label: t('forms.strategies.variableAssignee') },
  ];

  const movementOptions = [
    { value: 'F', label: t('forms.movements.forward') },
    { value: 'B', label: t('forms.movements.backward') },
    { value: 'C', label: t('forms.movements.complete') },
  ];

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(makeTaskFormSchema(t)),
    defaultValues: buildDefaults(data, props),
  });

  const {
    fields: decisionFields,
    append: appendDecision,
    remove: removeDecision,
  } = useFieldArray({ control, name: 'decisionConditions' });

  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({ control, name: 'actions' });

  const {
    fields: mappingFields,
    append: appendMapping,
    remove: removeMapping,
  } = useFieldArray({ control, name: 'inputMappings' });

  useEffect(() => {
    if (data && props) {
      reset(buildDefaults(data, props));
    }
  }, [nodeId]);

  const onSubmit = (values: TaskFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      requiredRoles: values.requiredRoles,
      properties: {
        ...(props ?? {}),
        activityName: values.activityName,
        assigneeRole: values.assigneeRole || undefined,
        assigneeGroup: values.assigneeGroup,
        assignmentStrategies: values.initialAssignmentStrategies[0] ?? 'round_robin',
        initialAssignmentStrategies: values.initialAssignmentStrategies,
        revisitAssignmentStrategies: values.revisitAssignmentStrategies,
        timeoutDuration: values.timeoutDuration,
        decisionConditions: arrayToRecord(values.decisionConditions),
        actions: values.actions.length > 0 ? values.actions : undefined,
        canRaiseFollowup: values.canRaiseFollowup || undefined,
        canRaiseQuotation: values.canRaiseQuotation || undefined,
        teamIdVariable: values.teamIdVariable || undefined,
        assignmentRules: values.teamConstrained ? { teamConstrained: true } : undefined,
        assigneeVariable: values.assigneeVariable || undefined,
        inputMappings:
          values.inputMappings.length > 0 ? arrayToRecord(values.inputMappings) : undefined,
      },
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-primary gap-1 text-xs">{t('forms.badges.taskActivity')}</div>

      {/* Basic info */}
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

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.activityName')}</span>
        </label>
        <input {...register('activityName')} className="input input-bordered input-sm w-full" />
      </div>

      {/* Assignment */}
      <div className="divider text-xs">{t('forms.sections.assignment')}</div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.assigneeRole')}</span>
        </label>
        <input
          {...register('assigneeRole')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.assigneeRoleHint')}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.assigneeGroup')}</span>
        </label>
        <input
          {...register('assigneeGroup')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.assigneeGroupHint')}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">
            {t('forms.fields.initialAssignmentStrategy')}
          </span>
        </label>
        <div className="flex flex-col gap-1">
          {strategyOptions.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                value={opt.value}
                {...register('initialAssignmentStrategies')}
                className="checkbox checkbox-primary checkbox-xs"
              />
              <span className="text-xs">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">
            {t('forms.fields.revisitAssignmentStrategy')}
          </span>
        </label>
        <div className="flex flex-col gap-1">
          {strategyOptions.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                value={opt.value}
                {...register('revisitAssignmentStrategies')}
                className="checkbox checkbox-primary checkbox-xs"
              />
              <span className="text-xs">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Timeout */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">
            {t('forms.fields.timeoutDuration')}
          </span>
        </label>
        <input
          {...register('timeoutDuration')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.timeoutDurationHint')}
        />
      </div>

      {/* Required Roles */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.requiredRoles')}</span>
        </label>
        <input
          className="input input-bordered input-sm w-full"
          defaultValue={data.requiredRoles.join(', ')}
          onBlur={e => {
            const roles = e.target.value
              .split(',')
              .map(r => r.trim())
              .filter(Boolean);
            updateActivityData(nodeId, { requiredRoles: roles });
          }}
        />
      </div>

      {/* Decision Conditions */}
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

      {/* Actions */}
      <div className="divider text-xs">{t('forms.sections.actions')}</div>

      <div className="flex flex-col gap-3">
        {actionFields.map((field, index) => (
          <div key={field.id} className="border border-base-300 rounded-lg p-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label py-0">
                  <span className="label-text text-xs">{t('forms.actionFields.value')}</span>
                </label>
                <input
                  {...register(`actions.${index}.value`)}
                  className="input input-bordered input-xs w-full"
                  placeholder={t('forms.placeholders.actionValueHint')}
                />
              </div>
              <div className="flex-1">
                <label className="label py-0">
                  <span className="label-text text-xs">{t('forms.actionFields.label')}</span>
                </label>
                <input
                  {...register(`actions.${index}.label`)}
                  className="input input-bordered input-xs w-full"
                  placeholder={t('forms.placeholders.actionLabelHint')}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  removeAction(index);
                  handleSubmit(onSubmit)();
                }}
                className="btn btn-ghost btn-xs text-error self-end"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label py-0">
                  <span className="label-text text-xs">
                    {t('forms.actionFields.assignmentMode')}
                  </span>
                </label>
                <select
                  {...register(`actions.${index}.assignmentMode`)}
                  className="select select-bordered select-xs w-full"
                >
                  <option value="system">{t('forms.assignmentModes.system')}</option>
                  <option value="user">{t('forms.assignmentModes.user')}</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="label py-0">
                  <span className="label-text text-xs">{t('forms.actionFields.movement')}</span>
                </label>
                <select
                  {...register(`actions.${index}.movement`)}
                  className="select select-bordered select-xs w-full"
                >
                  {movementOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label py-0">
                <span className="label-text text-xs">{t('forms.actionFields.condition')}</span>
              </label>
              <input
                {...register(`actions.${index}.condition`)}
                className="input input-bordered input-xs w-full"
                placeholder={t('forms.placeholders.actionConditionHint')}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            appendAction({
              value: '',
              label: '',
              assignmentMode: 'system',
              movement: 'F',
              condition: '',
            });
            setTimeout(() => handleSubmit(onSubmit)(), 0);
          }}
          className="btn btn-ghost btn-xs text-primary"
        >
          {t('forms.buttons.addAction')}
        </button>
      </div>

      {/* Additional Options */}
      <div className="divider text-xs">{t('forms.sections.additionalOptions')}</div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('canRaiseFollowup')}
            className="checkbox checkbox-primary checkbox-xs"
          />
          <span className="text-xs">{t('forms.checkboxes.canRaiseFollowup')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('canRaiseQuotation')}
            className="checkbox checkbox-primary checkbox-xs"
          />
          <span className="text-xs">{t('forms.checkboxes.canRaiseQuotation')}</span>
        </label>
      </div>

      {/* Variable Assignee */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">
            {t('forms.fields.assigneeVariable')}
          </span>
        </label>
        <input
          {...register('assigneeVariable')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.assigneeVariableHint')}
        />
      </div>

      {/* Team Assignment */}
      <div className="divider text-xs">{t('forms.sections.teamAssignment')}</div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.teamIdVariable')}</span>
        </label>
        <input
          {...register('teamIdVariable')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.teamIdVariableHint')}
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          {...register('teamConstrained')}
          className="checkbox checkbox-primary checkbox-xs"
        />
        <span className="text-xs">{t('forms.fields.teamConstrained')}</span>
      </label>

      {/* Input Mappings */}
      <div className="divider text-xs">{t('forms.sections.inputMappings')}</div>

      <div className="flex flex-col gap-2">
        {mappingFields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`inputMappings.${index}.key`)}
              className="input input-bordered input-xs flex-1"
              placeholder={t('forms.placeholders.inputMappingKeyHint')}
              onBlur={handleSubmit(onSubmit)}
            />
            <input
              {...register(`inputMappings.${index}.value`)}
              className="input input-bordered input-xs flex-[2]"
              placeholder={t('forms.placeholders.inputMappingValueHint')}
            />
            <button
              type="button"
              onClick={() => {
                removeMapping(index);
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
            appendMapping({ key: '', value: '' });
            setTimeout(() => handleSubmit(onSubmit)(), 0);
          }}
          className="btn btn-ghost btn-xs text-primary"
        >
          {t('forms.buttons.addMapping')}
        </button>
      </div>
    </form>
  );
}

function buildDefaults(
  data: ActivityNodeData | undefined,
  props: TaskProperties | undefined,
): TaskFormValues {
  return {
    name: data?.name ?? '',
    description: data?.description ?? '',
    activityName: props?.activityName ?? '',
    assigneeRole: props?.assigneeRole ?? '',
    assigneeGroup: props?.assigneeGroup ?? '',
    initialAssignmentStrategies: props?.initialAssignmentStrategies ?? ['round_robin'],
    revisitAssignmentStrategies: props?.revisitAssignmentStrategies ?? ['previous_owner'],
    timeoutDuration: props?.timeoutDuration ?? 'PT72H',
    decisionConditions: recordToArray(props?.decisionConditions ?? {}),
    requiredRoles: data?.requiredRoles ?? [],
    actions: (props?.actions ?? []).map(a => ({
      value: a.value ?? '',
      label: a.label ?? '',
      assignmentMode: a.assignmentMode ?? 'system',
      movement: a.movement ?? 'F',
      condition: a.condition ?? '',
    })),
    canRaiseFollowup: props?.canRaiseFollowup ?? false,
    canRaiseQuotation: props?.canRaiseQuotation ?? false,
    teamIdVariable: props?.teamIdVariable ?? '',
    teamConstrained: props?.assignmentRules?.teamConstrained ?? false,
    assigneeVariable: props?.assigneeVariable ?? '',
    inputMappings: recordToArray(props?.inputMappings ?? {}),
  };
}
