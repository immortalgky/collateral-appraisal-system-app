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
  name?: string;
  header: React.ReactNode;
  align?: Align;
  className?: string;

  rhfRenderCell?: {
    inputType: 'text' | 'number' | 'select';
    options?: { label: string; value: string }[];
  };

  renderCell?: (args: {
    fieldName: string;
    row: any;
    rowIndex: number;
    value: any;
    ctx: Ctx;
  }) => React.ReactNode;

  accessor?: (row: any, rowIndex: number, ctx: Ctx) => any;

  renderFooter?: (args: { rows: any[]; ctx: Ctx; columnIndex: string }) => React.ReactNode;
}

export type RHFColumn = ColumnDef & {
  derived?: {
    compute: (args: { row: Row; rows: Row[]; rowIndex: number; ctx: Ctx }) => number;

    normalize?: (v: number) => number;
    persist?: boolean; // default true
  };

  format?: (value: any, row: Row, rowIndex: number, ctx: Ctx) => React.ReactNode;
};
