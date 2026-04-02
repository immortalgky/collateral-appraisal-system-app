import { useState } from 'react';
import { FormFields } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import type { RentalInfoFormType } from '../schemas/form';
import {
  rentalScheduleField,
  rentalGrowthPeriodField,
} from '../configs/fields';

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
      .filter(e => e.atYear === year)
      .reduce((sum, e) => sum + (e.upFrontAmount ?? 0), 0);

    let growthRate = 0;

    if (year > 1) {
      if (data.growthRateType === 'Period') {
        const interval = data.growthIntervalYears ?? 0;
        if (interval > 0 && (year - 1) % interval === 0) {
          growthRate = data.growthRatePercent ?? 0;
          currentFee += currentFee * growthRate / 100;
        }
      } else if (data.growthRateType === 'Property') {
        const entry = growthPeriodEntries.find(e => year >= e.fromYear && year <= e.toYear);
        if (entry) {
          growthRate = entry.growthRate;
          currentFee = entry.totalAmount;
        }
      }
    }

    rows.push({
      year,
      contractStart: contractStart.toLocaleDateString('en-GB'),
      contractEnd: contractEnd.toLocaleDateString('en-GB'),
      upFront,
      contractRentalFee: currentFee,
      totalAmount: currentFee + upFront,
      growthRatePercent: growthRate,
    });
  }

  return rows;
}

const RentalInfoForm = () => {
  const { register, control, setValue, getValues } = useFormContext<RentalInfoFormType>();
  const growthRateType = useWatch({ control, name: 'growthRateType' });
  const [computedRows, setComputedRows] = useState<ScheduleRow[]>([]);

  const {
    fields: upFrontFields,
    append: appendUpFront,
    remove: removeUpFront,
  } = useFieldArray({ control, name: 'upFrontEntries' as any });

  const {
    fields: growthFields,
    append: appendGrowth,
    remove: removeGrowth,
  } = useFieldArray({ control, name: 'growthPeriodEntries' as any });

  const {
    fields: scheduleFields,
  } = useFieldArray({ control, name: 'scheduleEntries' as any });

  const handleGenerate = () => {
    const data = getValues();
    const rows = computeSchedule(data);
    setComputedRows(rows);

    // Populate scheduleEntries form field — apply existing overrides
    const overrides = data.scheduleOverrides ?? [];
    const entries = rows.map(row => {
      const override = overrides.find(o => o.year === row.year);
      return {
        year: row.year,
        contractStart: row.contractStart,
        contractEnd: row.contractEnd,
        upFront: override?.upFront ?? row.upFront,
        contractRentalFee: override?.contractRentalFee ?? row.contractRentalFee,
        totalAmount: (override?.upFront ?? row.upFront) + (override?.contractRentalFee ?? row.contractRentalFee),
        contractRentalFeeGrowthRatePercent: row.growthRatePercent,
      };
    });
    setValue('scheduleEntries', entries, { shouldDirty: true });
  };

  const handleCellChange = (idx: number, field: 'upFront' | 'contractRentalFee', value: number) => {
    const entries = getValues('scheduleEntries') ?? [];
    const entry = entries[idx];
    if (!entry) return;

    const updatedUpFront = field === 'upFront' ? value : entry.upFront;
    const updatedFee = field === 'contractRentalFee' ? value : entry.contractRentalFee;

    setValue(`scheduleEntries.${idx}.${field}` as any, value, { shouldDirty: true });
    setValue(`scheduleEntries.${idx}.totalAmount` as any, updatedUpFront + updatedFee, { shouldDirty: true });

    // Update overrides
    const overrides = getValues('scheduleOverrides') ?? [];
    const computed = computedRows.find(r => r.year === entry.year);
    const isUpFrontOverridden = updatedUpFront !== (computed?.upFront ?? 0);
    const isFeeOverridden = updatedFee !== (computed?.contractRentalFee ?? 0);

    const filtered = overrides.filter(o => o.year !== entry.year);
    if (isUpFrontOverridden || isFeeOverridden) {
      filtered.push({
        year: entry.year,
        upFront: isUpFrontOverridden ? updatedUpFront : null,
        contractRentalFee: isFeeOverridden ? updatedFee : null,
      });
    }
    setValue('scheduleOverrides', filtered, { shouldDirty: true });
  };

  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Rental Info</h2>
      <div className="grid grid-cols-5 gap-x-6 gap-y-4">
        {/* Schedule Header Fields */}
        <SectionRow title="Schedule" icon="calendar-days">
          <FormFields fields={rentalScheduleField} />
        </SectionRow>

        {/* Growth Rate */}
        <SectionRow title="Growth Rate" icon="chart-line">
          <div className="col-span-12 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Contract Rental Fee Growth Rate</span>
              <div className="flex rounded-md overflow-hidden border border-gray-300">
                <button
                  type="button"
                  onClick={() => setValue('growthRateType', 'Property', { shouldDirty: true })}
                  className={`px-4 py-1.5 text-sm font-medium ${growthRateType === 'Property' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}
                >
                  Property
                </button>
                <button
                  type="button"
                  onClick={() => setValue('growthRateType', 'Period', { shouldDirty: true })}
                  className={`px-4 py-1.5 text-sm font-medium ${growthRateType === 'Period' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}
                >
                  Period
                </button>
              </div>
            </div>

            {growthRateType === 'Period' && (
              <div className="grid grid-cols-12 gap-4">
                <FormFields fields={rentalGrowthPeriodField} />
              </div>
            )}

            {growthRateType === 'Property' && (
              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary-700 text-white">
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">From Year</th>
                      <th className="px-3 py-2 text-left">To Year</th>
                      <th className="px-3 py-2 text-right">Growth Rate %</th>
                      <th className="px-3 py-2 text-right">Growth Amount</th>
                      <th className="px-3 py-2 text-right">Total Amount</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {growthFields.map((field, idx) => (
                      <tr key={field.id}>
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <input type="number" {...register(`growthPeriodEntries.${idx}.fromYear` as any, { valueAsNumber: true })}
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" {...register(`growthPeriodEntries.${idx}.toYear` as any, { valueAsNumber: true })}
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" {...register(`growthPeriodEntries.${idx}.growthRate` as any, { valueAsNumber: true })}
                            className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-right" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" {...register(`growthPeriodEntries.${idx}.growthAmount` as any, { valueAsNumber: true })}
                            className="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-right" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" {...register(`growthPeriodEntries.${idx}.totalAmount` as any, { valueAsNumber: true })}
                            className="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-right" />
                        </td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => removeGrowth(idx)} className="text-red-500 hover:text-red-700">
                            <Icon style="solid" name="xmark" className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button"
                  onClick={() => appendGrowth({ fromYear: 0, toYear: 0, growthRate: 0, growthAmount: 0, totalAmount: 0 })}
                  className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
                  <Icon style="solid" name="plus" className="size-3" /> Add Period
                </button>
              </div>
            )}
          </div>
        </SectionRow>

        {/* Up Front Entries */}
        <SectionRow title="Up Front" icon="money-bill">
          <div className="col-span-12">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-700 text-white">
                  <th className="px-3 py-2 text-left">At Year</th>
                  <th className="px-3 py-2 text-right">Up Front Amount</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upFrontFields.map((field, idx) => (
                  <tr key={field.id}>
                    <td className="px-3 py-2">
                      <input type="number" {...register(`upFrontEntries.${idx}.atYear` as any, { valueAsNumber: true })}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" {...register(`upFrontEntries.${idx}.upFrontAmount` as any, { valueAsNumber: true })}
                        className="w-36 rounded border border-gray-300 px-2 py-1 text-sm text-right" />
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeUpFront(idx)} className="text-red-500 hover:text-red-700">
                        <Icon style="solid" name="xmark" className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button"
              onClick={() => appendUpFront({ atYear: 0, upFrontAmount: 0 })}
              className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
              <Icon style="solid" name="plus" className="size-3" /> Add
            </button>
          </div>
        </SectionRow>

        {/* Rental Schedule */}
        <SectionRow title="Rental Schedule" icon="table" isLast>
          <div className="col-span-12">
            <div className="flex justify-end mb-3">
              <button type="button" onClick={handleGenerate}
                className="px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700">
                GENERATE
              </button>
            </div>
            {scheduleFields.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary-700 text-white">
                      <th className="px-3 py-2 text-left">Year</th>
                      <th className="px-3 py-2 text-left">Contract Start</th>
                      <th className="px-3 py-2 text-left">Contract End</th>
                      <th className="px-3 py-2 text-right">Up Front (Lum)</th>
                      <th className="px-3 py-2 text-right">Contract Rental Fee</th>
                      <th className="px-3 py-2 text-right">Total Amount</th>
                      <th className="px-3 py-2 text-right">Growth Rate %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scheduleFields.map((field, idx) => {
                      const entry = getValues(`scheduleEntries.${idx}` as any);
                      return (
                        <tr key={field.id}>
                          <td className="px-3 py-2">{entry?.year}</td>
                          <td className="px-3 py-2">{entry?.contractStart}</td>
                          <td className="px-3 py-2">{entry?.contractEnd}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              {...register(`scheduleEntries.${idx}.upFront` as any, { valueAsNumber: true })}
                              onChange={(e) => handleCellChange(idx, 'upFront', parseFloat(e.target.value) || 0)}
                              className="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              {...register(`scheduleEntries.${idx}.contractRentalFee` as any, { valueAsNumber: true })}
                              onChange={(e) => handleCellChange(idx, 'contractRentalFee', parseFloat(e.target.value) || 0)}
                              className="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">{(entry?.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right">{(entry?.contractRentalFeeGrowthRatePercent ?? 0).toFixed(2)}</td>
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
