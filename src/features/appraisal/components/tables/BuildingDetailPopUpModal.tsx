import { Button, FormBooleanToggle, Icon, NumberInput, TextInput } from '@/shared/components';
import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import BuildingDetailTable, { toNumber, type FormTableHeader } from '../BuildingTable/BuildingDetailTable';
import type { ComputeCtx } from '../BuildingTable/useDerivedFieldArray';

interface BuildingDetailPopUpModalProps {
  name: string;
  index: number | undefined;
  onClose: (index: number | undefined) => void;
  outScopeFields: Record<string, any>;
}

// Computed Price Display Component
function ComputedPriceRow({ name, index }: { name: string; index: number | undefined }) {
  const area = useWatch({ name: `${name}.${index}.area` }) || 0;
  const pricePerSqm = useWatch({ name: `${name}.${index}.pricePerSqMeterBeforeDepreciation` }) || 0;
  const totalPriceAfterDepreciation = useWatch({ name: `${name}.${index}.totalPriceAfterDepreciation` }) || 0;

  const totalBefore = area * pricePerSqm;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Price Before Depreciation</label>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <span className="text-sm font-semibold text-blue-700">
            ฿{totalBefore.toLocaleString()}
          </span>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Price After Depreciation</label>
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="text-sm font-semibold text-green-700">
            ฿{totalPriceAfterDepreciation.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// Total RCN Display Component
function TotalRCNDisplay({ name, index }: { name: string; index: number | undefined }) {
  const area = useWatch({ name: `${name}.${index}.area` }) || 0;
  const pricePerSqm = useWatch({ name: `${name}.${index}.pricePerSqMeterBeforeDepreciation` }) || 0;

  const totalRCN = area * pricePerSqm;

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Total RCN (Baht)</label>
      <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2">
        <span className="text-sm font-medium text-gray-700">
          {totalRCN.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function BuildingDetailPopUpModal({ name, index, onClose, outScopeFields }: BuildingDetailPopUpModalProps) {
  const { register, setValue, getValues } = useFormContext();
  const prevMethodRef = useRef<boolean | null>(null);

  // Watch depreciation method: true = "Period" (first option), false = "Gross" (second option)
  const isGross = useWatch({ name: `${name}.${index}.depreciationMethod` }) === false;
  const buildingYear = useWatch({ name: `${name}.${index}.year` }) || 0;

  const depreciationArrayName = `${name}.${index}.buildingDepreciationMethods`;

  // When switching to Gross mode, auto-set toYear to building's year and ensure only one row
  useEffect(() => {
    if (isGross && prevMethodRef.current !== isGross) {
      const currentRows = getValues(depreciationArrayName) || [];

      if (currentRows.length === 0) {
        // Add initial row with toYear set to building year
        setValue(depreciationArrayName, [{
          fromYear: 1,
          toYear: buildingYear,
          depreciationPercentPerYear: 0,
          totalDepreciationPercent: 0,
          depreciationPrice: 0,
        }]);
      } else {
        // Update first row's toYear and keep only first row
        setValue(`${depreciationArrayName}.0.toYear`, buildingYear);
        if (currentRows.length > 1) {
          setValue(depreciationArrayName, [currentRows[0]]);
        }
      }
    }
    prevMethodRef.current = isGross;
  }, [isGross, buildingYear, depreciationArrayName, getValues, setValue]);

  // When building year changes and in Gross mode, update toYear
  useEffect(() => {
    if (isGross && buildingYear > 0) {
      setValue(`${depreciationArrayName}.0.toYear`, buildingYear);
    }
  }, [buildingYear, isGross, depreciationArrayName, setValue]);

  const handleOnClose = () => {
    onClose(undefined);
  };

  const handleOnCancel = () => {
    onClose(undefined);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="flex flex-col w-full max-w-3xl bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Building Detail</h2>
          <button
            type="button"
            onClick={handleOnCancel}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icon style="solid" name="xmark" className="size-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Row 1: Detail, Year, Area, Is Building */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-5">
              <TextInput
                {...register(`${name}.${index}.areaDescription`)}
                label="Detail"
                placeholder="Enter building description"
              />
            </div>
            <div className="col-span-2">
              <NumberInput
                {...register(`${name}.${index}.year`, {
                  valueAsNumber: true,
                })}
                label="Year"
              />
            </div>
            <div className="col-span-2">
              <NumberInput
                {...register(`${name}.${index}.area`, {
                  valueAsNumber: true,
                })}
                label="Area"
              />
            </div>
            <div className="col-span-3">
              <FormBooleanToggle
                label="Is Building"
                options={['Yes', 'No']}
                name={`${name}.${index}.isBuilding`}
              />
            </div>
          </div>

          {/* Row 2: Price per Sq.m, Total RCN */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <NumberInput
                {...register(`${name}.${index}.pricePerSqMeterBeforeDepreciation`, {
                  valueAsNumber: true,
                })}
                label="Price per Sq.m"
              />
            </div>
            <TotalRCNDisplay name={name} index={index} />
          </div>

          {/* Row 3: Computed Prices - Before/After Depreciation */}
          <ComputedPriceRow name={name} index={index} />

          {/* Depreciation Section */}
          <div className="border-t border-gray-200 pt-4">
            {/* Depreciation Toggle */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-gray-700">Depreciation</span>
              <FormBooleanToggle
                options={['Period', 'Gross']}
                name={`${name}.${index}.depreciationMethod`}
              />
            </div>

            {/* Depreciation Table */}
            <div className="flex w-full min-w-0">
              <BuildingDetailTable
                headers={propertiesTableHeader}
                name={`${name}.${index}.buildingDepreciationMethods`}
                outScopeFields={outScopeFields}
                defaultValue={{
                  fromYear: 1,
                  toYear: isGross ? buildingYear : 0,
                  depreciationPercentPerYear: 0,
                  totalDepreciationPercent: 0,
                  depreciationPrice: 0,
                }}
                disableAddRowBtn={isGross}
                readonlyFields={isGross ? ['toYear'] : []}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" type="button" onClick={handleOnCancel}>
            Cancel
          </Button>
          <Button onClick={handleOnClose} className="bg-primary-500 hover:bg-primary-600">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

const propertiesTableHeader: FormTableHeader[] = [
  {
    type: 'input-number' as const,
    name: 'fromYear',
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
    name: 'depreciationPercentPerYear',
    headerName: 'Depr. per year',
    className: 'w-[100px]',
    align: 'right' as const,
    tooltip: 'Depreciation percentage per year',
    footer: (rows: any[]) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;

      const values = rows.map((v: Record<string, any>) => toNumber(v['depreciationPercentPerYear']));
      const sum = values.reduce((prev: number, curr: number) => prev + curr, 0);
      const average = values.length > 0 ? sum / values.length : 0;
      return (
        <span className="font-medium text-gray-600 text-xs">
          Avg: {average.toFixed(1)}%
        </span>
      );
    },
  },
  {
    type: 'derived' as const,
    name: 'totalDepreciationPercent',
    headerName: 'Total Depr. %',
    align: 'right' as const,
    className: 'w-[110px]',
    tooltip: 'Total depreciation % = (To Year - From Year) × Rate',
    isComputed: true,
    modifier: (value: string) => {
      const num = Number(value);
      return num ? `${num.toFixed(1)} %` : '0 %';
    },
    compute: ({ row }: ComputeCtx) => {
      const deprePerYear = row['depreciationPercentPerYear'] || 0;
      const fromYear = row['fromYear'] || 0;
      const toYear = row['toYear'] || 0;
      return (toYear - fromYear) * deprePerYear;
    },
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;

      const sum = rows.reduce((acc, row) => acc + toNumber(row['totalDepreciationPercent']), 0);
      return (
        <span className="font-semibold text-orange-600 text-xs">
          Total: {sum.toFixed(1)}%
        </span>
      );
    },
  },
  {
    type: 'derived' as const,
    name: 'depreciationPrice',
    headerName: 'Price Depreciation',
    align: 'right' as const,
    className: 'w-[130px]',
    tooltip: 'Depreciation amount = Price Before × (Total Depr. % / 100)',
    isComputed: true,
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : '0'),
    compute: ({ row, outScopeFields }: ComputeCtx) => {
      const area = outScopeFields['area'] || 0;
      const pricePerSqm = outScopeFields['pricePerSqm'] || 0;
      const deprePercent = row['totalDepreciationPercent'] || 0;
      return area * pricePerSqm * (deprePercent / 100);
    },
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;

      const sum = rows.reduce((acc, row) => acc + toNumber(row['depreciationPrice']), 0);
      return (
        <span className="font-semibold text-red-600 text-xs">
          Total: ฿{sum.toLocaleString()}
        </span>
      );
    },
  },
];

export default BuildingDetailPopUpModal;
