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
import {
  useGetMachinerySummary,
  useGetMachinerySummarySuggestedCounts,
  useSaveMachinerySummary,
} from '@features/appraisal/api';
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

// The Section 3.1 counts every machine on the appraisal already answers. The backend derives them
// (GET .../machinery-summary/suggested-counts); the rule each one applies is spelled out in the
// field's "?" panel so the appraiser can tell whether the number is the one they mean.
const SUGGESTED_COUNT_RULE_KEYS = {
  surveyedNumber: 'propertyInfo.machinerySummary.suggested.rules.surveyedNumber',
  appraisalNumber: 'propertyInfo.machinerySummary.suggested.rules.appraisalNumber',
  installedAndUseCount: 'propertyInfo.machinerySummary.suggested.rules.installedAndUseCount',
  appraisalScrapCount: 'propertyInfo.machinerySummary.suggested.rules.appraisalScrapCount',
  appraisedByDocumentCount:
    'propertyInfo.machinerySummary.suggested.rules.appraisedByDocumentCount',
  notInstalledCount: 'propertyInfo.machinerySummary.suggested.rules.notInstalledCount',
} as const;

type SuggestedCountName = keyof typeof SUGGESTED_COUNT_RULE_KEYS;

const SUGGESTED_COUNT_NAMES = Object.keys(SUGGESTED_COUNT_RULE_KEYS) as SuggestedCountName[];

/**
 * Fills one count with its derived value. Rendered as the number input's `rightIcon`, which the
 * wrapper makes non-interactive by default — see MapPickerTriggerIcon for the same opt-back-in.
 */
const ApplySuggestionIcon = ({ label, onApply }: { label: string; onApply: () => void }) => (
  <button
    type="button"
    onClick={onApply}
    onMouseDown={e => e.preventDefault()}
    title={label}
    aria-label={label}
    className="pointer-events-auto p-1 -m-1 text-gray-400 hover:text-primary-600 transition-colors cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-primary-500/50"
  >
    <Icon name="wand-magic-sparkles" style="solid" className="size-3.5" />
  </button>
);

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

  const { data, isLoading, isError, error, refetch } = useGetMachinerySummary(appraisalId);
  const { data: suggestedCounts } = useGetMachinerySummarySuggestedCounts(appraisalId);
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

  const applyCount = (name: SuggestedCountName, value: number) =>
    methods.setValue(name, value, { shouldDirty: true, shouldValidate: true });

  /** Fills only the counts still blank, so a number the appraiser typed is never replaced. */
  const applySuggestedToEmpty = () => {
    if (!suggestedCounts) return;
    SUGGESTED_COUNT_NAMES.forEach(name => {
      const current = methods.getValues(name);
      if (current === null || current === undefined || current === ('' as unknown)) {
        applyCount(name, suggestedCounts[name]);
      }
    });
  };

  // Translate the general-section field labels (FormFields renders labels verbatim) and, for the
  // six counts, hang the derived value off them as a placeholder, a "?" explanation and a fill button.
  const generalFields = useMemo<FormField[]>(
    () =>
      machinerySummaryGeneralFields.map(field => {
        const key = FIELD_LABEL_KEYS[field.name as keyof typeof FIELD_LABEL_KEYS];
        const translated = key ? { ...field, label: t(key) } : field;

        const ruleKey = SUGGESTED_COUNT_RULE_KEYS[field.name as SuggestedCountName];
        if (!ruleKey || !suggestedCounts) return translated;

        const name = field.name as SuggestedCountName;
        const value = suggestedCounts[name];

        return {
          ...translated,
          placeholder: String(value),
          help: {
            title: t('propertyInfo.machinerySummary.suggested.helpTitle'),
            lines: [
              t(ruleKey),
              t('propertyInfo.machinerySummary.suggested.helpComputed', { value }),
              t('propertyInfo.machinerySummary.suggested.helpNote'),
            ],
          },
          ...(readOnly || field.type !== 'number-input'
            ? {}
            : {
                rightIcon: (
                  <ApplySuggestionIcon
                    label={t('propertyInfo.machinerySummary.suggested.applyOne', { value })}
                    onApply={() => applyCount(name, value)}
                  />
                ),
              }),
        } as FormField;
      }),
    // applyCount closes over the stable `methods` object from useForm
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, suggestedCounts, readOnly],
  );

  const onSubmit: SubmitHandler<machinerySummaryFormType> = values => {
    if (!appraisalId) return;
    saveMutation.mutate(
      { appraisalId, ...values },
      {
        onSuccess: () => {
          toast.success(t('propertyInfo.machinerySummary.saved'));
          onSaved?.();
        },
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
          {!readOnly && suggestedCounts && (
            <div className="mb-4 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={applySuggestedToEmpty}>
                <Icon name="wand-magic-sparkles" style="solid" className="size-3.5 mr-2" />
                {t('propertyInfo.machinerySummary.suggested.applyEmpty')}
              </Button>
            </div>
          )}
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
