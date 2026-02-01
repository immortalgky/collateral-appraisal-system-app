import { useFieldArray, useFormContext } from 'react-hook-form';
import { getFactorDesciption } from '../domain/getFactorDescription';
import { getDesciptions } from '../features/wqs/WQSSection';
import { RHFInputCell } from './table/RHFInputCell';
import { useEffect, useMemo } from 'react';
import { Icon } from '@/shared/components';
import { useDerivedFieldArray, type DerivedRule } from '../../BuildingTable/useDerivedFieldArray';

interface QualitativeTableProps {
  saleAdjustmentGridQualitatives: Record<string, any>[];
  comparativeFactors: Record<string, any>[];
  comparativeSurveys: Record<string, any>[];
  isLoading: boolean;
}
export const QualitativeTable = ({
  saleAdjustmentGridQualitatives = [],
  comparativeFactors = [],
  comparativeSurveys = [],
  isLoading = true,
}: QualitativeTableProps) => {
  const { control, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'saleAdjustmentGridQualitatives',
  });
  useEffect(() => {
    console.log(getValues('saleAdjustmentGridQualitatives'));
  }, [fields, getValues]);

  const qualitatives = useMemo(() => {
    return structuredClone(fields);
  }, [fields.length]);

  const derivedRules: DerivedRule[] = qualitatives
    .map((f, rowIndex) => {
      return comparativeSurveys.map((s, columnIndex) => {
        return {
          targetKey: `adjustValues.${columnIndex}.factorDiffPct`,
          compute: ctx => {
            const qualitativeLevel =
              ctx.getValues(
                `saleAdjustmentGridQualitatives.${rowIndex}.qualitatives.${columnIndex}.qualitativeLevel`,
              ) ?? '';
            console.log(qualitativeLevel);
            if (qualitativeLevel === 'E') return 0;
            if (qualitativeLevel === 'I') return 5;
            if (qualitativeLevel === 'b') return -5;
            return null;
          },
        };
      });
    })
    .flat();

  useDerivedFieldArray({ arrayName: 'saleAdjustmentGridCalculations', rules: derivedRules });

  console.log(derivedRules);
  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="table table-sm min-w-max border-separate border-spacing-0">
          <thead className="sticky top-0 z-20 bg-neutral-50">
            <tr className="border-b border-gray-300">
              <th rowSpan={2}>Factors</th>
              <th colSpan={comparativeSurveys.length}>Comparative Data</th>
              <th rowSpan={2}>Collateral</th>
              <th rowSpan={2}>Action</th>
            </tr>
            <tr className="border-b border-gray-300">
              {comparativeSurveys.map((col, index) => {
                return (
                  <th key={col.id} className={'font-medium text-gray-600 px-3 py-2.5'}>
                    survey {index}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={comparativeSurveys.length + 3}>Loading</td>
              </tr>
            ) : (
              qualitatives.map((f, rowIndex) => {
                const selected = saleAdjustmentGridQualitatives[rowIndex]?.factorCode;
                const qualitativeFactors = (comparativeFactors ?? [])
                  .filter(
                    f =>
                      f.factorCode === selected ||
                      !saleAdjustmentGridQualitatives.some(q => q.factorCode === f.factorCode),
                  )
                  .map(f => ({
                    label: getDesciptions(f.factorCode) ?? '',
                    value: f.factorCode,
                  }));
                const fieldName = `saleAdjustmentGridQualitatives.${rowIndex}.factorCode`;
                return (
                  <tr key={f.id}>
                    <td className={'font-medium text-gray-600 px-3 py-2.5'}>
                      <RHFInputCell
                        fieldName={fieldName}
                        inputType="select"
                        options={qualitativeFactors}
                      />
                    </td>
                    {/* <td>{getFactorDesciption(f.factorCode)}</td> */}

                    {comparativeSurveys.map((col, columnIndex) => {
                      // console.log(
                      //   `saleAdjustmentGridQualitatives.${rowIndex}.qualitatives.${columnIndex}.qualitativeLevel`,
                      // );
                      return (
                        <td key={columnIndex} className={'font-medium text-gray-600 px-3 py-2.5'}>
                          <RHFInputCell
                            fieldName={`saleAdjustmentGridQualitatives.${rowIndex}.qualitatives.${columnIndex}.qualitativeLevel`}
                            inputType="select"
                            options={[
                              { label: 'Equal', value: 'E' },
                              { label: 'Inferior', value: 'I' },
                              { label: 'Better', value: 'B' },
                            ]}
                          />
                        </td>
                      );
                    })}

                    <td>Collateral</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          remove(rowIndex);
                          console.log(getValues('saleAdjustmentGridQualitatives'));
                        }}
                        className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                        title="Delete"
                      >
                        <Icon style="solid" name="trash" className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
            <tr>
              <td>
                <button
                  type="button"
                  // onClick={() => onAppend({ factorCode: '', surveys: [] })}
                  onClick={() =>
                    append({
                      factorCode: '',
                      qualitatives: comparativeSurveys.map(() => ({ qualitativeLevel: '' })),
                    })
                  }
                  className="px-4 py-2 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                >
                  + Add More Factors
                </button>
              </td>
            </tr>
            <tr></tr>
            {qualitatives.map((f, rowIndex) => {
              return (
                <tr key={f.id}>
                  {comparativeSurveys.map((col, columnIndex) => {
                    return (
                      <td>
                        <RHFInputCell fieldName="" inputType="number" />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
