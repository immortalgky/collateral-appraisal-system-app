import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { useState, type ComponentProps } from 'react';
import { render, screen, within } from '@/test/test-utils';
import { FormReadOnlyContext } from '../context';
import { FormLayoutProvider } from '../FormLayoutProvider';
import type { FormLayoutMode } from '../formLayoutContext';
import { FormTable, FormTableBlock, FormTableRowActions, TableAddSlotProvider } from '.';
import type { FormTableColumn, FormTableProps } from '.';

type Row = { id: number; name: string; qty: number; value: number };

const ROWS: Row[] = [
  { id: 1, name: 'Alpha', qty: 2, value: 200 },
  { id: 2, name: 'Beta', qty: 3, value: 300 },
];

const actions = { move: vi.fn(), remove: vi.fn() };

const columns: FormTableColumn<Row>[] = [
  { key: 'no', kind: 'index', header: '#' },
  {
    key: 'name',
    kind: 'input',
    header: 'Name',
    card: { span: 6, title: r => r.name },
    cell: r => <input aria-label={`name ${r.id}`} defaultValue={r.name} />,
  },
  { key: 'qty', kind: 'input', align: 'end', header: 'Qty', total: '5', cell: r => r.qty },
  {
    key: 'value',
    kind: 'derived',
    align: 'end',
    header: 'Value',
    total: '500',
    cell: r => r.value,
  },
  {
    key: 'actions',
    kind: 'action',
    cell: (r, { position }) => (
      <FormTableRowActions
        position={position}
        count={ROWS.length}
        onMoveUp={() => actions.move(r.id, -1)}
        onMoveDown={() => actions.move(r.id, 1)}
        onDelete={() => actions.remove(r.id)}
      />
    ),
  },
];

const onAdd = vi.fn();
const add = [{ label: 'Add item', onClick: onAdd }];
const empty = { icon: 'table', message: 'No items yet' };

const renderTable = (layout: FormLayoutMode, props: Partial<FormTableProps<Row>> = {}) =>
  render(
    <FormLayoutProvider layout={layout}>
      <FormTable
        columns={columns}
        rows={ROWS}
        rowKey={r => r.id}
        add={add}
        empty={empty}
        {...props}
      />
    </FormLayoutProvider>,
  );

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('FormTable', () => {
  it.each(['standard', 'compact'] as const)('draws head, rows and a totals row (%s)', layout => {
    renderTable(layout);
    expect(screen.getAllByRole('columnheader').map(h => h.textContent)).toEqual([
      '#',
      'Name',
      'Qty',
      'Value',
      '',
    ]);
    expect(screen.getAllByRole('row')).toHaveLength(1 + ROWS.length + 1);
    // the plural key from `common`, in the label column
    const footer = screen.getAllByRole('row').at(-1)!;
    expect(within(footer).getByText('Total · 2 items')).toBeInTheDocument();
    expect(within(footer).getByText('500')).toBeInTheDocument();
    // the row number is drawn by the kit
    expect(within(screen.getAllByRole('row')[2]).getAllByRole('cell')[0]).toHaveTextContent('2');
  });

  it('puts the Standard add button under the table', () => {
    renderTable('standard');
    const button = screen.getByRole('button', { name: 'Add item' });
    const table = screen.getByRole('table');
    expect(table.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    button.click();
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('sends the Compact add link to the section band slot', () => {
    const Harness = () => {
      const [slot, setSlot] = useState<HTMLElement | null>(null);
      return (
        <FormLayoutProvider layout="compact">
          <div data-testid="band" ref={setSlot} />
          <TableAddSlotProvider value={slot}>
            <div data-testid="body">
              <FormTable columns={columns} rows={ROWS} rowKey={r => r.id} add={add} />
            </div>
          </TableAddSlotProvider>
        </FormLayoutProvider>
      );
    };
    render(<Harness />);
    expect(within(screen.getByTestId('band')).getByRole('button')).toHaveTextContent('+ Add item');
    expect(
      within(screen.getByTestId('body')).queryByRole('button', { name: /add item/i }),
    ).toBeNull();
  });

  describe('FormTableBlock', () => {
    const renderBlock = (layout: FormLayoutMode, title?: string) => {
      const Harness = () => {
        const [slot, setSlot] = useState<HTMLElement | null>(null);
        return (
          <FormLayoutProvider layout={layout}>
            <div data-testid="band" ref={setSlot} />
            <TableAddSlotProvider value={layout === 'compact' ? slot : null}>
              <FormTableBlock title={title}>
                <FormTable columns={columns} rows={ROWS} rowKey={r => r.id} add={add} />
              </FormTableBlock>
            </TableAddSlotProvider>
          </FormLayoutProvider>
        );
      };
      return render(<Harness />);
    };

    it('puts the Compact add link in its own heading, not the band', () => {
      renderBlock('compact', 'Items');
      const heading = screen.getByText('Items').parentElement!;
      expect(within(heading).getByRole('button', { name: /add item/i })).toBeInTheDocument();
      expect(within(screen.getByTestId('band')).queryByRole('button')).toBeNull();
    });

    it('keeps the Compact add link in the band without a title', () => {
      renderBlock('compact');
      expect(within(screen.getByTestId('band')).getByRole('button')).toHaveTextContent(
        '+ Add item',
      );
    });

    it('keeps the Standard button under the table', () => {
      renderBlock('standard', 'Items');
      const button = screen.getByRole('button', { name: 'Add item' });
      expect(
        within(screen.getByText('Items')).queryByRole('button', {
          name: /add item/i,
        }),
      ).toBeNull();
      expect(
        screen.getByRole('table').compareDocumentPosition(button) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  it('keeps the Compact add link inline when there is no band', () => {
    renderTable('compact');
    expect(screen.getByRole('button', { name: '+ Add item' })).toBeInTheDocument();
  });

  it.each(['standard', 'compact'] as const)(
    'is one add box instead of a table when empty (%s)',
    layout => {
      renderTable(layout, { rows: [] });
      expect(screen.queryByRole('table')).toBeNull();
      expect(screen.queryByRole('columnheader')).toBeNull();
      // the whole box is the button, and it is the only add (no second one under the table)
      const box = screen.getByRole('button', { name: /No items yet/ });
      expect(screen.getAllByRole('button')).toHaveLength(1);
      box.click();
      expect(onAdd).toHaveBeenCalledOnce();
    },
  );

  it('gives several empty-state adds one button each', () => {
    renderTable('standard', {
      rows: [],
      add: [
        { label: 'Add building', onClick: vi.fn() },
        { label: 'Add development', onClick: vi.fn() },
      ],
    });
    expect(screen.getByRole('button', { name: 'Add building' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add development' })).toBeInTheDocument();
  });

  it('read-only: no action column, no add, an empty table is only a message', () => {
    const { rerender } = render(
      <FormReadOnlyContext.Provider value>
        <FormTable columns={columns} rows={ROWS} rowKey={r => r.id} add={add} empty={empty} />
      </FormReadOnlyContext.Provider>,
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(
      <FormReadOnlyContext.Provider value>
        <FormTable columns={columns} rows={[]} rowKey={r => r.id} add={add} empty={empty} />
      </FormReadOnlyContext.Provider>,
    );
    expect(screen.getByText('No items yet')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('row actions: moves are disabled at the ends, delete takes two clicks', async () => {
    const { user } = renderTable('standard');
    expect(screen.getByRole('button', { name: 'Move row 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move row 2 down' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move row 1 down' }));
    expect(actions.move).toHaveBeenCalledWith(1, 1);

    await user.click(screen.getByRole('button', { name: 'Delete row 2' }));
    expect(actions.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(actions.remove).toHaveBeenCalledWith(2);
  });

  it('draws a two-level head for grouped columns', () => {
    const grouped = columns.map(c =>
      c.key === 'qty' || c.key === 'value' ? { ...c, group: 'Figures' } : c,
    );
    renderTable('standard', { columns: grouped });
    const group = screen.getByRole('columnheader', { name: 'Figures' });
    expect(group).toHaveAttribute('colspan', '2');
    expect(screen.getAllByRole('row')[0]).toContainElement(group);
    // ungrouped heads span both head rows
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('rowspan', '2');
  });
});

/** Widths the observer reports: the form shell, and the element that holds the table. */
const stubWidths = (shell: number, own: number) =>
  vi.stubGlobal(
    'ResizeObserver',
    class {
      callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element) {
        const width = target.matches('[class~="@container/form-shell"]') ? shell : own;
        this.callback(
          [{ target, contentRect: { width } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
    },
  );

const inShell = (minWidth?: number) => (
  <div className="@container/form-shell">
    <FormTable
      columns={columns}
      rows={ROWS}
      rowKey={r => r.id}
      minWidth={minWidth}
      add={add}
      empty={empty}
    />
  </div>
);

describe('FormTable wide tables', () => {
  // The rem threshold follows the root font size: 14 to 16px here, so 92rem is 1288 to 1472px.
  // The widths below sit clear of both ends.
  it('scrolls with frozen first and action columns when the table fits its container', () => {
    stubWidths(1600, 1600);
    render(inShell(92));
    const table = screen.getByRole('table');
    expect(table.parentElement).toHaveClass('overflow-x-auto');
    const first = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(first[0]).toHaveClass('sticky', 'left-0');
    expect(first.at(-1)).toHaveClass('sticky', 'right-0');
    expect(first[1]).not.toHaveClass('sticky');
  });

  it('turns into one card per row when its container is narrower than minWidth, in a wide shell too', () => {
    stubWidths(1600, 900);
    render(inShell(92));
    expect(screen.queryByRole('table')).toBeNull();
    // one result value per card
    expect(document.querySelectorAll('dd')).toHaveLength(ROWS.length);
    // header strip "n · title", the column header as the field label, the results strip, the totals
    expect(screen.getByText(/^1\s·\sAlpha$/)).toBeInTheDocument();
    expect(screen.getByLabelText('name 2')).toHaveValue('Beta');
    expect(screen.getAllByText('Value', { selector: 'dt' })).toHaveLength(ROWS.length);
    expect(screen.getByText('Total · 2 items')).toBeInTheDocument();
    // actions keep working from the strip, and the add stays under the cards
    expect(screen.getByRole('button', { name: 'Delete row 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });

  it('turns into cards in a narrow shell that cannot fit it', () => {
    stubWidths(1000, 900);
    render(inShell(92));
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('stays a table in a narrow shell when it fits', () => {
    stubWidths(1000, 1500);
    render(inShell(92));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('a table without minWidth never turns into cards', () => {
    stubWidths(600, 500);
    render(inShell());
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('is a table when there is no form shell around it', () => {
    stubWidths(600, 500);
    render(<FormTable columns={columns} rows={ROWS} rowKey={r => r.id} minWidth={92} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});

describe('FormTable row extras', () => {
  it('draws a note under a row, across all columns', () => {
    renderTable('standard', { rowNote: r => (r.id === 2 ? 'Overlaps floor 1' : null) });
    const note = screen.getByText('Overlaps floor 1');
    expect(note).toHaveAttribute('colspan', '5');
    expect(screen.getAllByText('Overlaps floor 1')).toHaveLength(1);
  });

  it('lets a rowElement draw the <tr>, and a click on a row action does not reach the row', async () => {
    const onRow = vi.fn();
    const onEdit = vi.fn();
    const Custom = ({ position, ...rest }: ComponentProps<'tr'> & { position: number }) => (
      <tr data-custom={position} {...rest} />
    );
    const withEdit: FormTableColumn<Row>[] = columns.map(c =>
      c.key === 'actions'
        ? {
            ...c,
            cell: (_r, { position }) => (
              <FormTableRowActions position={position} count={2} onEdit={onEdit} editLabel="Open" />
            ),
          }
        : c,
    );
    const { user } = renderTable('standard', {
      columns: withEdit,
      rowElement: Custom,
      rowProps: () => ({ onClick: onRow }),
    });
    expect(document.querySelectorAll('tbody tr[data-custom]')).toHaveLength(ROWS.length);
    await user.click(screen.getAllByRole('button', { name: 'Open' })[0]);
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onRow).not.toHaveBeenCalled();
    await user.click(screen.getByLabelText('name 1'));
    expect(onRow).toHaveBeenCalledOnce();
  });

  it('an action with its own icon is disabled on request and has no plus', async () => {
    const onSort = vi.fn();
    const { user } = renderTable('compact', {
      add: [...add, { label: 'Sort', icon: 'arrow-down-1-9', disabled: true, onClick: onSort }],
    });
    const sort = screen.getByRole('button', { name: 'Sort' });
    expect(sort).toBeDisabled();
    await user.click(sort);
    expect(onSort).not.toHaveBeenCalled();
  });

  it('pins the head and scrolls inside maxHeight', () => {
    renderTable('standard', { maxHeight: 28 });
    // the inline value, not the computed one: the test DOM resolves rem to px when computing
    const box = screen.getByRole('table').parentElement!;
    expect(box.style.maxHeight).toBe('28rem');
    expect(box).toHaveClass('overflow-auto');
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveClass('sticky', 'top-0');
  });

  it('takes read-only from its own prop as well as the page', () => {
    renderTable('standard', { readOnly: true });
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Add item' })).toBeNull();
  });
});
