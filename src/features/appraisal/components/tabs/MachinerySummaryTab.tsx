import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { type SubmitHandler, useForm, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import FormCard from '@shared/components/sections/FormCard';
import ActionBar from '@/shared/components/ActionBar';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { FormFields, type FormField } from '@/shared/components/form';
import FieldHelp from '@/shared/components/form/FieldHelp';
import DataErrorState from '@/shared/components/DataErrorState';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import {
  type MachinerySummarySuggestedCounts,
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

/** Digits each count accepts, mirroring `maxIntegerDigits` on the same field in the config. */
const MAX_COUNT_DIGITS: Record<string, number> = {
  surveyedNumber: 5,
  appraisalNumber: 5,
  installedAndUseCount: 5,
  appraisalScrapCount: 5,
  appraisedByDocumentCount: 5,
  notInstalledCount: 10,
};

const SUGGESTED_COUNT_NAMES = Object.keys(SUGGESTED_COUNT_RULE_KEYS) as SuggestedCountName[];

/** A labelled divider inside a FormCard, optionally carrying the action that belongs to it. */
const SubHeading = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="mb-2 flex items-center justify-between gap-3 border-b border-gray-100 pb-1">
    <span className="text-xs font-semibold tracking-wide text-gray-600">{title}</span>
    {action}
  </div>
);

/**
 * The six Section 3.1 counts as a reconciliation: what the appraiser entered, what the machines on
 * the appraisal actually add up to, and which group each total came from. The summary is
 * appraisal-level while the machines are organised into groups, so without the breakdown a total
 * that looks wrong gives no clue where to go and look.
 */
const CountsTable = ({
  suggested,
  readOnly,
  onApply,
}: {
  suggested?: MachinerySummarySuggestedCounts;
  readOnly: boolean;
  onApply: (name: SuggestedCountName, value: number) => void;
}) => {
  const { t } = useTranslation('appraisal');
  const { control, setValue } = useFormContext();
  const entered = useWatch({ control, name: SUGGESTED_COUNT_NAMES }) as Array<number | null>;

  const value = (i: number) => {
    const v = entered?.[i];
    return v === null || v === undefined || (v as unknown) === '' ? null : Number(v);
  };
  /** What to reconcile against: the typed number, or the derived one while the field is blank. */
  const effective = (name: SuggestedCountName) => {
    const i = SUGGESTED_COUNT_NAMES.indexOf(name);
    return value(i) ?? suggested?.[name] ?? 0;
  };

  const issues: string[] = [];
  if (suggested) {
    if (effective('appraisalNumber') > effective('surveyedNumber'))
      issues.push(
        t('propertyInfo.machinerySummary.checks.appraisedOverSurveyed', {
          appraised: effective('appraisalNumber'),
          surveyed: effective('surveyedNumber'),
        }),
      );
    const split = effective('installedAndUseCount') + effective('notInstalledCount');
    if (split > effective('surveyedNumber'))
      issues.push(
        t('propertyInfo.machinerySummary.checks.splitOverSurveyed', {
          split,
          surveyed: effective('surveyedNumber'),
        }),
      );
  }

  return (
    <div className="mb-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-[10.5px] uppercase tracking-wider text-gray-500">
              <th className="py-1.5 pr-3 text-left font-bold">
                {t('propertyInfo.machinerySummary.table.item')}
              </th>
              <th className="py-1.5 px-3 text-right font-bold">
                {t('propertyInfo.machinerySummary.table.entered')}
              </th>
              <th className="py-1.5 px-3 text-right font-bold">
                {t('propertyInfo.machinerySummary.table.derived')}
              </th>
              <th className="py-1.5 px-3 text-left font-bold">
                {t('propertyInfo.machinerySummary.table.source')}
              </th>
              <th className="w-px" />
            </tr>
          </thead>
          <tbody>
            {SUGGESTED_COUNT_NAMES.map((name, i) => {
              const derived = suggested?.[name];
              const typed = value(i);
              const differs = typed !== null && derived !== undefined && typed !== derived;
              return (
                <tr
                  key={name}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60"
                >
                  <td className="py-1 pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      {t(FIELD_LABEL_KEYS[name as keyof typeof FIELD_LABEL_KEYS])}
                      {/* The rule behind the derived number. It lived on the number-input's label
                          before these six moved into this table, and the reader needs it more here,
                          not less: the Derived column states a figure without saying how it was
                          counted. */}
                      {suggested && (
                        <FieldHelp
                          config={{
                            title: t('propertyInfo.machinerySummary.suggested.helpTitle'),
                            lines: [
                              t(SUGGESTED_COUNT_RULE_KEYS[name]),
                              t('propertyInfo.machinerySummary.suggested.helpComputed', {
                                value: suggested[name],
                              }),
                              t('propertyInfo.machinerySummary.suggested.helpNote'),
                            ],
                          }}
                        />
                      )}
                    </span>
                  </td>
                  <td className="py-1 px-3 text-right">
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={readOnly}
                      aria-label={t(FIELD_LABEL_KEYS[name as keyof typeof FIELD_LABEL_KEYS])}
                      value={typed === null ? '' : String(typed)}
                      onChange={e => {
                        // Capped here because this cell is a plain input, not the number-input the
                        // rest of the form uses: the schema still refines on maxIntegerDigits, and
                        // a longer number would fail validation with nothing on screen to say so —
                        // Save would just do nothing.
                        const digits = e.target.value
                          .replace(/[^0-9]/g, '')
                          .slice(0, MAX_COUNT_DIGITS[name] ?? 5);
                        setValue(name, digits === '' ? null : Number(digits), {
                          shouldDirty: true,
                          shouldValidate: false,
                        });
                      }}
                      className={clsx(
                        'w-20 rounded-md border px-2 py-1 text-right font-mono text-sm font-semibold tabular-nums',
                        typed !== null
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 bg-white',
                        readOnly && 'cursor-not-allowed bg-gray-50 text-gray-500',
                      )}
                    />
                  </td>
                  <td
                    className={clsx(
                      'py-1 px-3 text-right font-mono tabular-nums',
                      differs ? 'font-semibold text-warning' : 'text-gray-500',
                    )}
                  >
                    {derived ?? '—'}
                  </td>
                  <td className="py-1 px-3">
                    {(() => {
                      // Said as a sentence rather than shown as chips: the reader is checking a
                      // number they did not compute, and "มาจาก Group 2 5 เครื่อง และ Group 3 2 เครื่อง"
                      // answers "where did 7 come from" the way a colleague would. Groups
                      // contributing nothing are left out.
                      // Nothing derived yet (still loading, or the request failed): the Derived
                      // cell shows — and this one has to agree, rather than asserting that no
                      // machine matches.
                      if (!suggested) return <span className="text-gray-300">—</span>;
                      const parts = suggested.groups.filter(g => g[name] > 0);
                      if (parts.length === 0)
                        return (
                          <span className="text-[11px] text-gray-400">
                            {t('propertyInfo.machinerySummary.table.sourceNone')}
                          </span>
                        );
                      const list = parts
                        .map(g =>
                          t('propertyInfo.machinerySummary.table.sourcePart', {
                            count: g[name],
                            // Keyed on the id, not the name: a real group saved without a name
                            // would otherwise be reported as machines belonging to no group,
                            // which is the opposite of what this cell exists to say.
                            group:
                              g.groupId === null
                                ? t('propertyInfo.machinerySummary.table.sourceUngrouped')
                                : (g.groupName?.trim() ??
                                  t('propertyInfo.machinerySummary.table.sourceGroupNumber', {
                                    number: g.groupNumber ?? '?',
                                  })),
                          }),
                        )
                        .join(t('propertyInfo.machinerySummary.table.sourceJoin'));
                      return (
                        <span className="text-[11px] leading-snug text-gray-500">
                          {t('propertyInfo.machinerySummary.table.sourceSentence', { list })}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-1 pl-1">
                    {!readOnly && typed === null && derived !== undefined && (
                      <button
                        type="button"
                        onClick={() => onApply(name, derived)}
                        className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50/60 px-2 py-0.5 text-[11px] font-medium text-primary-700 transition-colors hover:border-primary-400 hover:bg-primary-50"
                      >
                        <Icon name="wand-magic-sparkles" style="solid" className="size-2.5" />
                        {t('propertyInfo.machinerySummary.table.use')}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {issues.length > 0 && (
        <p className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-content">
          <b className="font-semibold">{t('propertyInfo.machinerySummary.checks.title')}</b>{' '}
          {issues.join(' · ')} — {t('propertyInfo.machinerySummary.checks.note')}
        </p>
      )}
    </div>
  );
};

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

  // Three groups rather than one run of seven fields: who holds it, where it is, what is owed on it.
  const pick = (...names: string[]) => machineryLegalFields.filter(f => names.includes(f.name));

  return (
    <div className="grid grid-cols-12 gap-x-4 gap-y-2">
      <div className="col-span-12 mt-1 first:mt-0">
        <SubHeading title={t('propertyInfo.machinerySummary.groups.ownership')} />
        <div className="grid grid-cols-12 gap-x-4 gap-y-2">
          <FormFields fields={pick('proprietor', 'owner')} disabled={readOnly} showCharCount />
        </div>
      </div>
      <div className="col-span-12 mt-1 first:mt-0">
        <SubHeading title={t('propertyInfo.machinerySummary.groups.location')} />
        <div className="grid grid-cols-12 gap-x-4 gap-y-2">
          <FormFields
            fields={pick('machineAddress', 'latitude', 'longitude')}
            disabled={readOnly}
            showCharCount
          />
        </div>
      </div>
      <div className="col-span-12 mt-1 first:mt-0">
        <SubHeading title={t('propertyInfo.machinerySummary.groups.obligation')} />
        <div className="grid grid-cols-12 gap-x-4 gap-y-2">
          <FormFields fields={pick('obligation', 'other')} disabled={readOnly} showCharCount />
        </div>
      </div>
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
  const { data: suggestedCounts } = useGetMachinerySummarySuggestedCounts(appraisalId);
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

  // The six counts are rendered by CountsTable, not FormFields: side by side with what the system
  // derived they read as a reconciliation rather than six more boxes to fill. Everything else on
  // this section stays on FormFields, translated the usual way.
  const descriptiveFields = useMemo<FormField[]>(
    () =>
      machinerySummaryGeneralFields
        .filter(field => !(field.name in SUGGESTED_COUNT_RULE_KEYS))
        .map(field => {
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
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* No page heading here: the tab is already labelled "สรุปเครื่องจักร", and the two card
            titles below say which half of it you are looking at. */}
        {/* Section 3.1 — General machinery */}
        <FormCard
          title={t('propertyInfo.machinerySummary.generalSection')}
          icon="gears"
          iconColor="blue"
        >
          <SubHeading
            title={t('propertyInfo.machinerySummary.groups.counts')}
            action={
              !readOnly &&
              suggestedCounts && (
                <button
                  type="button"
                  onClick={applySuggestedToEmpty}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50"
                >
                  <Icon name="wand-magic-sparkles" style="solid" className="size-3" />
                  {t('propertyInfo.machinerySummary.suggested.applyEmpty')}
                </button>
              )
            }
          />
          <CountsTable suggested={suggestedCounts} readOnly={readOnly} onApply={applyCount} />

          <SubHeading title={t('propertyInfo.machinerySummary.groups.condition')} />
          <div className="grid grid-cols-12 gap-x-4 gap-y-2">
            <FormFields fields={descriptiveFields} disabled={readOnly} showCharCount />
          </div>
        </FormCard>

        {/* Section 3.3 — Rights & legal */}
        <FormCard
          title={t('propertyInfo.machinerySummary.legalSection')}
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
