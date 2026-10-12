import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import {
  APPRAISAL_DEFAULT_HIDDEN_COLUMNS,
  APPRAISAL_DEFAULT_SORT,
  effectiveSort,
  makeAppraisalColumns,
  nextAppraisalSort,
} from './tabConfigs';

// AppraisalFilterBuilder.AllowedSortFields (BE), lower-cased: BuildOrderBy falls back to CreatedAt
// for anything else, so a header that sorts on a key outside this set silently sorts by date.
const BE_SORT_FIELDS = new Set(
  [
    'AppraisalNumber',
    'RequestNumber',
    'CustomerName',
    'Status',
    'AppraisalType',
    'Priority',
    'SLADueDate',
    'SLAStatus',
    'CreatedAt',
    'AssignedDate',
    'AppointmentDateTime',
    'Province',
    'District',
    'SubDistrict',
    'Channel',
    'BankingSegment',
    'FacilityLimit',
    'PropertyCount',
    'ElapsedHours',
    'RemainingHours',
    'AssignmentType',
    'CompanyName',
    'RequestedAt',
    'Purpose',
    'AppraisalDate',
  ].map(f => f.toLowerCase()),
);

const columns = makeAppraisalColumns(((k: string) => k) as unknown as TFunction<'appraisal'>);

describe('makeAppraisalColumns', () => {
  it('holds number and customer in one column, with a sort target for each', () => {
    const merged = columns.find(c => c.key === 'appraisalCustomer');
    expect(merged?.headSorts?.map(h => h.key)).toEqual(['appraisalNumber', 'customerName']);
    expect(columns.some(c => c.key === 'customerName')).toBe(false);
  });

  it('only sorts on fields the API accepts', () => {
    const keys = columns.flatMap(c =>
      c.headSorts ? c.headSorts.map(h => h.key) : c.sortable ? [c.sortKey ?? c.key] : [],
    );
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) expect(BE_SORT_FIELDS.has(k.toLowerCase()), k).toBe(true);
  });

  it('sorts the SLA column by its due date, not by the status name', () => {
    const sla = columns.find(c => c.key === 'slaStatus');
    expect(sla?.sortKey).toBe('slaDueDate');
    // the sort cycle works on that key: ascending first (nearest due date first), then descending
    expect(nextAppraisalSort('', 'desc', 'slaDueDate')).toEqual({
      sortBy: 'slaDueDate',
      sortDir: 'asc',
    });
    expect(nextAppraisalSort('slaDueDate', 'asc', 'slaDueDate')).toEqual({
      sortBy: 'slaDueDate',
      sortDir: 'desc',
    });
    expect(nextAppraisalSort('slaDueDate', 'desc', 'slaDueDate')).toEqual({
      sortBy: '',
      sortDir: 'desc',
    });
  });

  it('starts with the priority column hidden, still offered in the picker', () => {
    expect(APPRAISAL_DEFAULT_HIDDEN_COLUMNS).toContain('priority');
    expect(columns.some(c => c.key === 'priority')).toBe(true);
  });

  it('lists the visible columns in the default order, with the hidden ones after them', () => {
    const keys = columns.map(c => c.key);
    expect(keys.slice(0, 12)).toEqual([
      'appraisalCustomer',
      'status',
      'purpose',
      'propertyTypes',
      'slaStatus',
      'priority',
      'assignee',
      'appointmentDateTime',
      'province',
      'requestor',
      'bankingSegment',
      'createdAt',
    ]);
    // priority keeps its place (it lands after SLA when turned on); the rest of the hidden ones trail
    expect(keys.slice(12)).toEqual(APPRAISAL_DEFAULT_HIDDEN_COLUMNS.filter(k => k !== 'priority'));
  });

  it('can show the default sort on one of its columns', () => {
    expect(
      columns.some(
        c => c.key.toLowerCase() === APPRAISAL_DEFAULT_SORT.by.toLowerCase() && c.sortable,
      ),
    ).toBe(true);
  });
});

describe('effectiveSort', () => {
  it('is the API default when nothing was chosen, and the choice otherwise', () => {
    expect(effectiveSort('', 'asc')).toEqual({ by: 'createdAt', dir: 'desc' });
    expect(effectiveSort('province', 'asc')).toEqual({ by: 'province', dir: 'asc' });
  });
});

describe('nextAppraisalSort', () => {
  const off = { sortBy: '', sortDir: 'desc' };

  it('cycles an ordinary column asc → desc → off', () => {
    const asc = nextAppraisalSort('', 'desc', 'province');
    expect(asc).toEqual({ sortBy: 'province', sortDir: 'asc' });
    const desc = nextAppraisalSort(asc.sortBy, asc.sortDir, 'province');
    expect(desc).toEqual({ sortBy: 'province', sortDir: 'desc' });
    expect(nextAppraisalSort(desc.sortBy, desc.sortDir, 'province')).toEqual(off);
  });

  it('starts a new column ascending, whatever was active', () => {
    expect(nextAppraisalSort('province', 'desc', 'status')).toEqual({
      sortBy: 'status',
      sortDir: 'asc',
    });
  });

  it('flips the default column, which already shows as sorted, instead of "clearing" it', () => {
    const asc = nextAppraisalSort('', 'desc', 'createdAt');
    expect(asc).toEqual({ sortBy: 'createdAt', sortDir: 'asc' });
    expect(nextAppraisalSort(asc.sortBy, asc.sortDir, 'createdAt')).toEqual(off);
  });

  it('recognises the default column under the API spelling too', () => {
    expect(nextAppraisalSort('CreatedAt', 'asc', 'createdAt')).toEqual(off);
  });
});
