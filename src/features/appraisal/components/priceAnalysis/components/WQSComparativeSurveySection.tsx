import { useFieldArray, useFormContext } from 'react-hook-form';
import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { getFactorDesciption } from '../shared/domain/getFactorDescription';
import { getPropertyValueByFactorCode } from '../shared/domain/getPropertyValueByFactorCode';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import { RHFInputCell } from './table/RHFInputCell';
import { useMemo } from 'react';
import type {
  FactorDataType,
  MarketComparableDataType,
  MarketComparableDetailType,
  TemplateDetailType,
  TemplateFactorDataType,
} from '../schemas/v1';
import type { ComparativeFactorFormType } from '../schemas/wqsForm';

interface ComparativeSurveySectionProps {
  comparativeMarketSurveys: MarketComparableDataType[];
  property: Record<string, unknown>;
  allFactors: FactorDataType[];
  template?: TemplateDetailType;
  fieldPath: Record<string, any>;
}
export function ComparativeSurveySection({
  comparativeMarketSurveys,
  property,
  allFactors,
  template,
  fieldPath,
}: ComparativeSurveySectionProps) {
  const {
    comparativeFactor: comparativeFactorPath,
    comparativeFactorsFactorCode: comparativeFactorsFactorCodePath,
  } = fieldPath;

  const { control, getValues } = useFormContext();
  const {
    fields: comparativeSurveyFactors,
    append: appendComparativeSurveyFactors,
    remove: removeComparativeSurveyFactors,
  } = useFieldArray({
    control,
    name: comparativeFactorPath(),
  });

  const comparativeFactors = useMemo(() => {
    return getValues(comparativeFactorPath()) as ComparativeFactorFormType[];
  }, [comparativeSurveyFactors]);

  const factorColumnStyle =
    'z-20 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full';
  const collateralColumnStyle =
    'text-left font-medium  px-3 py-2.5 w-[250px] min-w-[250px] max-w-[250px] whitespace-nowrap  sticky right-[70px] z-25 after:absolute after:left-[-2rem] after:top-0 after:h-full after:w-4 after:bg-gradient-to-l after:from-black/5 after:to-transparent after:translate-x-full';

  return (
    <div className="bg-white border border-gray-200 flex-1 min-h-0 min-w-0 rounded-lg b overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="table table-sm min-w-max">
          <thead className="bg-gray-50 sticky top-0">
            <tr className="">
              <th
                className={clsx('bg-gray-50 sticky left-0 h-[55px] w-[350px]', factorColumnStyle)}
              >
                Factors
              </th>
              {comparativeMarketSurveys.map((survey: MarketComparableDataType) => {
                return (
                  <th
                    key={survey.id}
                    className={'text-left font-medium  px-3 py-2.5 select-none whitespace-nowrap'}
                  >
                    {survey.surveyName}
                  </th>
                );
              })}
              <th className={clsx('bg-gray-50', collateralColumnStyle)}>Collateral</th>
              <th className="w-[70px] max-w-[70px] min-w-[70px]"></th>
            </tr>
          </thead>
          <tbody>
            {comparativeFactors.map((compFact: any, rowIndex: number) => {
              const selected = comparativeFactors[rowIndex];
              const options = (allFactors ?? [])
                .filter(
                  (f: FactorDataType) =>
                    f.factorCode === selected.factorCode ||
                    !comparativeFactors.some((q: any) => q.factorCode === f.factorCode),
                )
                .map((f: FactorDataType) => ({
                  label: f.factorName ?? '',
                  value: f.factorCode,
                }));
              return (
                <tr
                  key={compFact.factorCode ?? rowIndex}
                  className="hover:bg-gray-50 cursor-default transition-colors"
                >
                  <td
                    className={clsx(
                      'bg-white font-medium  sticky left-0 h-[55px]',
                      factorColumnStyle,
                    )}
                  >
                    <div
                      className="truncate"
                      title={getFactorDesciption(compFact.factorCode) ?? ''}
                    >
                      {template?.comparativeFactors?.find((t: TemplateFactorDataType) => {
                        return t.factorCode === compFact.factorCode;
                      }) ? (
                        <RHFInputCell
                          fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                          inputType="display"
                          accessor={({ value }) => getFactorDesciption(value.toString())}
                        />
                      ) : (
                        <RHFInputCell
                          fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                          inputType="select"
                          options={options}
                        />
                      )}
                    </div>
                  </td>
                  {comparativeMarketSurveys.map((survey: MarketComparableDetailType) => {
                    return (
                      <td key={survey.id} className="px-3 py-2.5 font-medium ">
                        {
                          <RHFInputCell
                            fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                            inputType="display"
                            accessor={({ value }) =>
                              survey.factorData?.find(
                                (factor: FactorDataType) => factor.factorCode === value,
                              )?.value ?? ''
                            }
                          />
                        }
                      </td>
                    );
                  })}
                  <td className={clsx('bg-white ', collateralColumnStyle)}>
                    <RHFInputCell
                      fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                      inputType="display"
                      accessor={({ value }) =>
                        getPropertyValueByFactorCode(value.toString(), property) ?? ''
                      }
                    />
                  </td>
                  <td className="bg-white px-3 py-2.5 w-[70px] min-w-[70px] max-w-[70px] sticky right-0">
                    {!template?.comparativeFactors?.find(
                      t => t.factorCode === compFact.factorCode,
                    ) && (
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
              <td className={clsx('bg-white sticky left-0', factorColumnStyle)}>
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
              {comparativeMarketSurveys.map((survey: any) => {
                return <td key={survey.id} className="px-3 py-2.5 "></td>;
              })}
              <td className={clsx('bg-white', collateralColumnStyle)}></td>
              <td className="text-center font-medium  px-3 py-2.5 w-[70px] min-w-[70px] max-w-[70px] sticky right-0 z-20"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
