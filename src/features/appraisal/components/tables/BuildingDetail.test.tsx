import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen, within } from '@/test/test-utils';
import { FormLayoutProvider } from '@/shared/components/form';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import { BuildingDetail } from './BuildingDetail';

const ROWS = [
  {
    areaDescription: 'Main house',
    isBuilding: true,
    area: 100,
    pricePerSqMBeforeDepreciation: 1000,
    year: 5,
    depreciationMethod: 'Period',
    depreciationPeriods: [
      {
        atYear: 1,
        toYear: 5,
        depreciationPerYear: 2,
        totalDepreciationPct: 10,
        priceDepreciation: 10000,
      },
    ],
  },
  {
    areaDescription: 'Car park',
    isBuilding: false,
    area: 20,
    pricePerSqMBeforeDepreciation: 500,
    year: 0,
    depreciationMethod: 'Gross',
    depreciationPeriods: [],
  },
];

const Harness = ({
  rows = ROWS,
  readOnly = false,
  showCostSummary = false,
}: {
  rows?: typeof ROWS;
  readOnly?: boolean;
  showCostSummary?: boolean;
}) => {
  const methods = useForm({ defaultValues: { depreciationDetails: rows } });
  return (
    <FormLayoutProvider layout="standard">
      <FormReadOnlyContext.Provider value={readOnly}>
        <FormProvider {...methods}>
          <div className="@container/form-shell">
            <BuildingDetail name="depreciationDetails" showCostSummary={showCostSummary} />
          </div>
        </FormProvider>
      </FormReadOnlyContext.Provider>
    </FormLayoutProvider>
  );
};

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

afterEach(() => vi.unstubAllGlobals());

// The rem threshold follows the root font size (14 to 16px): the table's width, about 71rem, is 994
// to 1139px. The widths below sit clear of both ends.
describe('BuildingDetail', () => {
  it('is a scrolling table with a two-level head and frozen end columns in a wide shell', () => {
    stubWidths(1800, 1800);
    render(<Harness />);
    const group = screen.getByRole('columnheader', { name: 'RCN Before Depre.' });
    expect(group).toHaveAttribute('colspan', '2');
    expect(screen.getByRole('table').parentElement).toHaveClass('overflow-x-auto');

    const cells = within(screen.getAllByRole('row')[2]).getAllByRole('cell');
    expect(cells).toHaveLength(11);
    expect(cells[0]).toHaveClass('sticky', 'left-0');
    expect(cells.at(-1)).toHaveClass('sticky', 'right-0');

    const footer = screen.getAllByRole('row').at(-1)!;
    expect(within(footer).getByText('Total · 2 items')).toBeInTheDocument();
    // the label runs over the empty columns after it (description + type), so it never wraps
    expect(within(footer).getByText('Total · 2 items')).toHaveAttribute('colspan', '2');
    expect(within(footer).getByText('120.00')).toBeInTheDocument();
  });

  it('stacks the computed pairs in one cell each, and keeps the head and totals under them', () => {
    stubWidths(1800, 1800);
    render(<Harness />);
    const heads = screen.getAllByRole('row')[1];
    expect(within(heads).getByText('Tot%').parentElement).toHaveTextContent('Tot%Total Price');
    expect(within(heads).getByText('฿/m²', { selector: 'span' }).parentElement).toHaveTextContent(
      '฿/m²Total Price',
    );

    const cells = within(screen.getAllByRole('row')[2]).getAllByRole('cell');
    // % over price, then ฿/m² over price; each with both values
    expect(cells[8]).toHaveTextContent(/^\d[\d,]*\.\d{2}%[\d,]+\.\d{2}$/);
    expect(cells[9]).toHaveTextContent(/^[\d,]+\.\d{2}[\d,]+\.\d{2}$/);
    expect(cells[8]).toHaveClass('text-right');

    // the totals row keeps the depreciation and after-depreciation totals under their columns
    const footer = within(screen.getAllByRole('row').at(-1)!).getAllByRole('cell');
    expect(footer).toHaveLength(10);
  });

  it('draws the age-band trigger as an editable box, not a link', () => {
    stubWidths(1800, 1800);
    render(<Harness />);
    expect(screen.getByTitle('Edit periods')).toHaveClass('border', 'bg-(--form-input-bg)');
  });

  it('turns into one card per row when the table does not fit its container', () => {
    stubWidths(1000, 900);
    render(<Harness />);
    expect(screen.queryByRole('table')).toBeNull();
    // header strip "n · description", the inputs as labelled fields, the results strip
    expect(screen.getByText(/^1\s·\sMain house$/)).toBeInTheDocument();
    expect(screen.getByLabelText('Detail 2')).toHaveValue('Car park');
    expect(screen.getAllByText('RCN Before Depre. (฿/m²)', { selector: 'div' })).toHaveLength(2);
    expect(screen.getAllByText('RCN Before Depre. (Total Price)', { selector: 'dt' })).toHaveLength(
      2,
    );
    expect(screen.getByText('Total · 2 items')).toBeInTheDocument();
    // the row actions, both adds and the Standard controls survive the switch
    expect(screen.getByRole('button', { name: 'Delete row 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Building' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Non-Building' })).toBeInTheDocument();
  });

  it('switches at the 11-column width, not the old 13-column one', () => {
    // 1,200px: too narrow for the old 107rem table (1,498px at 14px), wide enough for 71rem
    stubWidths(1300, 1200);
    render(<Harness />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('keeps every value in the card, the stacked pairs as separate values', () => {
    stubWidths(1000, 900);
    render(<Harness />);
    // four result cells per card (one row of the 4-column strip): the total % rides in the label
    expect(screen.getAllByText(/./, { selector: 'dt' })).toHaveLength(8);
    expect(screen.queryByText('Depreciation Tot%', { selector: 'dt' })).toBeNull();
    expect(screen.queryByText('Depreciation (Total Price)', { selector: 'dt' })).toBeNull();
    expect(
      screen.getAllByText(/^Depreciation \(Total \d+\.\d{2}%\)$/, { selector: 'dt' }),
    ).toHaveLength(2);
    expect(screen.getAllByText('RCN Before Depre. (Total Price)', { selector: 'dt' })).toHaveLength(
      2,
    );
    expect(screen.getAllByText('RCN After Depre. (฿/m²)', { selector: 'dt' })).toHaveLength(2);
    expect(screen.getAllByText('RCN After Depre. (Total Price)', { selector: 'dt' })).toHaveLength(
      2,
    );
  });

  it('keeps the age-band editor working inside a card', async () => {
    stubWidths(1000, 900);
    const { user } = render(<Harness />);
    await user.click(screen.getByTitle('Edit periods'));
    const bands = screen.getByRole('group', { name: 'Edit periods' });
    expect(within(bands).getByLabelText('To yr 1')).toBeInTheDocument();
  });

  it('adds a building row and a development row from the two add buttons', async () => {
    stubWidths(1800, 1800);
    const { user } = render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Add Non-Building' }));
    expect(screen.getByText('Total · 3 items')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add Building' }));
    expect(screen.getByText('Total · 4 items')).toBeInTheDocument();
  });

  it('opens a Period row’s age bands under it, and removes a row after a second click', async () => {
    stubWidths(1800, 1800);
    const { user } = render(<Harness />);
    expect(screen.queryByRole('group', { name: 'Edit periods' })).toBeNull();
    await user.click(screen.getByTitle('Edit periods'));
    const bands = screen.getByRole('group', { name: 'Edit periods' });
    expect(within(bands).getByLabelText('From yr 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete row 2' }));
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(screen.getByText('Total · 1 item')).toBeInTheDocument();
  });

  it('is one add box instead of a table when empty', () => {
    stubWidths(1800, 1800);
    render(<Harness rows={[]} />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('No depreciation data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Building' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Non-Building' })).toBeInTheDocument();
  });

  it('read-only: text only, no controls, no action column', () => {
    stubWidths(1800, 1800);
    render(<Harness readOnly />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Main house')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Delete row/ })).toBeNull();
    expect(within(screen.getAllByRole('row')[2]).getAllByRole('cell')).toHaveLength(10);
  });

  it('cost summary: boxed inputs when editable, plain text on a read page', () => {
    stubWidths(1800, 1800);
    const { unmount } = render(<Harness showCostSummary />);
    expect(screen.getByLabelText('Building Cost Value')).toBeInTheDocument();
    unmount();

    render(<Harness showCostSummary readOnly />);
    expect(screen.getByText('Building Cost Value')).toBeInTheDocument();
    expect(screen.queryByLabelText('Building Cost Value')).toBeNull();
    expect(screen.queryByLabelText('Building Insurance')).toBeNull();
    expect(screen.getAllByText(/^[\d,]+\.\d{2}$/, { selector: 'div' }).length).toBeGreaterThan(0);
  });
});
