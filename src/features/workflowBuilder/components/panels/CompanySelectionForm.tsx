import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { makeCompanySelectionFormSchema, type CompanySelectionFormValues } from '../../schemas';
import type { ActivityNodeData } from '../../adapters/toReactFlow';
import type { CompanySelectionProperties } from '../../types';

interface Props {
  nodeId: string;
}

export function CompanySelectionForm({ nodeId }: Props) {
  const { t } = useTranslation('workflowBuilder');
  const nodes = useWorkflowStore(s => s.nodes);
  const updateActivityData = useWorkflowStore(s => s.updateActivityData);

  const node = nodes.find(n => n.id === nodeId);
  const data = node?.data as ActivityNodeData | undefined;
  const props = data?.properties as CompanySelectionProperties | undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanySelectionFormValues>({
    resolver: zodResolver(makeCompanySelectionFormSchema(t)),
    defaultValues: {
      name: data?.name ?? '',
      description: data?.description ?? '',
      selectionMethod: props?.selectionMethod ?? 'roundrobin',
      loanTypeVariable: props?.loanTypeVariable ?? 'loanType',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name,
        description: data.description,
        selectionMethod: props?.selectionMethod ?? 'roundrobin',
        loanTypeVariable: props?.loanTypeVariable ?? 'loanType',
      });
    }
  }, [nodeId, data, reset]);

  const onSubmit = (values: CompanySelectionFormValues) => {
    updateActivityData(nodeId, {
      name: values.name,
      description: values.description,
      properties: {
        ...props,
        selectionMethod: values.selectionMethod,
        loanTypeVariable: values.loanTypeVariable,
      },
    });
  };

  if (!data) return null;

  return (
    <form onChange={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="badge badge-info gap-1 text-xs">{t('forms.badges.companySelection')}</div>

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
          <span className="label-text text-xs font-medium">
            {t('forms.fields.selectionMethod')}
          </span>
        </label>
        <select
          {...register('selectionMethod')}
          className="select select-bordered select-sm w-full"
        >
          <option value="roundrobin">{t('forms.selectionMethods.roundrobin')}</option>
          <option value="manual">{t('forms.selectionMethods.manual')}</option>
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text text-xs font-medium">
            {t('forms.fields.loanTypeVariable')}
          </span>
        </label>
        <input
          {...register('loanTypeVariable')}
          className="input input-bordered input-sm w-full"
          placeholder={t('forms.placeholders.loanTypeVariableHint')}
        />
      </div>
    </form>
  );
}
