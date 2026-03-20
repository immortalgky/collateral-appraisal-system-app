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
import { getFactorDesciption } from '@features/pricingAnalysis/domain/getFactorDescription.ts';
import { FactorValueDisplay } from './FactorValueDisplay';
import { useMemo, useState } from 'react';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useLocaleStore } from '@shared/store';
import type { ComparativeFactorsFormType } from '../schemas/saleAdjustmentGridForm';
import { ScrollableTableContainer } from './ScrollableTableContainer';

interface ComparativeFactorTableProps {
  comparativeMarketSurveys: MarketComparableDataType[];
  property: Record<string, unknown>;
  allFactors: FactorDataType[];
  template?: TemplateDetailType;
  fieldPath: Record<string, any>;
}
export function ComparativeFactorTable({
  comparativeMarketSurveys,
  property,
  allFactors,
  template,
  fieldPath,
}: ComparativeFactorTableProps) {
  const isReadOnly = usePageReadOnly();
  const language = useLocaleStore(s => s.language);
  const {
    comparativeFactors: comparativeFactorsPath,
    comparativeFactorsFactorCode: comparativeFactorsFactorCodePath,
  } = fieldPath;

  const { control, getValues, setValue } = useFormContext();
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

  const stickyGradient =
    'after:absolute after:right-0 after:top-0 after:h-full after:w-3 after:bg-gradient-to-r after:from-black/[0.04] after:to-transparent after:translate-x-full';
  const factorColumnStyle = clsx('z-20', stickyGradient);
  const collateralColumnStyle = clsx(
    'text-left font-medium px-3 py-1.5 w-[200px] min-w-[200px] max-w-[200px] whitespace-nowrap sticky left-[250px] z-20 overflow-hidden bg-white',
    stickyGradient,
  );

  if (comparativeMarketSurveys.length === 0) {
    return (
      <div className="bg-white border border-gray-200 flex-1 min-h-0 min-w-0 rounded-lg flex flex-col items-center justify-center py-10 text-gray-400">
        <Icon name="table" className="size-7 mb-2 text-gray-300" />
        <span className="text-sm text-gray-500">No comparative surveys selected yet.</span>
        <span className="text-xs mt-1 text-gray-400">
          Click &ldquo;Add Comparative Data&rdquo; to get started.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 flex-1 min-h-0 min-w-0 rounded-xl flex flex-col overflow-hidden">
      <ScrollableTableContainer className="flex-1 min-h-0">
        <table className="table table-xs min-w-max">
          <thead className="sticky top-0 z-30">
            <tr className="border-b border-gray-200">
              <th
                className={clsx(
                  'bg-gray-100/95 backdrop-blur-sm sticky left-0 h-[36px] w-[250px] min-w-[250px] max-w-[250px] px-3 py-1.5 text-xm font-semibold text-gray-500 uppercase tracking-wider',
                  factorColumnStyle,
                )}
              >
                Factors
              </th>
              <th
                className={clsx(
                  'bg-gray-100/95 backdrop-blur-sm text-xm font-semibold text-gray-500 uppercase tracking-wider',
                  collateralColumnStyle,
                )}
              >
                Collateral
              </th>
              {comparativeMarketSurveys.map((survey: MarketComparableDataType) => (
                <th
                  key={survey.id}
                  className="bg-gray-100/95 backdrop-blur-sm text-left text-xm font-semibold text-gray-500 px-3 py-1.5 select-none whitespace-nowrap min-w-[200px]"
                >
                  {survey.surveyName}
                </th>
              ))}
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
                  label: getFactorDesciption(cf.factorCode, allFactors ?? [], language) ?? '',
                  value: cf.factorCode,
                }));
              return (
                <tr
                  key={compFact.id}
                  className={clsx(
                    'group transition-colors',
                    rowIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white',
                  )}
                >
                  <td
                    className={clsx(
                      'font-medium sticky left-0 h-[36px] px-3 py-1 border-b border-gray-100',
                      rowIndex % 2 === 1 ? 'bg-gray-50' : 'bg-white',
                      'group-hover:bg-blue-50',
                      factorColumnStyle,
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        {template?.comparativeFactors?.find((t: TemplateComparativeFactorType) => {
                          return t.factorCode === compFact.factorCode;
                        }) ? (
                          <RHFInputCell
                            fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                            inputType="display"
                            accessor={({ value }) => {
                              return (
                                <div
                                  title={
                                    getFactorDesciption(
                                      value.toString(),
                                      allFactors ?? [],
                                      language,
                                    ) ?? ''
                                  }
                                  className="truncate"
                                >
                                  {getFactorDesciption(
                                    value.toString(),
                                    allFactors ?? [],
                                    language,
                                  ) ?? ''}
                                </div>
                              );
                            }}
                          />
                        ) : (
                          <RHFInputCell
                            fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                            inputType="select"
                            options={options}
                            onSelectChange={value => {
                              const factor = allFactors?.find(f => f.factorCode === value);
                              setValue(
                                `comparativeFactors.${rowIndex}.factorId`,
                                factor?.factorId ?? factor?.id ?? '',
                              );
                            }}
                          />
                        )}
                      </div>
                      {!template?.comparativeFactors?.find(
                        t => t.factorCode === compFact.factorCode,
                      ) && (
                        <button
                          type="button"
                          onClick={() => setDeleteIndex(rowIndex)}
                          className="size-5 flex-shrink-0 flex items-center justify-center cursor-pointer rounded text-gray-300 hover:text-danger-600 hover:bg-danger-50 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Icon style="solid" name="trash" className="size-2.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td
                    className={clsx(
                      'border-b border-gray-100 text-gray-700',
                      rowIndex % 2 === 1 ? 'bg-gray-50' : 'bg-white',
                      'group-hover:bg-blue-50',
                      collateralColumnStyle,
                    )}
                  >
                    <RHFInputCell
                      fieldName={comparativeFactorsFactorCodePath({ row: rowIndex })}
                      inputType="display"
                      accessor={({ value }) => {
                        const factor = allFactors?.find(f => f.factorCode === value);
                        const fieldName = factor?.fieldName as string | undefined;
                        const raw = fieldName ? property[fieldName] : null;
                        const rawStr = raw != null ? String(raw) : null;
                        return (
                          <FactorValueDisplay
                            value={rawStr}
                            dataType={factor?.dataType as string | undefined}
                            parameterGroup={factor?.parameterGroup as string | undefined}
                          />
                        );
                      }}
                    />
                  </td>
                  {comparativeMarketSurveys.map((survey: MarketComparableDetailType) => {
                    return (
                      <td
                        key={survey.id}
                        className="px-3 py-1 border-b border-gray-100 text-gray-700 min-w-[200px]"
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
                                return (
                                  <FactorValueDisplay
                                    value={factorData.value as string | undefined}
                                    dataType={factorData.dataType as string | undefined}
                                    parameterGroup={factorData.parameterGroup as string | undefined}
                                    fieldDecimal={factorData.fieldDecimal as number | undefined}
                                  />
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
              <td className={clsx('bg-white sticky left-0 px-3 py-2', 'z-15', stickyGradient)}>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() =>
                      appendComparativeSurveyFactors({
                        factorId: '',
                        factorCode: '',
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-dashed border-primary/40 rounded-lg cursor-pointer hover:bg-primary/5 hover:border-primary/60 transition-colors"
                  >
                    <Icon name="plus" className="size-3" />
                    Add Factor
                  </button>
                )}
              </td>
              <td className={clsx('bg-white', collateralColumnStyle)} />
              {comparativeMarketSurveys.map((survey: MarketComparableDetailType) => (
                <td key={survey.id} className="px-3 py-1.5" />
              ))}
            </tr>
          </tbody>
        </table>
      </ScrollableTableContainer>
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
