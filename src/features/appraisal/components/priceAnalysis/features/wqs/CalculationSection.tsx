import { RHFArrayTable } from './components/RHFArrayTable';
import type { ColumnDef, ColumnGroup, RHFRow } from './components/types';
import { RHFInputCell } from './components/RHFInputCell';
import { getDesciptions } from './WQSSection';
import { Icon } from '@/shared/components';
import { useFormContext, useWatch } from 'react-hook-form';
import clsx from 'clsx';
import { forecast } from '../../domain/excelUtils/forecast';
import { useMemo } from 'react';
import {
  RHFHorizontalArrayTable,
  RHFVerticalArrayTable,
} from '../../adapters/rhf-table/RHFArrayTable';
import type { RHFHorizontalColumn, RHFVerticalRowDef } from '../../adapters/rhf-table/spec';
import type { GridGroup } from '../../components/table/types';
import { useDerivedFields } from '../../components/useDerivedFieldArray';

interface CalculationSectionProps {
  comparativeSurveys: Record<string, string>[];
  template: Record<string, string>[];
  allFactors: Record<string, string>[];
  property: Record<string, any>;
}

export const CalculationSection = ({
  comparativeSurveys,
  template,
  allFactors,
  property,
}: CalculationSectionProps) => {
  const { getValues, setValue } = useFormContext();

  const DEFAULT_WQSSCORE_ROW = [
    {
      factorId: '',
      weight: 0,
      intensity: 0,
      surveys: [],
      collateral: 0,
    },
  ];

  const WQSScores = useWatch({ name: 'WQSScores' });
  const WQSCalculations = useWatch({ name: 'WQSCalculations' });

  const derivedRules = useMemo(() => {
    const finalValueRule = {
      targetPath: 'WQSFinalValue.finalValue',
      deps: ['WQSCalculations', 'WQSScores'],
      compute: () => {
        const x = (WQSScores ?? []).reduce((acc, curr) => acc + curr.collateral * curr.weight, 0);
        // known_y = adjusted values of each comparable
        const known_ys = (WQSCalculations ?? [])
          .map((c: any) => Number(c?.adjustedValue))
          .filter(Number.isFinite);

        const known_xs = (WQSScores ?? [])
          .map(
            f =>
              f.surveys?.map(survey => ({
                score: survey.surveyScore ?? 0,
                weight: f.weight ?? 0,
              })) ?? [],
          )
          .reduce((acc, curr) => {
            curr.forEach((value, i) => {
              acc[i] = (acc[i] ?? 0) + value.score * value.weight;
            });
            return acc;
          }, []);

        // must have >= 2 points
        if (known_xs.length < 2 || known_ys.length < 2 || known_xs.length !== known_ys.length) {
          return <div>0</div>;
        }

        const forecastResult = Number.isFinite(forecast({ x, known_ys, known_xs }))
          ? forecast({ x, known_ys, known_xs })
          : 0;

        return forecastResult;
      },
    };

    return [
      finalValueRule,
      ...WQSCalculations.map((column, index) => {
        return {
          targetPath: `WQSCalculations.[${index}].adjustedValue`,
          deps: ['WQSCaculations'],
          compute: () => {
            if (column.offeringPrice) {
              return column.offeringPriceAdjustmentPct > 0
                ? column.offeringPrice -
                    (column.offeringPrice * column.offeringPriceAdjustmentPct) / 100
                : column.offeringPriceAdjustmentAmt > 0
                  ? column.offeringPriceAdjustmentAmt
                  : column.offeringPrice;
            }
            if (column.sellingPrice) {
              return (
                column.sellingPrice +
                (column.sellingPrice * column.numberOfYears * column.sellingPriceAdjustmentYear) /
                  100
              );
            }
            return 0;
          },
        };
      }),
    ];
  }, [WQSCalculations, WQSScores]);

  useDerivedFields({
    rules: derivedRules,
    ctx: {},
  });

  let scoreConfigurations: RHFHorizontalColumn<Record<string, any>, any>[] = [
    {
      id: 'factorCode',
      header: (
        <div className="flex items-center justify-center bg-neutral-400 h-[116px]">Factor</div>
      ),
      field: 'factorCode',
      className: 'border-r border-neutral-300 sticky left-0 z-40 bg-white max-w-[200px] w-[200px]',
      render: ({ fieldPath, ctx, rowIndex, value }) => {
        if (rowIndex > ctx.template.calculationFactors.length - 1) {
          const comparativeFactors =
            (getValues('comparativeFactors') ?? [])
              ?.filter(
                compFact =>
                  !template.calculationFactors.some(
                    calFact => calFact.factorId === compFact.factorId,
                  ),
              )
              .map(compFact => ({
                label: getDesciptions(compFact.factorId),
                value: compFact.factorId,
              })) ?? [];
          console.log('comparativeFactors', comparativeFactors);
          return (
            <div className="max-w-[200px] truncate">
              <RHFInputCell fieldName={fieldPath} inputType="select" options={comparativeFactors} />
            </div>
          );
        }
        return (
          <div className="max-w-[200px] truncate" title={getDesciptions(value) ?? ''}>
            {getDesciptions(value) ?? ''}
          </div>
        );
      },
    },
    {
      id: 'weight',
      header: (
        <div className="flex items-center justify-center bg-neutral-400 h-[116px]">Weight</div>
      ),
      field: 'weight',
      className: 'border-r border-neutral-300 w-[100px] sticky left-[200px] z-40 bg-white',
      rhf: { inputType: 'number' },

      footer: ({ rows }) => {
        const totalWeight = rows.reduce((acc, curr) => {
          return acc + curr.weight;
        }, 0);
        return (
          <div
            className={clsx(
              'flex justify-end items-center text-right text-sm font-normal text-gray-400 px-3 py-4 w-[100px]',
            )}
          >
            {`${Number.isFinite(totalWeight) ? totalWeight : 0}`}
          </div>
        );
      },
    },
    {
      id: 'intensity',
      header: <div className="px-3">Intensity</div>,
      field: 'intensity',
      className: 'h-14 border-r border-neutral-300 sticky top-14',
      align: 'right',
      render: ({ fieldPath, row, ctx }) => {
        // if (row['factor'] ==)
        return (
          <div className="min-w-[100px]">
            <RHFInputCell fieldName={fieldPath} inputType="number" />
          </div>
        );
      },
      footer: ({ rows, ctx, columnIndex }) => {
        const totalIntensity = rows.reduce((acc, curr) => {
          return acc + curr.intensity;
        }, 0);
        return (
          <div
            className={clsx(
              'flex justify-end items-center text-right text-sm font-normal max-w-full',
              totalIntensity > 100 ? 'text-danger' : 'text-gray-400',
            )}
          >
            {Number.isFinite(totalIntensity) ? totalIntensity.toFixed(0) : 0}
          </div>
        );
      },
    },
    {
      id: 'score',
      header: <div className="px-3">Score</div>,
      className: 'h-14 border-r border-neutral-300 sticky top-14 w-[100px]',
      align: 'right',
      render: ({ fieldPath, row, rowIndex, value, ctx }) => (
        <div className="w-[100px]">{row['weight'] * row['intensity']}</div>
      ),
      footer: ({ rows }) => {
        const totalScore = rows.reduce((acc, curr) => {
          return acc + curr.weight * curr.intensity;
        }, 0);
        return (
          <div
            className={clsx(
              'flex justify-end items-center text-right text-sm font-normal px-3 py-4 max-w-full text-gray-400',
            )}
          >
            {Number.isFinite(totalScore) ? totalScore.toFixed(0) : 0}
          </div>
        );
      },
    },
  ];

  if (comparativeSurveys) {
    scoreConfigurations = [
      ...scoreConfigurations,
      ...comparativeSurveys.map((data, index) => {
        return {
          id: data.id,
          field: `surveys.${index}.surveyScore`,
          className: 'border-r border-neutral-300 sticky top-14 min-w-[200px]',
          header: (
            <div className="h-full">
              <div className="flex justify-center items-center truncate">
                <span>Survey {index + 1}</span>
              </div>
              <div className="flex flex-row justify-between items-center h-full w-full gap-2 text-wrap ">
                <div className="text-left p-2">Score</div>
                <div className="text-right p-2">Weighted Score</div>
              </div>
            </div>
          ),

          render: ({ fieldPath, row, rowIndex }) => {
            const surveyScore = getValues(fieldPath) ?? 0;
            const weight = row.weight ?? 0;
            const score = weight * surveyScore;

            return (
              <div className="max-w-full h-full flex flex-row justify-between items-center">
                <div className="w-30">
                  <RHFInputCell fieldName={fieldPath} inputType="number" />
                </div>
                <div className="max-w-full text-right">
                  <span>{Number.isFinite(score) ? score.toFixed(0) : 0}</span>
                </div>
              </div>
            );
          },

          footer: ({ rows }) => {
            const totalScore = rows.reduce((acc, curr) => {
              if (!curr) return acc;

              const score = curr['surveys']?.[index]?.surveyScore ?? 0;
              const weight = curr['weight'] ?? 0;
              return acc + score * weight;
            }, 0);

            return (
              <div className="flex justify-end items-center text-right text-sm font-normal text-gray-400  px-3 py-4">
                {Number.isFinite(totalScore) ? totalScore.toFixed(0) : 0}
              </div>
            );
          },
        };
      }),
    ];
  }

  scoreConfigurations = [
    ...scoreConfigurations,
    {
      id: 'collateral',
      field: 'collateral',
      className: 'border-r border-neutral-300 sticky top-0',
      header: (
        <div className="min-h-0 h-[116px]">
          <div className="flex flex-row justify-center items-center min-h-[60px] border-b border-neutral-300">
            <span>collateral</span>
          </div>
          <div className="flex flex-row justify-between items-start gap-2 text-wrap">
            <div className="p-2">Score</div>
            <div className="p-2">Weighted Score</div>
          </div>
        </div>
      ),
      render: ({ fieldPath, row, rowIndex, value, ctx }) => {
        const score = getValues(fieldPath) ?? 0;
        const weightedScore = row.weight * score;
        return (
          <div className="min-w-full flex flex-row justify-between items-center">
            <div className="w-18">
              <RHFInputCell fieldName={fieldPath} inputType="number" />
            </div>
            <div>
              {/* <span>{`${row['weight'] * value.score}`}</span> */}
              <span>{Number.isFinite(weightedScore) ? weightedScore.toFixed(0) : 0}</span>
            </div>
          </div>
        );
      },

      footer: ({ rows }) => {
        const totalScore = rows.reduce((acc, curr) => {
          const score = curr['collateral'] ?? 0;
          const weight = curr['weight'] ?? 0;
          return acc + score * weight;
        }, 0);

        return (
          <div className="flex justify-end items-center text-right text-sm font-normal text-gray-400 px-2">
            {Number.isFinite(totalScore) ? totalScore.toFixed(0) : 0}
          </div>
        );
      },
    },
    {
      id: 'action',
      header: <div className="bg-neutral-400 w-full h-[116px]"></div>,
      className: 'min-w-20 sticky right-0 z-40 border-l border-neutral-300 bg-white',
      render: ({ rowIndex, actions: { removeColumn }, ctx }) => {
        /*
          factor which was set from template not allow to change
         */
        if (rowIndex >= ctx.template.calculationFactors.length)
          return (
            <div className="flex justify-center items-center bg-white w-full h-full">
              <button
                type="button"
                onClick={() => removeColumn?.(rowIndex)}
                className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                title="Delete"
              >
                <Icon style="solid" name="trash" className="size-3.5" />
              </button>
            </div>
          );
        return <div className="min-w-full min-h-full bg-white"></div>;
      },
    },
  ];

  const scoreColumnGroupConfigurations: GridGroup[] = [
    {
      id: 'calculation',
      label: <div className="p-2">Calculation</div>,
      columnIds: ['intensity', 'score'],
      align: 'center',
      className: 'border-b border-r border-neutral-300 h-[60px]',
    },
    {
      id: 'surveys',
      label: <div className="p-2">Comparative Data</div>,
      columnIds: comparativeSurveys.map((data, index) => data.id),
      align: 'center',
      className: `border-b border-r border-neutral-300 h-[60px]`,
    },
  ];

  return (
    <div className="border border-neutral-300 rounded-lg overflow-clip">
      <RHFHorizontalArrayTable
        name="WQSScores"
        columns={scoreConfigurations}
        groups={scoreColumnGroupConfigurations}
        defaultRow={{ factorCode: '', weight: 0, intensity: 0, surveys: [], collateral: 0 }}
        ctx={{
          factors: allFactors,
          template: template,
          surveys: comparativeSurveys,
          property: property,
        }}
        // watch={{ comparativeFactors: 'comparativeFactors', scoreFactor: 'WQSScores' }} // TODO
        hasHeader={true}
        hasBody={true}
        hasFooter={true}
      />
      <div className="border-y border-neutral-300 flex justify-center h-14 text-sm items-center">
        {`Scoring Criteria : 1-2 Very low, 3-4 Fair, 5-6 Average, 7-8 Good, 9-10 Very Good`}
      </div>
      <RHFVerticalArrayTable
        name="WQSCalculations"
        leftHeaderClassName={'sticky left-0 bg-white z-30 border-r max-w-[600px]'}
        rowDefs={getCalculationConfigurations(setValue)}
        // hasHeader={false}
        defaultColumn={{}}
        hasAddButton={true}
        canEdit={true}
        watch={{ WQSScores: 'WQSScores' }}
        getColClassName={i => {
          return 'max-w-full h-[50px] border-r border-neutral-300';
        }}
      />
    </div>
  );
};

const getCalculationConfigurations = setValue => {
  const calculationConfigurations: RHFVerticalRowDef<Record<string, any>, any>[] = [
    {
      id: 'offeringPrice',
      header: <div className="flex justify-start items-center w-[600px]">Offering Price</div>,
      className: 'px-3 py-4',
      field: 'offeringPrice',
      accessor: ({ columnItem }) => {
        return columnItem['offeringPrice'];
      },
      render: ({ value }) => {
        return <div className="">{`${value ?? ''}`}</div>;
      },
    },
    {
      id: 'offeringPriceAdjustmentPct',
      header: (
        <div className="flex flex-row justify-between items-center">
          <div>Adjustment of Offer Price</div>
          <div>(%)</div>
        </div>
      ),
      field: 'offeringPriceAdjustmentPct',
      accessor: ({ columnItem, columnIndex, ctx }) => {
        return columnItem['offeringPriceAdjustmentPct'] ?? null;
      },
      render: ({ fieldPath, columnItem, columns, columnIndex, value, ctx }) => {
        return columnItem['offeringPrice'] ? (
          <div>
            <RHFInputCell fieldName={fieldPath} inputType="number" />
          </div>
        ) : null;
      },
    },
    {
      id: 'offeringPriceAdjustmentAmt',
      header: (
        <div className="flex flex-row justify-between items-center">
          <div>Adjustment of Offer Price</div>
          <div>(Amt)</div>
        </div>
      ),
      field: 'offeringPriceAdjustmentAmt',
      accessor: ({ columnItem }) => {
        return columnItem['offeringPriceAdjustmentAmt'] ?? null;
      },
      render: ({ fieldPath, columnItem }) => {
        return columnItem['offeringPrice'] ? (
          <div>
            <RHFInputCell fieldName={fieldPath} inputType="number" />
          </div>
        ) : null;
      },
    },
    {
      id: 'sellingPrice',
      header: <div className="">Selling Price</div>,
      field: 'sellingPrice',
      accessor: ({ columnItem, columnIndex, ctx }) => {
        return columnItem['sellingPrice'] ?? null;
      },
      render: ({ value, ctx }) => {
        return <div>{`${value ?? ''}`}</div>;
      },
    },
    {
      id: 'numberOfYears',
      header: <div>Number of Years</div>,
      field: 'numberOfYears',
      accessor: ({ columnItem, columnIndex, ctx }) => {
        return columnItem['numberOfYears'] ?? '';
      },
      render: ({ value, ctx }) => {
        return <div>{`${value ?? ''}`}</div>;
      },
    },
    {
      id: 'sellingPriceAdjustmentYear',
      header: <div>Adjust Period</div>,
      field: 'sellingPriceAdjustmentYear',
      accessor: ({ columnItem, columnIndex, ctx }) => {
        return columnItem['sellingPriceAdjustmentYear'] ?? '';
      },
      render: ({ fieldPath, columnItem, columns, columnIndex, value, ctx }) => {
        return columnItem['sellingPrice'] ? (
          <div>
            <RHFInputCell fieldName={fieldPath} inputType="number" />
          </div>
        ) : null;
      },
    },
    {
      id: 'cumulativeAdjustedPeriod',
      header: <div>Cumulative Adjusted Period</div>,
      accessor: ({ columnItem, columnIndex, ctx }) => {
        if (!columnItem['numberOfYears'] && !columnItem['sellingPriceAdjustmentYear']) return 0;
        return columnItem['numberOfYears'] * columnItem['sellingPriceAdjustmentYear'];
      },
      render: ({ columnItem }) => {
        if (!columnItem['sellingPrice']) return '';

        const numberOfYears = columnItem['numberOfYears'] ?? 0;
        const sellingPriceAdjustmentYear = columnItem['sellingPriceAdjustmentYear'] ?? 0;
        const cumulativeAdjustedPeriod = numberOfYears * sellingPriceAdjustmentYear;
        return (
          <div>{`${Number.isFinite(cumulativeAdjustedPeriod) ? cumulativeAdjustedPeriod.toFixed(0) : ''}`}</div>
        );
      },
    },
    {
      id: 'adjustedValue',
      header: <div>Adjusted Value</div>,
      field: 'adjustedValue',
      render: ({ value }) => {
        return <span>{Number.isFinite(value) ? Number(value).toLocaleString() : 0}</span>;
      },
    },
    {
      id: 'finalValue',
      header: <div>Final Value</div>,
      field: 'finalValue',
      render: ({ columnItem, columnIndex, ctx }) => {
        if (columnIndex !== columnItem.length - 1) return '';
        const x = (ctx.WQSScores ?? []).reduce(
          (acc, curr) => acc + curr.collateral * curr.weight,
          0,
        );
        // known_y = adjusted values of each comparable
        const known_ys = (columnItem ?? [])
          .map((c: any) => Number(c?.adjustedValue))
          .filter(Number.isFinite);

        const known_xs = (ctx.WQSScores ?? [])
          .map(
            f =>
              f.surveys?.map(survey => ({
                score: survey.surveyScore ?? 0,
                weight: f.weight ?? 0,
              })) ?? [],
          )
          .reduce((acc, curr) => {
            curr.forEach((value, i) => {
              acc[i] = (acc[i] ?? 0) + value.score * value.weight;
            });
            return acc;
          }, []);

        // must have >= 2 points
        if (known_xs.length < 2 || known_ys.length < 2 || known_xs.length !== known_ys.length) {
          return <div>0</div>;
        }

        const forecastResult = forecast({ x, known_ys, known_xs });
        const finalValue = useMemo(() => {
          console.log(forecastResult, x, known_xs, known_ys);
          return forecastResult;
        }, [forecastResult, known_xs, known_ys, x]);
        setValue(
          'WQSFinalValue.finalValue',
          Number.isFinite(finalValue) ? Number(finalValue).toFixed(2) : 0,
        );
        return <div>{Number.isFinite(finalValue) ? Number(finalValue).toLocaleString() : 0}</div>;
      },
    },
    {
      id: 'roundedFinalValue',
      header: <div>Final Value</div>,
      render: ({ columnItem, columnIndex }) => {
        if (columnIndex !== columnItem.length - 1) return '';
        return <RHFInputCell fieldName={'roundedFinalValue'} inputType="number" />;
      },
    },
  ];
  return calculationConfigurations;
};
