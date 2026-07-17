import { useEffect, useMemo, useState } from 'react';
import { type SubmitHandler, useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import FormCard from '@shared/components/sections/FormCard';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { FormFields, type FormField } from '@/shared/components/form';
import DataErrorState from '@/shared/components/DataErrorState';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useGetMachinerySummary, useSaveMachinerySummary } from '@features/appraisal/api';
import {
  machinerySummaryForm,
  machinerySummaryFormDefault,
  type machinerySummaryFormType,
} from '../../schemas/form';
import { machinerySummaryGeneralFields, machinerySummaryLegalFields } from '../../configs/fields';
import { mapMachinerySummaryResponseToForm } from '../../utils/mappers';
import { MapLocationPicker, MapPickerTriggerIcon } from '@/shared/components/MapLocationPicker';

const MachinerySummaryLegalForm = ({ readOnly }: { readOnly: boolean }) => {
  const { watch, setValue } = useFormContext();
  const [pickerOpen, setPickerOpen] = useState(false);

  const lat = watch('latitude');
  const lon = watch('longitude');
  const parsedLat = lat !== undefined && lat !== '' ? Number(lat) : null;
  const parsedLon = lon !== undefined && lon !== '' ? Number(lon) : null;
  const initialLat = parsedLat != null && !Number.isNaN(parsedLat) ? parsedLat : null;
  const initialLon = parsedLon != null && !Number.isNaN(parsedLon) ? parsedLon : null;

  const pickerButton = useMemo(
    () => <MapPickerTriggerIcon onClick={() => setPickerOpen(true)} />,
    [],
  );

  const machineryLegalFields = useMemo<FormField[]>(
    () =>
      machinerySummaryLegalFields.map(field => {
        if (
          !readOnly &&
          (field.name === 'latitude' || field.name === 'longitude') &&
          field.type === 'number-input'
        )
          return { ...field, rightIcon: pickerButton };
        return field;
      }),
    [pickerButton, readOnly],
  );

  return (
    <div className="grid grid-cols-12 gap-4">
      <FormFields fields={machineryLegalFields} disabled={readOnly} showCharCount />
      <MapLocationPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(newLat, newLon) => {
          setValue('latitude', newLat, { shouldDirty: true, shouldValidate: true });
          setValue('longitude', newLon, { shouldDirty: true, shouldValidate: true });
        }}
        initialLat={initialLat}
        initialLon={initialLon}
      />
    </div>
  );
};

/**
 * Appraisal-level machinery summary — one record per appraisal, "global for all
 * machines" (not tied to any single machine). Shown as a tab in the Property
 * Information page when the appraisal contains machinery.
 */
export const MachinerySummaryTab = () => {
  const readOnly = usePageReadOnly();
  const { t } = useTranslation('appraisal');
  const appraisalId = useAppraisalId();

  const { data, isLoading, isError, error, refetch } = useGetMachinerySummary(appraisalId);
  const saveMutation = useSaveMachinerySummary();

  const methods = useForm<machinerySummaryFormType>({
    defaultValues: machinerySummaryFormDefault,
    resolver: zodResolver(machinerySummaryForm),
  });

  // Seed the form once the summary loads (null response → empty defaults).
  useEffect(() => {
    if (!isLoading) {
      methods.reset(mapMachinerySummaryResponseToForm(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isLoading]);

  const onSubmit: SubmitHandler<machinerySummaryFormType> = values => {
    if (!appraisalId) return;
    saveMutation.mutate(
      { appraisalId, ...values },
      {
        onSuccess: () => toast.success(t('propertyInfo.machinerySummary.saved')),
        onError: () => toast.error(t('propertyInfo.machinerySummary.saveFailed')),
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
        title="Failed to load machinery summary"
        message={(error as Error)?.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <FormProvider methods={methods} schema={machinerySummaryForm}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {t('propertyInfo.machinerySummary.title')}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('propertyInfo.machinerySummary.subtitle')}
            </p>
          </div>
          {!readOnly && (
            <Button type="submit" size="sm" disabled={saveMutation.isPending}>
              <Icon
                name={saveMutation.isPending ? 'spinner' : 'floppy-disk'}
                style="solid"
                className={`w-3.5 h-3.5 mr-1.5 ${saveMutation.isPending ? 'animate-spin' : ''}`}
              />
              {t('propertyInfo.machinerySummary.save')}
            </Button>
          )}
        </div>

        {/* Section 3.1 — General machinery */}
        <FormCard
          title={t('propertyInfo.machinerySummary.generalSection')}
          subtitle={t('propertyInfo.machinerySummary.generalSubtitle')}
          icon="gears"
          iconColor="blue"
        >
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={machinerySummaryGeneralFields} disabled={readOnly} showCharCount />
          </div>
        </FormCard>

        {/* Section 3.3 — Rights & legal */}
        <FormCard
          title={t('propertyInfo.machinerySummary.legalSection')}
          subtitle={t('propertyInfo.machinerySummary.legalSubtitle')}
          icon="scale-balanced"
          iconColor="amber"
        >
          <MachinerySummaryLegalForm readOnly={readOnly} />
        </FormCard>
      </form>
    </FormProvider>
  );
};

export default MachinerySummaryTab;
