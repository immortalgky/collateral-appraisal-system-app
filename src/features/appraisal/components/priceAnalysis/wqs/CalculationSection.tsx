import { RHFArrayTable } from './components/RHFArrayTable';
import type { ColumnDef, ColumnGroup, RHFRow } from './components/types';
import { RHFInputCell } from './components/RHFInputCell';
import { getDesciptions } from './WQSSection';
import { Icon } from '@/shared/components';
import { useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import { forecast } from './components/excelUtils/forecast';
import { classNames } from '@/shared/utils/classNames';
import { useMemo } from 'react';

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

  let scoreConfigurations: ColumnDef[] = [
    {
      id: 'factorCode',
      header: (
        <div className="flex items-center justify-center w-full h-full bg-neutral-400">Factor</div>
      ),
      name: 'factorCode',
      className: 'border-r border-neutral-300 sticky left-0 z-40 bg-white w-[100px] min-w-0',
      renderCell: ({ fieldName, ctx, rowIndex, value }) => {
        if (rowIndex > ctx.template.calculationFactors.length - 1) {
          const comparativeFactors =
            ctx.comparativeFactors
              ?.filter(
                compFact =>
                  !template.calculationFactors.some(
                    calFact => calFact.factorId === compFact.factorCode,
                  ),
              )
              .map(compFact => ({
                label: getDesciptions(compFact.factorCode),
                value: compFact.factorCode,
              })) ?? [];
          return (
            <div className="w-[300px] truncate">
              <RHFInputCell fieldName={fieldName} inputType="select" options={comparativeFactors} />
            </div>
          );
        }
        return (
          <div className="w-[300px] truncate" title={getDesciptions(value) ?? ''}>
            {getDesciptions(value) ?? ''}
          </div>
        );
      },
    },
    {
      id: 'weight',
      header: <div>Weight</div>,
      name: 'weight',
      className: 'border-r border-neutral-300 w-[100px]',
      rhfRenderCell: { inputType: 'number' },

      renderFooter: ({ fieldName, rows, ctx, columnIndex }) => {
        const totalWeight = rows.reduce((acc, curr) => {
          return acc + curr[columnIndex];
        }, 0);
        return (
          <div
            className={clsx(
              'flex justify-end items-center text-right text-sm font-normal text-gray-400 px-3 py-4 w-[100px]',
            )}
          >
            {`${totalWeight}`}
          </div>
        );
      },
    },
    {
      id: 'intensity',
      header: <div className="px-3">Intensity</div>,
      name: 'intensity',
      className: 'h-14 border-r border-neutral-300 sticky top-14 w-[100px]',
      align: 'right',
      renderCell: ({ fieldName, row, ctx }) => {
        // if (row['factor'] ==)
        return <RHFInputCell fieldName={fieldName} inputType="number" />;
      },
      renderFooter: ({ rows, ctx, columnIndex }) => {
        const totalIntensity = rows.reduce((acc, curr) => {
          return acc + curr[columnIndex];
        }, 0);
        return (
          <div
            className={clsx(
              'flex justify-end items-center text-right text-sm font-normal px-3 py-4 w-[100px]',
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
      renderCell: ({ fieldName, row, rowIndex, value, ctx }) => (
        <div className="w-[100px]">{row['weight'] * row['intensity']}</div>
      ),
      align: 'right',
    },
  ];

  if (comparativeSurveys) {
    scoreConfigurations = [
      ...scoreConfigurations,
      ...comparativeSurveys.map((data, index) => {
        return {
          id: data.id,
          name: `surveys.${index}.surveyScore`,
          className: 'border-r border-neutral-300 sticky top-14 w-[200px]',
          header: (
            <div className="w-full h-full min-w-0">
              <div className="flex justify-center items-center truncate">
                <span>Survey {index + 1}</span>
              </div>
              <div className="flex flex-row justify-between items-center h-full w-full gap-2 text-wrap ">
                <div className="text-left p-2">Score</div>
                <div className="text-right p-2">Weighted Score</div>
              </div>
            </div>
          ),

          renderCell: ({ fieldName, row }) => {
            const surveyScore = getValues(fieldName) ?? 0;
            const weight = row['weight'] ?? 0;
            const score = weight * surveyScore;

            return (
              <div className="w-[200px] h-full flex flex-row justify-between items-center">
                <div className="w-30">
                  <RHFInputCell fieldName={fieldName} inputType="number" />
                </div>
                <div className="w-full text-right">
                  <span>{Number.isFinite(score) ? score.toFixed(0) : 0}</span>
                </div>
              </div>
            );
          },

          renderFooter: ({ rows }) => {
            const totalScore = rows.reduce((acc, curr) => {
              const score = curr['surveys'][index]?.surveyScore ?? 0;
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
      name: 'collateral',
      className: 'border-r border-neutral-300 w-[200px] sticky top-0 w-[200px]',
      header: (
        <div className="flex flex-col h-full">
          <div className="flex flex-row justify-center items-center w-full h-14 border-b border-neutral-300">
            <span>collateral</span>
          </div>
          <div className="flex flex-row justify-between items-start w-full gap-2 text-wrap ">
            <div className="p-2">Score</div>
            <div className="p-2">Weighted Score</div>
          </div>
        </div>
      ),
      renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
        const score = row['weight'] * value;
        return (
          <div className="w-[200px] flex flex-row justify-between items-center">
            <div className="w-18">
              <RHFInputCell fieldName={fieldName} inputType="number" />
            </div>
            <div>
              {/* <span>{`${row['weight'] * value.score}`}</span> */}
              <span>{Number.isFinite(score) ? score.toFixed(0) : 0}</span>
            </div>
          </div>
        );
      },

      renderFooter: ({ rows }) => {
        const totalScore = rows.reduce((acc, curr) => {
          const score = curr['collateral'] ?? 0;
          const weight = curr['weight'] ?? 0;
          return acc + score * weight;
        }, 0);

        return (
          <div className="flex justify-end items-center text-right text-sm font-normal text-gray-400  px-3 py-4">
            {Number.isFinite(totalScore) ? totalScore.toFixed(0) : 0}
          </div>
        );
      },
    },
    {
      id: 'action',
      header: <div className="bg-neutral-400 w-full h-full"></div>,
      className: 'min-w-20 sticky right-0 bg-white z-40 border-l border-neutral-300',
      renderCell: ({ rowIndex, onRemove, ctx }) => {
        /*
          factor which was set from template not allow to change
         */
        if (rowIndex >= ctx.template.calculationFactors.length)
          return (
            <div className="flex justify-center items-center">
              <button
                type="button"
                onClick={() => onRemove?.(rowIndex)}
                className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                title="Delete"
              >
                <Icon style="solid" name="trash" className="size-3.5" />
              </button>
            </div>
          );
        return <div></div>;
      },
    },
  ];

  const scoreColumnGroupConfigurations: ColumnGroup[] = [
    {
      id: 'calculation',
      label: <div className="p-2">Calculation</div>,
      columns: ['intensity', 'score'],
      align: 'center',
      className: 'border-b border-r border-neutral-300 h-14',
    },
    {
      id: 'surveys',
      label: <div className="p-2">Comparative Data</div>,
      columns: comparativeSurveys.map((data, index) => data.id),
      align: 'center',
      className: `border-b border-r border-neutral-300 h-14`,
    },
  ];

  return (
    <div className="border border-neutral-300 rounded-lg overflow-clip">
      <RHFArrayTable
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
        watch={{ comparativeFactors: 'comparativeFactors', scoreFactor: 'WQSScores' }}
      />
      <div className="border-y border-neutral-300 flex justify-center h-14 text-sm items-center">
        {`Scoring Criteria : 1-2 Very low, 3-4 Fair, 5-6 Average, 7-8 Good, 9-10 Very Good`}
      </div>
      <RHFArrayTable
        name="WQSCalculations"
        dataAlignment="vertical"
        leftHeaderStyle={'w-[100px]'}
        getColumnSize={(col, colIndex) => 'w-[200px]'}
        rows={getCalculationConfigurations(setValue)}
        hasHeader={false}
        hasAddButton={false}
        canEdit={true}
        watch={{ WQSScores: 'WQSScores' }}
      />
    </div>
  );
};

const getCalculationConfigurations = setValue => {
  const calculationConfigurations: RHFRow[] = [
    {
      id: 'offeringPrice',
      header: <div className="flex justify-start items-center w-[600px]">Offering Price</div>,
      name: 'offeringPrice',
      className: 'px-3 py-4',
      accessor: (column, columnIndex, ctx) => {
        return column['offeringPrice'];
      },
      renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
        return <div className="w-[300px]">{`${value ?? ''}`}</div>;
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
      name: 'offeringPriceAdjustmentPct',
      accessor: (column, columnIndex, ctx) => {
        return column['offeringPriceAdjustmentPct'] ?? null;
      },
      renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
        return column['offeringPrice'] ? (
          <div>
            <RHFInputCell fieldName={fieldName} inputType="number" />
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
      name: 'offeringPriceAdjustmentAmt',
      accessor: (column, columnIndex, ctx) => {
        return column['offeringPriceAdjustmentAmt'] ?? null;
      },
      renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
        return column['offeringPrice'] ? (
          <div>
            <RHFInputCell fieldName={fieldName} inputType="number" />
          </div>
        ) : null;
      },
    },
    {
      id: 'sellingPrice',
      header: <div className="">Selling Price</div>,
      name: 'sellingPrice',
      accessor: (column, columnIndex, ctx) => {
        return column['sellingPrice'] ?? null;
      },
      renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
        return <div>{`${value ?? ''}`}</div>;
      },
    },
    {
      id: 'numberOfYears',
      header: <div>Number of Years</div>,
      name: 'numberOfYears',
      accessor: (column, columnIndex, ctx) => {
        return column['numberOfYears'] ?? '';
      },
      renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
        return <div>{`${value ?? ''}`}</div>;
      },
    },
    {
      id: 'sellingPriceAdjustmentYear',
      header: <div>Adjust Period</div>,
      name: 'sellingPriceAdjustmentYear',
      accessor: (column, columnIndex, ctx) => {
        return column['sellingPriceAdjustmentYear'] ?? '';
      },
      renderCell: ({ fieldName, column, columns, columnIndex, value, ctx }) => {
        return column['sellingPrice'] ? (
          <div>
            <RHFInputCell fieldName={fieldName} inputType="number" />
          </div>
        ) : null;
      },
    },
    {
      id: 'cumulativeAdjustedPeriod',
      header: <div>Cumulative Adjusted Period</div>,
      accessor: (column, columnIndex, ctx) => {
        if (!column['numberOfYears'] && !column['sellingPriceAdjustmentYear']) return 0;
        return column['numberOfYears'] * column['sellingPriceAdjustmentYear'];
      },
      renderCell: ({ column }) => {
        if (!column['sellingPrice']) return '';

        const numberOfYears = column['numberOfYears'] ?? 0;
        const sellingPriceAdjustmentYear = column['sellingPriceAdjustmentYear'] ?? 0;
        const cumulativeAdjustedPeriod = numberOfYears * sellingPriceAdjustmentYear;
        return (
          <div>{`${Number.isFinite(cumulativeAdjustedPeriod) ? cumulativeAdjustedPeriod.toFixed(0) : ''}`}</div>
        );
      },
    },
    {
      id: 'adjustedValue',
      header: <div>Adjusted Value</div>,
      name: 'adjustedValue',
      derived: {
        compute: ({ column }) => {
          if (column['offeringPrice']) {
            return column['offeringPriceAdjustmentPct'] > 0
              ? column['offeringPrice'] -
                  (column['offeringPrice'] * column['offeringPriceAdjustmentPct']) / 100
              : column['offeringPriceAdjustmentAmt'] > 0
                ? column['offeringPriceAdjustmentAmt']
                : column['offeringPrice'];
          }
          if (column['sellingPrice']) {
            return (
              column['sellingPrice'] +
              (column['sellingPrice'] *
                column['numberOfYears'] *
                column['sellingPriceAdjustmentYear']) /
                100
            );
          }
          return 0;
        },
      },
      renderCell: ({ value }) => {
        return <span>{Number.isFinite(value) ? Number(value).toLocaleString() : 0}</span>;
      },
    },
    {
      id: 'finalValue',
      header: <div>Final Value</div>,
      name: 'finalValue',
      renderCell: ({ columns, columnIndex, ctx }) => {
        if (columnIndex !== columns.length - 1) return '';
        const x = (ctx.WQSScores ?? []).reduce(
          (acc, curr) => acc + curr.collateral * curr.weight,
          0,
        );
        // known_y = adjusted values of each comparable
        const known_ys = (columns ?? [])
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
      renderCell: ({ fieldName, columns, columnIndex }) => {
        if (columnIndex !== columns.length - 1) return '';
        return <RHFInputCell fieldName={'roundedFinalValue'} inputType="number" />;
      },
    },
  ];
  return calculationConfigurations;
};
