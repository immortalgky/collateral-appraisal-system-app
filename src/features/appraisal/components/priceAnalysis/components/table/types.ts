import type { ListBoxItem } from '@shared/components';

export type Align = 'left' | 'center' | 'right';

export type GridRow<Row extends Record<string, any>, Value = any> = {
  id: string; // stable key
  value: Value; // original row object
  rowDef?: Row; // row definition
};

export type GridCellCtx<RawRow, Ctx> = {
  row: GridRow<RawRow>;
  rowIndex: number;
  ctx: Ctx;
};

export type GridColumn<RawRow, Ctx> = {
  id: string;
  header?: React.ReactNode;
  style?: {
    headerClassName?: string;
    bodyClassName?: string;
    footerClassName?: string;
  };
  align?: Align;

  rhf?: {
    inputType?: 'number' | 'select' | 'text' | 'display';
    options?: ListBoxItem[];
  };

  renderCell: (cell: GridCellCtx<RawRow, Ctx>) => React.ReactNode;

  renderFooter?: (args: { rows: GridRow<RawRow>[]; ctx: Ctx }) => React.ReactNode;
};

export type GridGroup = {
  id: string;
  label: React.ReactNode;
  columnIds: string[];
  className?: string;
  align?: Align;
};
