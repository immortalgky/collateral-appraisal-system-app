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

interface CalculationSectionProps {
  comparativeData: Record<string, string>[];
}

export const CalculationSection = ({ comparativeData }: CalculationSectionProps) => {
  let scoreConfiguration: ColumnDef[] = [
    {
      id: 'factorId',
      header: <div>Factor</div>,
      name: 'factorId',
      className: 'w-60',
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
      className: 'w-30',
      rhfRenderCell: { inputType: 'number' },

      renderFooter: ({ fieldName, rows, ctx, columnIndex }) => {
        const totalWeight = rows.reduce((acc, curr) => {
          return acc + curr[columnIndex];
        }, 0);
        return (
          <div>
            <span>{`${totalWeight}`}</span>
          </div>
        );
      },
    },
    {
      id: 'intensity',
      header: <div>Intensity</div>,
      name: 'intensity',
      className: 'w-30',
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
          <div>
            <span>{`${totalIntensity}`}</span>
          </div>
        );
      },
    },
    {
      id: 'score',
      header: <div>Score</div>,
      className: 'w-30',
      renderCell: ({ fieldName, row, rowIndex, value, ctx }) => (
        <span>{`${row['weight'] * row['intensity']}`}</span>
      ),
      renderOnEditingCell: ({ fieldName, row, rowIndex, value, ctx }) => {
        return <span>{`${row['weight'] * row['intensity']}`}</span>;
      },
      align: 'right',
    },
  ];

  if (comparativeData) {
    scoreConfiguration = [
      ...scoreConfiguration,
      ...comparativeData.map((data, index) => {
        console.log(data, index);
        return {
          id: data.id,
          name: `surveys.${index}.value`,
          header: (
            <div className="flex flex-col">
              <div className="flex justify-center items-center truncate">
                <span>Survey {index + 1}</span>
              </div>
              <div className="flex flex-row justify-between items-start gap-2 text-wrap ">
                <span className="text-left">Score</span>
                <span className="text-right">Weighted Score</span>
              </div>
            </div>
          ),

          renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
            return (
              <div className="flex flex-row justify-between items-center">
                <div className="w-18">
                  <RHFInputCell fieldName={fieldName} inputType="number" />
                </div>
                <div>
                  {/* <span>{`${row['weight'] * row.score}`}</span> */}
                  <span>{`${row['weight'] * row['survey1']}`}</span>
                </div>
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
      header: (
        <div className="flex flex-col w-full h-full">
          <div className="flex justify-center items-start w-full h-full">
            <span>collateral</span>
          </div>
          <div className="flex flex-row justify-between items-start gap-2 text-wrap ">
            <span className="text-left">Score</span>
            <span className="text-right">Weighted Score</span>
          </div>
        </div>
      ),
      renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
        return (
          <div className="flex flex-row justify-between items-center">
            <div className="w-18">
              <RHFInputCell fieldName={fieldName} inputType="number" />
            </div>
            <div>
              {/* <span>{`${row['weight'] * value.score}`}</span> */}
              <span>{`${row['weight'] * row['collateral']}`}</span>
            </div>
          </div>
        );
      },
      renderOnEditingCell: ({ fieldName, row, rowIndex, value, ctx }) => {
        return (
          <div className="flex flex-row justify-between items-center">
            <div className="w-18">
              <span>{value ?? ''}</span>
            </div>
            <div>
              {/* <span>{`${row['weight'] * row.score}`}</span> */}
              <span>{`${row['weight'] * row['survey1']}`}</span>
            </div>
          </div>
        );
      },
    },
  ];

  const columnGroups: ColumnGroup[] = [
    {
      id: 'group 1',
      label: <span>Calculation</span>,
      columns: ['intensity', 'score'],
      align: 'center',
      className: 'w-60',
    },
    {
      id: 'group 2',
      label: <span>Comparative Data</span>,
      columns: comparativeData.map((data, index) => `${data.id}`),
      align: 'center',
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
