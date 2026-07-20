import { useEffect, useMemo } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { FormFields } from '@/shared/components/form';
import DataErrorState from '@/shared/components/DataErrorState';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useGetMachinerySummary, useSaveMachinerySummary } from '@features/appraisal/api';
import {
  machineryBookSection1Form,
  machineryBookSection1FormDefault,
  type machineryBookSection1FormType,
} from '../../schemas/form';
import { machineryBookSection1Fields } from '../../configs/fields';

// Literal key map — `t()`'s strict typed keys reject a dynamically-concatenated string
// (`machineryBookSection1.fields.${field.name}`), so each field name is mapped to its
// literal translation key here instead.
const LABEL_KEYS = {
  assignment: 'machineryBookSection1.fields.assignment',
  valuationPurpose: 'machineryBookSection1.fields.valuationPurpose',
  propertyCharacteristics: 'machineryBookSection1.fields.propertyCharacteristics',
} as const;

/**
 * Machinery Book Section 1 intro (วัตถุประสงค์และที่ตั้งเครื่องจักร) — three free-text fields
 * (assignment / valuation purpose / property characteristics) stored on the SAME
 * appraisal-level machinery summary record as Section 3.1/3.3 (MachinerySummaryTab.tsx,
 * shown on Property Information), but this is a different, report-only form shown in the
 * Appraisal Book Builder on the Documents page. Machinery-only — the caller gates rendering
 * on hasMachinery.
 */
export const MachineryBookSection1Tab = () => {
  const readOnly = usePageReadOnly();
  const { t } = useTranslation('appraisal');
  const appraisalId = useAppraisalId();

  const { data, isLoading, isError, error, refetch } = useGetMachinerySummary(appraisalId);
  const saveMutation = useSaveMachinerySummary();

  const methods = useForm<machineryBookSection1FormType>({
    defaultValues: machineryBookSection1FormDefault,
    resolver: zodResolver(machineryBookSection1Form),
  });

  // Seed the form once the summary loads (null response → empty defaults). Only reads the 3
  // fields this form owns — never touches Section 3.1/3.3.
  useEffect(() => {
    if (!isLoading) {
      methods.reset({
        assignment: data?.assignment ?? null,
        valuationPurpose: data?.valuationPurpose ?? null,
        propertyCharacteristics: data?.propertyCharacteristics ?? null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isLoading]);

  // Field labels are translated here rather than baked into machineryBookSection1Fields —
  // buildFormSchema doesn't use `label` for validation, so the static config array only needs
  // placeholder labels; FormFields renders these translated ones.
  const fields = useMemo(
    () =>
      machineryBookSection1Fields.map(field => ({
        ...field,
        label: t(LABEL_KEYS[field.name as keyof typeof LABEL_KEYS]),
      })),
    [t],
  );

  const onSubmit: SubmitHandler<machineryBookSection1FormType> = values => {
    if (!appraisalId) return;
    // CRITICAL — no clobber: send ONLY these 3 fields (+ appraisalId), never spread the full
    // machinery-summary object. The backend PUT patches non-null fields, so this leaves
    // Section 3.1/3.3 (edited on Property Information) untouched.
    saveMutation.mutate(
      {
        appraisalId,
        assignment: values.assignment,
        valuationPurpose: values.valuationPurpose,
        propertyCharacteristics: values.propertyCharacteristics,
      },
      {
        onSuccess: () => toast.success(t('machineryBookSection1.saved')),
        onError: () => toast.error(t('machineryBookSection1.saveFailed')),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Icon name="spinner" style="solid" className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <DataErrorState
        variant="inline"
        title={t('machineryBookSection1.loadFailed')}
        message={(error as Error)?.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <FormProvider methods={methods} schema={machineryBookSection1Form}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {t('machineryBookSection1.title')}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('machineryBookSection1.subtitle')}</p>
          </div>
          {!readOnly && (
            <Button type="submit" size="sm" disabled={saveMutation.isPending}>
              <Icon
                name={saveMutation.isPending ? 'spinner' : 'floppy-disk'}
                style="solid"
                className={`w-3.5 h-3.5 mr-1.5 ${saveMutation.isPending ? 'animate-spin' : ''}`}
              />
              {t('machineryBookSection1.save')}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-12 gap-4">
          <FormFields fields={fields} disabled={readOnly} showCharCount />
        </div>
      </form>
    </FormProvider>
  );
};

export default MachineryBookSection1Tab;
