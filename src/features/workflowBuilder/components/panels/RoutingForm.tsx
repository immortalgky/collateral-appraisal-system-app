import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { makeRoutingFormSchema, type RoutingFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { RoutingProperties } from '../../types';

interface RoutingFormProps {
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

export function RoutingForm({ nodeId }: RoutingFormProps) {
  const { t } = useTranslation('workflowBuilder');
  const nodes = useWorkflowStore(s => s.nodes);
  const updateActivityData = useWorkflowStore(s => s.updateActivityData);

  const node = nodes.find(n => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as RoutingProperties | undefined;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<RoutingFormValues>({
    resolver: zodResolver(makeRoutingFormSchema(t)),
    defaultValues: buildDefaults(data, props),
  });

  const {
    fields: conditionFields,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({ control, name: 'routingConditions' });

  const watchedConditions = watch('routingConditions');

  useEffect(() => {
    if (data && props) {
      reset(buildDefaults(data, props));
    }
  }, [nodeId]);

  const onSubmit = (values: RoutingFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        routingConditions: arrayToRecord(values.routingConditions),
        defaultDecision: values.defaultDecision,
      },
    });
  };

  if (!data) return null;

  const conditionKeys = (watchedConditions ?? []).map(c => c.key).filter(Boolean);

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-accent gap-1 text-xs">{t('forms.badges.routingActivity')}</div>

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

      {/* Routing Conditions */}
      <div className="divider text-xs">{t('forms.sections.routingConditions')}</div>

      <div className="flex flex-col gap-2">
        {conditionFields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`routingConditions.${index}.key`)}
              className="input input-bordered input-xs flex-1"
              placeholder={t('forms.placeholders.routingConditionNameHint')}
              onBlur={handleSubmit(onSubmit)}
            />
            <input
              {...register(`routingConditions.${index}.value`)}
              className="input input-bordered input-xs flex-[2]"
              placeholder={t('forms.placeholders.routingExpressionHint')}
            />
            <button
              type="button"
              onClick={() => {
                removeCondition(index);
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
            appendCondition({ key: '', value: '' });
            setTimeout(() => handleSubmit(onSubmit)(), 0);
          }}
          className="btn btn-ghost btn-xs text-primary"
        >
          {t('forms.buttons.addCondition')}
        </button>
      </div>

      {/* Default Decision */}
      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.condition')}</span>
        </label>
        <select
          {...register('defaultDecision')}
          className="select select-bordered select-sm w-full"
          onChange={e => {
            register('defaultDecision').onChange(e);
            handleSubmit(onSubmit)();
          }}
        >
          <option value="">{t('forms.defaultDecision.none')}</option>
          {conditionKeys.map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}

function buildDefaults(
  data: ActivityNodeData | undefined,
  props: RoutingProperties | undefined,
): RoutingFormValues {
  return {
    name: data?.name ?? '',
    description: data?.description ?? '',
    routingConditions: recordToArray(props?.routingConditions ?? {}),
    defaultDecision: props?.defaultDecision ?? '',
  };
}
