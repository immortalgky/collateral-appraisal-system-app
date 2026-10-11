import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen, within } from '@/test/test-utils';
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

const render_ = (sortBy: string, sortDir: string, onSort = vi.fn()) => {
  const base = makeAppraisalColumns(t);
  const columns: AppraisalColumnDef[] = [
    base.find(c => c.key === 'appraisalCustomer')!,
    { key: 'bankingSegment', label: 'Group' },
    { key: 'propertyTypes', label: 'Collateral' },
    { key: 'createdAt', label: 'Created', sortable: true },
  ];
  render(
    <AppraisalResultsTable
      columns={columns}
      items={[item]}
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
    expect(badge?.className).toContain('bg-gray-100');
  });
});
