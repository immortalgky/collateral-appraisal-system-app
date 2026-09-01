import { useEffect, useMemo, useState } from 'react';
import { type SubmitHandler, useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import FormCard from '@shared/components/sections/FormCard';
import ActionBar from '@/shared/components/ActionBar';
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

// Literal key map — the strictly-typed `t()` rejects a dynamically-concatenated key
// (`propertyInfo.machinerySummary.fields.${field.name}`), so each field name maps to its
// literal translation key here. FormFields renders `field.label` verbatim (no i18n), so the
// label must be translated before the config array is handed to it.
const FIELD_LABEL_KEYS = {
  inIndustrial: 'propertyInfo.machinerySummary.fields.inIndustrial',
  surveyedNumber: 'propertyInfo.machinerySummary.fields.surveyedNumber',
  appraisalNumber: 'propertyInfo.machinerySummary.fields.appraisalNumber',
  installedAndUseCount: 'propertyInfo.machinerySummary.fields.installedAndUseCount',
  appraisalScrapCount: 'propertyInfo.machinerySummary.fields.appraisalScrapCount',
  appraisedByDocumentCount: 'propertyInfo.machinerySummary.fields.appraisedByDocumentCount',
  notInstalledCount: 'propertyInfo.machinerySummary.fields.notInstalledCount',
  maintenance: 'propertyInfo.machinerySummary.fields.maintenance',
  exterior: 'propertyInfo.machinerySummary.fields.exterior',
  performance: 'propertyInfo.machinerySummary.fields.performance',
  marketDemandAvailable: 'propertyInfo.machinerySummary.fields.marketDemandAvailable',
  marketDemand: 'propertyInfo.machinerySummary.fields.marketDemand',
  proprietor: 'propertyInfo.machinerySummary.fields.proprietor',
  owner: 'propertyInfo.machinerySummary.fields.owner',
  machineAddress: 'propertyInfo.machinerySummary.fields.machineAddress',
  latitude: 'propertyInfo.machinerySummary.fields.latitude',
  longitude: 'propertyInfo.machinerySummary.fields.longitude',
  obligation: 'propertyInfo.machinerySummary.fields.obligation',
  other: 'propertyInfo.machinerySummary.fields.other',
} as const;

const MachinerySummaryLegalForm = ({ readOnly }: { readOnly: boolean }) => {
  const { t } = useTranslation('appraisal');
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
        const key = FIELD_LABEL_KEYS[field.name as keyof typeof FIELD_LABEL_KEYS];
        const translated = key ? { ...field, label: t(key) } : field;
        if (
          !readOnly &&
          (field.name === 'latitude' || field.name === 'longitude') &&
          field.type === 'number-input'
        )
          return { ...translated, rightIcon: pickerButton };
        return translated;
      }),
    [pickerButton, readOnly, t],
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
export const MachinerySummaryTab = ({ onSaved }: { onSaved?: () => void } = {}) => {
  const readOnly = usePageReadOnly();
  const { t } = useTranslation('appraisal');
  const appraisalId = useAppraisalId();
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const { data, isLoading, isError, error, refetch } = useGetMachinerySummary(appraisalId);
  const saveMutation = useSaveMachinerySummary();

  const methods = useForm<machinerySummaryFormType>({
    defaultValues: machinerySummaryFormDefault,
    resolver: zodResolver(machinerySummaryForm),
  });

  const { getValues, reset } = methods;

  // Seed the form once the summary loads (null response → empty defaults).
  useEffect(() => {
    if (!isLoading) {
      methods.reset(mapMachinerySummaryResponseToForm(data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isLoading]);

  // Translate the general-section field labels (FormFields renders labels verbatim).
  const generalFields = useMemo<FormField[]>(
    () =>
      machinerySummaryGeneralFields.map(field => {
        const key = FIELD_LABEL_KEYS[field.name as keyof typeof FIELD_LABEL_KEYS];
        return key ? { ...field, label: t(key) } : field;
      }),
    [t],
  );

  const onSubmit: SubmitHandler<machinerySummaryFormType> = values => {
    setSaveAction('submit');
    if (!appraisalId) return;
    saveMutation.mutate(
      { appraisalId, ...values },
      {
        onSuccess: () => {
          toast.success(t('propertyInfo.machinerySummary.saved'));
          setSaveAction(null);
          onSaved?.();
        },
        onError: () => {
          toast.error(t('propertyInfo.machinerySummary.saveFailed'));
          setSaveAction(null);
        },
      },
    );
  };

  const handleSaveDraft = () => {
    setSaveAction('draft');
    const data = getValues();
    const payload = mapMachinerySummaryResponseToForm(data);
    if (!appraisalId) return;
    saveMutation.mutate(
      { appraisalId, ...payload },
      {
        onSuccess: () => {
          reset(getValues());
          toast.success(t('propertyInfo.machinerySummary.saved'));
          setSaveAction(null);
          onSaved?.();
        },
        onError: () => {
          toast.error(t('propertyInfo.machinerySummary.saveFailed'));
          setSaveAction(null);
        },
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
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('propertyInfo.machinerySummary.title')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('propertyInfo.machinerySummary.subtitle')}
          </p>
        </div>

        {/* Section 3.1 — General machinery */}
        <FormCard
          title={t('propertyInfo.machinerySummary.generalSection')}
          subtitle={t('propertyInfo.machinerySummary.generalSubtitle')}
          icon="gears"
          iconColor="blue"
        >
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={generalFields} disabled={readOnly} showCharCount />
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

        {/* Sticky footer actions — pinned to the bottom of the scroll area */}
        {!readOnly && (
          <ActionBar>
            <ActionBar.Left>
              <ActionBar.UnsavedIndicator show={methods.formState.isDirty} />
            </ActionBar.Left>
            <ActionBar.Right>
              <Button
                variant="ghost"
                type="button"
                onClick={handleSaveDraft}
                isLoading={saveMutation.isPending && saveAction === 'draft'}
                disabled={saveMutation.isPending}
              >
                <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                {t('propertyInfo.machinerySummary.saveDraft')}
              </Button>
              <Button
                type="submit"
                isLoading={saveMutation.isPending}
                disabled={saveMutation.isPending}
              >
                <Icon name="check" style="solid" className="size-4 mr-2" />
                {t('propertyInfo.machinerySummary.save')}
              </Button>
            </ActionBar.Right>
          </ActionBar>
        )}
      </form>
    </FormProvider>
  );
};

export default MachinerySummaryTab;
