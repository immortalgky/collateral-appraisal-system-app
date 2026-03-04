import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Icon } from '@/shared/components';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import clsx from 'clsx';
import { RHFInputCell } from './table/RHFInputCell';
import type {
  FactorDataType,
  MarketComparableDataType,
  MarketComparableDetailType,
  TemplateComparativeFactorType,
  TemplateDetailType,
} from '../schemas';
import { readFactorValue } from '../domain/readFactorValue';
import { getFactorDesciption } from '@features/pricingAnalysis/domain/getFactorDescription.ts';
import { getPropertyValueByFactorCode } from '@features/pricingAnalysis/domain/getPropertyValueByFactorCode.ts';
import { useMemo, useState } from 'react';
import type { ComparativeFactorsFormType } from '../schemas/saleAdjustmentGridForm';

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
    comparativeFactors: comparativeFactorsPath,
    comparativeFactorsFactorCode: comparativeFactorsFactorCodePath,
  } = fieldPath;

  const { control, getValues } = useFormContext();
  const {
    fields: comparativeSurveyFactors,
    append: appendComparativeSurveyFactors,
    remove: removeComparativeSurveyFactors,
  } = useFieldArray({
    control,
    name: comparativeFactorsPath(),
  });

  const watchComparativeFactors =
    (useWatch({ name: comparativeFactorsPath() }) as ComparativeFactorsFormType[]) ?? [];

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const usedFactorCodes = useMemo(
    () => watchComparativeFactors.map(r => r?.factorCode).filter(Boolean),
    [watchComparativeFactors],
  );

  const comparativeFactors = useMemo(() => {
    return getValues(comparativeFactorsPath());
  }, [comparativeSurveyFactors]);

  if (comparativeMarketSurveys.length === 0) {
    return (
      <div className="bg-white border border-gray-200 flex-1 min-h-0 min-w-0 rounded-lg flex flex-col items-center justify-center py-12 text-gray-400">
        <Icon name="table" className="size-8 mb-2" />
        <span className="text-sm">No comparative surveys selected yet.</span>
        <span className="text-xs mt-1">Click "Add Comparative Data" to get started.</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300 rounded-xl  max-h-[400px]">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="table table-sm min-w-max border-separate border-spacing-0">
          <thead className="bg-neutral-50">
            <tr className="">
              <th
                className={clsx(
                  'bg-gray-50 border-b border-gray-300 h-[55px] w-[350px] min-w-[350px] max-w-[350px] z-30 sticky left-0 top-0',
                )}
              >
                Factors
              </th>
              <th className="bg-gray-50 border-r border-b border-gray-300 w-[65px] max-w-[65px] min-w-[65px] z-30 sticky left-[350px] top-0"></th>
              <th
                className={clsx(
                  'bg-gray-50 border-b border-gray-300 w-[250px] min-w-[250px] max-w-[250px] z-30 sticky left-[415px] top-0 text-center font-medium px-3 py-2.5  whitespace-nowrap',
                  'after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full',
                )}
              >
                Collateral
              </th>
              {comparativeMarketSurveys.map((survey: MarketComparableDataType) => {
                return (
                  <th
                    key={survey.id}
                    className={
                      'bg-gray-50 border-r border-b border-gray-300 text-left font-medium z-28 sticky top-0 px-3 py-2.5 select-none whitespace-nowrap'
                    }
                  >
                    {survey.surveyName}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* use comparativeSurveyFactors directly because we need to update it immediatly */}
            {comparativeSurveyFactors.map((compFact: any, rowIndex: number) => {
              const selected = watchComparativeFactors[rowIndex]?.factorCode ?? '';
              const options = (allFactors ?? [])
                .filter(
                  cf => cf.factorCode === selected || !usedFactorCodes.includes(cf.factorCode),
                )
                .map(cf => ({
                  label: getFactorDesciption(cf.factorCode, allFactors ?? []) ?? '',
                  value: cf.factorCode,
                }));
              return (
                <tr key={compFact.id} className="hover:bg-gray-70 cursor-default transition-colors">
                  <td
                    className={clsx(
                      'bg-white border-b border-gray-300 font-medium h-[55px] w-[350px] min-w-[350px] max-w-[350px] z-25 sticky left-0',
                    )}
                  >
                    {template?.comparativeFactors?.find((t: TemplateComparativeFactorType) => {
                      return t.factorCode === compFact.factorCode;
                    }) ? (
                      <RHFInputCell
                        fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                        inputType="display"
                        accessor={({ value }) => {
                          return (
                            <div
                              title={getFactorDesciption(value.toString(), allFactors ?? []) ?? ''}
                              className="truncate"
                            >
                              {getFactorDesciption(value.toString(), allFactors ?? []) ?? ''}
                            </div>
                          );
                        }}
                      />
                    ) : (
                      <div>
                        <RHFInputCell
                          fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                          inputType="select"
                          options={options}
                        />
                      </div>
                    )}
                  </td>
                  <td className="bg-white border-r border-b border-gray-300 px-3 py-2.5 w-[65px] min-w-[65px] max-w-[65px] sticky left-[350px] z-25">
                    {!template?.comparativeFactors?.find(
                      t => t.factorCode === compFact.factorCode,
                    ) && (
                      <div className="flex flex-row justify-center items-center">
                        <button
                          type="button"
                          onClick={() => setDeleteIndex(rowIndex)}
                          className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors "
                          title="Delete"
                        >
                          <Icon style="solid" name="trash" className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td
                    className={clsx(
                      'bg-white border-b border-gray-300 text-right font-medium px-3 py-2.5 w-[250px] min-w-[250px] max-w-[250px] z-25 sticky left-[415px] top-0 whitespace-nowrap after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full',
                    )}
                  >
                    <RHFInputCell
                      fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        return (
                          <div
                            title={getPropertyValueByFactorCode(value.toString(), property) ?? ''}
                            className="truncate"
                          >
                            {getPropertyValueByFactorCode(value.toString(), property) ?? ''}
                          </div>
                        );
                      }}
                    />
                  </td>
                  {comparativeMarketSurveys.map((survey: MarketComparableDetailType) => {
                    return (
                      <td
                        key={survey.id}
                        className="border-r border-b border-gray-300 px-3 py-2.5 font-medium min-w-[250px]"
                      >
                        {
                          <RHFInputCell
                            fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                            inputType="display"
                            accessor={({ value }) => {
                              const factorData = survey.factorData?.find(
                                (factor: FactorDataType) => factor.factorCode === value,
                              );
                              if (factorData) {
                                const factorValue = readFactorValue({
                                  dataType: factorData.dataType,
                                  fieldDecimal: factorData.fieldDecimal,
                                  value: factorData.value,
                                });
                                return (
                                  <div title={factorValue?.toString() ?? ''} className="truncate">
                                    {factorValue ?? ''}
                                  </div>
                                );
                              }
                              return '';
                            }}
                          />
                        }
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr>
              <td
                colSpan={2}
                className={clsx(
                  'bg-white border-b border-r border-gray-300 sticky left-0',
                  'z-25 after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full',
                )}
              >
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
              <td
                className={clsx(
                  'bg-white border-b border-gray-300 text-left font-medium px-3 py-2.5 w-[250px] min-w-[250px] max-w-[250px] z-25 sticky left-[415px] top-0 whitespace-nowrap after:absolute after:right-0 after:top-0 after:h-full after:w-4 after:bg-gradient-to-r after:from-black/5 after:to-transparent after:translate-x-full',
                )}
              ></td>
              {comparativeMarketSurveys.map((survey: any) => {
                return (
                  <td
                    key={survey.id}
                    className="border-r border-b border-gray-300 px-3 py-2.5 "
                  ></td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        isOpen={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        onConfirm={() => {
          if (deleteIndex !== null) {
            removeComparativeSurveyFactors(deleteIndex);
            setDeleteIndex(null);
          }
        }}
        variant="danger"
        title="Remove Factor"
        message="Are you sure you want to remove this comparative factor?"
      />
    </div>
  );
}
