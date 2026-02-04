import { useFieldArray, useFormContext } from 'react-hook-form';
import { getFactorDesciption } from '../../../domain/getFactorDescription';
import { getDesciptions, getPropertyValueByFactorCode } from '../../wqs/WQSSection';
import { saleGridFieldPath } from '../adapters/fieldPath';
import { RHFInputCell } from '../../../components/table/RHFInputCell';
import { Icon } from '@/shared/components';
import { MarketSurveySelectionModal } from '../../../components/MarketSurveySelectionModal';

interface ComparativeSurveySectionProps {
  comparativeSurveys: any;
  property: any;
  allFactors: any;
  template: any;
}
export function ComparativeSurveySection({
  comparativeSurveys,
  property,
  allFactors,
  template,
}: ComparativeSurveySectionProps) {
  const { control, getValues } = useFormContext();
  const {
    fields: comparativeSurveyFactors,
    append: appendComparativeSurveyFactors,
    remove: removeComparativeSurveyFactors,
  } = useFieldArray({
    control,
    name: 'comparativeFactors',
  });

  const { comparativeFactors: comparativeFactorsPath } = saleGridFieldPath;

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white overflow-hidden flex flex-col border border-gray-300 rounded-xl">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="table table-sm min-w-max border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="border-r border-b border-gray-300 text-center w-[200px] bg-gray-50">
                Factors
              </th>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <th
                    key={s.id}
                    className="border-r border-b border-gray-300 text-center bg-gray-50"
                  >
                    {s.id}
                  </th>
                );
              })}
              <th className="border-r border-b border-gray-300 text-center bg-gray-50">
                Collateral
              </th>
              <th className="border-b border-gray-300 text-center bg-gray-50">Action</th>
            </tr>
          </thead>
          <tbody>
            {comparativeSurveyFactors.map((f, rowIndex) => {
              const selected = f.factorCode ?? '';
              const comparativeFactors = (allFactors ?? [])
                .filter(
                  f =>
                    f.factorCode === selected ||
                    !template?.comparativeFactors.some(q => q.factorId === f.value),
                )
                .map(f => ({
                  label: f.description ?? '',
                  value: f.value,
                }));
              const fieldName = comparativeFactorsPath({ row: rowIndex });
              return (
                <tr key={f.id}>
                  <td className="border-b border-r h-[60px] border-gray-300">
                    <div
                      className="truncate max-w-[200px]"
                      title={getFactorDesciption(f.factorCode) ?? ''}
                    >
                      {template?.comparativeFactors.find(t => t.factorId === f.factorCode) ? (
                        <RHFInputCell
                          fieldName={fieldName}
                          inputType="display"
                          accessor={({ value }) => getDesciptions(value)}
                        />
                      ) : (
                        <RHFInputCell
                          fieldName={fieldName}
                          inputType="select"
                          options={comparativeFactors}
                        />
                      )}
                    </div>
                  </td>
                  {comparativeSurveys.map((s, columnIndex) => {
                    return (
                      <td key={s.id} className="border-b border-r h-[60px] border-gray-300">
                        {
                          <RHFInputCell
                            fieldName={comparativeFactorsPath({ row: rowIndex })}
                            inputType="display"
                            accessor={({ value }) =>
                              s.factors.find(f => f.id === value)?.value ?? ''
                            }
                          />
                        }
                      </td>
                    );
                  })}
                  <td className="border-b border-r h-[60px] border-gray-300">
                    {getPropertyValueByFactorCode(f.factorCode, property) ?? ''}
                  </td>
                  <td className="border-b border-r h-[60px] border-gray-300">
                    {!template?.comparativeFactors.find(t => t.factorId === f.factorCode) && (
                      <div className="flex flex-row justify-center items-center">
                        <button
                          type="button"
                          onClick={() => {
                            removeComparativeSurveyFactors(rowIndex);
                          }}
                          className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors "
                          title="Delete"
                        >
                          <Icon style="solid" name="trash" className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="border-b border-r border-gray-300">
                <button
                  type="button"
                  onClick={() =>
                    appendComparativeSurveyFactors({
                      factorCode: '',
                      qualitatives: comparativeSurveys.map(() => ({ qualitativeLevel: '' })),
                    })
                  }
                  className="px-4 py-2 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                >
                  + Add More Factors
                </button>
              </td>
              {comparativeSurveys.map((col, columnIndex) => {
                return <td key={col.id} className="border-b border-r border-gray-300"></td>;
              })}
              <td className="border-b border-r border-gray-300"></td>
              <td className="border-b border-r border-gray-300"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
