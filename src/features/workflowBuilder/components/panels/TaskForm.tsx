import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { taskFormSchema, type TaskFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { TaskProperties } from '../../types';
import { AssignmentStrategy } from '../../types';

interface TaskFormProps {
  nodeId: string;
}

const STRATEGY_OPTIONS = [
  { value: AssignmentStrategy.STARTED_BY, label: 'Started By' },
  { value: AssignmentStrategy.ROUND_ROBIN, label: 'Round Robin' },
  { value: AssignmentStrategy.PREVIOUS_OWNER, label: 'Previous Owner' },
  { value: 'pool', label: 'Pool' },
  { value: 'variable_assignee', label: 'Variable Assignee' },
];

const MOVEMENT_OPTIONS = [
  { value: 'F', label: 'Forward (F)' },
  { value: 'B', label: 'Backward (B)' },
  { value: 'C', label: 'Complete (C)' },
];

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
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateActivityData = useWorkflowStore((s) => s.updateActivityData);

  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as TaskProperties | undefined;

  const { register, handleSubmit, reset, control, formState: { errors } } =
    useForm<TaskFormValues>({
      resolver: zodResolver(taskFormSchema),
      defaultValues: buildDefaults(data, props),
    });

  const { fields: decisionFields, append: appendDecision, remove: removeDecision } =
    useFieldArray({ control, name: 'decisionConditions' });

  const { fields: actionFields, append: appendAction, remove: removeAction } =
    useFieldArray({ control, name: 'actions' });

  const { fields: mappingFields, append: appendMapping, remove: removeMapping } =
    useFieldArray({ control, name: 'inputMappings' });

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
        inputMappings: values.inputMappings.length > 0 ? arrayToRecord(values.inputMappings) : undefined,
      },
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-primary gap-1 text-xs">Task Activity</div>

      {/* Basic info */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Name</span>
        </label>
        <input
          {...register('name')}
          className="input input-bordered input-sm w-full"
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
          <span className="label-text text-xs font-medium">Activity Name</span>
        </label>
        <input
          {...register('activityName')}
          className="input input-bordered input-sm w-full"
        />
      </div>

      {/* Assignment */}
      <div className="divider text-xs">Assignment</div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Assignee Role</span>
        </label>
        <input
          {...register('assigneeRole')}
          className="input input-bordered input-sm w-full"
          placeholder="e.g. Admin"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Assignee Group</span>
        </label>
        <input
          {...register('assigneeGroup')}
          className="input input-bordered input-sm w-full"
          placeholder="e.g. Admin"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Initial Assignment Strategy</span>
        </label>
        <div className="flex flex-col gap-1">
          {STRATEGY_OPTIONS.map((opt) => (
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
          <span className="label-text text-xs font-medium">Revisit Assignment Strategy</span>
        </label>
        <div className="flex flex-col gap-1">
          {STRATEGY_OPTIONS.map((opt) => (
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
          <span className="label-text text-xs font-medium">Timeout Duration (ISO 8601)</span>
        </label>
        <input
          {...register('timeoutDuration')}
          className="input input-bordered input-sm w-full"
          placeholder="PT72H"
        />
      </div>

      {/* Required Roles */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Required Roles (comma-separated)</span>
        </label>
        <input
          className="input input-bordered input-sm w-full"
          defaultValue={data.requiredRoles.join(', ')}
          onBlur={(e) => {
            const roles = e.target.value
              .split(',')
              .map((r) => r.trim())
              .filter(Boolean);
            updateActivityData(nodeId, { requiredRoles: roles });
          }}
        />
      </div>

      {/* Decision Conditions */}
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
          + Add Decision
        </button>
      </div>

      {/* Actions */}
      <div className="divider text-xs">Actions</div>

      <div className="flex flex-col gap-3">
        {actionFields.map((field, index) => (
          <div key={field.id} className="border border-base-300 rounded-lg p-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label py-0">
                  <span className="label-text text-xs">Value</span>
                </label>
                <input
                  {...register(`actions.${index}.value`)}
                  className="input input-bordered input-xs w-full"
                  placeholder="e.g. approve"
                />
              </div>
              <div className="flex-1">
                <label className="label py-0">
                  <span className="label-text text-xs">Label</span>
                </label>
                <input
                  {...register(`actions.${index}.label`)}
                  className="input input-bordered input-xs w-full"
                  placeholder="e.g. Approve"
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
                  <span className="label-text text-xs">Assignment Mode</span>
                </label>
                <select
                  {...register(`actions.${index}.assignmentMode`)}
                  className="select select-bordered select-xs w-full"
                >
                  <option value="system">System</option>
                  <option value="user">User</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="label py-0">
                  <span className="label-text text-xs">Movement</span>
                </label>
                <select
                  {...register(`actions.${index}.movement`)}
                  className="select select-bordered select-xs w-full"
                >
                  {MOVEMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label py-0">
                <span className="label-text text-xs">Condition (optional)</span>
              </label>
              <input
                {...register(`actions.${index}.condition`)}
                className="input input-bordered input-xs w-full"
                placeholder="e.g. status == 'pending'"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            appendAction({ value: '', label: '', assignmentMode: 'system', movement: 'F', condition: '' });
            setTimeout(() => handleSubmit(onSubmit)(), 0);
          }}
          className="btn btn-ghost btn-xs text-primary"
        >
          + Add Action
        </button>
      </div>

      {/* Additional Options */}
      <div className="divider text-xs">Additional Options</div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('canRaiseFollowup')}
            className="checkbox checkbox-primary checkbox-xs"
          />
          <span className="text-xs">Can Raise Followup</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('canRaiseQuotation')}
            className="checkbox checkbox-primary checkbox-xs"
          />
          <span className="text-xs">Can Raise Quotation</span>
        </label>
      </div>

      {/* Variable Assignee */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Assignee Variable</span>
        </label>
        <input
          {...register('assigneeVariable')}
          className="input input-bordered input-sm w-full"
          placeholder="e.g. internalFollowupStaffId"
        />
      </div>

      {/* Team Assignment */}
      <div className="divider text-xs">Team Assignment</div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">Team ID Variable</span>
        </label>
        <input
          {...register('teamIdVariable')}
          className="input input-bordered input-sm w-full"
          placeholder="e.g. assignedCompanyId"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          {...register('teamConstrained')}
          className="checkbox checkbox-primary checkbox-xs"
        />
        <span className="text-xs">Team Constrained</span>
      </label>

      {/* Input Mappings */}
      <div className="divider text-xs">Input Mappings</div>

      <div className="flex flex-col gap-2">
        {mappingFields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`inputMappings.${index}.key`)}
              className="input input-bordered input-xs flex-1"
              placeholder="Key"
              onBlur={handleSubmit(onSubmit)}
            />
            <input
              {...register(`inputMappings.${index}.value`)}
              className="input input-bordered input-xs flex-[2]"
              placeholder="Value / variable"
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
          + Add Mapping
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
    actions: (props?.actions ?? []).map((a) => ({
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
