import {
  Fragment,
  type ComponentProps,
  type ComponentType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useFormReadOnly } from '../context';
import { FormLayoutProvider } from '../FormLayoutProvider';
import { useFormLayout } from '../formLayoutContext';
import { FormTableAdd, FormTableEmpty } from './FormTableAdd';
import { ALIGN, BLEED, FROZEN, tableStyles } from './styles';
import type {
  FormTableAddAction,
  FormTableCellContext,
  FormTableColumn,
  FormTableColumnKind,
} from './types';
import { useTableCards } from './useTableCards';

type Frozen = 'first' | 'last' | undefined;

const INDEX_WIDTH = '2.8571rem';
const SPAN = { 3: 'col-span-3', 4: 'col-span-4', 6: 'col-span-6', 12: 'col-span-12' } as const;

/** The "no value" mark for a read-only cell. */
export const FormTableDash = () => <span className="text-(--palette-ink-3)">—</span>;

const kindOf = <Row,>(c: FormTableColumn<Row>): FormTableColumnKind => c.kind ?? 'text';

/** Cell content of a column for one row; the `index` column draws the row number itself. */
const content = <Row,>(c: FormTableColumn<Row>, row: Row, ctx: FormTableCellContext) =>
  kindOf(c) === 'index' && !c.cell ? ctx.position + 1 : c.cell?.(row, ctx);

// ─── building blocks ──────────────────────────────────────────────────────────────────────────

interface FormTableCellProps {
  kind?: FormTableColumnKind;
  align?: 'start' | 'end' | 'center';
  valign?: 'top';
  className?: string;
  /** A band cell that runs across columns (a group heading row). */
  colSpan?: number;
  /** Wide tables only: the first and the action column stay put while the rest scroll. */
  frozen?: Frozen;
  children?: ReactNode;
}

/**
 * A body cell. `kind` picks the per-kind look. Its inputs size themselves: pass `cell` to
 * Input / NumberInput / Dropdown and they are 28px in Compact, the normal control in Standard.
 */
export function FormTableCell({
  kind = 'text',
  align,
  valign,
  className,
  colSpan,
  frozen,
  children,
}: FormTableCellProps) {
  const s = tableStyles[useFormLayout()];
  return (
    <td
      colSpan={colSpan}
      className={clsx(
        s.td,
        ALIGN[align ?? (kind === 'action' ? 'end' : kind === 'index' ? 'center' : 'start')],
        valign === 'top' && 'align-top!',
        kind === 'index' && 'text-(--palette-ink-2)',
        frozen && FROZEN[frozen],
        className,
      )}
    >
      {children}
    </td>
  );
}

export function FormTableRow(props: ComponentProps<'tr'>) {
  return <tr {...props} />;
}

/**
 * The kit's bare `<table>` in a sideways-scrolling box, for a table whose rows are not one record
 * each (group bands, subtotals) and so cannot be a `FormTable`. Build it from `FormTableHead`,
 * `FormTableRow` and `FormTableCell`; `minWidth` (rem) is the width below which it scrolls.
 */
export function FormTableFrame({
  minWidth,
  bleed,
  children,
}: {
  minWidth?: number;
  /** Standard: pad the edge cells 12px instead of relying on a padded parent (rows run full width). */
  bleed?: boolean;
  children: ReactNode;
}) {
  const layout = useFormLayout();
  const s = tableStyles[layout];
  const style = minWidth != null ? { minWidth: `${minWidth}rem` } : undefined;
  return (
    <div className="overflow-x-auto">
      <table className={clsx(s.table, bleed && layout === 'standard' && BLEED)} style={style}>
        {children}
      </table>
    </div>
  );
}

/**
 * A pinned head: its cells stick to the top of the scroll box. They paint their own ground
 * (Compact's head is tinted already; Standard's has no fill, so it gets the surface).
 */
const STICKY_HEAD = {
  standard: 'sticky top-0 z-10 bg-(--palette-surface)',
  compact: 'sticky top-0 z-10',
};

interface FormTableHeadProps<Row> {
  columns: FormTableColumn<Row>[];
  frozen: (index: number) => Frozen;
  /** Pin the head cells (a one-level head). */
  sticky?: boolean;
}

/** The head: one row, or two when any column has a `group` (group cells above, sub-headers below). */
export function FormTableHead<Row>({ columns, frozen, sticky }: FormTableHeadProps<Row>) {
  const layout = useFormLayout();
  const s = tableStyles[layout];
  const grouped = columns.some(c => c.group != null);

  const th = (c: FormTableColumn<Row>, i: number, rowSpan?: number) => (
    <th
      key={c.key}
      scope="col"
      rowSpan={rowSpan}
      className={clsx(
        s.th,
        ALIGN[c.align ?? (kindOf(c) === 'index' ? 'center' : 'start')],
        sticky && STICKY_HEAD[layout],
        frozen(i) && FROZEN[frozen(i)!],
      )}
    >
      {c.header}
    </th>
  );

  if (!grouped)
    return (
      <thead>
        <tr>{columns.map((c, i) => th(c, i))}</tr>
      </thead>
    );

  const top: ReactNode[] = [];
  for (let i = 0; i < columns.length; ) {
    const c = columns[i];
    if (c.group == null) {
      top.push(th(c, i, 2));
      i += 1;
      continue;
    }
    let end = i + 1;
    while (end < columns.length && columns[end].group === c.group) end += 1;
    top.push(
      <th key={c.key} scope="colgroup" colSpan={end - i} className={clsx(s.th, s.group)}>
        {c.group}
      </th>,
    );
    i = end;
  }
  return (
    <thead>
      <tr>{top}</tr>
      <tr>{columns.map((c, i) => (c.group != null ? th(c, i) : null))}</tr>
    </thead>
  );
}

interface FormTableTotalsProps<Row> {
  columns: FormTableColumn<Row>[];
  /** "รวม · n รายการ", put in the first column that is neither the index nor the actions. */
  label: ReactNode;
  frozen: (index: number) => Frozen;
}

/** The totals row (`<tfoot>`): the label, then each column's `total`, bold. */
export function FormTableTotals<Row>({ columns, label, frozen }: FormTableTotalsProps<Row>) {
  const s = tableStyles[useFormLayout()];
  const labelAt = columns.findIndex(c => !['index', 'action'].includes(kindOf(c)));
  let labelEnd = labelAt;
  while (
    labelAt >= 0 &&
    labelEnd + 1 < columns.length &&
    columns[labelEnd + 1].total == null &&
    kindOf(columns[labelEnd + 1]) !== 'action'
  )
    labelEnd += 1;
  return (
    <tfoot>
      <tr>
        {columns.map((c, i) => {
          // The label runs over the empty columns after it, so a narrow first column does not wrap it
          if (i > labelAt && i <= labelEnd) return null;
          return (
            <td
              key={c.key}
              colSpan={i === labelAt ? labelEnd - labelAt + 1 : undefined}
              className={clsx(
                s.totalsTd,
                ALIGN[c.align ?? 'start'],
                i === labelAt && 'whitespace-nowrap',
                frozen(i) && FROZEN[frozen(i)!],
              )}
            >
              {i === labelAt ? label : c.total}
            </td>
          );
        })}
      </tr>
    </tfoot>
  );
}

// ─── the table ────────────────────────────────────────────────────────────────────────────────

export interface FormTableProps<Row> {
  columns: FormTableColumn<Row>[];
  /** In display order. */
  rows: Row[];
  rowKey: (row: Row, position: number) => string | number;
  /**
   * Makes it a wide table, in rem. The table scrolls sideways with the first and action columns
   * frozen; in a narrow form shell that cannot fit it, it turns into one card per row.
   */
  minWidth?: number;
  /** Extra props for a row's `<tr>` (a key handler, a data attribute). Table mode only. */
  rowProps?: (row: Row, position: number) => HTMLAttributes<HTMLTableRowElement>;
  /**
   * Draws each row's `<tr>` itself, for a row that needs a hook (a sortable row). It gets the
   * `rowProps` and the row's cells as `children`, and must render a `<tr>` with all of them.
   */
  rowElement?: ComponentType<FormTableRowElementProps>;
  /**
   * Content under a row across all columns: a warning line or a sub-form. Unstyled (give a line
   * `text-xs` yourself). In card mode it sits between the inputs and the results strip. Return
   * nothing for none.
   */
  rowNote?: (row: Row, position: number) => ReactNode;
  /** The "+ เพิ่ม…" actions. Not shown in read-only mode, nor while the table is empty (see `empty`). */
  add?: FormTableAddAction[];
  /** Shown instead of the table when there are no rows; its box is the add button. */
  empty?: { icon: string; message: string };
  /** Replaces "รวม · n รายการ" where a feature key fits the noun better. */
  totalLabel?: ReactNode;
  /** Read-only on top of the page's own flag (a table with its own `readOnly` prop). */
  readOnly?: boolean;
  /**
   * Rem. A long list scrolls inside this height and the head stays pinned (table mode; solid
   * head cells, so keep a one-level head).
   */
  maxHeight?: number;
  /** Standard: pad the edge cells 12px instead of relying on a padded parent (rows run full width). */
  bleed?: boolean;
}

/** What a `rowElement` gets: the `rowProps` as `<tr>` props, the cells as `children`, and the row's place. */
export type FormTableRowElementProps = Omit<ComponentProps<'tr'>, 'ref'> & { position: number };

/**
 * The editable / read-only table of a form (DESIGN.md 17.7). Reads the layout (`useFormLayout`) and
 * the page's read-only flag; `action` columns and the add actions disappear when read-only.
 */
export function FormTable<Row>({
  columns,
  rows,
  rowKey,
  minWidth,
  rowProps,
  rowElement: RowElement,
  rowNote,
  add = [],
  empty,
  totalLabel,
  readOnly: readOnlyProp,
  maxHeight,
  bleed,
}: FormTableProps<Row>) {
  const { t } = useTranslation('common');
  const layout = useFormLayout();
  const readOnly = useFormReadOnly() || !!readOnlyProp;
  const [ref, cards] = useTableCards(minWidth);
  const s = tableStyles[layout];

  const cols = columns.filter(c => !(readOnly && kindOf(c) === 'action'));
  // A column with `show` belongs to one mode only (a stacked cell in the table, its parts in the card)
  const tableCols = cols.filter(c => c.show !== 'card');
  const cardCols = cols.filter(c => c.show !== 'table');
  const addActions = readOnly ? [] : add;
  const wide = minWidth != null;
  const frozen = (i: number): Frozen => {
    if (!wide) return undefined;
    if (i === 0) return 'first';
    return i === tableCols.length - 1 && kindOf(tableCols[i]) === 'action' ? 'last' : undefined;
  };
  const ctx = (position: number): FormTableCellContext => ({ position, readOnly });
  const hasTotals = cols.some(c => c.total != null);
  const label = totalLabel ?? t('table.totalItems', { count: rows.length });
  const isEmpty = rows.length === 0 && empty != null;

  let body: ReactNode;
  if (isEmpty)
    body = <FormTableEmpty icon={empty.icon} message={empty.message} actions={addActions} />;
  else if (cards)
    body = (
      <FormTableCards
        columns={cardCols}
        rows={rows}
        rowKey={rowKey}
        ctx={ctx}
        label={label}
        showTotals={hasTotals}
        rowNote={rowNote}
        inset={layout === 'compact'}
      />
    );
  else
    body = (
      <table
        className={clsx(s.table, bleed && layout === 'standard' && BLEED)}
        style={wide ? { minWidth: `${minWidth}rem` } : undefined}
      >
        {tableCols.some(c => c.width || kindOf(c) === 'index') && (
          <colgroup>
            {tableCols.map(c => (
              <col
                key={c.key}
                style={{ width: c.width ?? (kindOf(c) === 'index' ? INDEX_WIDTH : undefined) }}
              />
            ))}
          </colgroup>
        )}
        <FormTableHead columns={tableCols} frozen={frozen} sticky={maxHeight != null} />
        <tbody>
          {rows.map((row, position) => {
            const key = rowKey(row, position);
            const cells = tableCols.map((c, i) => (
              <FormTableCell
                key={c.key}
                kind={kindOf(c)}
                align={c.align}
                valign={c.valign}
                className={c.className}
                frozen={frozen(i)}
              >
                {content(c, row, ctx(position))}
              </FormTableCell>
            ));
            const note = rowNote?.(row, position);
            return (
              <Fragment key={key}>
                {RowElement ? (
                  <RowElement position={position} {...rowProps?.(row, position)}>
                    {cells}
                  </RowElement>
                ) : (
                  <FormTableRow {...rowProps?.(row, position)}>{cells}</FormTableRow>
                )}
                {note && (
                  <tr>
                    <td
                      colSpan={tableCols.length}
                      className="px-[0.5714rem] py-[0.5714rem] first:pl-0"
                    >
                      {note}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        {hasTotals && <FormTableTotals columns={tableCols} label={label} frozen={frozen} />}
      </table>
    );

  return (
    <div>
      {/* Always mounted: it is what the width observer measures, also while the table is empty. */}
      <div
        ref={ref}
        className={clsx(
          wide && !cards && 'overflow-x-auto',
          maxHeight != null && !cards && 'overflow-auto',
        )}
        style={maxHeight != null && !cards ? { maxHeight: `${maxHeight}rem` } : undefined}
      >
        {body}
      </div>
      {!isEmpty && addActions.length > 0 && <FormTableAdd actions={addActions} />}
    </div>
  );
}

// ─── card mode ────────────────────────────────────────────────────────────────────────────────

interface FormTableCardsProps<Row> {
  columns: FormTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row, position: number) => string | number;
  ctx: (position: number) => FormTableCellContext;
  label: ReactNode;
  showTotals: boolean;
  rowNote?: (row: Row, position: number) => ReactNode;
  /** Compact: the section body has no padding, so the cards bring the sheet's side padding. */
  inset?: boolean;
}

/**
 * One card per row, with Standard controls whatever the form's layout: a header strip ("n · title"
 * and the row actions), the inputs as labelled fields on a 12-column grid, and the `result` columns
 * as a strip of label / value; the totals follow as a grid.
 */
function FormTableCards<Row>({
  columns,
  rows,
  rowKey,
  ctx,
  label,
  showTotals,
  rowNote,
  inset,
}: FormTableCardsProps<Row>) {
  const actions = columns.filter(c => kindOf(c) === 'action');
  const titled = columns.find(c => c.card?.title);
  const zoned = columns.filter(c => !['index', 'action'].includes(kindOf(c)));
  const zone = (c: FormTableColumn<Row>) =>
    c.card?.zone ?? (kindOf(c) === 'derived' ? 'result' : 'input');
  const inputs = zoned.filter(c => zone(c) === 'input');
  const results = zoned.filter(c => zone(c) === 'result');
  const totals = columns.filter(c => c.total != null);

  return (
    <FormLayoutProvider layout="standard">
      <div
        className={clsx(
          // minmax(0,1fr): a card never grows past the box. The extra 1px left is the Compact body's -ml-px.
          'grid grid-cols-[minmax(0,1fr)] gap-[0.7143rem]',
          inset && 'pr-[0.8571rem] pl-[calc(0.8571rem+1px)] py-[0.5714rem]',
        )}
      >
        {rows.map((row, position) => {
          const cellCtx = ctx(position);
          const note = rowNote?.(row, position);
          return (
            <div
              key={rowKey(row, position)}
              className="overflow-hidden rounded-[0.7143rem] border border-(--palette-line)"
            >
              <div className="flex items-center gap-2 bg-(--palette-surface-2) px-[1.1429rem] py-[0.4286rem] text-xs font-semibold text-(--palette-ink)">
                <span className="min-w-0 truncate">
                  {position + 1}
                  {titled?.card?.title && <> · {titled.card.title(row, cellCtx)}</>}
                </span>
                <span className="ml-auto flex">
                  {actions.map(c => (
                    <span key={c.key}>{c.cell?.(row, cellCtx)}</span>
                  ))}
                </span>
              </div>
              <div className="grid grid-cols-12 gap-x-[1.1429rem] gap-y-[0.7143rem] px-[1.1429rem] py-[0.8571rem]">
                {inputs.map(c => (
                  <div key={c.key} className={clsx('min-w-0', SPAN[c.card?.span ?? 3])}>
                    <div className="mb-1 text-xs font-medium text-(--palette-ink)">
                      {c.card?.rowLabel?.(row, cellCtx) ?? c.card?.label ?? c.header}
                    </div>
                    {content(c, row, cellCtx)}
                  </div>
                ))}
              </div>
              {note && (
                // Between the zones: a warning line or a sub-form (the age-band editor).
                <div className="px-[1.1429rem] pb-[0.8571rem]">{note}</div>
              )}
              {results.length > 0 && (
                <dl className="grid grid-cols-4 gap-x-[1.1429rem] gap-y-[0.7143rem] border-t border-(--palette-line-soft) bg-(--palette-surface-2) px-[1.1429rem] py-[0.7143rem]">
                  {results.map(c => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-xs text-(--palette-ink-2)">
                        {c.card?.rowLabel?.(row, cellCtx) ?? c.card?.label ?? c.header}
                      </dt>
                      <dd className="text-right text-sm font-semibold tabular-nums">
                        {content(c, row, cellCtx)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
        {showTotals && (
          <div
            className="grid items-end gap-x-[1.1429rem] gap-y-[0.7143rem] border-t border-(--palette-ink-3) pt-[0.8571rem] font-bold"
            style={{ gridTemplateColumns: `1.3fr repeat(${totals.length}, minmax(0, 1fr))` }}
          >
            <div>{label}</div>
            {totals.map(c => (
              <div key={c.key} className="text-right tabular-nums">
                <small className="block text-xs font-medium text-(--palette-ink-2)">
                  {c.card?.label ?? c.header}
                </small>
                {c.total}
              </div>
            ))}
          </div>
        )}
      </div>
    </FormLayoutProvider>
  );
}
