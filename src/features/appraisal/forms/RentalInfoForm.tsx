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

interface SectionRowProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  isLast?: boolean;
}

const SectionRow = ({ title, icon, children, isLast = false }: SectionRowProps) => (
  <>
    <div className="col-span-1 pt-1">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
    </div>
    <div className="col-span-4">
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </div>
    {!isLast && <div className="h-px bg-gray-200 col-span-5 my-2" />}
  </>
);

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

  // Auto-calculate toYear, growthAmount, and totalAmount for growth period entries
  useEffect(() => {
    if (!watchedGrowthEntries?.length) return;
    watchedGrowthEntries.forEach((entry: any, idx: number) => {
      const nextEntry = watchedGrowthEntries[idx + 1];
      const expectedToYear = nextEntry?.fromYear ? nextEntry.fromYear - 1 : numberOfYears;
      if (entry?.toYear !== expectedToYear && expectedToYear > 0) {
        setValue(p(`growthPeriodEntries.${idx}.toYear`), expectedToYear, { shouldDirty: true });
      }
      const prevTotal =
        idx === 0
          ? contractRentalFeePerYear
          : (watchedGrowthEntries[idx - 1]?.totalAmount ?? contractRentalFeePerYear);

      const rate = entry?.growthRate ?? 0;
      // Only auto-calc growthAmount from rate when rate is non-zero
      if (rate !== 0) {
        const expectedAmount = Math.round((rate / 100) * prevTotal * 100) / 100;
        if (entry?.growthAmount !== expectedAmount) {
          setValue(p(`growthPeriodEntries.${idx}.growthAmount`), expectedAmount, {
            shouldDirty: true,
          });
        }
      }
      // Always: totalAmount = prevTotal + growthAmount
      const currentAmount = entry?.growthAmount ?? 0;
      const expectedTotal = Math.round((prevTotal + currentAmount) * 100) / 100;
      if (entry?.totalAmount !== expectedTotal) {
        setValue(p(`growthPeriodEntries.${idx}.totalAmount`), expectedTotal, { shouldDirty: true });
      }
    });
  }, [
    watchedGrowthEntries
      ?.map((e: any) => `${e?.fromYear}-${e?.growthRate}-${e?.growthAmount}-${e?.totalAmount}`)
      .join(','),
    numberOfYears,
    contractRentalFeePerYear,
  ]);

  const handleGrowthAmountChange = (idx: number, amount: number) => {
    const prevTotal =
      idx === 0
        ? contractRentalFeePerYear
        : (watchedGrowthEntries?.[idx - 1]?.totalAmount ?? contractRentalFeePerYear);
    const total = Math.round((prevTotal + amount) * 100) / 100;
    setValue(p(`growthPeriodEntries.${idx}.totalAmount`), total, { shouldDirty: true });
  };

  const upFrontTotal = (watchedUpFrontEntries ?? []).reduce(
    (sum: number, e: any) => sum + (e?.upFrontAmount ?? 0),
    0,
  );
  const [computedRows, setComputedRows] = useState<ScheduleRow[]>([]);
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
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Rental Info</h2>
      <div className="grid grid-cols-5 gap-x-6 gap-y-4">
        {/* Schedule Header Fields */}
        <SectionRow title="Schedule" icon="calendar-days">
          <FormFields fields={rentalScheduleField} namePrefix={namePrefix} />
        </SectionRow>

        {/* Growth Rate */}
        <SectionRow title="Growth Rate" icon="chart-line">
          <div className="col-span-12 space-y-4">
            <FormStringToggle
              name={p('growthRateType')}
              label="Contract Rental Fee Growth Rate"
              size="sm"
              options={[
                { name: 'Period', label: 'Frequency' },
                { name: 'Property', label: 'Period' },
              ]}
            />

            {growthRateType === 'Period' && (
              <div className="grid grid-cols-12 gap-4">
                <FormFields fields={rentalGrowthPeriodField} namePrefix={namePrefix} />
              </div>
            )}

            {growthRateType === 'Property' && (
              <div>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        At Year
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        To Year
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Growth Rate
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Growth Amount
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Total Amount (Baht)
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
                              <NumberInput {...f} decimalPlaces={2} disabled className="!py-1.5" />
                            )}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <button
                            type="button"
                            onClick={() => removeGrowth(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Icon style="solid" name="xmark" className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={() =>
                    appendGrowth({
                      fromYear: 0,
                      toYear: 0,
                      growthRate: 0,
                      growthAmount: 0,
                      totalAmount: 0,
                    })
                  }
                  className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Icon style="solid" name="plus" className="size-3" /> Add Period
                </button>
              </div>
            )}
          </div>
        </SectionRow>

        {/* Up Front Entries */}
        <SectionRow title="Up Front" icon="money-bill">
          <div className="col-span-12">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">At Date</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                    Up Front Amount
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
                      <button
                        type="button"
                        onClick={() => removeUpFront(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Icon style="solid" name="xmark" className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {upFrontFields.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-3 py-2 text-sm font-semibold text-gray-700">Total</td>
                    <td className="px-3 py-2 text-sm font-semibold text-right text-gray-700">
                      {fmtNumber(upFrontTotal)}
                    </td>
                    <td className="px-3 py-2 w-10"></td>
                  </tr>
                </tfoot>
              )}
            </table>
            {upFrontFields.length > 0 &&
              upFrontTotalInput > 0 &&
              Math.abs(upFrontTotal - upFrontTotalInput) > 0.01 && (
                <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                  <Icon style="solid" name="triangle-exclamation" className="size-4 shrink-0" />
                  <span>
                    Total up front entries ({fmtNumber(upFrontTotal)}) does not match the Up Front
                    amount ({fmtNumber(upFrontTotalInput)})
                  </span>
                </div>
              )}
            {rentalErrors.upFrontEntries?.message && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <Icon style="solid" name="circle-exclamation" className="size-4 shrink-0" />
                <span>{rentalErrors.upFrontEntries.message}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => appendUpFront({ atYear: '', upFrontAmount: 0 })}
              className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
            >
              <Icon style="solid" name="plus" className="size-3" /> Add
            </button>
          </div>
        </SectionRow>

        {/* Rental Schedule */}
        <SectionRow title="Rental Schedule" icon="table" isLast>
          <div className="col-span-12">
            <div className="flex justify-end gap-2 mb-3">
              {scheduleFields.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsScheduleEditing(!isScheduleEditing)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md border ${isScheduleEditing ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  <Icon
                    style="solid"
                    name={isScheduleEditing ? 'lock-open' : 'pen'}
                    className="size-3 mr-1.5 inline-block"
                  />
                  {isScheduleEditing ? 'Editing' : 'Edit'}
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isGenerating && (
                  <Icon style="solid" name="spinner" className="size-3.5 animate-spin" />
                )}
                {isGenerating ? 'GENERATING...' : 'GENERATE'}
              </button>
            </div>
            {isGenerating ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Year
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Contract Start
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Contract End
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Up Front (Baht/Year)
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Contract Rental Fee (Baht/Year)
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Total Amount (Baht)
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Growth Rate %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        {Array.from({ length: 7 }).map((_, col) => (
                          <td key={col} className="px-3 py-2.5">
                            <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : scheduleFields.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Year
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Contract Start
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Contract End
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Up Front (Baht/Year)
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Contract Rental Fee (Baht/Year)
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Total Amount (Baht)
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Growth Rate %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleFields.map((field, idx) => {
                      const entry = watchedScheduleEntries?.[idx];
                      const upFrontVal = entry?.upFront ?? 0;
                      const feeVal = entry?.contractRentalFee ?? 0;
                      const totalVal = upFrontVal + feeVal;
                      return (
                        <tr key={field.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-gray-700">{entry?.year}</td>
                          <td className="px-3 py-1.5 text-gray-700">
                            {entry?.contractStart
                              ? format(new Date(entry.contractStart), 'dd/MM/yyyy')
                              : ''}
                          </td>
                          <td className="px-3 py-1.5 text-gray-700">
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
                              <span className="block text-right text-gray-700">
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
                              <span className="block text-right text-gray-700">
                                {fmtNumber(feeVal)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-right font-medium text-gray-700">
                            {fmtNumber(totalVal)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-700">
                            {(entry?.contractRentalFeeGrowthRatePercent ?? 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Icon style="solid" name="table" className="size-8 mx-auto mb-2 opacity-50" />
                <p>Click GENERATE to compute the rental schedule</p>
              </div>
            )}
          </div>
        </SectionRow>
      </div>
    </div>
  );
};

export default RentalInfoForm;
