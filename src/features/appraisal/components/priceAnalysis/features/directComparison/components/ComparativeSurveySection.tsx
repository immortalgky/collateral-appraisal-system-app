import { useFieldArray, useFormContext } from 'react-hook-form';
import { getFactorDesciption } from '../../../domain/getFactorDescription';
import { getDesciptions, getPropertyValueByFactorCode } from '../../wqs/components/WQSSection';
import { RHFInputCell } from '../../../components/table/RHFInputCell';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { directComparisonPath } from '@features/appraisal/components/priceAnalysis/features/directComparison/adapters/fieldPath.ts';

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

  const { comparativeFactorsFactorCode: comparativeFactorsFactorCodePath } = directComparisonPath;

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="table table-sm min-w-max">
          <thead className="sticky top-0 z-20 bg-gray-50">
            <tr className="">
              <th
                className={clsx(
                  'bg-gray-50 sticky left-0 z-10 h-[55px] w-[350px] after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full',
                )}
              >
                Factors
              </th>
              {comparativeSurveys.map((s, columnIndex) => {
                return (
                  <th
                    key={s.id}
                    className={
                      'text-left font-medium text-gray-600 px-3 py-2.5 select-none whitespace-nowrap'
                    }
                  >
                    {s.surveyName}
                  </th>
                );
              })}
              <th
                className={clsx(
                  'text-left font-medium text-gray-600 px-3 py-2.5 w-[250px] min-w-[250px] max-w-[250px] whitespace-nowrap bg-gray-50 sticky right-[70px] z-20 ',
                  'after:absolute after:left-[-2rem] after:top-0 after:h-full after:w-4 after:bg-gradient-to-l after:from-black/5 after:to-transparent after:translate-x-full',
                )}
              >
                Collateral
              </th>
              <th className="w-[70px] max-w-[70px] min-w-[70px]"></th>
            </tr>
          </thead>
          <tbody>
            {comparativeSurveyFactors.map((f, rowIndex) => {
              const selected = comparativeSurveyFactors[rowIndex] ?? '';
              const comparativeFactors = (allFactors ?? [])
                .filter(
                  f =>
                    f.value === selected.factorCode ||
                    !comparativeSurveyFactors.some(q => q.factorCode === f.value),
                )
                .map(f => ({
                  label: f.description ?? '',
                  value: f.value,
                }));
              return (
                <tr key={f.id} className="hover:bg-gray-50 cursor-default transition-colors">
                  <td
                    className={clsx(
                      'bg-white font-medium text-gray-600 sticky left-0 z-10 h-[55px] after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full',
                    )}
                  >
                    <div className="truncate" title={getFactorDesciption(f.factorCode) ?? ''}>
                      {template?.comparativeFactors.find(t => {
                        return t.factorId === f.factorCode;
                      }) ? (
                        <RHFInputCell
                          fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                          inputType="display"
                          accessor={({ value }) => getDesciptions(value)}
                        />
                      ) : (
                        <RHFInputCell
                          fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                          inputType="select"
                          options={comparativeFactors}
                        />
                      )}
                    </div>
                  </td>
                  {comparativeSurveys.map(s => {
                    return (
                      <td key={s.id} className="px-3 py-2.5 font-light text-gray-600">
                        {
                          <RHFInputCell
                            fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                            inputType="display"
                            accessor={({ value }) =>
                              s.factors.find(f => f.id === value)?.value ?? ''
                            }
                          />
                        }
                      </td>
                    );
                  })}
                  <td
                    className={clsx(
                      'bg-white text-left font-light text-gray-600 px-3 py-2.5 w-[250px] min-w-[250px] max-w-[250px] whitespace-nowrap sticky right-[70px] z-20',
                      'after:absolute after:left-[-2rem] after:top-0 after:h-full after:w-4 after:bg-gradient-to-l after:from-black/5 after:to-transparent after:translate-x-full',
                    )}
                  >
                    <RHFInputCell
                      fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                      inputType="display"
                      accessor={({ value }) => getPropertyValueByFactorCode(value, property) ?? ''}
                    />
                  </td>
                  <td className="bg-white px-3 py-2.5 w-[70px] min-w-[70px] max-w-[70px] sticky right-0">
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
              <td className="bg-white sticky left-0 z-10 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full">
                <button
                  type="button"
                  onClick={() =>
                    appendComparativeSurveyFactors({
                      factorCode: '',
                    })
                  }
                  className="px-4 py-2 w-full border border-dashed border-primary rounded-lg cursor-pointer text-primary hover:bg-primary/10"
                >
                  + Add More Factors
                </button>
              </td>
              {comparativeSurveys.map((col, columnIndex) => {
                return <td key={col.id} className="px-3 py-2.5 text-gray-600"></td>;
              })}
              <td
                className={clsx(
                  'bg-white text-left font-medium text-gray-600 px-3 py-2.5 w-[250px] min-w-[250px] max-w-[250px] whitespace-nowrap sticky right-[70px] z-10',
                  'after:absolute after:left-[-2rem] after:top-0 after:h-full after:w-4 after:bg-gradient-to-l after:from-black/5 after:to-transparent after:translate-x-full',
                )}
              ></td>
              <td className="text-center font-medium text-gray-600 px-3 py-2.5 w-[70px] min-w-[70px] max-w-[70px] sticky right-0 z-20"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
