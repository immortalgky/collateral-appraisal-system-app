import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { act } from '@testing-library/react';
import { render, screen, waitFor, within } from '@/test/test-utils';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import LandTitleTable from './LandTitleTable';

// The drag needs layout (pointer coordinates), which happy-dom has not: keep the deduction list's
// drop handler and its row ids, and call it the way a drop would.
const dnd = vi.hoisted(() => ({
  onDragEnd: undefined as undefined | ((e: unknown) => void),
  ids: [] as string[],
}));
vi.mock('@dnd-kit/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: (props: {
      children: React.ReactNode;
      onDragEnd: (e: unknown) => void;
      accessibility?: { screenReaderInstructions?: { draggable?: string } };
    }) => {
      // The deed rows have a DndContext of their own; this is the deduction rows'.
      if (props.accessibility?.screenReaderInstructions?.draggable?.includes('deduction'))
        dnd.onDragEnd = props.onDragEnd;
      return <>{props.children}</>;
    },
  };
});
vi.mock('@dnd-kit/sortable', async importOriginal => {
  const actual = await importOriginal<typeof import('@dnd-kit/sortable')>();
  return {
    ...actual,
    SortableContext: (props: { children: React.ReactNode; items: string[] }) => {
      if (props.items.some(id => Number.isNaN(Number(id)))) dnd.ids = props.items;
      const Real = actual.SortableContext;
      return (
        <Real items={props.items} strategy={actual.verticalListSortingStrategy}>
          {props.children}
        </Real>
      );
    },
  };
});

// 1 rai + 50 wa = 450 sq.wa; one deduction of 30 leaves 420 (1-0-20).
const TITLES = [{ titleType: 'DEED', titleNumber: '10001', rai: 1, ngan: 0, squareWa: 50 }];
const ROW = { reasonCode: '', areaInSqWa: 30, remark: 'fence' };

const Harness = ({
  encroached = true,
  rows = [ROW],
  readOnly = false,
  titles = TITLES,
}: {
  encroached?: boolean;
  rows?: (typeof ROW)[];
  readOnly?: boolean;
  titles?: typeof TITLES;
}) => {
  const methods = useForm({
    defaultValues: { titles, isEncroached: encroached, landAreaDeductions: rows },
  });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...methods}>
        <LandTitleTable name="titles" fields={[]} deductions />
        <button type="button" onClick={() => methods.setValue('titles', [])}>
          drop deeds
        </button>
        <output data-testid="values">
          {JSON.stringify({
            isEncroached: methods.watch('isEncroached'),
            rows: methods.watch('landAreaDeductions')?.length,
          })}
        </output>
        <output data-testid="order">
          {JSON.stringify((methods.watch('landAreaDeductions') ?? []).map(r => r.remark))}
        </output>
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
};

const summary = () => document.querySelector('[data-area-summary]');
const bodyRows = () => [...document.querySelectorAll('tbody tr')] as HTMLTableRowElement[];
/** The 0-based column a cell starts at, counting the colSpan of the cells before it. */
const columnOf = (row: HTMLTableRowElement, cell: Element) => {
  let col = 0;
  for (const c of Array.from(row.cells)) {
    if (c === cell) return col;
    col += c.colSpan;
  }
  return -1;
};

describe('LandTitleTable deduction ledger', () => {
  it('shows the area summary as a strip under the table, outside the scroll box: deeds, deducted, area to appraise', () => {
    render(<Harness />);
    const card = summary()!;
    const table = document.querySelector('table')!;
    expect(card).not.toBeNull();
    // Not in the table, and not in the box that scrolls the rows.
    expect(table.contains(card)).toBe(false);
    expect(table.parentElement!.contains(card)).toBe(false);
    expect(document.querySelector('tfoot')).toBeNull();
    expect(card).toHaveTextContent('Per title deeds');
    expect(card).toHaveTextContent('1 parcels');
    expect(card).toHaveTextContent('450.00');
    expect(card).toHaveTextContent('Deducted');
    expect(card).toHaveTextContent('1 items');
    expect(card).toHaveTextContent('30.00 Sq.Wa');
    expect(card).toHaveTextContent('Area for appraisal');
    expect(card).toHaveTextContent('420.00');
  });

  it('lays the strip out as three tiles with the signs between them', () => {
    render(<Harness />);
    const card = summary()!;
    const tiles = [...card.querySelectorAll('[data-tile]')].map(t => t.getAttribute('data-tile'));
    expect(tiles).toEqual(['deed', 'deducted', 'net']);
    expect(
      [...card.children].map(c => c.textContent?.trim()).filter(t => t === '−' || t === '='),
    ).toEqual(['−', '=']);
    expect(card.querySelector('[data-tile="net"]')).toHaveClass('bg-(--palette-accent-wash)');
  });

  it('leaves out the deducted tile and the minus when nothing is deducted: deeds = area to appraise', () => {
    render(<Harness encroached={false} rows={[]} />);
    const card = summary()!;
    expect(card.querySelector('[data-tile="deducted"]')).toBeNull();
    expect(card.textContent).not.toContain('−');
    expect(card.textContent).toContain('=');
    expect([...card.querySelectorAll('[data-tile]')].map(t => t.getAttribute('data-tile'))).toEqual(
      ['deed', 'net'],
    );
  });

  it('keeps the scrolling body to the deeds and the deduction rows: no duplicate totals', () => {
    render(<Harness />);
    const body = document.querySelector('tbody')!;
    for (const text of ['Per title deeds', 'Deducted', 'Area for appraisal', 'Total'])
      expect(body).not.toHaveTextContent(text);
    expect(screen.getAllByText('Area for appraisal')).toHaveLength(1);
    expect(screen.getAllByText(/Per title deeds/)).toHaveLength(1);
  });

  it('shows two lines, the deed area as the area to appraise, when nothing is deducted', () => {
    render(<Harness encroached={false} rows={[]} />);
    const card = summary()!;
    expect(card).toHaveTextContent('Per title deeds');
    expect(card).toHaveTextContent('Area for appraisal');
    expect(card).not.toHaveTextContent('Deducted');
    expect(card.textContent?.match(/450\.00/g)).toHaveLength(2);
  });

  it('hides the deducted line while the switch is on but there are no items', () => {
    render(<Harness rows={[]} />);
    expect(summary()).not.toHaveTextContent('Deducted');
  });

  it('draws the deductions as a small table: a header in the deed columns, the rows, the add row last', () => {
    render(<Harness rows={[ROW, ROW]} />);
    const rows = bodyRows();
    const head = rows.find(r => r.querySelector('th'))!;
    // "#" under the deed numbers, the reason and remark across type..position, the amount under
    // the area column, an empty cell over the trash.
    expect([...head.querySelectorAll('th')].map(c => c.textContent)).toEqual([
      'Drag to reorder',
      '#',
      'ReasonRemark',
      'Area deducted (Sq.Wa)',
      '',
    ]);
    const deductionRows = rows.filter(r => r.querySelector('input[name$="areaInSqWa"]'));
    expect(deductionRows).toHaveLength(2);
    // Numbered, and no "−" or unit inside the amount field: the header carries the unit.
    expect([...deductionRows[1].cells].map(c => c.textContent)).toContain('2');
    expect(deductionRows[0].textContent).not.toContain('−');
    // Head, then the rows, then the add row as the table's last.
    expect(rows.indexOf(head)).toBeLessThan(rows.indexOf(deductionRows[0]));
    const add = screen.getByRole('button', { name: /Add deduction/ });
    expect(add.closest('tr')).toBe(rows[rows.length - 1]);
  });

  it('puts the amount under the deed area column and the trash under the deed trash', () => {
    render(<Harness />);
    const rows = bodyRows();
    const deed = rows[0];
    const deduction = rows.find(r => r.querySelector('input[name$="areaInSqWa"]'))!;
    const deedArea = [...deed.cells].find(c => c.textContent?.includes('450.00'))!;
    const dedArea = deduction.querySelector('input[name$="areaInSqWa"]')!.closest('td')!;
    expect(columnOf(deduction, dedArea)).toBe(columnOf(deed, deedArea));
    const trash = deduction.querySelector('button[aria-label^="Delete row"]')!.closest('td')!;
    const deedTrash = deed.querySelector('button[aria-label^="Delete row"]')!.closest('td')!;
    expect(columnOf(deduction, trash)).toBe(columnOf(deed, deedTrash));
  });

  it('shows just the header and the add row when the switch is on with no items', () => {
    render(<Harness rows={[]} />);
    const rows = bodyRows();
    expect(rows.some(r => r.querySelector('th'))).toBe(true);
    expect(rows.some(r => r.querySelector('input[name$="areaInSqWa"]'))).toBe(false);
    expect(screen.getByRole('button', { name: /Add deduction/ }).closest('tr')).toBe(
      rows[rows.length - 1],
    );
  });

  it('keeps the heading and the switch, but no rows and no deducted total, while it is off', () => {
    render(<Harness encroached={false} rows={[]} />);
    expect(screen.getByText('Deduct area')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'No' })).toBeInTheDocument();
    expect(screen.queryByText('Add deduction', { exact: false })).toBeNull();
  });

  it('names a deed row by its number for a screen reader', () => {
    render(<Harness />);
    expect(screen.getByRole('row', { name: 'Edit title 10001' })).toBeInTheDocument();
  });

  it('adds and removes a row, and the net area follows', async () => {
    const { user } = render(<Harness rows={[]} />);
    expect(summary()).toHaveTextContent('450.00');
    await user.click(screen.getByRole('button', { name: /Add deduction/ }));
    expect(screen.getByTestId('values')).toHaveTextContent('"rows":1');
    await user.type(document.querySelector('input[name$="areaInSqWa"]')!, '50');
    expect(summary()).toHaveTextContent('400.00');
    // The deed row has a delete too; the deduction row is the last one.
    await user.click(screen.getAllByRole('button', { name: 'Delete row 1' }).at(-1)!);
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(screen.getByTestId('values')).toHaveTextContent('"rows":0');
  });

  it('asks before switching off, and clears the rows only once confirmed', async () => {
    const { user } = render(<Harness />);
    await user.click(screen.getByRole('radio', { name: 'No' }));
    expect(screen.getByTestId('values')).toHaveTextContent('"isEncroached":true,"rows":1');
    // The dialog is portalled with its own markup, which the role query treats as hidden.
    await user.click(await screen.findByRole('button', { name: 'Delete', hidden: true }));
    await waitFor(() =>
      expect(screen.getByTestId('values')).toHaveTextContent('"isEncroached":false,"rows":0'),
    );
    expect(summary()).not.toHaveTextContent('Deducted');
  });

  it('is plain text on a read page: no inputs, no add, no delete', () => {
    render(<Harness readOnly />);
    expect(document.querySelectorAll('tbody input')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Add deduction/ })).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete row/ })).toBeNull();
    // Plain text values, under the same header; no add row.
    expect(bodyRows().some(r => r.querySelector('th'))).toBe(true);
    expect(screen.getByText('fence')).toBeInTheDocument();
    // The area to appraise still shows on a read page.
    expect(within(summary() as HTMLElement).getByText(/420\.00/)).toBeInTheDocument();
  });

  it('drags the deductions into a new order, which the numbers and the saved array follow', () => {
    render(
      <Harness
        rows={[
          { ...ROW, remark: 'first' },
          { ...ROW, remark: 'second' },
          { ...ROW, remark: 'third' },
        ]}
      />,
    );
    expect(screen.getAllByLabelText('Drag to reorder')).toHaveLength(3);
    expect(screen.getByTestId('order')).toHaveTextContent('["first","second","third"]');
    act(() => dnd.onDragEnd?.({ active: { id: dnd.ids[0] }, over: { id: dnd.ids[2] } }));
    expect(screen.getByTestId('order')).toHaveTextContent('["second","third","first"]');
    // The remark inputs, top to bottom, are in the new order.
    expect(
      [...document.querySelectorAll<HTMLInputElement>('input[name$="remark"]')].map(i => i.value),
    ).toEqual(['second', 'third', 'first']);
    // Dropping on itself does nothing.
    act(() => dnd.onDragEnd?.({ active: { id: dnd.ids[1] }, over: { id: dnd.ids[1] } }));
    expect(screen.getByTestId('order')).toHaveTextContent('["second","third","first"]');
  });

  it('has no handle for a single deduction, and a click on a handle opens or deletes nothing', async () => {
    const { unmount } = render(<Harness />);
    expect(screen.queryByLabelText('Drag to reorder')).toBeNull();
    unmount();
    const again = render(<Harness rows={[ROW, { ...ROW, remark: 'two' }]} />);
    await again.user.click(screen.getAllByLabelText('Drag to reorder')[0]);
    expect(screen.queryByRole('button', { name: 'Confirm delete' })).toBeNull();
    expect(screen.getByTestId('values')).toHaveTextContent('"rows":2');
  });

  it('shows no handle on a read page', () => {
    render(<Harness readOnly rows={[ROW, { ...ROW, remark: 'two' }]} />);
    expect(screen.queryByLabelText('Drag to reorder')).toBeNull();
  });

  it('keeps the deduction switch and rows reachable while there is no deed', async () => {
    const { user } = render(<Harness titles={[]} encroached={false} rows={[]} />);
    expect(screen.getByText('Deduct area')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    expect(screen.getByTestId('values')).toHaveTextContent('"isEncroached":true');
    await user.click(screen.getByRole('button', { name: /Add deduction/ }));
    expect(screen.getByTestId('values')).toHaveTextContent('"rows":1');
    expect(document.querySelector('input[name$="areaInSqWa"]')).not.toBeNull();
  });

  it('shows the stored deductions of a record with no deed, on a read page too', () => {
    render(<Harness titles={[]} readOnly />);
    expect(screen.getByText('fence')).toBeInTheDocument();
  });

  it('keeps the rows on screen when the last deed is removed, instead of saving them hidden', async () => {
    const { user } = render(<Harness />);
    expect(document.querySelector('input[name$="areaInSqWa"]')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'drop deeds' }));
    expect(document.querySelector('input[name$="areaInSqWa"]')).not.toBeNull();
    expect(screen.getByTestId('values')).toHaveTextContent('"isEncroached":true,"rows":1');
    // And switching off still asks before it clears them.
    await user.click(screen.getByRole('radio', { name: 'No' }));
    expect(screen.getByTestId('values')).toHaveTextContent('"isEncroached":true,"rows":1');
  });
});
