import { useEffect, useState } from 'react';
import { FormFields } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import { useFieldArray, useFormContext, useWatch, Controller } from 'react-hook-form';
import { format, formatISO } from 'date-fns';
import type { RentalInfoFormType } from '../schemas/form';
import { rentalScheduleField, rentalGrowthPeriodField } from '../configs/fields';
import NumberInput from '@/shared/components/inputs/NumberInput';
import DatePickerInput from '@/shared/components/inputs/DatePickerInput';
import FormStringToggle from '@/shared/components/inputs/FormStringToggle';
import ConfirmDeleteButton from '@/shared/components/ConfirmDeleteButton';
import { useFormReadOnly } from '@/shared/components/form/context';
import { FieldLabels } from '../components/FieldLabels';
import SectionRow from '../components/SectionRow';
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

const RentalInfoForm = ({ namePrefix }: { namePrefix?: string }) => {
  const { t } = useTranslation('appraisal');
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

  return (
    <FieldLabels scope="rental">
      <div className="w-full max-w-full overflow-hidden">
        {/* No page heading: the section bands below name each group, and the tab already
          says "Rental Info". */}
        <div className="cas-section-grid cas-sheet grid grid-cols-5 gap-x-6 gap-y-4">
          {/* Schedule Header Fields */}
          <SectionRow
            fixedColumns
            spacedRule
            title={t('forms.rentalInfo.groups.schedule')}
            icon="calendar-days"
          >
            <FormFields fields={rentalScheduleField} namePrefix={namePrefix} />
          </SectionRow>

          {/* Growth Rate */}
          <SectionRow
            fixedColumns
            spacedRule
            title={t('forms.rentalInfo.groups.growthRate')}
            icon="chart-line"
          >
            <div className="col-span-12 space-y-4">
              {/* The toggle and the fields it governs share one grid, so they read as consecutive
                rows rather than two blocks with a gutter between them. data-field marks the
                toggle as a row of its own — label left, control right; FormFields adds that
                wrapper for config-driven fields, and this one is rendered by hand. */}
              <div className="grid grid-cols-12 gap-4">
                <div data-field={p('growthRateType')} className="col-span-12">
                  <FormStringToggle
                    name={p('growthRateType')}
                    label={t('fieldLabels.rental.growthRateType')}
                    size="sm"
                    options={[
                      { name: 'Period', label: t('forms.rentalInfo.growthFrequency') },
                      { name: 'Property', label: t('forms.rentalInfo.growthPeriod') },
                    ]}
                  />
                </div>

                {growthRateType === 'Period' && (
                  <FormFields fields={rentalGrowthPeriodField} namePrefix={namePrefix} />
                )}

                {growthRateType === 'Property' && (
                  <div className="col-span-12">
                    {/* The band holds the title, the count and the add link (hidden outside
                        `.cas-form-grid`, where the dashed button under the table, its twin, shows). */}
                    <div className="cas-labelled-table">
                      <div className="cas-table-label">
                        {t('forms.rentalInfo.groups.growthRate')}
                        <span className="cas-label-meta">
                          {t('forms.rentalInfo.growthPeriodCount', { count: growthFields.length })}
                        </span>
                        {!readOnly && (
                          <button type="button" onClick={addGrowthPeriod} className="cas-label-add">
                            + {t('forms.rentalInfo.addPeriod')}
                          </button>
                        )}
                      </div>
                      <div className="cas-table-card min-w-0 flex-1">
                        <table className="cas-form-table w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                {t('forms.rentalInfo.table.atYear')}
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                {t('forms.rentalInfo.table.toYear')}
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                {t('forms.rentalInfo.table.growthRate')}
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                {t('forms.rentalInfo.table.growthAmount')}
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                                {t('forms.rentalInfo.table.totalAmount')}
                              </th>
                              <th className="px-3 py-2 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {growthFields.map((field, idx) => (
                              <tr key={field.id} className="border-b border-gray-100">
                                <td className="px-3 py-1.5">
                                  <Controller
                                    control={control}
                                    name={p(`growthPeriodEntries.${idx}.fromYear`)}
                                    render={({ field: f, fieldState: { error } }) => (
                                      <NumberInput
                                        {...f}
                                        decimalPlaces={0}
                                        maxIntegerDigits={3}
                                        thousandSeparator={false}
                                        error={error?.message}
                                        className="!py-1.5"
                                      />
                                    )}
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <Controller
                                    control={control}
                                    name={p(`growthPeriodEntries.${idx}.toYear`)}
                                    render={({ field: f }) => (
                                      <NumberInput
                                        {...f}
                                        decimalPlaces={0}
                                        maxIntegerDigits={3}
                                        thousandSeparator={false}
                                        disabled
                                        className="!py-1.5"
                                      />
                                    )}
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <Controller
                                    control={control}
                                    name={p(`growthPeriodEntries.${idx}.growthRate`)}
                                    render={({ field: f }) => (
                                      <NumberInput
                                        {...f}
                                        decimalPlaces={2}
                                        maxIntegerDigits={3}
                                        rightIcon={<span className="text-xs">%</span>}
                                        className="!py-1.5"
                                        onChange={e => {
                                          f.onChange(e);
                                          handleGrowthRateChange(idx, e.target.value ?? 0);
                                        }}
                                      />
                                    )}
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <Controller
                                    control={control}
                                    name={p(`growthPeriodEntries.${idx}.growthAmount`)}
                                    render={({ field: f }) => (
                                      <NumberInput
                                        {...f}
                                        decimalPlaces={2}
                                        maxIntegerDigits={15}
                                        className="!py-1.5"
                                        onChange={e => {
                                          f.onChange(e);
                                          handleGrowthAmountChange(idx, e.target.value ?? 0);
                                        }}
                                      />
                                    )}
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <Controller
                                    control={control}
                                    name={p(`growthPeriodEntries.${idx}.totalAmount`)}
                                    render={({ field: f }) => (
                                      <NumberInput
                                        {...f}
                                        decimalPlaces={2}
                                        disabled
                                        className="!py-1.5"
                                      />
                                    )}
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <ConfirmDeleteButton
                                    onConfirm={() => removeGrowth(idx)}
                                    rowNumber={idx + 1}
                                    readOnly={readOnly}
                                    className="cas-row-btn text-red-500 hover:text-red-700"
                                  >
                                    <Icon style="solid" name="xmark" className="size-4" />
                                  </ConfirmDeleteButton>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Twin of the band's add link, for outside `.cas-form-grid`. */}
                    {!readOnly && (
                      <div className="cas-outside-form-only">
                        <button
                          type="button"
                          onClick={addGrowthPeriod}
                          className="mt-2 mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
                        >
                          <Icon style="solid" name="plus" className="size-3" />
                          {t('forms.rentalInfo.addPeriod')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </SectionRow>

          {/* Up Front Entries */}
          <SectionRow
            fixedColumns
            spacedRule
            title={t('forms.rentalInfo.groups.upFront')}
            icon="money-bill"
          >
            <div className="col-span-12">
              {/* The band holds the title, the count and the add link (hidden outside
                  `.cas-form-grid`, where the dashed button under the table, its twin, shows). */}
              <div className="cas-labelled-table">
                <div className="cas-table-label">
                  {t('forms.rentalInfo.groups.upFront')}
                  <span className="cas-label-meta">
                    {t('forms.rentalInfo.upFrontCount', { count: upFrontFields.length })}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => appendUpFront({ atYear: '', upFrontAmount: 0 })}
                      className="cas-label-add"
                    >
                      + {t('forms.rentalInfo.addUpFront')}
                    </button>
                  )}
                </div>
                <div className="cas-table-card min-w-0 flex-1">
                  <table className="cas-form-table w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                          {t('forms.rentalInfo.table.atDate')}
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                          {t('forms.rentalInfo.table.upFrontAmount')}
                        </th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {upFrontFields.map((field, idx) => (
                        <tr key={field.id} className="border-b border-gray-100">
                          <td className="px-3 py-1.5">
                            <Controller
                              control={control}
                              name={p(`upFrontEntries.${idx}.atYear`)}
                              render={({ field: f }) => (
                                <DatePickerInput
                                  value={typeof f.value === 'string' ? f.value : null}
                                  onChange={val => f.onChange(val ?? '')}
                                  onBlur={f.onBlur}
                                  name={f.name}
                                />
                              )}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <Controller
                              control={control}
                              name={p(`upFrontEntries.${idx}.upFrontAmount`)}
                              render={({ field: f }) => (
                                <NumberInput
                                  {...f}
                                  decimalPlaces={2}
                                  maxIntegerDigits={15}
                                  className="!py-1.5"
                                />
                              )}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <ConfirmDeleteButton
                              onConfirm={() => removeUpFront(idx)}
                              rowNumber={idx + 1}
                              readOnly={readOnly}
                              className="cas-row-btn text-red-500 hover:text-red-700"
                            >
                              <Icon style="solid" name="xmark" className="size-4" />
                            </ConfirmDeleteButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {upFrontFields.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-gray-200 bg-gray-50">
                          <td className="px-3 py-2 text-sm font-semibold">
                            {t('forms.rentalInfo.table.total')}
                          </td>
                          <td className="px-3 py-2 text-sm font-semibold text-right">
                            {fmtNumber(upFrontTotal)}
                          </td>
                          <td className="px-3 py-2 w-10"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
              {upFrontFields.length > 0 &&
                upFrontTotalInput > 0 &&
                Math.abs(upFrontTotal - upFrontTotalInput) > 0.01 && (
                  <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
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
                <div className="mt-2 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  <Icon style="solid" name="circle-exclamation" className="size-4 shrink-0" />
                  <span>{rentalErrors.upFrontEntries.message}</span>
                </div>
              )}
              {/* Twin of the band's add link, for outside `.cas-form-grid`. */}
              {!readOnly && (
                <div className="cas-outside-form-only">
                  <button
                    type="button"
                    onClick={() => appendUpFront({ atYear: '', upFrontAmount: 0 })}
                    className="mt-2 mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
                  >
                    <Icon style="solid" name="plus" className="size-3" />
                    {t('forms.rentalInfo.addUpFront')}
                  </button>
                </div>
              )}
            </div>
          </SectionRow>

          {/* Rental Schedule */}
          <SectionRow
            fixedColumns
            spacedRule
            title={t('forms.rentalInfo.groups.rentalSchedule')}
            icon="table"
            isLast
          >
            <div className="col-span-12">
              {/* The band holds the title, the year count and the actions (hidden outside
                  `.cas-form-grid`, where the solid button below, its twin, shows). The header row is
                  always there; an empty schedule is one muted row. */}
              <div className="cas-labelled-table">
                <div className="cas-table-label">
                  {t('forms.rentalInfo.groups.rentalSchedule')}
                  <span className="cas-label-meta">
                    {t('forms.rentalInfo.scheduleYears', { count: scheduleFields.length })}
                  </span>
                  {!readOnly && scheduleFields.length > 0 && (
                    // Pressed = editing: amber, like the Data Correction rail's amber badges. `!` because
                    // the skin's own `.cas-label-add` colour is unlayered and would beat a plain utility.
                    <button
                      type="button"
                      onClick={() => setIsScheduleEditing(!isScheduleEditing)}
                      aria-pressed={isScheduleEditing}
                      className="cas-label-add aria-pressed:!text-[color:var(--dc-warn)]"
                    >
                      {isScheduleEditing ? (
                        <>
                          <span aria-hidden="true">✓ </span>
                          {t('forms.rentalInfo.editing')}
                        </>
                      ) : (
                        t('forms.rentalInfo.edit')
                      )}
                    </button>
                  )}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="cas-label-add disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isGenerating
                        ? t('forms.rentalInfo.generating')
                        : t('forms.rentalInfo.generate')}
                    </button>
                  )}
                </div>
                <div className="cas-table-card min-w-0 flex-1 overflow-x-auto">
                  <table className="cas-form-table w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                          {t('forms.rentalInfo.table.year')}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                          {t('forms.rentalInfo.table.contractStart')}
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                          {t('forms.rentalInfo.table.contractEnd')}
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                          {t('forms.rentalInfo.table.upFrontPerYear')}
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                          {t('forms.rentalInfo.table.rentalFeePerYear')}
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                          {t('forms.rentalInfo.table.totalAmount')}
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                          {t('forms.rentalInfo.table.growthRatePct')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isGenerating ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            {Array.from({ length: 7 }).map((_, col) => (
                              <td key={col} className="px-3 py-2.5">
                                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : scheduleFields.length > 0 ? (
                        scheduleFields.map((field, idx) => {
                          const entry = watchedScheduleEntries?.[idx];
                          const upFrontVal = entry?.upFront ?? 0;
                          const feeVal = entry?.contractRentalFee ?? 0;
                          const totalVal = upFrontVal + feeVal;
                          return (
                            <tr
                              key={field.id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="px-3 py-1.5 text-gray-700 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink)]">
                                {entry?.year}
                              </td>
                              <td className="px-3 py-1.5 text-gray-700 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink)]">
                                {entry?.contractStart
                                  ? format(new Date(entry.contractStart), 'dd/MM/yyyy')
                                  : ''}
                              </td>
                              <td className="px-3 py-1.5 text-gray-700 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink)]">
                                {entry?.contractEnd
                                  ? format(new Date(entry.contractEnd), 'dd/MM/yyyy')
                                  : ''}
                              </td>
                              <td className="px-3 py-1.5">
                                {isScheduleEditing ? (
                                  <Controller
                                    control={control}
                                    name={p(`scheduleEntries.${idx}.upFront`)}
                                    render={({ field: f }) => (
                                      <NumberInput
                                        {...f}
                                        decimalPlaces={2}
                                        maxIntegerDigits={15}
                                        className="!py-1.5"
                                        onChange={e => {
                                          f.onChange(e);
                                          handleCellChange(idx, 'upFront', e.target.value ?? 0);
                                        }}
                                      />
                                    )}
                                  />
                                ) : (
                                  <span className="block text-right text-gray-700 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink)]">
                                    {fmtNumber(upFrontVal)}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-1.5">
                                {isScheduleEditing ? (
                                  <Controller
                                    control={control}
                                    name={p(`scheduleEntries.${idx}.contractRentalFee`)}
                                    render={({ field: f }) => (
                                      <NumberInput
                                        {...f}
                                        decimalPlaces={2}
                                        maxIntegerDigits={15}
                                        className="!py-1.5"
                                        onChange={e => {
                                          f.onChange(e);
                                          handleCellChange(
                                            idx,
                                            'contractRentalFee',
                                            e.target.value ?? 0,
                                          );
                                        }}
                                      />
                                    )}
                                  />
                                ) : (
                                  <span className="block text-right text-gray-700 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink)]">
                                    {fmtNumber(feeVal)}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-right font-medium text-gray-700 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink)]">
                                {fmtNumber(totalVal)}
                              </td>
                              <td className="px-3 py-1.5 text-right text-gray-700 dark:in-[.cas-form-grid]:text-[color:var(--palette-ink)]">
                                {(entry?.contractRentalFeeGrowthRatePercent ?? 0).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-3 py-2 text-center text-xs text-gray-400">
                            {t('forms.rentalInfo.scheduleEmpty')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Twin of the band's calculate action, for outside `.cas-form-grid`. */}
              {!readOnly && (
                <div className="cas-outside-form-only mt-3 flex justify-end gap-2">
                  {scheduleFields.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsScheduleEditing(!isScheduleEditing)}
                      aria-pressed={isScheduleEditing}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 aria-pressed:border-amber-300 aria-pressed:bg-amber-50 aria-pressed:text-amber-700"
                    >
                      {isScheduleEditing ? (
                        <>
                          <span aria-hidden="true">✓ </span>
                          {t('forms.rentalInfo.editing')}
                        </>
                      ) : (
                        t('forms.rentalInfo.edit')
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isGenerating && (
                      <Icon style="solid" name="spinner" className="size-3.5 animate-spin" />
                    )}
                    {isGenerating
                      ? t('forms.rentalInfo.generating')
                      : t('forms.rentalInfo.generate')}
                  </button>
                </div>
              )}
            </div>
          </SectionRow>
        </div>
      </div>
    </FieldLabels>
  );
};

export default RentalInfoForm;
