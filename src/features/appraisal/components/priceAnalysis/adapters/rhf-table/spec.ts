export type RHFInputType = 'text' | 'number' | 'select' | 'display';

export type RHFCellBinding = {
  inputType: RHFInputType;
  options?: { label: string; value: string }[];
};

export type RHFHorizontalColumn<Row, Ctx> = {
  id: string;
  header?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';

  /** field name inside a row object: e.g. "weight" or "surveys.0.surveyScore" */
  field?: string;

  /** optional RHF default renderer */
  rhf?: RHFCellBinding;

  /** optional custom cell */
  render?: (args: {
    fieldPath: string; // e.g. "WQSScores.2.weight"
    row: Row;
    rowIndex: number;
    ctx: Ctx;
    value: any;
    actions: {
      addColumn: () => void;
      removeColumn: (columnIndex: number) => void;
    };
  }) => React.ReactNode;

  // derived?: {
  //   targetPath: string;
  //   deps: string[];
  //   compute: (args: { getValues: any; ctx: Ctx }) => any;
  //   normalize?: (v: any) => any;
  //   setValueOptions?: {
  //     shouldDirty?: boolean;
  //     shouldTouch?: boolean;
  //     shouldValidate?: boolean;
  //   };
  // };

  accessor?: (args: { row: Row; rowIndex: number; ctx: Ctx }) => any;

  footer?: (args: { rows: Row[]; ctx: Ctx }) => React.ReactNode;
};

export type RHFVerticalRowDef<ColumnItem, Ctx> = {
  id: string;
  header?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';

  /** field name inside the column item: e.g. "offeringPriceAdjustmentPct" */
  field?: string;

  rhf?: RHFCellBinding;

  render?: (args: {
    fieldPath: string; // e.g. "WQSCalculations.1.offeringPriceAdjustmentPct"
    columnItem: ColumnItem;
    columnIndex: number;
    ctx: Ctx;
    value: any;
    actions: {
      addColumn: () => void;
      removeColumn: (columnIndex: number) => void;
    };
  }) => React.ReactNode;

  accessor?: (args: { columnItem: ColumnItem; columnIndex: number; ctx: Ctx }) => any;
};
