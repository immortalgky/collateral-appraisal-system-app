import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';
import {
  FormFieldShell,
  FormFields,
  FormSection,
  FormSheet,
  FormTable,
  FormTableDash,
  FormTableRowActions,
  useFormLayout,
  type FormTableColumn,
} from '@/shared/components/form';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useFieldArray, useFormContext, useWatch, Controller } from 'react-hook-form';
import { format, formatISO, isValid } from 'date-fns';
import type { RentalInfoFormType } from '../schemas/form';
import { rentalScheduleField, rentalGrowthPeriodField } from '../configs/fields';
import NumberInput from '@/shared/components/inputs/NumberInput';
import DatePickerInput from '@/shared/components/inputs/DatePickerInput';
import FormStringToggle from '@/shared/components/inputs/FormStringToggle';
import { useFormReadOnly } from '@/shared/components/form/context';
import { ValidationText } from '@/shared/components/form/ValidationText';
import { FieldLabels } from '../components/FieldLabels';
import { sumColumn } from '@features/request/components/tables/formTableUtils';
import { useTranslation } from 'react-i18next';

interface ScheduleRow {
  year: number;
  contractStart: string;
  contractEnd: string;
  upFront: number;
  contractRentalFee: number;
  totalAmount: number;
  growthRatePercent: number;
}

function computeSchedule(data: RentalInfoFormType): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const numberOfYears = data.numberOfYears ?? 0;
  const startDate = data.firstYearStartDate ? new Date(data.firstYearStartDate) : null;
  if (numberOfYears <= 0 || !startDate) return rows;

  let currentFee = data.contractRentalFeePerYear ?? 0;
  const upFrontEntries = data.upFrontEntries ?? [];
  const growthPeriodEntries = data.growthPeriodEntries ?? [];

  for (let year = 1; year <= numberOfYears; year++) {
    const contractStart = new Date(startDate);
    contractStart.setFullYear(startDate.getFullYear() + year - 1);

    const contractEnd = new Date(startDate);
    contractEnd.setFullYear(startDate.getFullYear() + year);
    contractEnd.setDate(contractEnd.getDate() - 1);

    const upFront = upFrontEntries
      .filter(e => {
        if (typeof e.atYear === 'number') return e.atYear === year;
        const entryDate = new Date(e.atYear);
        return entryDate >= contractStart && entryDate <= contractEnd;
      })
      .reduce((sum, e) => sum + (e.upFrontAmount ?? 0), 0);

    let growthRate = 0;

    // Frequency growth: apply every N years (skip year 1)
    if (year > 1 && data.growthRateType === 'Period') {
      const interval = data.growthIntervalYears ?? 0;
      if (interval > 0 && (year - 1) % interval === 0) {
        growthRate = data.growthRatePercent ?? 0;
        currentFee += (currentFee * growthRate) / 100;
      }
    }

    // Period growth: apply from fromYear (no base year skip)
    if (data.growthRateType === 'Property') {
      const entryIdx = growthPeriodEntries.findIndex(e => year >= e.fromYear && year <= e.toYear);
      const entry = entryIdx >= 0 ? growthPeriodEntries[entryIdx] : undefined;
      if (entry) {
        currentFee = entry.totalAmount;
        // Show growth rate only at the first year of the period
        if (year === entry.fromYear) {
          growthRate = entry.growthRate ?? 0;
          // If rate is 0/null but amount exists, derive from previous period's totalAmount
          if (!growthRate && (entry.growthAmount ?? 0) > 0) {
            const prevBase =
              entryIdx > 0
                ? growthPeriodEntries[entryIdx - 1].totalAmount
                : (data.contractRentalFeePerYear ?? 0);
            if (prevBase > 0) {
              growthRate = Math.round((entry.growthAmount / prevBase) * 100 * 100) / 100;
            }
          }
        }
      }
    }

    rows.push({
      year,
      contractStart: formatISO(contractStart),
      contractEnd: formatISO(contractEnd),
      upFront,
      contractRentalFee: currentFee,
      totalAmount: currentFee + upFront,
      growthRatePercent: growthRate,
    });
  }

  return rows;
}

const fmtNumber = (val: number) =>
  val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isBlank = (v: unknown) => v === null || v === undefined || v === '';
/** A read-only whole number, or the dash. */
const plainInt = (v: unknown) => (isBlank(v) ? <FormTableDash /> : String(v));
/** A read-only amount with two decimals, or the dash. */
const plainMoney = (v: unknown) => (isBlank(v) ? <FormTableDash /> : fmtNumber(Number(v)));

/** The kit's section hint is quiet text on its own: drop the leading "· " the count keys carry. */
const countHint = (text: string) => text.replace(/^·\s*/, '');

/** A table row that only needs its place in a field array. */
type ArrayRow = { id: string; idx: number };
/** A rental-schedule row; `skeleton` rows stand in while the schedule is being generated. */
type ScheduleTableRow = ArrayRow & { skeleton?: boolean };

const SKELETON_ROWS: ScheduleTableRow[] = Array.from({ length: 5 }, (_, i) => ({
  id: `skeleton-${i}`,
  idx: i,
  skeleton: true,
}));

const Pulse = () => <div className="h-4 animate-pulse rounded bg-(--palette-surface-3)" />;

const RentalInfoForm = ({ namePrefix }: { namePrefix?: string }) => {
  const { t } = useTranslation('appraisal');
  const layout = useFormLayout();
  const growthTypeLabelId = useId();
  // Helper to prefix field names
  const p = (name: string) => (namePrefix ? `${namePrefix}.${name}` : name) as any;

  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext();
  const growthRateType = useWatch({ control, name: p('growthRateType') });
  const numberOfYears = useWatch({ control, name: p('numberOfYears') }) ?? 0;
  const watchedGrowthEntries = useWatch({ control, name: p('growthPeriodEntries') }) as
    | any[]
    | undefined;
  const watchedScheduleEntries = useWatch({ control, name: p('scheduleEntries') }) as
    | any[]
    | undefined;
  const watchedUpFrontEntries = useWatch({ control, name: p('upFrontEntries') }) as
    | any[]
    | undefined;
  const upFrontTotalInput = useWatch({ control, name: p('upFrontTotalAmount') }) ?? 0;
  const contractRentalFeePerYear = useWatch({ control, name: p('contractRentalFeePerYear') }) ?? 0;

  // Resolve nested errors for prefixed paths
  const rentalErrors = namePrefix ? ((errors as any)?.[namePrefix] ?? {}) : errors;

  // Auto-sync toYear only — rate ↔ amount derived in onChange handlers below
  useEffect(() => {
    if (!watchedGrowthEntries?.length) return;
    watchedGrowthEntries.forEach((entry: any, idx: number) => {
      const nextEntry = watchedGrowthEntries[idx + 1];
      const expectedToYear = nextEntry?.fromYear ? nextEntry.fromYear - 1 : numberOfYears;
      if (entry?.toYear !== expectedToYear && expectedToYear > 0) {
        setValue(p(`growthPeriodEntries.${idx}.toYear`), expectedToYear, { shouldDirty: true });
      }
    });
  }, [
    watchedGrowthEntries?.map((e: any) => `${e?.fromYear}-${e?.toYear}`).join(','),
    numberOfYears,
  ]);

  const getPrevTotal = (idx: number): number => {
    if (idx === 0) return contractRentalFeePerYear;
    const prev = getValues(p(`growthPeriodEntries.${idx - 1}.totalAmount`));
    return prev ?? contractRentalFeePerYear;
  };

  const handleGrowthRateChange = (idx: number, rate: number) => {
    const prevTotal = getPrevTotal(idx);
    const amount = Math.round((rate / 100) * prevTotal * 100) / 100;
    const total = Math.round((prevTotal + amount) * 100) / 100;
    setValue(p(`growthPeriodEntries.${idx}.growthAmount`), amount, { shouldDirty: true });
    setValue(p(`growthPeriodEntries.${idx}.totalAmount`), total, { shouldDirty: true });
  };

  const handleGrowthAmountChange = (idx: number, amount: number) => {
    const prevTotal = getPrevTotal(idx);
    const total = Math.round((prevTotal + amount) * 100) / 100;
    const derivedRate = prevTotal > 0 ? Math.round((amount / prevTotal) * 100 * 100) / 100 : 0;
    setValue(p(`growthPeriodEntries.${idx}.growthRate`), derivedRate, { shouldDirty: true });
    setValue(p(`growthPeriodEntries.${idx}.totalAmount`), total, { shouldDirty: true });
  };

  const upFrontTotal = sumColumn(watchedUpFrontEntries, 'upFrontAmount');
  const [computedRows, setComputedRows] = useState<ScheduleRow[]>([]);
  // Every add / edit / generate link and row delete below is an edit: a viewer gets none of them.
  const readOnly = useFormReadOnly();
  const [isScheduleEditing, setIsScheduleEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const {
    fields: upFrontFields,
    append: appendUpFront,
    remove: removeUpFront,
  } = useFieldArray({ control, name: p('upFrontEntries') });

  const {
    fields: growthFields,
    append: appendGrowth,
    remove: removeGrowth,
  } = useFieldArray({ control, name: p('growthPeriodEntries') });
  const addGrowthPeriod = () =>
    appendGrowth({ fromYear: 0, toYear: 0, growthRate: 0, growthAmount: 0, totalAmount: 0 });
  const addUpFront = () => appendUpFront({ atYear: '', upFrontAmount: 0 });

  const { fields: scheduleFields, replace: replaceScheduleEntries } = useFieldArray({
    control,
    name: p('scheduleEntries'),
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const allData = getValues();
      const riData = namePrefix ? allData[namePrefix] : allData;
      const rows = computeSchedule(riData);
      setComputedRows(rows);

      setValue(p('scheduleOverrides'), [], { shouldDirty: true });

      const entries = rows.map(row => ({
        year: row.year,
        contractStart: row.contractStart,
        contractEnd: row.contractEnd,
        upFront: row.upFront,
        contractRentalFee: row.contractRentalFee,
        totalAmount: row.totalAmount,
        contractRentalFeeGrowthRatePercent: row.growthRatePercent,
      }));
      replaceScheduleEntries(entries);
      setIsGenerating(false);
    }, 400);
  };

  const handleCellChange = (idx: number, field: 'upFront' | 'contractRentalFee', value: number) => {
    const entries = getValues(p('scheduleEntries')) ?? [];
    const entry = entries[idx];
    if (!entry) return;

    const updatedUpFront = field === 'upFront' ? value : entry.upFront;
    const updatedFee = field === 'contractRentalFee' ? value : entry.contractRentalFee;

    setValue(p(`scheduleEntries.${idx}.${field}`), value, { shouldDirty: true });
    setValue(p(`scheduleEntries.${idx}.totalAmount`), updatedUpFront + updatedFee, {
      shouldDirty: true,
    });

    const overrides = getValues(p('scheduleOverrides')) ?? [];
    const computed = computedRows.find(r => r.year === entry.year);
    const isUpFrontOverridden = updatedUpFront !== (computed?.upFront ?? 0);
    const isFeeOverridden = updatedFee !== (computed?.contractRentalFee ?? 0);

    const filtered = overrides.filter((o: any) => o.year !== entry.year);
    if (isUpFrontOverridden || isFeeOverridden) {
      filtered.push({
        year: entry.year,
        upFront: isUpFrontOverridden ? updatedUpFront : null,
        contractRentalFee: isFeeOverridden ? updatedFee : null,
      });
    }
    setValue(p('scheduleOverrides'), filtered, { shouldDirty: true });
  };

  // ─── Growth rate by period ──────────────────────────────────────────────────────────────────────

  const growthRows: ArrayRow[] = growthFields.map((f, idx) => ({ id: f.id, idx }));
  const growthColumns: FormTableColumn<ArrayRow>[] = [
    {
      key: 'fromYear',
      kind: 'input',
      align: 'end',
      header: t('forms.rentalInfo.table.atYear'),
      card: { span: 4 },
      cell: ({ idx }, { readOnly: ro, position }) =>
        ro ? (
          plainInt(watchedGrowthEntries?.[idx]?.fromYear)
        ) : (
          <Controller
            control={control}
            name={p(`growthPeriodEntries.${idx}.fromYear`)}
            render={({ field: f, fieldState: { error } }) => (
              <NumberInput
                {...f}
                cell
                decimalPlaces={0}
                maxIntegerDigits={3}
                thousandSeparator={false}
                aria-label={`${t('forms.rentalInfo.table.atYear')} ${position + 1}`}
                error={error?.message}
              />
            )}
          />
        ),
    },
    {
      key: 'toYear',
      kind: 'derived',
      align: 'end',
      header: t('forms.rentalInfo.table.toYear'),
      cell: ({ idx }) => plainInt(watchedGrowthEntries?.[idx]?.toYear),
    },
    {
      key: 'growthRate',
      kind: 'input',
      align: 'end',
      header: t('forms.rentalInfo.table.growthRate'),
      card: { span: 4 },
      cell: ({ idx }, { readOnly: ro, position }) =>
        ro ? (
          plainMoney(watchedGrowthEntries?.[idx]?.growthRate)
        ) : (
          <Controller
            control={control}
            name={p(`growthPeriodEntries.${idx}.growthRate`)}
            render={({ field: f }) => (
              <NumberInput
                {...f}
                cell
                decimalPlaces={2}
                maxIntegerDigits={3}
                suffix="%"
                aria-label={`${t('forms.rentalInfo.table.growthRate')} ${position + 1}`}
                onChange={e => {
                  f.onChange(e);
                  handleGrowthRateChange(idx, e.target.value ?? 0);
                }}
              />
            )}
          />
        ),
    },
    {
      key: 'growthAmount',
      kind: 'input',
      align: 'end',
      header: t('forms.rentalInfo.table.growthAmount'),
      card: { span: 4 },
      cell: ({ idx }, { readOnly: ro, position }) =>
        ro ? (
          plainMoney(watchedGrowthEntries?.[idx]?.growthAmount)
        ) : (
          <Controller
            control={control}
            name={p(`growthPeriodEntries.${idx}.growthAmount`)}
            render={({ field: f }) => (
              <NumberInput
                {...f}
                cell
                decimalPlaces={2}
                maxIntegerDigits={15}
                aria-label={`${t('forms.rentalInfo.table.growthAmount')} ${position + 1}`}
                onChange={e => {
                  f.onChange(e);
                  handleGrowthAmountChange(idx, e.target.value ?? 0);
                }}
              />
            )}
          />
        ),
    },
    {
      key: 'totalAmount',
      kind: 'derived',
      align: 'end',
      header: t('forms.rentalInfo.table.totalAmount'),
      cell: ({ idx }) => plainMoney(watchedGrowthEntries?.[idx]?.totalAmount),
    },
    {
      key: 'actions',
      kind: 'action',
      width: '3.5rem',
      cell: ({ idx }, { position }) => (
        <FormTableRowActions
          position={position}
          count={growthRows.length}
          onDelete={() => removeGrowth(idx)}
        />
      ),
    },
  ];

  // ─── Up-front payments ──────────────────────────────────────────────────────────────────────────

  const upFrontRows: ArrayRow[] = upFrontFields.map((f, idx) => ({ id: f.id, idx }));
  const upFrontColumns: FormTableColumn<ArrayRow>[] = [
    {
      key: 'atYear',
      kind: 'input',
      header: t('forms.rentalInfo.table.atDate'),
      card: { span: 6 },
      cell: ({ idx }, { readOnly: ro, position }) => {
        if (ro) {
          const v = watchedUpFrontEntries?.[idx]?.atYear;
          if (isBlank(v)) return <FormTableDash />;
          const date = typeof v === 'string' ? new Date(v) : null;
          return date && isValid(date) ? format(date, 'dd/MM/yyyy') : String(v);
        }
        return (
          <Controller
            control={control}
            name={p(`upFrontEntries.${idx}.atYear`)}
            render={({ field: f }) => (
              <DatePickerInput
                cell
                value={typeof f.value === 'string' ? f.value : null}
                onChange={val => f.onChange(val ?? '')}
                onBlur={f.onBlur}
                name={f.name}
                aria-label={`${t('forms.rentalInfo.table.atDate')} ${position + 1}`}
              />
            )}
          />
        );
      },
    },
    {
      key: 'upFrontAmount',
      kind: 'input',
      align: 'end',
      header: t('forms.rentalInfo.table.upFrontAmount'),
      card: { span: 6 },
      total: fmtNumber(upFrontTotal),
      cell: ({ idx }, { readOnly: ro, position }) =>
        ro ? (
          plainMoney(watchedUpFrontEntries?.[idx]?.upFrontAmount)
        ) : (
          <Controller
            control={control}
            name={p(`upFrontEntries.${idx}.upFrontAmount`)}
            render={({ field: f }) => (
              <NumberInput
                {...f}
                cell
                decimalPlaces={2}
                maxIntegerDigits={15}
                aria-label={`${t('forms.rentalInfo.table.upFrontAmount')} ${position + 1}`}
              />
            )}
          />
        ),
    },
    {
      key: 'actions',
      kind: 'action',
      width: '3.5rem',
      cell: ({ idx }, { position }) => (
        <FormTableRowActions
          position={position}
          count={upFrontRows.length}
          onDelete={() => removeUpFront(idx)}
        />
      ),
    },
  ];

  // ─── Rental schedule ────────────────────────────────────────────────────────────────────────────

  const scheduleRows: ScheduleTableRow[] = isGenerating
    ? SKELETON_ROWS
    : scheduleFields.map((f, idx) => ({ id: f.id, idx }));
  /** A skeleton row draws a pulse bar in every cell. */
  const cellOf = (row: ScheduleTableRow, content: React.ReactNode) =>
    row.skeleton ? <Pulse /> : content;
  const entryOf = (row: ScheduleTableRow) => watchedScheduleEntries?.[row.idx];
  const dateOf = (iso?: string) => (iso ? format(new Date(iso), 'dd/MM/yyyy') : '');

  // The totals row sums what the rows show; there is none while skeleton rows stand in.
  const scheduleUpFrontSum = sumColumn(watchedScheduleEntries, 'upFront');
  const scheduleFeeSum = sumColumn(watchedScheduleEntries, 'contractRentalFee');
  const totalOf = (sum: number) => (isGenerating ? undefined : fmtNumber(sum));

  /** The editable amount columns: an input while editing, the figure otherwise. */
  const amountColumn = (
    key: 'upFront' | 'contractRentalFee',
    header: string,
    total?: string,
  ): FormTableColumn<ScheduleTableRow> => ({
    key,
    kind: 'input',
    align: 'end',
    header,
    total,
    card: { span: 6 },
    cell: (row, { readOnly: ro, position }) => {
      if (row.skeleton) return <Pulse />;
      const entry = entryOf(row);
      if (!isScheduleEditing || ro) return fmtNumber(entry?.[key] ?? 0);
      return (
        <Controller
          control={control}
          name={p(`scheduleEntries.${row.idx}.${key}`)}
          render={({ field: f }) => (
            <NumberInput
              {...f}
              cell
              decimalPlaces={2}
              maxIntegerDigits={15}
              aria-label={`${header} ${position + 1}`}
              onChange={e => {
                f.onChange(e);
                handleCellChange(row.idx, key, e.target.value ?? 0);
              }}
            />
          )}
        />
      );
    },
  });

  const scheduleColumns: FormTableColumn<ScheduleTableRow>[] = [
    {
      key: 'year',
      header: t('forms.rentalInfo.table.year'),
      card: { title: row => (row.skeleton ? null : entryOf(row)?.year) },
      cell: row => cellOf(row, entryOf(row)?.year),
    },
    {
      key: 'contractStart',
      header: t('forms.rentalInfo.table.contractStart'),
      card: { zone: 'result' },
      cell: row => cellOf(row, dateOf(entryOf(row)?.contractStart)),
    },
    {
      key: 'contractEnd',
      header: t('forms.rentalInfo.table.contractEnd'),
      card: { zone: 'result' },
      cell: row => cellOf(row, dateOf(entryOf(row)?.contractEnd)),
    },
    amountColumn(
      'upFront',
      t('forms.rentalInfo.table.upFrontPerYear'),
      totalOf(scheduleUpFrontSum),
    ),
    amountColumn(
      'contractRentalFee',
      t('forms.rentalInfo.table.rentalFeePerYear'),
      totalOf(scheduleFeeSum),
    ),
    {
      key: 'totalAmount',
      kind: 'derived',
      align: 'end',
      header: t('forms.rentalInfo.table.totalAmount'),
      total: totalOf(scheduleUpFrontSum + scheduleFeeSum),
      cell: row =>
        cellOf(
          row,
          <span className="font-medium">
            {fmtNumber((entryOf(row)?.upFront ?? 0) + (entryOf(row)?.contractRentalFee ?? 0))}
          </span>,
        ),
    },
    {
      key: 'growthRatePct',
      kind: 'derived',
      align: 'end',
      header: t('forms.rentalInfo.table.growthRatePct'),
      cell: row => cellOf(row, (entryOf(row)?.contractRentalFeeGrowthRatePercent ?? 0).toFixed(2)),
    },
  ];

  // Edit toggle + generate, at the right of the section head: buttons in Standard, links in the
  // Compact band (DESIGN.md 17.7, 17.10).
  const editLabel = isScheduleEditing ? (
    <>
      <span aria-hidden="true">✓ </span>
      {t('forms.rentalInfo.editing')}
    </>
  ) : (
    t('forms.rentalInfo.edit')
  );
  const generateLabel = isGenerating
    ? t('forms.rentalInfo.generating')
    : t('forms.rentalInfo.generate');
  const link =
    'text-xs font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-60';
  const scheduleActions = readOnly ? undefined : (
    <>
      {scheduleFields.length > 0 &&
        (layout === 'standard' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsScheduleEditing(!isScheduleEditing)}
            aria-pressed={isScheduleEditing}
            className="aria-pressed:border-amber-300! dark:aria-pressed:border-amber-500/40! aria-pressed:bg-(--palette-warn-wash)! aria-pressed:text-(--palette-warn)!"
          >
            {editLabel}
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => setIsScheduleEditing(!isScheduleEditing)}
            aria-pressed={isScheduleEditing}
            className={clsx(
              link,
              isScheduleEditing ? 'text-(--palette-warn)' : 'text-(--palette-accent-ink)',
            )}
          >
            {editLabel}
          </button>
        ))}
      {layout === 'standard' ? (
        <Button size="sm" onClick={handleGenerate} isLoading={isGenerating}>
          {generateLabel}
        </Button>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className={clsx(link, 'text-(--palette-accent-ink)')}
        >
          {generateLabel}
        </button>
      )}
    </>
  );

  return (
    <FieldLabels scope="rental">
      <div className="w-full max-w-full">
        {/* No page heading: the section bands below name each group, and the tab already
          says "Rental Info". */}
        <FormSheet>
          {/* Schedule Header Fields */}
          <FormSection title={t('forms.rentalInfo.groups.schedule')} icon="calendar-days">
            <FormFields fields={rentalScheduleField} namePrefix={namePrefix} />
          </FormSection>

          {/* Growth Rate */}
          <FormSection
            title={t('forms.rentalInfo.groups.growthRate')}
            icon="chart-line"
            hint={
              growthRateType === 'Property' && growthFields.length > 0
                ? countHint(t('forms.rentalInfo.growthPeriodCount', { count: growthFields.length }))
                : undefined
            }
          >
            <div className="col-span-12 space-y-4">
              {/* The toggle and the fields it governs share one grid, so they read as consecutive
                rows rather than two blocks with a gutter between them. FormFieldShell is the
                wrapper FormFields gives a config-driven field (label, data-field); this one is
                rendered by hand. */}
              <div className="grid grid-cols-12 gap-4">
                <FormFieldShell
                  name={p('growthRateType')}
                  label={t('fieldLabels.rental.growthRateType')}
                  labelId={growthTypeLabelId}
                  wrapperClassName="col-span-12"
                >
                  <FormStringToggle
                    name={p('growthRateType')}
                    options={[
                      { name: 'Period', label: t('forms.rentalInfo.growthFrequency') },
                      { name: 'Property', label: t('forms.rentalInfo.growthPeriod') },
                    ]}
                  />
                </FormFieldShell>

                {growthRateType === 'Period' && (
                  <FormFields fields={rentalGrowthPeriodField} namePrefix={namePrefix} />
                )}

                {growthRateType === 'Property' && (
                  <div className="col-span-12">
                    <FormTable
                      columns={growthColumns}
                      rows={growthRows}
                      rowKey={row => row.id}
                      minWidth={44}
                      add={[{ label: t('forms.rentalInfo.addPeriod'), onClick: addGrowthPeriod }]}
                      empty={{
                        icon: 'chart-line',
                        message: t('forms.rentalInfo.growthPeriodEmpty'),
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </FormSection>

          {/* Up Front Entries */}
          <FormSection title={t('forms.rentalInfo.groups.upFront')} icon="money-bill">
            <div className="col-span-12">
              <FormTable
                columns={upFrontColumns}
                rows={upFrontRows}
                rowKey={row => row.id}
                add={[{ label: t('forms.rentalInfo.addUpFront'), onClick: addUpFront }]}
                empty={{ icon: 'money-bill', message: t('forms.rentalInfo.upFrontEmpty') }}
              />
              {upFrontFields.length > 0 &&
                upFrontTotalInput > 0 &&
                Math.abs(upFrontTotal - upFrontTotalInput) > 0.01 && (
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-200 dark:border-amber-500/30 bg-(--palette-warn-wash) px-3 py-2 text-sm text-(--palette-warn)">
                    <Icon style="solid" name="triangle-exclamation" className="size-4 shrink-0" />
                    <span>
                      {t('forms.rentalInfo.upFrontMismatch', {
                        entries: fmtNumber(upFrontTotal),
                        total: fmtNumber(upFrontTotalInput),
                      })}
                    </span>
                  </div>
                )}
              {rentalErrors.upFrontEntries?.message && (
                <div className="mt-2 flex items-center gap-2 rounded-md border border-(--palette-req-line) bg-(--palette-req-wash) px-3 py-2 text-sm text-(--palette-req)">
                  <Icon style="solid" name="circle-exclamation" className="size-4 shrink-0" />
                  <span>
                    <ValidationText message={rentalErrors.upFrontEntries.message} />
                  </span>
                </div>
              )}
            </div>
          </FormSection>

          {/* Rental Schedule */}
          <FormSection
            title={t('forms.rentalInfo.groups.rentalSchedule')}
            icon="table"
            hint={
              scheduleFields.length > 0
                ? countHint(t('forms.rentalInfo.scheduleYears', { count: scheduleFields.length }))
                : undefined
            }
            actions={scheduleActions}
          >
            <div className="col-span-12">
              <FormTable
                columns={scheduleColumns}
                rows={scheduleRows}
                rowKey={row => row.id}
                minWidth={52}
                totalLabel={t('forms.rentalInfo.totalYears', { count: scheduleFields.length })}
                empty={{ icon: 'table', message: t('forms.rentalInfo.scheduleEmpty') }}
              />
            </div>
          </FormSection>
        </FormSheet>
      </div>
    </FieldLabels>
  );
};

export default RentalInfoForm;
