import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import clsx from 'clsx';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { RHFInputCell } from './table/RHFInputCell';
import { ScrollableTableContainer } from './ScrollableTableContainer';
import { ParameterDisplay } from '@/shared/components';
import { Skeleton } from '@/shared/components/Skeleton';
import { useEffect } from 'react';

export interface MachineryItem {
  appraisalPropertyId: string;
  quantity: number | null;
  machineName: string | null;
  registrationNo: string | null;
  manufacturer: string | null;
  conditionUse: string | null;
  yearOfManufacture: number | null;
}

export interface MachineryRowFormValue {
  id: string | null;
  appraisalPropertyId: string;
  machine: MachineryItem;
  rcn: number | null;
  lifeSpan: number | null;
  durationInUse: number;
  residualLifeSpan: number;
  conditionFactor: number | null;
  physicalDeterioration: number;
  functionalObsolescence: number | null;
  economicObsolescence: number | null;
  fmv: number;
  marketDemand: 'Y' | 'N';
  notes: string;
}

const costMachinePath = {
  rows: () => 'machineryCosts',
  rcn: (r: number) => `machineryCosts.${r}.rcn`,
  lifeSpan: (r: number) => `machineryCosts.${r}.lifeSpan`,
  durationInUse: (r: number) => `machineryCosts.${r}.durationInUse`,
  residualLifeSpan: (r: number) => `machineryCosts.${r}.residualLifeSpan`,
  conditionFactor: (r: number) => `machineryCosts.${r}.conditionFactor`,
  physicalDeterioration: (r: number) => `machineryCosts.${r}.physicalDeterioration`,
  functionalObsolescence: (r: number) => `machineryCosts.${r}.functionalObsolescence`,
  economicObsolescence: (r: number) => `machineryCosts.${r}.economicObsolescence`,
  fmv: (r: number) => `machineryCosts.${r}.fmv`,
  marketDemand: (r: number) => `machineryCosts.${r}.marketDemand`,
  notes: (r: number) => `machineryCosts.${r}.notes`,
  conditionUse: (r: number) => `machineryCosts.${r}.machine.conditionUse`,
  yearOfManufacture: (r: number) => `machineryCosts.${r}.machine.yearOfManufacture`,
};

const DISABLED_CONDITION_CODE = '03';

function useRowComputedValues(rowIndex: number) {
  const { control } = useFormContext();

  const currentYear = new Date().getFullYear() + 543; // พ.ศ.

  const conditionUse = useWatch({ name: costMachinePath.conditionUse(rowIndex) }) as string;
  const yearOfManufacture = useWatch({
    name: costMachinePath.yearOfManufacture(rowIndex),
  }) as number;
  const lifeSpan = (useWatch({ name: costMachinePath.lifeSpan(rowIndex) }) as number | null) ?? 0;
  const rcn = useWatch({ name: costMachinePath.rcn(rowIndex) }) as number | null;
  const conditionFactor =
    (useWatch({ name: costMachinePath.conditionFactor(rowIndex) }) as number | null) ?? 0;
  const functionalObsolescence = useWatch({
    name: costMachinePath.functionalObsolescence(rowIndex),
  }) as number | null;
  const economicObsolescence = useWatch({
    name: costMachinePath.economicObsolescence(rowIndex),
  }) as number | null;

  // n = currentYear - yearOfManufacture
  const durationInUse = yearOfManufacture > 0 ? currentYear - yearOfManufacture : 0;

  // R = N - n
  const diffResidualLifeSpan = (lifeSpan ?? 0) - durationInUse;
  const isResidualBelowMin = diffResidualLifeSpan < 5;
  const residualLifeSpan =
    isResidualBelowMin && conditionUse !== DISABLED_CONDITION_CODE ? 5 : diffResidualLifeSpan;

  // P = ((1 - (N - R) / N) * C)
  const physicalDeterioration =
    lifeSpan !== 0 ? (1 - (lifeSpan - residualLifeSpan) / lifeSpan) * conditionFactor : 0;

  // FMV = (RCN * P) * F * E
  const fmv =
    (rcn ?? 0) *
    physicalDeterioration *
    (functionalObsolescence ?? 0) *
    (economicObsolescence ?? 0);

  const marketDemand: 'Y' | 'N' = fmv > 0 ? 'Y' : 'N';

  const isDisabled = conditionUse === DISABLED_CONDITION_CODE;

  return {
    durationInUse,
    residualLifeSpan,
    isResidualBelowMin,
    physicalDeterioration,
    fmv,
    marketDemand,
    isDisabled,
  };
}

function MachineryRow({ rowIndex, isReadOnly }: { rowIndex: number; isReadOnly: boolean }) {
  const { getValues } = useFormContext();
  const {
    durationInUse,
    residualLifeSpan,
    isResidualBelowMin,
    physicalDeterioration,
    fmv,
    marketDemand,
    isDisabled,
  } = useRowComputedValues(rowIndex);

  const { setValue } = useFormContext();
  useEffect(() => {
    setValue(costMachinePath.fmv(rowIndex), fmv, { shouldDirty: false });
  }, [fmv, rowIndex, setValue]);

  const machine: MachineryItem = getValues(`machineryCosts.${rowIndex}.machine`) ?? {};
  const inputDisabled = isDisabled || isReadOnly;
  const tdBase = 'px-2 py-1.5 border-b border-r border-gray-300 text-xs whitespace-nowrap';

  return (
    <tr>
      <td className={clsx(tdBase, 'text-center bg-white w-10 min-w-10 max-w-10')}>
        {rowIndex + 1}
      </td>
      <td className={clsx(tdBase, 'text-center bg-white')}>{machine.quantity ?? 0}</td>
      <td className={clsx(tdBase)} title={machine.machineName ?? '-'}>
        {machine.machineName}
      </td>
      <td className={clsx(tdBase)}>{machine.registrationNo}</td>
      <td className={clsx(tdBase)}>{machine.manufacturer}</td>
      <td className={clsx(tdBase, 'text-center')}>
        <span
          className={clsx(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            isDisabled ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-700',
          )}
        >
          <ParameterDisplay group="ConditionUse" code={machine.conditionUse} />
        </span>
      </td>
      <td className={clsx(tdBase, 'text-center')}>
        {(machine.yearOfManufacture ?? 0 > 0) ? machine.yearOfManufacture : '-'}
      </td>

      {/* RCN */}
      <td className="border-b border-r border-gray-300 ">
        <RHFInputCell
          fieldName={costMachinePath.rcn(rowIndex)}
          inputType="number"
          disabled={inputDisabled}
          number={{ decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
        />
      </td>

      <td className="border-b border-r border-gray-300">
        <RHFInputCell
          fieldName={costMachinePath.lifeSpan(rowIndex)}
          inputType="number"
          disabled={inputDisabled}
          number={{ decimalPlaces: 0, maxIntegerDigits: 3, allowNegative: false }}
        />
      </td>

      <td className={clsx(tdBase, 'text-right font-medium text-gray-700')}>{durationInUse}</td>

      <td
        className={clsx(
          tdBase,
          'text-right font-medium',
          isResidualBelowMin ? 'text-red-500' : 'text-gray-700',
        )}
      >
        {residualLifeSpan}
      </td>

      <td className="border-b border-r border-gray-300">
        <RHFInputCell
          fieldName={costMachinePath.conditionFactor(rowIndex)}
          inputType="number"
          disabled={inputDisabled}
          number={{ decimalPlaces: 2, maxIntegerDigits: 1, allowNegative: false, maxValue: 1 }}
        />
      </td>

      <td className={clsx(tdBase, 'text-right font-medium text-gray-700')}>
        {physicalDeterioration.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </td>

      <td className="border-b border-r border-gray-300">
        <RHFInputCell
          fieldName={costMachinePath.functionalObsolescence(rowIndex)}
          inputType="number"
          disabled={inputDisabled}
          number={{ decimalPlaces: 2, maxIntegerDigits: 1, allowNegative: false, maxValue: 1 }}
        />
      </td>

      <td className="border-b border-r border-gray-300 ">
        <RHFInputCell
          fieldName={costMachinePath.economicObsolescence(rowIndex)}
          inputType="number"
          disabled={inputDisabled}
          number={{ decimalPlaces: 2, maxIntegerDigits: 1, allowNegative: false, maxValue: 1 }}
        />
      </td>

      <td className={clsx(tdBase, 'text-right font-semibold text-gray-800')}>
        {fmv.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </td>

      <td className={clsx(tdBase, 'text-center')}>
        <span
          className={clsx(
            'inline-flex items-center justify-center size-6 rounded-full text-xs font-bold',
            marketDemand === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500',
          )}
        >
          {marketDemand}
        </span>
      </td>

      <td className="border-b border-r border-gray-300">
        <RHFInputCell fieldName={costMachinePath.notes(rowIndex)} inputType="text" />
      </td>
    </tr>
  );
}

export function CostMachineSection({
  isLoading = false,
}: {
  machineryItems: MachineryItem[];
  isLoading?: boolean;
}) {
  const isReadOnly = usePageReadOnly();
  const { control } = useFormContext();
  const { fields } = useFieldArray({ control, name: costMachinePath.rows() });
  const allRows =
    (useWatch({ control, name: costMachinePath.rows() }) as MachineryRowFormValue[]) ?? [];

  const totalQuantity = allRows.reduce((sum, row) => sum + (row?.machine?.quantity ?? 0), 0);
  const totalRcn = allRows.reduce((sum, row) => sum + (row?.rcn ?? 0), 0);
  const totalFmv = allRows.reduce((sum, row) => sum + (row?.fmv ?? 0), 0);
  const th =
    'bg-gray-50 border-b border-r border-gray-300 text-xs font-medium text-gray-700 px-2 py-2 whitespace-nowrap';
  const thCenter = clsx(th, 'text-center');

  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300 rounded-xl overflow-hidden">
        <ScrollableTableContainer className="flex-1 min-h-0">
          <table className="table table-xs min-w-max border-separate border-spacing-0">
            <thead className="bg-neutral-50">
              <tr>
                <th rowSpan={3} className={clsx(th, 'text-center min-w-24')}>No.</th>
                <th rowSpan={3} className={clsx(th, 'text-center min-w-24')}>Quantity</th>
                <th colSpan={5} className={clsx(thCenter, 'border-b-2')}>Machinery Information</th>
                <th rowSpan={2} className={clsx(th, 'min-w-32 text-right')}>
                  RCN Replacement Cost<br />
                  <span className="font-normal text-gray-500">(Baht)</span>
                </th>
                <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                  N<br /><span className="font-normal text-xs text-gray-500">Life Span (Year(s))</span>
                </th>
                <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                  n<br /><span className="font-normal text-xs text-gray-500">Duration in Use (Year(s))</span>
                </th>
                <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                  R<br /><span className="font-normal text-gray-500">Residual Life Span (Year(s))</span>
                </th>
                <th colSpan={4} className={clsx(thCenter, 'border-b-2')}>Depreciation</th>
                <th rowSpan={3} className={clsx(th, 'text-right')}>
                  Fair Market Value<br />
                  <span className="text-xs font-normal text-gray-500">FMV (Baht)</span>
                </th>
                <th rowSpan={3} className={clsx(thCenter, 'min-w-32')}>
                  Market Demand<br />
                  <span className="text-xs font-normal text-gray-500">Available / Used</span>
                </th>
                <th rowSpan={3} className={clsx(th, 'min-w-32')}>Notes</th>
              </tr>
              <tr>
                <th rowSpan={2} className={clsx(th, 'min-w-32')}>Machinery Name</th>
                <th rowSpan={2} className={clsx(th, 'min-w-32')}>Registration No.</th>
                <th rowSpan={2} className={clsx(th, 'min-w-32')}>Country of Manufacturer</th>
                <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>Condition Use</th>
                <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>Year</th>
                <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                  C<br /><span className="font-normal text-xs text-gray-500">Condition Factor</span>
                </th>
                <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                  P<br /><span className="font-normal text-xs text-gray-500">Physical Deterioration</span>
                </th>
                <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                  F<br /><span className="font-normal text-xs text-gray-500">Functional Obsolescence</span>
                </th>
                <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                  E<br />
                  <span className="font-normal text-xs text-gray-500">Economic / External Obsolescence</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 17 }).map((_, j) => (
                    <td key={j} className="border-b border-r border-gray-300 px-2 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTableContainer>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300 rounded-xl overflow-hidden">
      <ScrollableTableContainer className="flex-1 min-h-0">
        <table className="table table-xs min-w-max border-separate border-spacing-0">
          <thead className="bg-neutral-50">
            <tr>
              <th rowSpan={3} className={clsx(th, 'text-center min-w-24')}>
                No.
              </th>
              <th rowSpan={3} className={clsx(th, 'text-center min-w-24')}>
                Quantity
              </th>
              <th colSpan={5} className={clsx(thCenter, 'border-b-2 ')}>
                Machinery Information
              </th>
              <th rowSpan={2} className={clsx(th, 'min-w-32 text-right')}>
                RCN Replacement Cost
                <br />
                <span className="font-normal text-gray-500">(Baht)</span>
              </th>
              <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                N<br />
                <span className="font-normal text-xs text-gray-500">Life Span (Year(s))</span>
              </th>
              <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                n<br />
                <span className="font-normal text-xs text-gray-500">Duration in Use (Year(s))</span>
              </th>
              <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                R<br />
                <span className="font-normal text-gray-500">Residual Life Span (Year(s))</span>
              </th>
              <th colSpan={4} className={clsx(thCenter, 'border-b-2')}>
                Depreciation
              </th>
              <th rowSpan={3} className={clsx(th, 'text-right')}>
                Fair Market Value
                <br />
                <span className="text-xs font-normal text-gray-500">FMV (Baht)</span>
              </th>
              <th rowSpan={3} className={clsx(thCenter, 'min-w-32')}>
                Market Demand
                <br />
                <span className="text-xs font-normal text-gray-500">Available / Used</span>
              </th>
              <th rowSpan={3} className={clsx(th, 'min-w-32')}>
                Notes
              </th>
            </tr>
            <tr>
              <th rowSpan={2} className={clsx(th, 'min-w-32')}>
                Machinery Name
              </th>
              <th rowSpan={2} className={clsx(th, 'min-w-32')}>
                Registration No.
              </th>
              <th rowSpan={2} className={clsx(th, 'min-w-32')}>
                Country of Manufacturer
              </th>
              <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                Condition Use
              </th>
              <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                Year
              </th>
              <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                C<br />
                <span className="font-normal text-xs text-gray-500">Condition Factor</span>
              </th>
              <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                P<br />
                <span className="font-normal text-xs text-gray-500">Physical Deterioration</span>
              </th>
              <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                F<br />
                <span className="font-normal text-xs text-gray-500">Functional Obsolescence</span>
              </th>
              <th rowSpan={2} className={clsx(thCenter, 'min-w-32')}>
                E<br />
                <span className="font-normal text-xs text-gray-500">
                  Economic / External Obsolescence
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fields.map((_field, rowIndex) => (
              <MachineryRow key={_field.id} rowIndex={rowIndex} isReadOnly={isReadOnly} />
            ))}
            {fields.length === 0 && (
              <tr>
                <td colSpan={17} className="py-10 text-center text-sm text-gray-400">
                  No data.
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={1} className={clsx(thCenter, 'min-w-32')}>
                Total
              </td>
              <td colSpan={1} className={clsx(thCenter, 'min-w-32')}>
                {totalQuantity.toLocaleString()}
              </td>
              <td colSpan={5} className={clsx(thCenter, 'min-w-32')}></td>
              <td colSpan={1} className={clsx(thCenter, 'min-w-32')}>
                {totalRcn.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </td>
              <td colSpan={7} className={clsx(thCenter, 'min-w-32')}></td>
              <td colSpan={1} className={clsx(thCenter, 'min-w-32')}>
                {totalFmv.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </td>
              <td colSpan={2} className={clsx(thCenter, 'min-w-32')}></td>
            </tr>
          </tbody>
        </table>
      </ScrollableTableContainer>
    </div>
  );
}
