import type { ColumnDef, ColumnGroup } from './types';

export const columns: ColumnDef[] = [
  {
    id: 'factor',
    header: <div>Header 1</div>,
  },
  {
    id: 'weight',
    header: <div>Header 2</div>,
  },
  {
    id: 'intensity',
    header: <div>Header 3</div>,
  },
  {
    id: 'score',
    header: <div>Header 5</div>,
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
  },
];

export const columnGroups: ColumnGroup[] = [
  {
    id: 'group 1',
    label: <span>Group 1</span>,
    columns: ['factor', 'weight', 'intensity', 'score'],
  },
];
