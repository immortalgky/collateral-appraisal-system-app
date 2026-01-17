export type Align = 'left' | 'center' | 'right';

export interface ColumnGroup {
  id: string;
  label: React.ReactNode;
  columns: string[]; // id of columns under this group
  align?: Align;
  className?: string;
}

export interface ColumnDef<Row = Record<string, any>, Ctx = Record<string, any>> {
  id: string;
  name?: string;
  header?: React.ReactNode;
  align?: Align;
  className?: string;

  rhfRenderCell?: {
    inputType: 'text' | 'number' | 'select' | 'display';
    options?: { label: string; value: string }[];
  };

  renderCell?: (args: {
    fieldName: string;
    row: Row;
    rowIndex: number;
    value: any;
    ctx: Ctx;
  }) => React.ReactNode;

  accessor?: (row: Row, rowIndex: number, ctx: Ctx) => any;

  renderFooter?: (args: { rows: Row[]; ctx: Ctx; columnIndex: string }) => React.ReactNode;
}

export type RHFColumn<Row = Record<string, any>, Ctx = Record<string, any>> = ColumnDef & {
  derived?: {
    compute: (args: { row: Row; rows: Row[]; rowIndex: number; ctx: Ctx }) => number;

    normalize?: (v: number) => number;
    persist?: boolean; // default true
  };

  format?: (value: any, row: Row, rowIndex: number, ctx: Ctx) => React.ReactNode;
};

export type RowDef<Column = Record<string, any>, Ctx = Record<string, any>> = {
  id: string;
  name?: string;
  header?: React.ReactNode;
  align?: Align;
  className?: string;

  rhfRenderCell?: {
    inputType: 'text' | 'number' | 'select' | 'display';
    options?: { label: string; value: string }[];
  };

  renderCell?: (args: {
    fieldName: string;
    column: any;
    columns: any[];
    columnIndex: number;
    value: any;
    ctx: Ctx;
  }) => React.ReactNode;

  accessor?: (column: Column, columnIndex: number, ctx: Ctx) => any;

  renderFooter?: (args: { columns: Column[]; columnIndex: string; ctx: Ctx }) => React.ReactNode;
};

export type RHFRow<Column = Record<string, any>, Ctx = Record<string, any>> = RowDef & {
  derived?: {
    compute: (args: { column: Column; columns: Column[]; columnIndex: number; ctx: Ctx }) => number;

    normalize?: (v: number) => number;
    persist?: boolean; // default true
  };

  format?: (value: any, column: Column, Column: number, ctx: Ctx) => React.ReactNode;
};
