import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import {
  makeRequestSubmissionActivityFormSchema,
  type RequestSubmissionActivityFormValues,
} from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { RequestSubmissionActivityProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function RequestSubmissionActivityForm({ nodeId }: Props) {
  const { t } = useTranslation('workflowBuilder');
  const nodes = useWorkflowStore(s => s.nodes);
  const updateActivityData = useWorkflowStore(s => s.updateActivityData);

  const node = nodes.find(n => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as RequestSubmissionActivityProperties | undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestSubmissionActivityFormValues>({
    resolver: zodResolver(makeRequestSubmissionActivityFormSchema(t)),
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
      <div className="badge badge-primary gap-1 text-xs">{t('forms.badges.requestSubmission')}</div>

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
          <span className="label-text text-xs font-medium">{t('forms.fields.propertyType')}</span>
        </label>
        <select {...register('propertyType')} className="select select-bordered select-sm w-full">
          <option value="">{t('forms.placeholders.selectType')}</option>
          <option value="Residential">{t('forms.propertyTypes.residential')}</option>
          <option value="Commercial">{t('forms.propertyTypes.commercial')}</option>
          <option value="Industrial">{t('forms.propertyTypes.industrial')}</option>
          <option value="Land">{t('forms.propertyTypes.land')}</option>
        </select>
        {errors.propertyType && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.propertyType.message}</span>
          </label>
        )}
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">
            {t('forms.fields.propertyAddress')}
          </span>
        </label>
        <input {...register('propertyAddress')} className="input input-bordered input-sm w-full" />
        {errors.propertyAddress && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.propertyAddress.message}</span>
          </label>
        )}
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.estimatedValue')}</span>
        </label>
        <input
          type="number"
          {...register('estimatedValue')}
          className="input input-bordered input-sm w-full"
          min={0}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.purpose')}</span>
        </label>
        <select {...register('purpose')} className="select select-bordered select-sm w-full">
          <option value="">{t('forms.placeholders.selectPurpose')}</option>
          <option value="Mortgage">{t('forms.purposes.mortgage')}</option>
          <option value="Insurance">{t('forms.purposes.insurance')}</option>
          <option value="Tax Assessment">{t('forms.purposes.taxAssessment')}</option>
          <option value="Sale">{t('forms.purposes.sale')}</option>
        </select>
        {errors.purpose && (
          <label className="label">
            <span className="label-text-alt text-error">{errors.purpose.message}</span>
          </label>
        )}
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">{t('forms.fields.requestorId')}</span>
        </label>
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
