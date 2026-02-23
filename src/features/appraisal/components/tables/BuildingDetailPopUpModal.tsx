import { Button, FormBooleanToggle, FormStringToggle, Icon, NumberInput, TextInput, } from '@/shared/components';
import { useCallback, useEffect } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { createPortal } from 'react-dom';
import BuildingDetailTable, { type FormTableHeader, toNumber, } from '../BuildingTable/BuildingDetailTable';
import type { ComputeCtx } from '../BuildingTable/useDerivedFieldArray';

interface BuildingDetailPopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DepreciationDetailData) => void;
  initialData?: DepreciationDetailData | null;
  mode: 'add' | 'edit';
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

const defaultDepreciationDetail: DepreciationDetailData = {
  areaDescription: '',
  area: 0,
  isBuilding: true,
  year: 0,
  pricePerSqMBeforeDepreciation: 0,
  depreciationMethod: 'Gross',
  depreciationPeriods: [],
};

// Depreciation Flow Card Component
function DepreciationFlowCard() {
  const area = useWatch({ name: 'area' }) || 0;
  const pricePerSqm = useWatch({ name: 'pricePerSqMBeforeDepreciation' }) || 0;
  const depreciationPeriods = useWatch({ name: 'depreciationPeriods' }) || [];

  const totalBefore = area * pricePerSqm;

  const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const totalPriceDepreciation = Array.isArray(depreciationPeriods)
    ? depreciationPeriods.reduce((acc: number, p: any) => acc + toNum(p.priceDepreciation), 0)
    : 0;

  const priceAfterDepreciation = totalBefore - totalPriceDepreciation;
  const depreciationPct = totalBefore > 0 ? (totalPriceDepreciation / totalBefore) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      {/* Price Before */}
      <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center">
        <div className="text-[10px] font-medium text-blue-500 uppercase tracking-wide">Before</div>
        <div className="text-sm font-semibold text-blue-700">฿{totalBefore.toLocaleString()}</div>
      </div>

      {/* Arrow */}
      <Icon style="solid" name="arrow-right" className="size-3.5 text-gray-300 shrink-0" />

      {/* Depreciation Amount */}
      <div className="flex-1 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-center">
        <div className="text-[10px] font-medium text-orange-500 uppercase tracking-wide flex items-center justify-center gap-1">
          Depreciation
          <span className="inline-flex items-center px-1 py-px rounded bg-orange-200 text-orange-700 text-[9px] font-semibold">
            {depreciationPct.toFixed(1)}%
          </span>
        </div>
        <div className="text-sm font-semibold text-orange-700">
          -฿{totalPriceDepreciation.toLocaleString()}
        </div>
      </div>

      {/* Arrow */}
      <Icon style="solid" name="arrow-right" className="size-3.5 text-gray-300 shrink-0" />

      {/* Price After */}
      <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
        <div className="text-[10px] font-medium text-green-500 uppercase tracking-wide">After</div>
        <div className="text-sm font-semibold text-green-700">
          ฿{priceAfterDepreciation.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// Total RCN Display Component
function TotalRCNDisplay() {
  const area = useWatch({ name: 'area' }) || 0;
  const pricePerSqm = useWatch({ name: 'pricePerSqMBeforeDepreciation' }) || 0;

  const totalRCN = area * pricePerSqm;

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Total RCN (Baht)</label>
      <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2">
        <span className="text-sm font-medium text-gray-700">{totalRCN.toLocaleString()}</span>
      </div>
    </div>
  );
}

function BuildingDetailPopUpModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode,
}: BuildingDetailPopUpModalProps) {
  const methods = useForm<DepreciationDetailData>({
    defaultValues: initialData || defaultDepreciationDetail,
  });

  const { register, handleSubmit, reset, watch, setValue, getValues } = methods;

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      reset(initialData || defaultDepreciationDetail);
    }
  }, [isOpen, initialData, reset]);

  const isGross = watch('depreciationMethod') === 'Gross';
  const buildingYear = watch('year') || 0;
  const areaValue = watch('area');
  const pricePerSqMValue = watch('pricePerSqMBeforeDepreciation');
  const depreciationPeriods = watch('depreciationPeriods') || [];

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

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="flex flex-col w-full max-w-3xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'add' ? 'Add Building Detail' : 'Edit Building Detail'}
          </h2>
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
              {/* Building Information Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-1">
                  Building Information
                </h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-5">
                    <TextInput
                      {...register('areaDescription')}
                      label="Detail"
                      placeholder="Enter building description"
                    />
                  </div>
                  <div className="col-span-2">
                    <NumberInput
                      {...register('year', {
                        valueAsNumber: true,
                      })}
                      value={buildingYear}
                      label="Year"
                      rightIcon={<span className="text-xs text-gray-400">yrs</span>}
                    />
                  </div>
                  <div className="col-span-2">
                    <NumberInput
                      {...register('area', {
                        valueAsNumber: true,
                      })}
                      value={areaValue ?? ''}
                      label="Area"
                      rightIcon={<span className="text-xs text-gray-400">sq.m.</span>}
                    />
                  </div>
                  <div className="col-span-3">
                    <FormBooleanToggle
                      label="Is Building"
                      options={['Yes', 'No']}
                      name="isBuilding"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-1">
                  Pricing
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <NumberInput
                      {...register('pricePerSqMBeforeDepreciation', {
                        valueAsNumber: true,
                      })}
                      value={pricePerSqMValue ?? ''}
                      label="Price per Sq.m"
                      rightIcon={<span className="text-xs text-gray-400">฿/m²</span>}
                    />
                  </div>
                  <TotalRCNDisplay />
                </div>
              </div>

              {/* Depreciation Summary Flow */}
              <DepreciationFlowCard />

              {/* Depreciation Section */}
              <div className="border-t border-gray-200 pt-4">
                {/* Depreciation Toggle */}
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm font-medium text-gray-700">Depreciation</span>
                  <FormStringToggle
                    options={[
                      { name: 'Gross', label: 'Gross' },
                      { name: 'Period', label: 'Period' },
                    ]}
                    name="depreciationMethod"
                  />
                </div>

                {/* Depreciation Table */}
                <div className="flex w-full min-w-0">
                  <BuildingDetailTable
                    headers={propertiesTableHeader}
                    name="depreciationPeriods"
                    outScopeFields={{
                      area: 'area',
                      pricePerSqm: 'pricePerSqMBeforeDepreciation',
                    }}
                    defaultValue={{
                      atYear: 1,
                      toYear: isGross ? buildingYear : 0,
                      depreciationPerYear: 0,
                      totalDepreciationPct: 0,
                      priceDepreciation: 0,
                    }}
                    disableAddRowBtn={isGross && depreciationPeriods.length > 0}
                    readonlyFields={isGross ? ['toYear'] : []}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary-500 hover:bg-primary-600">
                {mode === 'add' ? 'Add' : 'Save'}
                <span className="ml-1.5 text-[10px] opacity-60 hidden sm:inline">↵</span>
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>,
    document.body,
  );
}

const propertiesTableHeader: FormTableHeader[] = [
  {
    type: 'input-number' as const,
    name: 'atYear',
    headerName: 'At Year',
    className: 'w-[80px]',
    align: 'right' as const,
    tooltip: 'Starting year for this depreciation period',
  },
  {
    type: 'input-number' as const,
    name: 'toYear',
    headerName: 'To Year',
    className: 'w-[80px]',
    align: 'right' as const,
    tooltip: 'Ending year for this depreciation period',
  },
  {
    type: 'input-number' as const,
    name: 'depreciationPerYear',
    headerName: 'Depr. per year',
    className: 'w-[100px]',
    align: 'right' as const,
    tooltip: 'Depreciation percentage per year',
    footer: (rows: any[]) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;

      const toNum = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const totalYears = rows.reduce((acc: number, v: Record<string, any>) => {
        const atYear = toNum(v['atYear']);
        const toYear = toNum(v['toYear']);
        return acc + Math.max(toYear - atYear + 1, 0);
      }, 0);

      if (totalYears === 0) return null;

      const weightedSum = rows.reduce((acc: number, v: Record<string, any>) => {
        const atYear = toNum(v['atYear']);
        const toYear = toNum(v['toYear']);
        const yearSpan = Math.max(toYear - atYear + 1, 0);
        return acc + toNum(v['depreciationPerYear']) * yearSpan;
      }, 0);

      const average = weightedSum / totalYears;

      return <span className="font-medium text-gray-600 text-xs">Avg: {average.toFixed(1)}%</span>;
    },
  },
  {
    type: 'derived' as const,
    name: 'totalDepreciationPct',
    headerName: 'Total Depr. %',
    align: 'right' as const,
    className: 'w-[110px]',
    tooltip: 'Total depreciation % = (To Year - At Year + 1) × Rate',
    isComputed: true,
    modifier: (value: string) => {
      const num = Number(value);
      return num ? `${num.toFixed(1)} %` : '0 %';
    },
    compute: ({ row }: ComputeCtx) => {
      const deprePerYear = row['depreciationPerYear'] || 0;
      const atYear = row['atYear'] || 0;
      const toYear = row['toYear'] || 0;
      return (toYear - atYear + 1) * deprePerYear;
    },
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;

      const sum = rows.reduce((acc, row) => acc + toNumber(row['totalDepreciationPct']), 0);
      return (
        <span className="font-semibold text-orange-600 text-xs">Total: {sum.toFixed(1)}%</span>
      );
    },
  },
  {
    type: 'derived' as const,
    name: 'priceDepreciation',
    headerName: 'Price Depreciation',
    align: 'right' as const,
    className: 'w-[130px]',
    tooltip: 'Depreciation amount = Price Before × (Total Depr. % / 100)',
    isComputed: true,
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : '0'),
    compute: ({ row, outScopeFields }: ComputeCtx) => {
      const area = outScopeFields['area'] || 0;
      const pricePerSqm = outScopeFields['pricePerSqm'] || 0;
      const deprePercent = row['totalDepreciationPct'] || 0;
      return area * pricePerSqm * (deprePercent / 100);
    },
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;

      const sum = rows.reduce((acc, row) => acc + toNumber(row['priceDepreciation']), 0);
      return (
        <span className="font-semibold text-red-600 text-xs">Total: ฿{sum.toLocaleString()}</span>
      );
    },
  },
];

export default BuildingDetailPopUpModal;
