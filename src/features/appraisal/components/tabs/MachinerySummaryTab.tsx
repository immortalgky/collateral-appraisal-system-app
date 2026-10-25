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
import {
  FormFields,
  FormSection,
  FormSheet,
  FormTable,
  FormTableDash,
  UserFormLayoutProvider,
  useFormLayout,
  type FormField,
  type FormTableColumn,
} from '@/shared/components/form';
import NumberInput from '@/shared/components/inputs/NumberInput';
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
import {
  allMachinerySummaryFields,
  machinerySummaryGeneralFields,
  machinerySummaryLegalFields,
} from '../../configs/fields';
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
      className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-(--palette-accent-ink) hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline!"
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
  const layout = useFormLayout();
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

  /** The sentence saying which groups a derived total came from (see the comment below). */
  const sourceOf = (name: SuggestedCountName) => {
    // Said as a sentence rather than shown as chips: the reader is checking a
    // number they did not compute, and "มาจาก Group 2 5 เครื่อง และ Group 3 2 เครื่อง"
    // answers "where did 7 come from" the way a colleague would. Groups
    // contributing nothing are left out.
    // Nothing derived yet (still loading, or the request failed): the Derived
    // cell shows — and this one has to agree, rather than asserting that no
    // machine matches.
    if (!suggested) return <FormTableDash />;
    const parts = suggested.groups.filter(g => g[name] > 0);
    if (parts.length === 0)
      return (
        <span className="text-xs text-(--palette-ink-2)">
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
      <span className="text-xs text-(--palette-ink-2)">
        {t('propertyInfo.machinerySummary.table.sourceSentence', { list })}
      </span>
    );
  };

  const labelOf = (name: SuggestedCountName) =>
    t(FIELD_LABEL_KEYS[name as keyof typeof FIELD_LABEL_KEYS]);

  const rows = SUGGESTED_COUNT_NAMES.map((name, i) => ({ name, i }));
  const columns: FormTableColumn<(typeof rows)[number]>[] = [
    {
      key: 'item',
      // `index` so that, in card mode, the label is the card's title rather than a field of its own.
      kind: 'index',
      align: 'start',
      width: '16rem',
      header: t('propertyInfo.machinerySummary.table.item'),
      card: { title: ({ name }) => labelOf(name) },
      cell: ({ name }) => (
        <span className="inline-flex items-center gap-1.5 text-(--palette-ink)">
          {labelOf(name)}
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
      ),
    },
    {
      key: 'entered',
      kind: 'input',
      align: 'end',
      width: '8rem',
      header: t('propertyInfo.machinerySummary.table.entered'),
      card: { span: 6 },
      cell: ({ name, i }) => (
        <div className="ml-auto w-full max-w-[6.5rem]">
          {/* Capped at the same digits the schema refines on (`MAX_COUNT_DIGITS`): a longer number
              would fail validation with nothing on screen to say so, and Save would do nothing. */}
          <NumberInput
            cell
            decimalPlaces={0}
            maxIntegerDigits={MAX_COUNT_DIGITS[name] ?? 5}
            thousandSeparator={false}
            placeholder="-"
            disabled={readOnly}
            aria-label={labelOf(name)}
            value={value(i)}
            onChange={e => {
              setValue(name, e.target.value, { shouldDirty: true, shouldValidate: false });
            }}
          />
        </div>
      ),
    },
    {
      key: 'derived',
      kind: 'derived',
      align: 'end',
      width: '7rem',
      header: t('propertyInfo.machinerySummary.table.derived'),
      cell: ({ name, i }) => {
        const derived = suggested?.[name];
        if (derived === undefined) return <FormTableDash />;
        const typed = value(i);
        const differs = typed !== null && typed !== derived;
        return (
          <span
            className={differs ? 'font-semibold text-(--palette-warn)' : 'text-(--palette-ink-2)'}
          >
            {derived}
          </span>
        );
      },
    },
    {
      key: 'source',
      kind: 'text',
      header: t('propertyInfo.machinerySummary.table.source'),
      card: { zone: 'input', span: 12 },
      cell: ({ name }) => sourceOf(name),
    },
    {
      key: 'use',
      kind: 'action',
      width: '6rem',
      cell: ({ name, i }) => {
        const derived = suggested?.[name];
        const typed = value(i);
        // Always there so the column keeps its shape; disabled once the entered number already is
        // the calculated one.
        if (readOnly || derived === undefined) return null;
        return (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="xs"
              onClick={() => onApply(name, derived)}
              disabled={typed === derived}
              title={
                typed === derived ? t('propertyInfo.machinerySummary.table.useDisabled') : undefined
              }
              leftIcon={<Icon name="wand-magic-sparkles" style="solid" />}
            >
              {t('propertyInfo.machinerySummary.table.use')}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <FormTable columns={columns} rows={rows} rowKey={row => row.name} minWidth={40} />

      {issues.length > 0 && (
        <p
          className={clsx(
            'mt-2 rounded-md border border-amber-200 dark:border-amber-500/30 bg-(--palette-warn-wash) px-3 py-2 text-xs text-(--palette-warn)',
            layout === 'compact' && 'mx-2 mb-2',
          )}
        >
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
      <FormSection title={t('propertyInfo.machinerySummary.groups.ownership')} icon="user">
        <FormFields fields={pick('proprietor', 'owner', 'obligation')} disabled={readOnly} />
      </FormSection>
      <FormSection title={t('propertyInfo.machinerySummary.groups.location')} icon="location-dot">
        <FormFields fields={pick('machineAddress', 'latitude', 'longitude')} disabled={readOnly} />
      </FormSection>
      <FormSection title={t('propertyInfo.machinerySummary.groups.remarks')} icon="note-sticky">
        <FormFields fields={pick('other')} disabled={readOnly} />
      </FormSection>
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
        <Icon
          name="spinner"
          style="solid"
          className="w-6 h-6 animate-spin text-(--palette-primary-text)"
        />
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
    <UserFormLayoutProvider>
      <FormProvider
        methods={methods}
        schema={machinerySummaryForm}
        fields={allMachinerySummaryFields}
      >
        <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* No page heading here: the tab is already labelled "สรุปเครื่องจักร". The sheet is a
            FormSheet, like the machinery form's. Counters: each field's own `showCharCount` wins;
            only the condition block sets the flag form-wide, for the market-demand textarea (4000)
            whose config has none. */}
          <FormSheet>
            <FormSection
              title={t('propertyInfo.machinerySummary.groups.counts')}
              icon="gears"
              actions={
                !readOnly && suggestedCounts ? (
                  <FillEmptyLink suggested={suggestedCounts} onClick={applySuggestedToEmpty} />
                ) : undefined
              }
            >
              <div className="col-span-12">
                <CountsTable suggested={suggestedCounts} readOnly={readOnly} onApply={applyCount} />
              </div>
            </FormSection>
            <FormSection
              title={t('propertyInfo.machinerySummary.groups.condition')}
              icon="clipboard-check"
            >
              <FormFields fields={descriptiveFields} disabled={readOnly} showCharCount />
            </FormSection>
            <MachinerySummaryLegalForm readOnly={readOnly} />
          </FormSheet>

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
    </UserFormLayoutProvider>
  );
};

export default MachinerySummaryTab;
