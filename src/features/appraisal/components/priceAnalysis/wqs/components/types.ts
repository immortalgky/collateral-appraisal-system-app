export type Align = 'left' | 'center' | 'right';

export interface ColumnGroup {
  id: string;
  label: React.ReactNode;
  columns: string[]; // id of columns under this group
  align?: Align;
  className?: string;
}

export interface ColumnDef {
  id: string;
  header: React.ReactNode;
  align?: Align;
  className?: string;

  accessor?: (row: any, rowIndex: number, ctx: Ctx) => any;

  renderCell?: (args: { row: any; rowIndex: number; value: any; ctx: Ctx }) => React.ReactNode;

  renderFooter?: (args: { rows: any[]; ctx: Ctx; columnIndex: string }) => React.ReactNode;
}
