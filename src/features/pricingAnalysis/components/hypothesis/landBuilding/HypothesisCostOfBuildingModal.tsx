/**
 * Modal for adding / editing a single Cost-of-Building row (FSD Figure 52).
 *
 * Fields collected from the user:
 *   description               — Building Details (text)
 *   isBuilding                — Is Building toggle (Yes/No)
 *   area                      — B01 Area (Sq.M)
 *   pricePerSqM               — B02 Price/m²
 *   year                      — B04 Building age (years, integer)
 *   annualDepreciationPercent — B05 %/yr (Gross mode)
 *   depreciationMethod        — Gross | Period
 *   depreciationPeriods       — sub-table visible in Period mode
 *
 * Live preview card shows B03, B06, B07, B08.
 *   Gross mode:  B06 = min(100, year × annualDepreciationPercent)
 *   Period mode: B06 = min(100, Σ (toYear − atYear + 1) × depreciationPerYear)
 */
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FormProvider, useFieldArray, useForm, useWatch } from 'react-hook-form';
import {
  Button,
  FormBooleanToggle,
  FormStringToggle,
  Icon,
  NumberInput,
  TextInput,
} from '@/shared/components';
import type { LandBuildingFormValues } from '../../../schemas/hypothesisForm';

// Derive the row type directly from the form schema so it stays in sync.
export type CostBuildingRow = LandBuildingFormValues['costOfBuildingItems'][number];

interface Props {
  isOpen: boolean;
  modelName: string;
  initialData?: CostBuildingRow | null;
  mode: 'add' | 'edit';
  /** When true the modal pre-selects isBuilding = true (default). Pass false for Non-Building shortcut. */
  defaultIsBuilding?: boolean;
  onClose: () => void;
  onSave: (row: CostBuildingRow) => void;
  /** Called when the user clicks Delete in edit mode. Parent calls remove(globalIdx) then closes. */
  onDelete?: () => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const toN = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ─── Derived-value preview card (reads from parent form context) ──────────────

function PreviewCard() {
  const area = useWatch({ name: 'area' }) ?? 0;
  const pricePerSqM = useWatch({ name: 'pricePerSqM' }) ?? 0;
  const year = useWatch({ name: 'year' }) ?? 0;
  const annualPct = useWatch({ name: 'annualDepreciationPercent' }) ?? 0;
  const depreciationMethod = useWatch({ name: 'depreciationMethod' }) ?? 'Gross';
  const depreciationPeriods: Array<{ atYear?: unknown; toYear?: unknown; depreciationPerYear?: unknown }> =
    useWatch({ name: 'depreciationPeriods' }) ?? [];

  /** B03 */
  const priceBeforeDepre = toN(area) * toN(pricePerSqM);

  /** B06 — method-dependent */
  const totalDeprecPct: number = (() => {
    if (depreciationMethod === 'Period' && Array.isArray(depreciationPeriods)) {
      const sum = depreciationPeriods.reduce((acc, p) => {
        const span = Math.max(toN(p.toYear) - toN(p.atYear) + 1, 0);
        return acc + span * toN(p.depreciationPerYear);
      }, 0);
      return Math.min(100, sum);
    }
    return Math.min(100, toN(year) * toN(annualPct));
  })();

  /** B07 */
  const depreciationAmt = priceBeforeDepre * totalDeprecPct / 100;
  /** B08 */
  const valueAfterDepre = priceBeforeDepre - depreciationAmt;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center">
        <div className="text-[10px] font-medium text-blue-500 uppercase tracking-wide">
          Before
        </div>
        <div className="text-sm font-semibold text-blue-700">
          ฿{priceBeforeDepre.toLocaleString()}
        </div>
      </div>

      <Icon style="solid" name="arrow-right" className="size-3.5 text-gray-300 shrink-0" />

      <div className="flex-1 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-center">
        <div className="text-[10px] font-medium text-orange-500 uppercase tracking-wide flex items-center justify-center gap-1">
          Depr.
          <span className="inline-flex items-center px-1 py-px rounded bg-orange-200 text-orange-700 text-[9px] font-semibold">
            {totalDeprecPct.toFixed(1)}%
          </span>
        </div>
        <div className="text-sm font-semibold text-orange-700">
          -฿{depreciationAmt.toLocaleString()}
        </div>
      </div>

      <Icon style="solid" name="arrow-right" className="size-3.5 text-gray-300 shrink-0" />

      <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
        <div className="text-[10px] font-medium text-green-500 uppercase tracking-wide">
          After
        </div>
        <div className="text-sm font-semibold text-green-700">
          ฿{valueAfterDepre.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const buildEmptyDefaults = (modelName: string, isBuilding: boolean): CostBuildingRow => ({
  id: null,
  description: '',
  amount: 0,
  rateAmount: null,
  quantity: null,
  ratePercent: null,
  area: null,
  pricePerSqM: null,
  year: null,
  annualDepreciationPercent: null,
  priceBeforeDepreciation: null,
  totalDepreciationPercent: null,
  depreciationAmount: null,
  valueAfterDepreciation: null,
  isBuilding,
  depreciationMethod: 'Gross',
  depreciationPeriods: [],
  category: 'CostOfBuilding',
  kind: 'BuildingConstruction',
  modelName,
  displaySequence: 0,
});

export function HypothesisCostOfBuildingModal({
  isOpen,
  modelName,
  initialData,
  mode,
  defaultIsBuilding = true,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const methods = useForm<CostBuildingRow>({
    defaultValues: initialData ?? buildEmptyDefaults(modelName, defaultIsBuilding),
  });

  const { register, handleSubmit, reset, watch, setValue, getValues, control } = methods;

  // Re-initialise whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      reset(initialData ?? buildEmptyDefaults(modelName, defaultIsBuilding));
    }
  }, [isOpen, initialData, modelName, defaultIsBuilding, reset]);

  const areaValue = watch('area');
  const pricePerSqMValue = watch('pricePerSqM');
  const yearValue = watch('year');
  const annualPctValue = watch('annualDepreciationPercent');
  const depreciationMethod = watch('depreciationMethod');
  const isGross = depreciationMethod === 'Gross';

  // Field array for depreciation periods — lives inside the modal's own form
  const { fields: periodFields, append: appendPeriod, remove: removePeriod } = useFieldArray({
    control,
    name: 'depreciationPeriods',
  });

  const watchedPeriods: Array<{ atYear?: number | null; toYear?: number | null; depreciationPerYear?: number | null }> =
    watch('depreciationPeriods') ?? [];

  // Footer stats for period sub-table
  const periodTotalYears = watchedPeriods.reduce(
    (acc, p) => acc + Math.max(toN(p.toYear) - toN(p.atYear) + 1, 0),
    0,
  );
  const periodWeightedSum = watchedPeriods.reduce((acc, p) => {
    const span = Math.max(toN(p.toYear) - toN(p.atYear) + 1, 0);
    return acc + span * toN(p.depreciationPerYear);
  }, 0);
  const periodAvgPct = periodTotalYears > 0 ? periodWeightedSum / periodTotalYears : 0;
  const periodTotalDeprecPct = Math.min(100, periodWeightedSum);

  // When switching TO Gross: clear the periods array entirely (Gross hides the sub-table)
  useEffect(() => {
    if (!isOpen || !isGross) return;
    const currentRows = getValues('depreciationPeriods') ?? [];
    if (currentRows.length > 0) {
      setValue('depreciationPeriods', []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGross, isOpen]);

  // When switching TO Period from an empty list: seed one default row
  const prevMethodRef = useRef<string>('Gross');
  useEffect(() => {
    if (!isOpen) return;
    if (prevMethodRef.current === 'Gross' && depreciationMethod === 'Period') {
      const currentRows = getValues('depreciationPeriods') ?? [];
      if (currentRows.length === 0) {
        const seedYear = toN(getValues('year')) || 1;
        setValue('depreciationPeriods', [{ atYear: 1, toYear: seedYear, depreciationPerYear: 0 }]);
      }
    }
    prevMethodRef.current = depreciationMethod ?? 'Gross';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depreciationMethod, isOpen]);

  const onSubmit = useCallback(
    (data: CostBuildingRow) => {
      onSave(data);
    },
    [onSave],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    },
    [handleSubmit, onSubmit],
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="flex flex-col w-full max-w-3xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">
              {mode === 'add' ? 'Add Building Row' : 'Edit Building Row'}
            </h2>
            <span className="inline-flex px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold">
              {modelName}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icon style="solid" name="xmark" className="size-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <FormProvider {...methods}>
          <form
            onSubmit={e => {
              e.stopPropagation();
              handleSubmit(onSubmit)(e);
            }}
            onKeyDown={handleKeyDown}
          >
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Description + Is Building toggle */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <TextInput
                    {...register('description', { required: 'Description is required' })}
                    label="Building Details"
                    placeholder="e.g. Main Structure, Roof, etc."
                    maxLength={200}
                  />
                </div>
                <div>
                  <FormBooleanToggle
                    label="Is Building"
                    options={['No', 'Yes']}
                    name="isBuilding"
                  />
                </div>
              </div>

              {/* Area + Price/m² */}
              <div className="grid grid-cols-2 gap-4">
                <NumberInput
                  {...register('area', { valueAsNumber: true })}
                  value={areaValue ?? ''}
                  label="Area (Sq.M)"
                  rightIcon={<span className="text-xs text-gray-400">m²</span>}
                  maxIntegerDigits={8}
                  decimalPlaces={2}
                />
                <NumberInput
                  {...register('pricePerSqM', { valueAsNumber: true })}
                  value={pricePerSqMValue ?? ''}
                  label="Price/m²"
                  rightIcon={<span className="text-xs text-gray-400">฿</span>}
                  maxIntegerDigits={10}
                  decimalPlaces={2}
                />
              </div>

              {/* Depreciation section */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                {/* Depreciation method toggle */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Depreciation</span>
                  <FormStringToggle
                    options={[
                      { name: 'Gross', label: 'Gross' },
                      { name: 'Period', label: 'Period' },
                    ]}
                    name="depreciationMethod"
                  />
                </div>

                {/* Gross mode: year + %/yr inputs */}
                {isGross && (
                  <div className="grid grid-cols-2 gap-4">
                    <NumberInput
                      {...register('year', { valueAsNumber: true })}
                      value={yearValue ?? ''}
                      label="Year"
                      rightIcon={<span className="text-xs text-gray-400">yrs</span>}
                      maxIntegerDigits={3}
                      decimalPlaces={0}
                    />
                    <NumberInput
                      {...register('annualDepreciationPercent', { valueAsNumber: true })}
                      value={annualPctValue ?? ''}
                      label="%/yr"
                      rightIcon={<span className="text-xs text-gray-400">%</span>}
                      maxIntegerDigits={3}
                      decimalPlaces={2}
                    />
                  </div>
                )}

                {/* Period mode: year input (reference) + period sub-table */}
                {!isGross && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <NumberInput
                        {...register('year', { valueAsNumber: true })}
                        value={yearValue ?? ''}
                        label="Building Year (ref)"
                        rightIcon={<span className="text-xs text-gray-400">yrs</span>}
                        maxIntegerDigits={3}
                        decimalPlaces={0}
                      />
                    </div>

                    {/* Add Period button above the table */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Periods</span>
                      <button
                        type="button"
                        onClick={() =>
                          appendPeriod({
                            atYear: 1,
                            toYear: toN(yearValue) || 1,
                            depreciationPerYear: 0,
                          })
                        }
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Icon name="plus" className="size-3" />
                        Add Period
                      </button>
                    </div>

                    {/* Period sub-table */}
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                            <th className="px-3 py-2 text-right font-medium w-[80px]">At Year</th>
                            <th className="px-3 py-2 text-right font-medium w-[80px]">To Year</th>
                            <th className="px-3 py-2 text-right font-medium w-[120px]">
                              Depr./yr (%)
                            </th>
                            <th className="px-2 py-2 w-[36px]" />
                          </tr>
                        </thead>
                        <tbody>
                          {periodFields.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-4 text-center text-gray-400 italic"
                              >
                                No periods — click Add Period
                              </td>
                            </tr>
                          ) : (
                            periodFields.map((field, idx) => {
                              const atYearVal = watchedPeriods?.[idx]?.atYear ?? '';
                              const toYearVal = watchedPeriods?.[idx]?.toYear ?? '';
                              const depPerYearVal =
                                watchedPeriods?.[idx]?.depreciationPerYear ?? '';
                              return (
                                <tr
                                  key={field.id}
                                  className="border-b border-gray-100 last:border-b-0"
                                >
                                  <td className="px-2 py-1.5">
                                    <NumberInput
                                      {...register(
                                        `depreciationPeriods.${idx}.atYear`,
                                        { valueAsNumber: true },
                                      )}
                                      value={atYearVal}
                                      maxIntegerDigits={3}
                                      decimalPlaces={0}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <NumberInput
                                      {...register(
                                        `depreciationPeriods.${idx}.toYear`,
                                        { valueAsNumber: true },
                                      )}
                                      value={toYearVal}
                                      maxIntegerDigits={3}
                                      decimalPlaces={0}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <NumberInput
                                      {...register(
                                        `depreciationPeriods.${idx}.depreciationPerYear`,
                                        { valueAsNumber: true },
                                      )}
                                      value={depPerYearVal}
                                      maxIntegerDigits={3}
                                      decimalPlaces={2}
                                      rightIcon={
                                        <span className="text-xs text-gray-400">%</span>
                                      }
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removePeriod(idx)}
                                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <Icon name="xmark" className="size-3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {periodFields.length > 0 && (
                          <tfoot>
                            <tr className="bg-gray-50 border-t border-gray-200">
                              <td
                                colSpan={2}
                                className="px-3 py-2 text-xs text-gray-500 italic"
                              >
                                Summary
                              </td>
                              <td className="px-3 py-2 text-right">
                                <div className="text-xs font-medium text-gray-600">
                                  Avg: {periodAvgPct.toFixed(1)}%
                                </div>
                                <div className="text-xs font-semibold text-orange-600">
                                  Total: {periodTotalDeprecPct.toFixed(1)}%
                                </div>
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Live preview */}
              <PreviewCard />
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
              <div>
                {mode === 'edit' && onDelete && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={onDelete}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Icon name="trash" className="size-3.5 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {mode === 'add' ? 'Add' : 'Save'}
                  <span className="ml-1.5 text-[10px] opacity-60 hidden sm:inline">↵</span>
                </Button>
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>,
    document.body,
  );
}
