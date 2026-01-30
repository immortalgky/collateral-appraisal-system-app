import { useFieldArray, useFormContext } from 'react-hook-form';
import { getFactorDesciption } from '../domain/getFactorDescription';
import { getDesciptions } from '../features/wqs/WQSSection';
import { RHFInputCell } from './table/RHFInputCell';
import { useEffect, useMemo } from 'react';

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
                  <tr key={rowIndex}>
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
                    <td></td>
                  </tr>
                );
              })
            )}
            {/* {!isEmpty ? (
              rows.map((row, rowIndex) => (
                <tr key={row.id} className="border-b border-gray-300">
                  {columns.map(col => (
                    <td
                      key={col.id}
                      className={clsx(
                        ' whitespace-nowrap truncate text-sm border-b border-gray-300',
                        col.style?.bodyClassName ?? '',
                      )}
                    >
                      {col.renderCell({
                        row,
                        rowIndex,
                        ctx,
                      })}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr />
            )} */}
          </tbody>
        </table>
      </div>
    </div>
  );
};
