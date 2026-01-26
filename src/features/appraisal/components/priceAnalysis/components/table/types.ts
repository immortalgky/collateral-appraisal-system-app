export type Align = 'left' | 'center' | 'right';

export type GridRow<Raw = any> = {
  id: string; // stable key
  raw: Raw; // original row object
};

export type GridCellCtx<RawRow, Ctx> = {
  row: GridRow<RawRow>;
  rowIndex: number;
  ctx: Ctx;
  actions: {
    onAdd: any; // TODO
    onRemove: any; // TODO
  };
};

export type GridColumn<RawRow, Ctx> = {
  id: string;
  header?: React.ReactNode;
  className?: string;
  align?: Align;

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
