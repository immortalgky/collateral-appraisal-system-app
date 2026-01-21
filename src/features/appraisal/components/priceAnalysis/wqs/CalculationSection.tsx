import {
  ALL_FACTORS,
  calculationRows,
  columnGroups,
  columns,
  DEFAULT_WQSSCORE_ROW,
  FACTORS,
  PROPERTIES,
  TEMPLATE,
} from './data/data';
import { RHFArrayTable } from './components/RHFArrayTable';
import type { ColumnDef } from './components/types';
import { MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND } from './data/comparativeData';
import { RHFInputCell } from './components/RHFInputCell';
import { getDesciptions } from './WQSSection';
import { Icon } from '@/shared/components';
import { useFormContext } from 'react-hook-form';
import clsx from 'clsx';

interface CalculationSectionProps {
  comparativeData: Record<string, string>[];
}

export const CalculationSection = ({ comparativeData }: CalculationSectionProps) => {
  const { getValues } = useFormContext();

  let scoreConfiguration: ColumnDef[] = [
    {
      id: 'factorId',
      header: <div>Factor</div>,
      name: 'factorId',
      className: 'w-60 border-r border-neutral-300',
      renderCell: ({ fieldName, ctx, rowIndex, value }) => {
        if (rowIndex >= ctx.template[0].calculationFactors.length) {
          const comparativeFactors =
            ctx.comparativeFactors?.map(compFact => ({
              label: getDesciptions(compFact.factorId),
              value: compFact.factorId,
            })) ?? [];
          return (
            <RHFInputCell fieldName={fieldName} inputType="select" options={comparativeFactors} />
          );
        }
        return (
          <div className="w-full truncate" title={getDesciptions(value) ?? ''}>
            <span>{getDesciptions(value) ?? ''}</span>
          </div>
        );
      },
    },
    {
      id: 'weight',
      header: <div>Weight</div>,
      name: 'weight',
      className: 'w-30 border-r border-neutral-300',
      rhfRenderCell: { inputType: 'number' },

      renderFooter: ({ fieldName, rows, ctx, columnIndex }) => {
        const totalWeight = rows.reduce((acc, curr) => {
          return acc + curr[columnIndex];
        }, 0);
        return (
          <div
            className={clsx(
              'flex justify-end items-center text-right text-sm font-normal text-gray-400',
            )}
          >
            {`${totalWeight}`}
          </div>
        );
      },
    },
    {
      id: 'intensity',
      header: <div>Intensity</div>,
      name: 'intensity',
      className: 'w-30 border-r border-neutral-300',
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
              'flex justify-end items-center text-right text-sm font-normal',
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
      header: <div>Score</div>,
      className: 'w-30 border-r border-neutral-300',
      renderCell: ({ fieldName, row, rowIndex, value, ctx }) => (
        <span>{`${row['weight'] * row['intensity']}`}</span>
      ),
      align: 'right',
    },
  ];

  if (comparativeData) {
    scoreConfiguration = [
      ...scoreConfiguration,
      ...comparativeData.map((data, index) => {
        return {
          id: data.id,
          name: `surveys.${index}.value`,
          className: 'border-r border-neutral-300 w-60',
          header: (
            <div className="flex flex-col">
              <div className="flex justify-center items-center truncate">
                <span>Survey {index + 1}</span>
              </div>
              <div className="flex flex-row justify-between items-start gap-2 text-wrap ">
                <div className="text-left p-2">Score</div>
                <div className="text-right p-2">Weighted Score</div>
              </div>
            </div>
          ),

          renderCell: ({ fieldName, row }) => {
            const value = getValues(fieldName) ?? 0;
            const score = row['weight'] * value;
            return (
              <div className="flex flex-row justify-between items-center">
                <div className="w-18">
                  <RHFInputCell fieldName={fieldName} inputType="number" />
                </div>
                <div>
                  <span>{Number.isFinite(score) ? score.toFixed(0) : 0}</span>
                </div>
              </div>
            );
          },

          renderFooter: ({ rows }) => {
            const totalScore = rows.reduce((acc, curr) => {
              const score = curr['surveys'][index]?.value ?? 0;
              const weight = curr['weight'] ?? 0;
              return acc + score * weight;
            }, 0);

            return (
              <div className="flex justify-end items-center text-right text-sm font-normal text-gray-400">
                {Number.isFinite(totalScore) ? totalScore.toFixed(0) : 0}
              </div>
            );
          },
        };
      }),
    ];
  }

  scoreConfiguration = [
    ...scoreConfiguration,
    {
      id: 'collateral',
      name: 'collateral',
      className: 'border-r border-neutral-300',
      header: (
        <div className="flex flex-col w-full h-full">
          <div className="flex justify-center items-start w-full h-full border-b border-neutral-300 p-2">
            <span>collateral</span>
          </div>
          <div className="flex flex-row justify-between items-start gap-2 text-wrap ">
            <div className="text-left p-2">Score</div>
            <div className="text-right p-2">Weighted Score</div>
          </div>
        </div>
      ),
      renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
        const score = row['weight'] * value;
        return (
          <div className="flex flex-row justify-between items-center">
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
          <div className="flex justify-end items-center text-right text-sm font-normal text-gray-400">
            {Number.isFinite(totalScore) ? totalScore.toFixed(0) : 0}
          </div>
        );
      },
    },
    {
      id: 'action',
      header: <div></div>,
      className: 'w-16',
      renderCell: ({ rowIndex, onRemove, ctx }) => {
        /*
          factor which was set from template not allow to change
         */
        if (rowIndex >= ctx.template[0].calculationFactors.length)
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

  const columnGroups: ColumnGroup[] = [
    {
      id: 'calculation',
      label: <div className="p-2">Calculation</div>,
      columns: ['intensity', 'score'],
      align: 'center',
      className: 'border-b border-r border-neutral-300',
    },
    {
      id: 'comparativeData',
      label: <div className="p-2">Comparative Data</div>,
      columns: comparativeData.map((data, index) => data.id),
      align: 'center',
      className: `border-b border-r border-neutral-300`,
    },
  ];

  return (
    <div className="border border-neutral-300 rounded-lg overflow-clip">
      <RHFArrayTable
        name="WQSScores"
        columns={scoreConfiguration}
        groups={columnGroups}
        defaultRow={DEFAULT_WQSSCORE_ROW}
        ctx={{
          factors: ALL_FACTORS,
          template: TEMPLATE,
          surveyData: MOC_SELECTED_COMPARATIVE_SURVEY_DATA_LAND,
          property: PROPERTIES[0],
        }}
        watch={{ comparativeFactors: 'comparativeData' }}
      />
      <div className="border-y border-neutral-300 flex justify-center h-14 text-sm items-center">
        {`Scoring Criteria : 1-2 Very low, 3-4 Fair, 5-6 Average, 7-8 Good, 9-10 Very Good`}
      </div>
      <RHFArrayTable
        name="WQSCalculations"
        dataAlignment="vertical"
        rows={calculationRows}
        hasHeader={false}
        hasAddButton={false}
        canEdit={true}
        watch={{ WQSScores: 'WQSScores' }}
      />
    </div>
  );
};
