import type { ComputeCtx } from './useDerivedFieldArray';

/*
 * What is left of the old config-driven building table: the header config the pricing Cost of
 * Building table (BuildingCostTable) is declared in, and `toNumber`. The editable depreciation
 * table is BuildingDetail (tables/BuildingDetail.tsx), on the form table kit.
 */

type Align = 'left' | 'right' | 'center';

export type FormTableHeader =
  | FormTableDerivedHeader
  | FormTableRowTextInputHeader
  | FormTableRowNumberInputHeader
  | FormTableRowGroupHeader
  | FormTableRowRunNumberHeader
  | FormTableDisplayHeader;

type HeaderType =
  | 'general'
  | 'display'
  | 'derived'
  | 'input-text'
  | 'input-number'
  | 'input-dropdown'
  | 'row-number'
  | 'group'
  | 'component';

interface BaseHeader {
  type: HeaderType;
  headerName: string;
  align?: Align;
  isStickyRight?: boolean;
  className?: string;
  groupName?: string;
  tooltip?: string;
  isComputed?: boolean;
}

interface FormTableDerivedHeader extends BaseHeader {
  type: 'derived';
  name: string;

  render?: (ctx: { value: any; row: any; rowIndex: number }) => React.ReactNode; // customize view rendering (optional)

  compute?: (ctx: ComputeCtx) => number;
  normalize?: (v: number) => number;
  modifier?: (v: string) => string;

  // groupLabel is set on a group's subtotal row, absent on the grand total.
  footer?: (ctx: { rows: any[]; groupLabel?: string }) => React.ReactNode;
}

interface FormTableDisplayHeader extends BaseHeader {
  type: 'display';
  value: string;
  render?: (value: any) => React.ReactNode;
}

interface FormTableRowGroupHeader extends BaseHeader {
  type: 'group';
}

interface FormTableRowTextInputHeader extends BaseHeader {
  type: 'input-text';
  name: string;

  render?: (value: string) => React.ReactNode;
  modifier?: (v: string) => string;

  footer?: (values: string[]) => React.ReactNode;
}

interface FormTableRowNumberInputHeader extends BaseHeader {
  type: 'input-number';
  name: string;
  maxIntegerDigits?: number;
  decimalPlaces?: number;

  render?: (value: number) => React.ReactNode;

  compute?: (ctx: ComputeCtx) => number;
  normalize?: (v: number) => number;

  footer?: (values: number[]) => React.ReactNode;
}

interface FormTableRowRunNumberHeader extends BaseHeader {
  type: 'row-number';
  rowNumberColumn: boolean;
}

export function toNumber(v: string) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}
