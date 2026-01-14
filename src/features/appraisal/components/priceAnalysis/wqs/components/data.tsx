import type { ColumnDef, ColumnGroup } from './types';

export const columns: ColumnDef[] = [
  {
    id: 'factor',
    header: <div>Factor</div>,
    renderCell: ({ row, rowIndex, value, ctx }) => {
      return <span>{`${value}`}</span>;
    },
  },
  {
    id: 'weight',
    header: <div>Weight</div>,
    renderCell: ({ row, rowIndex, value, ctx }) => {
      return <span>{`${value}`}</span>;
    },

    renderFooter: ({ rows, ctx, columnIndex }) => {
      const totalWeight = rows.reduce((acc, curr) => acc[columnIndex] + curr[columnIndex]);
      return <span>{`${totalWeight}`}</span>;
    },
  },
  {
    id: 'intensity',
    header: <div>Intensity</div>,
    renderCell: ({ row, rowIndex, value, ctx }) => {
      return <span>{`${value}`}</span>;
    },
    renderFooter: ({ rows, ctx, columnIndex }) => {
      const totalIntensity = rows.reduce((acc, curr) => acc[columnIndex] + curr[columnIndex]);
      return <span>{`${totalIntensity}`}</span>;
    },
  },
  {
    id: 'score',
    header: <div>Score</div>,
    renderCell: ({ row, rowIndex, value, ctx }) => {
      return <span>{`${row.weight * row.intensity}`}</span>;
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
      return <span>{`${value}`}</span>;
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
      return <span>{`${value}`}</span>;
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
      { id: 'survey1', score: 5, weightedScore: 6 },
      { id: 'survey2', score: 7, weightedScore: 7 },
    ],
  },
  {
    factor: 'plotLocation',
    weight: 2,
    intensity: 10,
    surveys: [
      { id: 'survey1', score: 5, weightedScore: 10 },
      { id: 'survey2', score: 7, weightedScore: 14 },
    ],
  },
];
