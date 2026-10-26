import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import i18n from '@/i18n';
import { render, screen, within } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import type { ColumnTableLayout } from '@/shared/components/columnLayout';
import AppraisalResultsTable from './AppraisalResultsTable';
import { makeAppraisalColumns, type AppraisalColumnDef } from './tabConfigs';
import type { AppraisalDto } from '../../api/appraisalSearch';
import type { TFunction } from 'i18next';

// Only the property types are labelled: the other parameter groups stay empty, so codes show as is.
const PROPERTY_TYPES = [
  { code: 'B', description: 'Building' },
  { code: 'L', description: 'Land' },
  { code: 'LB', description: 'Land and Building' },
  { code: 'U', description: 'Condo' },
  { code: 'MAC', description: 'Machinery' },
  { code: 'VEH', description: 'Vehicle' },
  { code: 'LS', description: 'Leasehold' },
];
vi.mock('@/shared/utils/parameterUtils', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/utils/parameterUtils')>()),
  useParametersByGroup: (group: string) => (group === 'PropertyType' ? PROPERTY_TYPES : []),
}));

const item = {
  id: '1',
  appraisalNumber: '69105467',
  status: 'InProgress',
  appraisalType: 'ReAppraisal',
  priority: 'Normal',
  propertyTypes: 'B, L, LB, U, MAC, VEH, LS',
  bankingSegment: 'RETAIL',
  customerName: 'Somchai Wongprasert',
  customerCount: 3,
} as unknown as AppraisalDto;

const labels: Record<string, string> = {
  'list.columns.appraisalNumberCustomer': 'No / Customer',
  'list.columns.appraisalNumber': 'Number',
  'list.columns.customer': 'Customer',
  'list.columns.bankingSegment': 'Group',
  'list.columns.createdAt': 'Created',
};
const t = ((k: string) => labels[k] ?? k) as unknown as TFunction<'appraisal'>;

const render_ = (
  sortBy: string,
  sortDir: string,
  onSort = vi.fn(),
  rowItem: AppraisalDto = item,
  extra: string[] = [],
) => {
  const base = makeAppraisalColumns(t);
  const columns: AppraisalColumnDef[] = [
    base.find(c => c.key === 'appraisalCustomer')!,
    { key: 'bankingSegment', label: 'Group' },
    { key: 'propertyTypes', label: 'Collateral' },
    { key: 'createdAt', label: 'Created', sortable: true },
    ...base.filter(c => extra.includes(c.key)),
  ];
  render(
    <AppraisalResultsTable
      columns={columns}
      items={[rowItem]}
      isLoading={false}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      onRowClick={vi.fn()}
    />,
  );
  return onSort;
};

describe('AppraisalResultsTable', () => {
  it('shows number over customer in one cell, with the extra-customer count', () => {
    render_('createdAt', 'desc');
    const cell = screen.getByText('69105467').closest('td')!;
    expect(within(cell).getByText('Somchai Wongprasert')).toBeTruthy();
    expect(within(cell).getByText('+2')).toBeTruthy();
  });

  it('gives each half of the merged header its own sort button', () => {
    const onSort = render_('createdAt', 'desc');
    screen.getByRole('button', { name: 'Customer' }).click();
    screen.getByRole('button', { name: 'Number' }).click();
    expect(onSort.mock.calls.map(c => c[0])).toEqual(['customerName', 'appraisalNumber']);
  });

  it('marks the sort it is given as active, in either spelling of the key', () => {
    render_('CreatedAt', 'desc');
    const th = screen.getByRole('columnheader', { name: /Created/ });
    expect(th.getAttribute('aria-sort')).toBe('descending');
  });

  it('gives the collateral cell a title with the whole labelled list, since the cell cuts it', () => {
    render_('createdAt', 'desc');
    const full = 'Building, Land, Land and Building, Condo, Machinery, Vehicle, Leasehold';
    const cell = screen.getByTitle(full);
    // what the title says is what the cell shows (labels, not codes)...
    expect(cell).toHaveTextContent(full);
    expect(cell.getAttribute('title')).toBe(cell.textContent);
    expect(cell.getAttribute('title')).not.toContain('B,');
    // ...and the cell cuts it with an ellipsis, which is why the title is needed
    expect(cell.className).toContain('truncate');
  });

  it('draws the business group as one neutral badge', () => {
    render_('createdAt', 'desc');
    const badge = screen.getByText('RETAIL').closest('span.rounded-md');
    expect(badge?.className).toContain('bg-(--palette-surface-3)');
  });

  it('flags a high-priority job beside its number, with the tooltip and label, and nothing for normal', () => {
    render_('createdAt', 'desc', vi.fn(), { ...item, priority: 'High' } as AppraisalDto);
    const cell = screen.getByText('69105467').closest('td')!;
    const flag = within(cell).getByRole('img', { name: i18n.t('appraisal:list.priorityHigh') });
    expect(flag.getAttribute('title')).toBe(i18n.t('appraisal:list.priorityHigh'));
    expect(flag.className).toContain('text-(--palette-danger)');
  });

  it('shows no flag for a normal-priority job', () => {
    render_('createdAt', 'desc');
    expect(screen.queryByRole('img', { name: i18n.t('appraisal:list.priorityHigh') })).toBeNull();
  });

  it('sorts the SLA header by its due date, and marks it active under that key', () => {
    const onSort = render_('slaDueDate', 'asc', vi.fn(), item, ['slaStatus']);
    const th = screen.getByRole('columnheader', { name: /list\.columns\.sla/ });
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    th.click();
    expect(onSort).toHaveBeenCalledWith('slaDueDate');
  });

  it('keeps a two-line row to a 50px height: the cells carry py-1.5, not the old py-2.5', () => {
    render_('createdAt', 'desc');
    const cell = screen.getByText('69105467').closest('td')!;
    expect(cell.className).toContain('py-1.5');
    expect(cell.className).not.toContain('py-2.5');
  });

  it('draws a cancelled status as a red badge, and a live one is not red', () => {
    render_('createdAt', 'desc', vi.fn(), { ...item, status: 'Cancelled' } as AppraisalDto, [
      'status',
    ]);
    const badge = screen.getByText(i18n.t('appraisal:list.status.Cancelled')).closest('span');
    expect(badge?.className).toContain('bg-red-50');
    expect(badge?.className).toContain('text-red-700');
  });

  it('does not tint the badge of a live status red', () => {
    render_('createdAt', 'desc', vi.fn(), item, ['status']);
    const badge = screen.getByText(i18n.t('appraisal:list.status.InProgress')).closest('span');
    expect(badge?.className).not.toContain('bg-red-50');
  });

  it('shows an unassigned job as a muted dash, named for screen readers, with no icon', () => {
    render_('createdAt', 'desc', vi.fn(), { ...item, assigneeUserId: null } as AppraisalDto, [
      'assignee',
    ]);
    const dash = screen.getByRole('img', { name: i18n.t('appraisal:list.unassigned') });
    expect(dash).toHaveTextContent('—');
    expect(dash.getAttribute('title')).toBe(i18n.t('appraisal:list.unassigned'));
    expect(dash.className).toContain('text-(--palette-gray-400)');
    expect(dash.querySelector('svg')).toBeNull();
    // the words are not printed in the cell
    expect(screen.queryByText(i18n.t('appraisal:list.unassigned'))).toBeNull();
  });

  it('draws the external company icon in neutral gray, not purple', () => {
    render_(
      'createdAt',
      'desc',
      vi.fn(),
      { ...item, assigneeUserId: null, companyName: 'Thai Valuation Co.' } as AppraisalDto,
      ['assignee'],
    );
    const icon = screen.getByText('Thai Valuation Co.').previousElementSibling;
    expect(icon?.getAttribute('class')).toContain('text-(--palette-gray-400)');
    expect(icon?.getAttribute('class')).not.toContain('indigo');
  });
});

// ── Row focus ring and filling the container ────────────────────────────────────────────────────

const baseCols = makeAppraisalColumns(t);
const pick = (...keys: string[]) => keys.map(k => baseCols.find(c => c.key === k)!);

describe('AppraisalResultsTable row focus', () => {
  const setup = () =>
    render(
      <AppraisalResultsTable
        columns={pick('appraisalCustomer', 'status')}
        items={[item]}
        isLoading={false}
        sortBy="createdAt"
        sortDir="desc"
        onSort={vi.fn()}
        onRowClick={vi.fn()}
      />,
    );
  const row = () => screen.getByText('69105467').closest('tr')!;
  // The header's sort buttons come first in the tab order.
  const tabToRow = async (user: ReturnType<typeof render>['user']) => {
    for (let i = 0; i < 6 && document.activeElement !== row(); i++) await user.tab();
  };

  it('switches the global outline off inline, and draws an inset keyboard ring on a Tab', async () => {
    const { user } = setup();
    // the global :focus-visible outline is unlayered: only an inline style removes it
    expect(row().style.outlineStyle).toBe('none');
    await tabToRow(user);
    expect(row()).toHaveFocus();
    expect(row().className).toContain('focus-visible:ring-2');
    expect(row().className).toContain('focus-visible:ring-inset');
  });

  it('draws no ring on a row after a mouse press, and gets it back on the next Tab', async () => {
    const { user } = setup();
    await user.click(row()); // the drawer opens from this; closing hands the focus back to the row
    expect(row().className).not.toContain('focus-visible:ring-2');
    expect(row().style.outlineStyle).toBe('none');
    (document.activeElement as HTMLElement).blur();
    await tabToRow(user); // onto the row again, by keyboard
    expect(row().className).toContain('focus-visible:ring-2');
  });

  it('draws the ring again when the rows are walked with j/k after the mouse', async () => {
    const { user } = setup();
    await user.click(row());
    expect(row().className).not.toContain('focus-visible:ring-2');
    await user.keyboard('j');
    expect(row().className).toContain('focus-visible:ring-2');
  });
});

describe('AppraisalResultsTable fills its container', () => {
  const proto = HTMLElement.prototype;
  const original = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  const RO = globalThis.ResizeObserver;
  afterEach(() => {
    if (original) Object.defineProperty(proto, 'clientWidth', original);
    globalThis.ResizeObserver = RO;
  });

  const widths = { appraisalCustomer: 220, status: 135, purpose: 190 };
  const layout = {
    visibleColumns: ['appraisalCustomer', 'status', 'purpose'],
    widths,
    setWidth: vi.fn(),
    getAutoFitWidth: () => () => null,
    showRowNumber: true,
  } as ColumnTableLayout;

  const renderAt = (containerWidth: number) => {
    Object.defineProperty(proto, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.className.includes('overflow-x-auto') ? containerWidth : 0;
      },
    });
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    } as unknown as typeof ResizeObserver;
    const { container } = render(
      <AppraisalResultsTable
        columns={pick('appraisalCustomer', 'status', 'purpose')}
        items={[item]}
        isLoading={false}
        sortBy="createdAt"
        sortDir="desc"
        onSort={vi.fn()}
        onRowClick={vi.fn()}
        layout={layout}
        pinnedColumn="appraisalCustomer"
      />,
    );
    const cols = [...container.querySelectorAll('col')].map(c => parseFloat(c.style.width));
    const table = container.querySelector('table') as HTMLTableElement;
    return { cols, table };
  };

  it('stretches the columns to the container, keeping the row-number column and every minimum', () => {
    const { cols, table } = renderAt(1200);
    // [row number, customer, status, purpose]
    expect(cols[0]).toBe(48);
    expect(cols.reduce((a, b) => a + b, 0)).toBe(1200);
    expect(cols[1]).toBeGreaterThanOrEqual(220);
    expect(cols[2]).toBeGreaterThanOrEqual(135);
    expect(cols[3]).toBeGreaterThanOrEqual(190);
    expect(table.style.width).toBe('1200px');
  });

  it('keeps the user widths and scrolls sideways when the columns pass the container', () => {
    const { cols, table } = renderAt(300);
    expect(cols).toEqual([48, 220, 135, 190]);
    expect(table.style.width).toBe(`${48 + 220 + 135 + 190}px`);
  });
});

describe('AppraisalResultsTable resizing while filled', () => {
  const proto = HTMLElement.prototype;
  const original = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  const RO = globalThis.ResizeObserver;
  const capture = proto.setPointerCapture;
  afterEach(() => {
    if (original) Object.defineProperty(proto, 'clientWidth', original);
    globalThis.ResizeObserver = RO;
    proto.setPointerCapture = capture;
  });

  const setWidth = vi.fn();
  const layout = {
    visibleColumns: ['appraisalCustomer', 'status'],
    widths: { appraisalCustomer: 250, status: 250 },
    setWidth,
    getAutoFitWidth: () => () => 310,
    showRowNumber: false,
  } as ColumnTableLayout;

  const setup = () => {
    setWidth.mockClear();
    Object.defineProperty(proto, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.className.includes('overflow-x-auto') ? 1000 : 0;
      },
    });
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    } as unknown as typeof ResizeObserver;
    proto.setPointerCapture = vi.fn();
    const { container } = render(
      <AppraisalResultsTable
        columns={pick('appraisalCustomer', 'status')}
        items={[item]}
        isLoading={false}
        sortBy="createdAt"
        sortDir="desc"
        onSort={vi.fn()}
        onRowClick={vi.fn()}
        layout={layout}
        pinnedColumn="appraisalCustomer"
      />,
    );
    const colWidths = () =>
      [...container.querySelectorAll('col')].map(c => parseFloat(c.style.width));
    const handle = container.querySelector('th .cursor-col-resize') as HTMLElement;
    return { colWidths, handle };
  };

  it('starts from what is shown: the table fills, so each column shows 500 of 250 stored', () => {
    const { colWidths } = setup();
    expect(colWidths()).toEqual([500, 500]);
  });

  it('stores a minimum below the shown width when dragged narrower, never an inflated one', () => {
    const { handle } = setup();
    fireEvent.pointerDown(handle, { clientX: 500, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 450, pointerId: 1 }); // 50px narrower on screen
    expect(setWidth).toHaveBeenLastCalledWith('appraisalCustomer', expect.any(Number));
    const stored = setWidth.mock.calls.at(-1)![1] as number;
    // it would have rendered about 643 if the 450 were stored as it is
    expect(stored).toBeLessThan(450);
    expect(stored).toBeLessThan(250); // narrower than before, not wider
    // and the table then shows the column at the cursor's width, not wider than it was (500)
    expect(Math.floor((1000 * stored) / (stored + 250))).toBeLessThanOrEqual(450);
  });

  it('stores what auto-fit measures as it is, not scaled again by the fill', () => {
    const { handle } = setup();
    fireEvent.doubleClick(handle);
    expect(setWidth).toHaveBeenLastCalledWith('appraisalCustomer', 310);
  });
});

// ── Why a row answers the search ───────────────────────────────────────────────────────────────

describe('AppraisalResultsTable search matches', () => {
  const setup = (
    row: Partial<AppraisalDto>,
    searchTerm: string,
    props: Partial<ComponentProps<typeof AppraisalResultsTable>> = {},
  ) =>
    render(
      <AppraisalResultsTable
        columns={pick('appraisalCustomer', 'province', 'requestor')}
        items={[{ ...item, ...row } as AppraisalDto]}
        isLoading={false}
        sortBy="createdAt"
        sortDir="desc"
        onSort={vi.fn()}
        onRowClick={vi.fn()}
        searchTerm={searchTerm}
        {...props}
      />,
    );
  const matchedLabel = () => i18n.t('appraisal:list.matchedOn');
  const fieldLabel = (f: string) => i18n.t(`nav:search.fields.${f}` as never) as string;

  it('marks the part of the appraisal number the term matched', () => {
    setup({ matchedOn: [{ field: 'appraisalNumber', value: '69105467' }] }, '05467');
    const mark = screen.getByText('05467');
    expect(mark.tagName).toBe('MARK');
    expect(mark.closest('td')).toHaveTextContent('69105467');
  });

  it('says which hidden field matched, with the value marked, and counts the rest', () => {
    setup(
      {
        appraisalNumber: '69105524',
        matchedOn: [
          { field: 'prevAppraisalNumber', value: '69105522' },
          { field: 'loanApplicationNumber', value: '69105522-LT' },
        ],
      },
      '69105522',
    );
    const line = screen.getByText(matchedLabel(), { exact: false }).closest('[title]')!;
    expect(line).toHaveTextContent(`${fieldLabel('prevAppraisalNumber')}: 69105522`);
    expect(within(line as HTMLElement).getAllByText('69105522')[0].tagName).toBe('MARK');
    expect(within(line as HTMLElement).getByText('+1')).toBeTruthy();
    // the tooltip lists every match, so "+1" is not a dead end
    expect(line.getAttribute('title')).toContain(
      `${fieldLabel('loanApplicationNumber')}: 69105522-LT`,
    );
  });

  it('adds no line when the match is already on screen and marked', () => {
    setup(
      {
        matchedOn: [
          { field: 'appraisalNumber', value: '69105467' },
          { field: 'customerName', value: 'Somchai Wongprasert' },
        ],
      },
      'Somchai',
    );
    expect(screen.getByText('Somchai').tagName).toBe('MARK');
    expect(screen.queryByText(matchedLabel(), { exact: false })).toBeNull();
  });

  it('still names a customer who is not the one displayed', () => {
    setup({ matchedOn: [{ field: 'customerName', value: 'Malee Srisuk' }] }, 'Malee');
    const line = screen.getByText(matchedLabel(), { exact: false }).closest('[title]')!;
    expect(line).toHaveTextContent(`${fieldLabel('customerName')}: Malee Srisuk`);
  });

  it('names a province match only when the province column is off', () => {
    const row = { province: 'นนทบุรี', matchedOn: [{ field: 'province', value: 'นนทบุรี' }] };
    const { unmount } = setup(row, 'นนทบุรี');
    expect(screen.getByText('นนทบุรี').tagName).toBe('MARK');
    expect(screen.queryByText(matchedLabel(), { exact: false })).toBeNull();
    unmount();

    setup(row, 'นนทบุรี', { columns: pick('appraisalCustomer') });
    const line = screen.getByText(matchedLabel(), { exact: false }).closest('[title]')!;
    expect(line).toHaveTextContent(`${fieldLabel('province')}: นนทบุรี`);
  });

  it('marks the term but adds no line for a single-field search, which sends no matches', () => {
    setup({ matchedOn: null }, '69105', { searchField: 'appraisalNumber' });
    expect(screen.getByText('69105').tagName).toBe('MARK');
    expect(screen.queryByText(matchedLabel(), { exact: false })).toBeNull();
  });

  it('marks only the field a single-field search looked at', () => {
    setup({ matchedOn: null, customerName: 'Somchai 69105' }, '69105', {
      searchField: 'customerName',
    });
    const marks = screen.getAllByText('69105');
    expect(marks).toHaveLength(1);
    expect(marks[0].closest('[title]')).toHaveAttribute('title', 'Somchai 69105');
  });

  it('does not mark a cell the all-fields search did not match on', () => {
    setup(
      {
        appraisalNumber: '69105522',
        matchedOn: [{ field: 'prevAppraisalNumber', value: '691055' }],
      },
      '691055',
    );
    const marks = screen.getAllByText('691055');
    expect(marks).toHaveLength(1);
    expect(marks[0].closest('[title]')!.textContent).toContain(matchedLabel());
  });

  it('names a deed and DOPA province once, and not at all beside the province column', () => {
    const row = {
      province: 'นนทบุรี',
      matchedOn: [
        { field: 'dopaProvince', value: 'นนทบุรี' },
        { field: 'province', value: 'นนทบุรี' },
      ],
    };
    const { unmount } = setup(row, 'นนทบุรี');
    expect(screen.queryByText(matchedLabel(), { exact: false })).toBeNull();
    unmount();

    setup(row, 'นนทบุรี', { columns: pick('appraisalCustomer') });
    const line = screen.getByText(matchedLabel(), { exact: false }).closest('[title]')!;
    expect(line.getAttribute('title')).toBe(`${fieldLabel('province')}: นนทบุรี`);
    expect(within(line as HTMLElement).queryByText('+1')).toBeNull();
  });

  it('marks a requestor match in the requestor cell instead of naming it', () => {
    setup(
      {
        requestorName: 'Malee Srisuk',
        matchedOn: [{ field: 'requestorName', value: 'Malee Srisuk' }],
      },
      'Malee',
    );
    expect(screen.getByText('Malee').tagName).toBe('MARK');
    expect(screen.queryByText(matchedLabel(), { exact: false })).toBeNull();
  });

  it('does not mark the displayed customer when another customer matched', () => {
    setup({ matchedOn: [{ field: 'customerName', value: 'Somsak Boonmee' }] }, 'Som');
    // the line names the customer who matched; the displayed one is left unmarked
    expect(screen.getAllByText('Som')).toHaveLength(1);
    expect(screen.getByText('Som').closest('[title]')!.textContent).toContain(matchedLabel());
  });

  it('marks a number searched in Thai digits', () => {
    setup({ matchedOn: [{ field: 'appraisalNumber', value: '69105467' }] }, '๐๕๔๖๗');
    expect(screen.getByText('05467').tagName).toBe('MARK');
  });

  it('marks a value stored in Thai digits when the term is typed in Thai digits', () => {
    setup({ matchedOn: [{ field: 'titleNumber', value: 'โฉนด ๑๒๓๔' }] }, '๑๒๓๔');
    expect(screen.getByText('๑๒๓๔').tagName).toBe('MARK');
  });

  it('does not mark Thai digits for a term typed in 0-9, which the server never folds', () => {
    const { container } = setup({ matchedOn: null, customerName: 'หจก. ๑๒๓ ก่อสร้าง' }, '123', {
      searchField: 'customerName',
    });
    expect(container.querySelector('mark')).toBeNull();
  });

  it('reads Thai digits as 0-9 for the appraisal number only, as the server does', () => {
    const { container } = setup({ matchedOn: null, customerName: 'บริษัท 123 จำกัด' }, '๑๒๓', {
      searchField: 'customerName',
    });
    expect(container.querySelector('mark')).toBeNull();
  });

  it('reads Thai digits as 0-9 in a number only when the whole term is digits', () => {
    const { container } = setup(
      { matchedOn: [{ field: 'appraisalNumber', value: '69123456' }], appraisalNumber: '69123456' },
      '๑๒๓*',
    );
    expect(container.querySelector('mark')).toBeNull();
  });

  it('treats a requestor stored with surrounding spaces as shown', () => {
    setup(
      {
        requestorName: 'Malee Srisuk ',
        matchedOn: [{ field: 'requestorName', value: 'Malee Srisuk ' }],
      },
      'Malee',
    );
    expect(screen.queryByText(matchedLabel(), { exact: false })).toBeNull();
  });

  it('marks the longest run between wildcards', () => {
    setup({ matchedOn: [{ field: 'customerName', value: 'Somchai Wongprasert' }] }, '*wong*');
    expect(screen.getByText('Wong').tagName).toBe('MARK');
  });

  it('drops the line in compact density, like every second line', () => {
    setup({ matchedOn: [{ field: 'prevAppraisalNumber', value: '69105522' }] }, '69105522', {
      density: 'compact',
    });
    expect(screen.queryByText(matchedLabel(), { exact: false })).toBeNull();
  });
});
