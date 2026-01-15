import { NumberInput } from '@/shared/components';
import type { ColumnDef, ColumnGroup, RHFColumn } from './types';
import { RHFInputCell } from './RHFInputCell';

export const columns: RHFColumn[] = [
  {
    id: 'factor',
    header: <div>Factor</div>,
    rhf: {
      name: 'factor',
      input: 'select',
      options: [
        { label: 'environment', value: 'Environment' },
        { label: 'plotLocation', value: 'Plot Location' },
      ],
    },
  },
  {
    id: 'weight',
    header: <div>Weight</div>,
    rhf: { name: 'weight', input: 'number' },

    renderFooter: ({ rows, ctx, columnIndex }) => {
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
    rhf: { name: 'intensity', input: 'number' },
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
    renderCell: ({ row, rowIndex, value, ctx }) => <span>{`${value}`}</span>,
    rhf: { name: 'score', input: 'display' },
    align: 'right',
    derived: {
      compute: ({ row, rows, rowIndex, ctx }) => {
        return row['intensity'] * row['weight'];
      },
    },
  },
  {
    id: 'survey1',
    header: (
      <div className="flex flex-col">
        <div className="flex justify-center items-center">
          <span>Survey 1</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Score</span>
          <span>Weighted Score</span>
        </div>
      </div>
    ),

    renderCell: ({ row, rowIndex, value, ctx }) => {
      return (
        <div>
          <RHFInputCell fieldName="survey1" inputType="number" />
        </div>
      );
    },
  },
  {
    id: 'survey2',
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

    renderCell: ({ row, rowIndex, value, ctx }) => {
      return (
        <div>
          <span>{`${value}`}</span>;
        </div>
      );
    },
  },
  {
    id: 'survey3',
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

    renderCell: ({ row, rowIndex, value, ctx }) => {
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

    renderCell: ({ row, rowIndex, value, ctx }) => {
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
