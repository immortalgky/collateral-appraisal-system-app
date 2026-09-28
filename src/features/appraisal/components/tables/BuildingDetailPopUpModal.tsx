import { Button, FormStringToggle, Icon, NumberInput, TextInput } from '@/shared/components';
import { useCallback, useEffect, useState } from 'react';
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import clsx from 'clsx';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import { useFormReadOnly } from '@/shared/components/form/context';
import { toNumber } from '../BuildingTable/BuildingDetailTable';
import { type DerivedRule, useDerivedFieldArray } from '../BuildingTable/useDerivedFieldArray';

interface BuildingDetailPopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DepreciationDetailData) => void;
  initialData?: DepreciationDetailData | null;
  mode: 'add' | 'edit';
  /** Deleting a row happens here now — the table itself has no action column any more. */
  onDelete?: () => void;
  /** Which subgroup the Add button belongs to, so the new row lands in the right one. */
  defaultIsBuilding?: boolean;
}

interface DepreciationDetailData {
  areaDescription: string;
  area: number;
  isBuilding: boolean;
  year: number;
  pricePerSqMBeforeDepreciation: number;
  depreciationMethod: string;
  depreciationPeriods: any[];
  [key: string]: any;
}

export const defaultDepreciationDetail: DepreciationDetailData = {
  areaDescription: '',
  area: 0,
  isBuilding: true,
  year: 0,
  pricePerSqMBeforeDepreciation: 0,
  depreciationMethod: 'Gross',
  depreciationPeriods: [],
};

const FORM_ID = 'building-detail-form';

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (n: number, digits = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const periodMessages = {
  toBeforeAt: (toYear: number, atYear: number) =>
    `To Year (${toYear}) must be ≥ At Year (${atYear})`,
  noAge: () => 'Building Year must be set before adding depreciation periods',
  pastAge: (toYear: number, age: number) =>
    `To Year (${toYear}) must not exceed building Year (${age})`,
  overlap: (atYear: number, prevToYear: number) =>
    `At Year (${atYear}) must be > previous row's To Year (${prevToYear})`,
};

/** The same checks the form has always run on submit, per row so they can sit beside the row. */
export function periodErrors(
  rows: any[],
  buildingYear: number,
  msg: typeof periodMessages = periodMessages,
): string[][] {
  return rows.map((row, i) => {
    const errors: string[] = [];
    const atYear = Number(row.atYear) || 0;
    const toYear = Number(row.toYear) || 0;

    if (toYear < atYear) errors.push(msg.toBeforeAt(toYear, atYear));

    if (buildingYear <= 0) {
      errors.push(msg.noAge());
    } else if (toYear > buildingYear) {
      errors.push(msg.pastAge(toYear, buildingYear));
    }

    if (i > 0) {
      const prevToYear = Number(rows[i - 1].toYear) || 0;
      if (atYear <= prevToYear) errors.push(msg.overlap(atYear, prevToYear));
    }
    return errors;
  });
}

/** Price summary pinned to the footer: Before − Depreciation = After. */
function DepreciationFlow() {
  const area = useWatch({ name: 'area' }) || 0;
  const pricePerSqm = useWatch({ name: 'pricePerSqMBeforeDepreciation' }) || 0;
  const depreciationPeriods = useWatch({ name: 'depreciationPeriods' }) || [];

  const totalBefore = area * pricePerSqm;
  const totalPriceDepreciation = Array.isArray(depreciationPeriods)
    ? depreciationPeriods.reduce((acc: number, p: any) => acc + toNum(p.priceDepreciation), 0)
    : 0;
  const priceAfterDepreciation = totalBefore - totalPriceDepreciation;
  const depreciationPct = totalBefore > 0 ? (totalPriceDepreciation / totalBefore) * 100 : 0;

  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[13px] tabular-nums text-gray-400">
      Before <b className="font-medium text-gray-900">{money(totalBefore)}</b>− Depreciation
      <b className="font-medium text-orange-700">{money(totalPriceDepreciation)}</b>(
      {depreciationPct.toFixed(1)}%) =
      <span className="text-base font-bold text-primary-700">{money(priceAfterDepreciation)}</span>
    </div>
  );
}

function BuildingDetailPopUpModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode,
  onDelete,
  defaultIsBuilding = true,
}: BuildingDetailPopUpModalProps) {
  const methods = useForm<DepreciationDetailData>({
    defaultValues: initialData || defaultDepreciationDetail,
  });

  const { register, handleSubmit, reset, watch, setValue, getValues } = methods;
  const formReadOnly = useFormReadOnly();

  const [showErrors, setShowErrors] = useState(false);
  // Two clicks to delete. A ConfirmDialog portals outside the panel, which the panel treats as an
  // outside click and makes inert.
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      reset(initialData || { ...defaultDepreciationDetail, isBuilding: defaultIsBuilding });
      setShowErrors(false);
      setConfirmDelete(false);
    }
  }, [isOpen, initialData, defaultIsBuilding, reset]);

  const isGross = watch('depreciationMethod') === 'Gross';
  const buildingYear = watch('year') || 0;
  const isBuilding = watch('isBuilding');
  const areaDescriptionValue = watch('areaDescription');
  const areaValue = watch('area');
  const pricePerSqMValue = watch('pricePerSqMBeforeDepreciation');

  // When switching to Gross mode, trim to single row (keep first, drop the rest)
  useEffect(() => {
    if (!isOpen || !isGross) return;
    const currentRows = getValues('depreciationPeriods') || [];
    if (currentRows.length > 1) {
      setValue('depreciationPeriods', [currentRows[0]]);
    }
  }, [isGross, isOpen, getValues, setValue]);

  // When building year changes and in Gross mode, sync toYear on existing row
  useEffect(() => {
    if (!isOpen || !isGross || buildingYear <= 0) return;
    const currentRows = getValues('depreciationPeriods') || [];
    if (currentRows.length > 0) {
      setValue('depreciationPeriods.0.toYear', buildingYear);
    }
  }, [buildingYear, isGross, isOpen, getValues, setValue]);

  const onSubmit = useCallback(
    (data: DepreciationDetailData) => {
      const errors = periodErrors(data.depreciationPeriods ?? [], Number(data.year) || 0);
      if (errors.some(e => e.length > 0)) {
        setShowErrors(true);
        return;
      }
      onSave(data);
      onClose();
    },
    [onSave, onClose],
  );

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to save
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    },
    [handleSubmit, onSubmit],
  );

  const kind = isBuilding === false ? 'non-building' : 'building';

  return (
    <FormProvider {...methods}>
      <SlideOverPanel
        isOpen={isOpen}
        onClose={onClose}
        width="xl"
        title={`${mode === 'add' ? 'Add' : 'Edit'} ${kind} item`}
        footer={
          <div className="flex flex-col gap-3">
            <DepreciationFlow />
            <div className="flex flex-wrap items-center gap-2">
              {mode === 'edit' && onDelete && !formReadOnly && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    if (!confirmDelete) return setConfirmDelete(true);
                    onDelete();
                    onClose();
                  }}
                  className={
                    confirmDelete
                      ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                      : 'text-red-600 border-red-200 hover:bg-red-50'
                  }
                >
                  <Icon style="solid" name="trash" className="size-3.5 mr-1" />
                  {confirmDelete ? 'Confirm delete' : 'Delete'}
                </Button>
              )}
              <span className="flex-1" />
              <Button variant="outline" type="button" onClick={onClose}>
                {formReadOnly ? 'Close' : 'Cancel'}
              </Button>
              {!formReadOnly && (
                <Button
                  type="submit"
                  form={FORM_ID}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  {mode === 'add' ? 'Add' : 'Save'}
                  <span className="ml-1.5 text-[10px] opacity-60 hidden sm:inline">↵</span>
                </Button>
              )}
            </div>
          </div>
        }
      >
        <form
          id={FORM_ID}
          onSubmit={e => {
            // The panel portals out of the page's form, but React still bubbles submit through it.
            e.stopPropagation();
            handleSubmit(onSubmit)(e);
          }}
          onKeyDown={handleKeyDown}
          className="flex flex-col divide-y divide-gray-200"
        >
          <section className="flex flex-col gap-4 pb-5">
            <div
              role="radiogroup"
              aria-label="Item type"
              className="grid grid-cols-2 gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1"
            >
              {[
                {
                  value: true,
                  label: 'Building',
                  hint: 'Counts toward Building Insurance',
                  swatch: 'bg-primary-500',
                },
                {
                  value: false,
                  label: 'Non-Building',
                  hint: 'Fence, paving, pool…',
                  swatch: 'bg-amber-500',
                },
              ].map(option => {
                const selected = (isBuilding !== false) === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={formReadOnly}
                    onClick={() => setValue('isBuilding', option.value, { shouldDirty: true })}
                    className={clsx(
                      'grid grid-cols-[auto_1fr] items-center gap-x-2 rounded-md px-3 py-2 text-left text-sm font-medium',
                      selected
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700',
                    )}
                  >
                    <span className={clsx('size-2 rounded-sm', option.swatch)} />
                    {option.label}
                    <span className="col-start-2 text-xs font-normal text-gray-400">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextInput
                  {...register('areaDescription')}
                  value={areaDescriptionValue ?? ''}
                  label="Detail"
                  placeholder="e.g. 1st floor, carport"
                  maxLength={50}
                />
              </div>
              <NumberInput
                {...register('area', { valueAsNumber: true })}
                value={areaValue ?? ''}
                label="Area"
                rightIcon={<span className="text-xs text-gray-400">sq.m.</span>}
                maxIntegerDigits={6}
              />
              <NumberInput
                {...register('year', { valueAsNumber: true })}
                value={buildingYear}
                label="Building age"
                rightIcon={<span className="text-xs text-gray-400">yrs</span>}
                maxIntegerDigits={3}
                decimalPlaces={0}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3 py-5">
            <h3 className="text-sm font-semibold text-gray-800">Replacement cost new</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
              <NumberInput
                {...register('pricePerSqMBeforeDepreciation', { valueAsNumber: true })}
                value={pricePerSqMValue ?? ''}
                label="Price per Sq.m"
                rightIcon={<span className="text-xs text-gray-400">฿/m²</span>}
                maxIntegerDigits={15}
              />
              <div className="flex flex-col items-end rounded-lg bg-gray-50 px-3 py-2 tabular-nums">
                <span className="self-start text-xs font-medium text-gray-500">Total RCN</span>
                <span className="text-lg font-semibold text-gray-900">
                  {money(toNum(areaValue) * toNum(pricePerSqMValue))}
                </span>
                <span className="text-xs text-gray-400">
                  {money(toNum(areaValue))} m² × {money(toNum(pricePerSqMValue))} ฿/m²
                </span>
              </div>
            </div>
          </section>

          <DepreciationSection
            isGross={isGross}
            buildingYear={buildingYear}
            showErrors={showErrors}
            readOnly={formReadOnly}
          />
        </form>
      </SlideOverPanel>
    </FormProvider>
  );
}

function DepreciationSection({
  isGross,
  buildingYear,
  showErrors,
  readOnly,
}: {
  isGross: boolean;
  buildingYear: number;
  showErrors: boolean;
  readOnly: boolean;
}) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'depreciationPeriods' });
  const rows: any[] = useWatch({ name: 'depreciationPeriods' }) || [];

  // Mounted for both methods, as the period table was: it keeps each period's % and ฿ current.
  useDerivedFieldArray({
    arrayName: 'depreciationPeriods',
    rules: periodRules,
    outScopeFields: { area: 'area', pricePerSqm: 'pricePerSqMBeforeDepreciation' },
  });

  const lastToYear = rows.length > 0 ? Number(rows[rows.length - 1]?.toYear) || 0 : 0;
  const canAdd =
    !readOnly &&
    !(
      buildingYear <= 0 ||
      (isGross && rows.length > 0) ||
      (rows.length > 0 && lastToYear >= buildingYear)
    );

  const addPeriod = () =>
    append({
      atYear: rows.length > 0 ? lastToYear + 1 : 1,
      toYear: buildingYear,
      depreciationPerYear: 0,
      totalDepreciationPct: 0,
      priceDepreciation: 0,
    });

  // Gross is a single period from year 1 to the building's age. The first time an age is entered,
  // start that period so the rate has somewhere to go.
  useEffect(() => {
    if (!readOnly && isGross && buildingYear > 0 && rows.length === 0) addPeriod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGross, buildingYear, rows.length, readOnly]);

  const errors = periodErrors(rows, buildingYear);
  const totalPct = rows.reduce((acc, row) => acc + toNumber(row?.totalDepreciationPct), 0);
  const totalAmount = rows.reduce((acc, row) => acc + toNumber(row?.priceDepreciation), 0);

  return (
    <section className="flex flex-col gap-3 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800">Depreciation</h3>
        <FormStringToggle
          options={[
            { name: 'Gross', label: 'Gross' },
            { name: 'Period', label: 'Period' },
          ]}
          name="depreciationMethod"
        />
      </div>
      <p className="-mt-1 text-xs text-gray-500">
        {isGross
          ? 'One rate applied to every year of the building age.'
          : 'Different rates for different age bands.'}
      </p>

      {buildingYear <= 0 && rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
          Enter the building age first — depreciation runs from year 1 to that age.
        </div>
      ) : isGross ? (
        rows.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
            <Controller
              name="depreciationPeriods.0.depreciationPerYear"
              control={control}
              render={({ field }) => (
                <NumberInput
                  {...field}
                  label="Rate per year"
                  rightIcon={<span className="text-xs text-gray-400">%/yr</span>}
                  maxIntegerDigits={3}
                />
              )}
            />
            <div className="flex flex-col items-end rounded-lg bg-gray-50 px-3 py-2 tabular-nums">
              <span className="self-start text-xs font-medium text-gray-500">
                Total depreciation
              </span>
              <span className="text-lg font-semibold text-gray-900">{totalPct.toFixed(2)}%</span>
              <span className="text-xs text-gray-400">
                Year {toNum(rows[0]?.atYear)}–{toNum(rows[0]?.toYear)} ×{' '}
                {toNum(rows[0]?.depreciationPerYear).toFixed(2)}%/yr
              </span>
            </div>
            <RowErrors errors={showErrors ? errors[0] : []} />
          </div>
        )
      ) : (
        <>
          <YearRuler rows={rows} buildingYear={buildingYear} />
          <div className="overflow-x-auto">
            <div className="min-w-[520px] text-[13px] tabular-nums">
              <div className="grid grid-cols-[80px_80px_1fr_72px_1fr_32px] gap-2 border-b border-gray-200 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <span>At Year</span>
                <span>To Year</span>
                <span className="text-right">Rate / yr</span>
                <span className="text-right">Total</span>
                <span className="text-right">Amount (฿)</span>
                <span />
              </div>
              {fields.map((field, i) => {
                const row = rows[i] ?? {};
                const rowErrors = errors[i] ?? [];
                const invalid = rowErrors.length > 0;
                return (
                  <div key={field.id} className="border-b border-gray-100 py-1.5">
                    <div className="grid grid-cols-[80px_80px_1fr_72px_1fr_32px] items-center gap-2">
                      {(['atYear', 'toYear'] as const).map(key => (
                        <Controller
                          key={key}
                          name={`depreciationPeriods.${i}.${key}`}
                          control={control}
                          render={({ field: f }) => (
                            <NumberInput
                              {...f}
                              decimalPlaces={0}
                              maxIntegerDigits={3}
                              className={clsx('text-right', invalid && 'border-red-400')}
                            />
                          )}
                        />
                      ))}
                      <Controller
                        name={`depreciationPeriods.${i}.depreciationPerYear`}
                        control={control}
                        render={({ field: f }) => (
                          <NumberInput
                            {...f}
                            maxIntegerDigits={3}
                            className="text-right"
                            rightIcon={<span className="text-xs text-gray-400">%</span>}
                          />
                        )}
                      />
                      <span className="text-right">
                        {toNum(row.totalDepreciationPct).toFixed(1)}%
                      </span>
                      <span className="text-right text-orange-700">
                        {toNum(row.priceDepreciation).toLocaleString()}
                      </span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          aria-label={`Remove period ${i + 1}`}
                          className="flex size-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Icon style="solid" name="trash" className="size-3" />
                        </button>
                      )}
                    </div>
                    {/* Shown once a save was attempted, the way the list above the table used to be. */}
                    <RowErrors errors={showErrors ? rowErrors : []} />
                  </div>
                );
              })}
              {rows.length > 0 && (
                <div className="grid grid-cols-[80px_80px_1fr_72px_1fr_32px] gap-2 py-2 font-semibold">
                  <span className="col-span-3">Total</span>
                  <span className="text-right">{totalPct.toFixed(1)}%</span>
                  <span className="text-right text-orange-700">
                    ฿{totalAmount.toLocaleString()}
                  </span>
                  <span />
                </div>
              )}
            </div>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={addPeriod}
              disabled={!canAdd}
              className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-600 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:bg-transparent disabled:hover:text-gray-600"
            >
              + Add period
              {canAdd && (
                <span className="text-gray-400">
                  {' '}
                  from year {rows.length > 0 ? lastToYear + 1 : 1}
                </span>
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function RowErrors({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div className="col-span-full mt-1 flex flex-col gap-0.5">
      {errors.map(err => (
        <p key={err} className="flex items-start gap-1.5 text-xs text-red-600">
          <Icon
            name="circle-exclamation"
            style="solid"
            className="size-3.5 shrink-0 mt-px text-red-500"
          />
          {err}
        </p>
      ))}
    </div>
  );
}

/** Years 1…age as a strip: one band per period, hatched where no period covers the year. */
function YearRuler({ rows, buildingYear }: { rows: any[]; buildingYear: number }) {
  if (buildingYear <= 0) return null;

  const segments: { from: number; to: number; rate?: number }[] = [];
  let cursor = 1;
  for (const row of rows) {
    const atYear = Math.max(Number(row?.atYear) || 0, cursor);
    const toYear = Math.min(Number(row?.toYear) || 0, buildingYear);
    if (toYear < atYear) continue;
    if (atYear > cursor) segments.push({ from: cursor, to: atYear - 1 });
    segments.push({ from: atYear, to: toYear, rate: toNum(row?.depreciationPerYear) });
    cursor = toYear + 1;
  }
  if (cursor <= buildingYear) segments.push({ from: cursor, to: buildingYear });

  const uncovered = segments.filter(s => s.rate === undefined);
  const label = (s: { from: number; to: number }) => `Y${s.from}${s.to > s.from ? `–${s.to}` : ''}`;
  let band = 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-7 gap-0.5 overflow-hidden rounded-md" aria-hidden>
        {segments.map(s => (
          <div
            key={`${s.from}-${s.to}`}
            style={{ flexGrow: s.to - s.from + 1 }}
            className={clsx(
              'flex min-w-0 basis-0 items-center truncate px-2 text-[11px] font-semibold',
              s.rate === undefined
                ? 'bg-[repeating-linear-gradient(135deg,#f3f4f6_0_6px,#e5e7eb_6px_8px)] text-gray-400'
                : band++ % 2 === 0
                  ? 'bg-orange-700 text-white'
                  : 'bg-orange-500 text-white',
            )}
          >
            {label(s)} · {s.rate === undefined ? 'none' : `${s.rate.toFixed(1)}%`}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-gray-400">
        <span>Year 1</span>
        <span>Year {buildingYear}</span>
      </div>
      {uncovered.length > 0 && rows.length > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No depreciation yet for {uncovered.map(label).join(', ')}.
        </p>
      )}
    </div>
  );
}

/** Moved verbatim from the old period table's column headers. */
export const periodRules: DerivedRule[] = [
  {
    targetKey: 'totalDepreciationPct',
    compute: ({ row }) => {
      const deprePerYear = row['depreciationPerYear'] || 0;
      const atYear = row['atYear'] || 0;
      const toYear = row['toYear'] || 0;
      return (toYear - atYear + 1) * deprePerYear;
    },
  },
  {
    targetKey: 'priceDepreciation',
    compute: ({ outScopeFields, row }) => {
      const area = outScopeFields['area'] || 0;
      const pricePerSqm = outScopeFields['pricePerSqm'] || 0;
      const deprePercent = row['totalDepreciationPct'] || 0;
      return area * pricePerSqm * (deprePercent / 100);
    },
  },
];

export default BuildingDetailPopUpModal;
