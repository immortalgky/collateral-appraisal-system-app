import { useEffect, useMemo, useState } from 'react';
import { type SubmitHandler, useForm, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
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
import SectionRow from '../SectionRow';
import { TD, TH } from '../tables/denseTable';
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

/** "Fill the blanks" in the counts section head: disabled when no blank count has a calculated value. */
const FillEmptyLink = ({
  suggested,
  onClick,
}: {
  suggested: MachinerySummarySuggestedCounts;
  onClick: () => void;
}) => {
  const { t } = useTranslation('appraisal');
  const { control } = useFormContext();
  const entered = useWatch({ control, name: SUGGESTED_COUNT_NAMES }) as Array<number | null>;
  const nothingToFill = !SUGGESTED_COUNT_NAMES.some((name, i) => {
    const v = entered?.[i];
    const blank = v === null || v === undefined || (v as unknown) === '';
    return blank && suggested[name] !== undefined;
  });
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={nothingToFill}
      className="cas-title-add ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium text-primary-700 transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline!"
    >
      {t('propertyInfo.machinerySummary.suggested.applyEmpty')}
    </button>
  );
};

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
    <div>
      <div className="cas-labelled-table">
        <div className="cas-table-card min-w-0 flex-1 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[560px] border-collapse text-[0.875rem]">
            <thead className="bg-[#f8fafa] text-left text-[0.8125rem] font-medium text-[#55636f]">
              <tr>
                <th className={clsx(TH, 'text-left')}>
                  {t('propertyInfo.machinerySummary.table.item')}
                </th>
                <th className={clsx(TH, 'text-right')}>
                  {t('propertyInfo.machinerySummary.table.entered')}
                </th>
                <th className={clsx(TH, 'text-right')}>
                  {t('propertyInfo.machinerySummary.table.derived')}
                </th>
                <th className={clsx(TH, 'text-left')}>
                  {t('propertyInfo.machinerySummary.table.source')}
                </th>
                <th className={clsx(TH, 'w-px')} />
              </tr>
            </thead>
            <tbody className="text-[#1f2937] dark:in-[.cas-form-grid]:text-[color:var(--palette-ink)]">
              {SUGGESTED_COUNT_NAMES.map((name, i) => {
                const derived = suggested?.[name];
                const typed = value(i);
                const differs = typed !== null && derived !== undefined && typed !== derived;
                return (
                  <tr
                    key={name}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60"
                  >
                    <td className={TD}>
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
                    <td className={clsx(TD, 'text-right')}>
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
                          'w-20 rounded-md border px-2 py-1 text-right text-sm tabular-nums',
                          typed !== null
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-white',
                          readOnly && 'cursor-not-allowed bg-gray-50 text-gray-500',
                        )}
                      />
                    </td>
                    <td
                      className={clsx(
                        TD,
                        'text-right tabular-nums',
                        differs ? 'font-semibold text-warning' : 'text-gray-500',
                      )}
                    >
                      {derived ?? '—'}
                    </td>
                    <td className={TD}>
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
                    <td className={clsx(TD, 'align-middle leading-[0]')}>
                      {/* Always there so the column keeps its shape; disabled once the entered number
                          already is the calculated one. */}
                      {!readOnly && derived !== undefined && (
                        <button
                          type="button"
                          onClick={() => onApply(name, derived)}
                          disabled={typed === derived}
                          title={
                            typed === derived
                              ? t('propertyInfo.machinerySummary.table.useDisabled')
                              : undefined
                          }
                          className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-[0.3077rem] border px-2 text-[0.75rem] font-medium leading-none transition-colors border-[color:var(--palette-accent-line)] bg-[color:var(--palette-accent-wash)] text-[color:var(--palette-accent-ink)] hover:bg-[color:color-mix(in_srgb,var(--palette-accent)_14%,var(--palette-accent-wash))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--palette-accent)]/40 disabled:cursor-not-allowed disabled:border-[color:var(--palette-line)] disabled:bg-[color:var(--palette-surface-3)] disabled:text-[color:var(--palette-ink-3)]"
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
      </div>

      {issues.length > 0 && (
        <p className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-content dark:in-[.cas-form-grid]:border-[color:var(--palette-warn)]/30 dark:in-[.cas-form-grid]:bg-[color:var(--palette-warn-wash)] dark:in-[.cas-form-grid]:text-[color:var(--palette-warn)] in-data-[form-layout=grid]:mx-2 in-data-[form-layout=grid]:mb-2">
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
  const parsedLat = lat != null && lat !== '' ? Number(lat) : null;
  const parsedLon = lon != null && lon !== '' ? Number(lon) : null;
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

  // Three groups rather than one run of seven fields: who holds it and what is owed on it, where it is, remarks.
  const pick = (...names: string[]) => machineryLegalFields.filter(f => names.includes(f.name));

  return (
    <>
      <SectionRow title={t('propertyInfo.machinerySummary.groups.ownership')} icon="user">
        <FormFields fields={pick('proprietor', 'owner', 'obligation')} disabled={readOnly} />
      </SectionRow>
      <SectionRow title={t('propertyInfo.machinerySummary.groups.location')} icon="location-dot">
        <FormFields fields={pick('machineAddress', 'latitude', 'longitude')} disabled={readOnly} />
      </SectionRow>
      <SectionRow
        title={t('propertyInfo.machinerySummary.groups.remarks')}
        icon="note-sticky"
        isLast
      >
        <FormFields fields={pick('other')} disabled={readOnly} />
      </SectionRow>
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
    </>
  );
};

/**
 * Appraisal-level machinery summary — one record per appraisal, "global for all
 * machines" (not tied to any single machine). Shown as a tab in the Property
 * Information page when the appraisal contains machinery.
 */
export const MachinerySummaryTab = ({
  onSaved,
  cancelPath,
}: {
  onSaved?: () => void;
  /** Where Cancel goes. Without one it steps back in history, like the property forms. */
  cancelPath?: string;
} = {}) => {
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
      <form onSubmit={methods.handleSubmit(onSubmit)} className="cas-form-grid flex flex-col gap-4">
        {/* No page heading here: the tab is already labelled "สรุปเครื่องจักร". The sheet is the
            machinery form's own (`cas-sheet` + `SectionRow`), so labels and section heads come from
            the form skin. Counters: each field's own `showCharCount` wins; only the condition block
            sets the flag form-wide, for the market-demand textarea (4000) whose config has none. */}
        <div className="cas-section-grid cas-sheet grid grid-cols-1 xl:grid-cols-5 gap-6">
          <SectionRow
            title={t('propertyInfo.machinerySummary.groups.counts')}
            icon="gears"
            action={
              !readOnly && suggestedCounts ? (
                <FillEmptyLink suggested={suggestedCounts} onClick={applySuggestedToEmpty} />
              ) : undefined
            }
          >
            <div className="col-span-12">
              <CountsTable suggested={suggestedCounts} readOnly={readOnly} onApply={applyCount} />
            </div>
          </SectionRow>
          <SectionRow
            title={t('propertyInfo.machinerySummary.groups.condition')}
            icon="clipboard-check"
          >
            <FormFields fields={descriptiveFields} disabled={readOnly} showCharCount />
          </SectionRow>
          <MachinerySummaryLegalForm readOnly={readOnly} />
        </div>

        {/* Sticky footer actions — pinned to the bottom of the scroll area. Cancel is there even
            when read-only, the same as the property forms: it is the way back to the list. */}
        <ActionBar>
          <ActionBar.Left>
            <CancelButton fallbackPath={cancelPath} />
            {!readOnly && (
              <>
                <ActionBar.Divider />
                <ActionBar.UnsavedIndicator show={methods.formState.isDirty} />
              </>
            )}
          </ActionBar.Left>
          {!readOnly && (
            <ActionBar.Right>
              <Button
                variant="ghost"
                type="button"
                onClick={handleSaveDraft}
                isLoading={saveMutation.isPending && saveAction === 'draft'}
                disabled={saveMutation.isPending}
              >
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
          )}
        </ActionBar>
      </form>
    </FormProvider>
  );
};

export default MachinerySummaryTab;
