import { NumberInput } from '@/shared/components';
import type { ColumnDef, ColumnGroup, RHFColumn } from './types';
import { RHFInputCell } from './RHFInputCell';

export const columns: RHFColumn[] = [
  {
    id: 'factor',
    header: <div>Factor</div>,
    name: 'factor',
    rhfRenderCell: {
      inputType: 'select',
      options: [
        { label: 'environment', value: 'Environment' },
        { label: 'plotLocation', value: 'Plot Location' },
      ],
    },
  },
  {
    id: 'weight',
    header: <div>Weight</div>,
    name: 'weight',
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
    rhfRenderCell: { inputType: 'number' },
    align: 'right',

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
    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => (
      <span>{`${row['intensity'] * row['weight']}`}</span>
    ),
    align: 'right',
  },
  {
    id: 'survey1',
    name: 'survey1',
    header: (
      <div className="flex flex-col">
        <div className="flex justify-center items-center">
          <span>Survey 1</span>
        </div>
        <div className="flex flex-row justify-between items-center">
          <span>Score</span>
          <span>Weighted Score</span>
        </div>
      </div>
    ),

    accessor: (row, rowIndex, ctx) => ({
      score: row['survey1'],
    }),

    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      console.log(fieldName);
      return (
        <div className="flex flex-row justify-between items-center">
          <div>
            <RHFInputCell fieldName={fieldName} inputType="number" />
          </div>
          <div>
            <span>{`${row['weight'] * value.score}`}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: 'survey2',
    name: 'survey2',
    header: (
      <div className="flex flex-col">
        <div className="flex justify-center items-center">
          <span>Survey 2</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Score</span>
          <span>Weighted Score</span>
        </div>
      </div>
    ),

    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div>
          <span>{`${value}`}</span>;
        </div>
      );
    },
  },
  {
    id: 'survey3',
    name: 'survey3',
    header: (
      <div className="flex flex-col">
        <div className="flex justify-center items-center">
          <span>Survey 3</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Score</span>
          <span>Weighted Score</span>
        </div>
      </div>
    ),

    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div>
          <span>{`${value}`}</span>;
        </div>
      );
    },
  },
  {
    id: 'collateral',
    header: (
      <div className="flex flex-col">
        <span>Collateral</span>
      </div>
    ),

    renderCell: ({ fieldName, row, rowIndex, value, ctx }) => {
      return (
        <div>
          <span>{`${value}`}</span>;
        </div>
      );
    },
  },
];

export const columnGroups: ColumnGroup[] = [
  {
    id: 'group 1',
    label: <span>Calculation</span>,
    columns: ['intensity', 'score'],
    align: 'center',
  },
  {
    id: 'group 2',
    label: <span>Comparative Data</span>,
    columns: ['survey1', 'survey2', 'survey3'],
    align: 'center',
  },
];

export const rows: Record<string, any>[] = [
  {
    factor: '',
    weight: 1,
    intensity: 10,
    survey1: 0,
    survey2: 0,
    survey3: 0,
    collateral: 0,
  },
];
