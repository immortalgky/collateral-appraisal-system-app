import { NumberInput } from '@/shared/components';
import type { ColumnDef, ColumnGroup } from './types';

export const columns: ColumnDef[] = [
  {
    id: 'factor',
    header: <div>Factor</div>,
    renderCell: ({ row, rowIndex, value, ctx }) => {
      return (
        <div>
          <span>{`${value}`}</span>
        </div>
      );
    },
  },
  {
    id: 'weight',
    header: <div>Weight</div>,
    renderCell: ({ row, rowIndex, value, ctx }) => {
      return (
        <div>
          <NumberInput />
        </div>
      );
    },

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
    renderCell: ({ row, rowIndex, value, ctx }) => {
      return (
        <div>
          <NumberInput />
        </div>
      );
    },
    renderFooter: ({ rows, ctx, columnIndex }) => {
      const totalIntensity = rows.reduce((acc, curr) => {
        return acc + curr[columnIndex];
      }, 0);
      return (
        <div>
          <span>{`${totalIntensity}`}</span>;
        </div>
      );
    },
  },
  {
    id: 'score',
    header: <div>Score</div>,
    renderCell: ({ row, rowIndex, value, ctx }) => {
      return (
        <div>
          <span>{`${row.weight * row.intensity}`}</span>
        </div>
      );
    },
  },
  {
    id: 'survey1',
    header: (
      <div className="flex flex-col">
        <span>Survey 1</span>
        <div className="flex justify-between items-center">
          <span>Score</span>
          <span>Weighted Score</span>
        </div>
      </div>
    ),

    renderCell: ({ row, rowIndex, value, ctx }) => {
      return (
        <div>
          <span>{`${value}`}</span>
        </div>
      );
    },
  },
  {
    id: 'survey2',
    header: (
      <div className="flex flex-col">
        <span>Survey 2</span>
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
];

export const columnGroups: ColumnGroup[] = [
  {
    id: 'group 1',
    label: <span>Group 1</span>,
    columns: ['intensity', 'score'],
    align: 'center',
  },
  {
    id: 'group 2',
    label: <span>Group 2</span>,
    columns: ['survey1', 'survey2'],
    align: 'center',
  },
];

export const rows: Record<string, any>[] = [
  {
    factor: 'environment',
    weight: 1,
    intensity: 10,
    surveys: [
      { id: 'survey1', score: 5 },
      { id: 'survey2', score: 7 },
    ],
  },
  {
    factor: 'plotLocation',
    weight: 2,
    intensity: 10,
    surveys: [
      { id: 'survey1', score: 5 },
      { id: 'survey2', score: 7 },
    ],
  },
];
