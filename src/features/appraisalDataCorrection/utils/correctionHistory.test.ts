import { describe, expect, it } from 'vitest';
import {
  countByTarget,
  DOCUMENTS_PANE,
  filterByKind,
  groupByDay,
  latestOf,
  targetOf,
  entryKind,
  propertyFieldLabel,
} from './correctionHistory';

// Local time, so the day boundaries hold in whatever timezone the test runs in.
const at = (day: number, hour: number) => new Date(2026, 8, day, hour).toISOString();
const row = (id: string, appraisalPropertyId: string | null, changedAt: string) => ({
  id,
  appraisalPropertyId,
  changedAt,
});

const rows = [
  row('a', 'p1', at(18, 11)),
  row('b', null, at(29, 9)),
  row('c', 'p1', at(29, 10)),
  row('d', 'p2', at(22, 15)),
];

describe('targetOf', () => {
  it('maps a null property id to the documents entry', () => {
    expect(targetOf(rows[1])).toBe(DOCUMENTS_PANE);
    expect(targetOf(rows[0])).toBe('p1');
  });
});

describe('countByTarget', () => {
  it('counts rows per property and lumps document rows together', () => {
    expect(countByTarget(rows)).toEqual(
      new Map([
        ['p1', 2],
        [DOCUMENTS_PANE, 1],
        ['p2', 1],
      ]),
    );
  });

  it('is empty for no rows', () => {
    expect(countByTarget([]).size).toBe(0);
  });
});

describe('latestOf', () => {
  it('picks the newest row overall regardless of input order', () => {
    expect(latestOf(rows)?.id).toBe('c');
  });

  it('picks the newest row for one target', () => {
    expect(latestOf(rows, 'p2')?.id).toBe('d');
    expect(latestOf(rows, DOCUMENTS_PANE)?.id).toBe('b');
  });

  it('is undefined when the target has no rows', () => {
    expect(latestOf(rows, 'p9')).toBeUndefined();
    expect(latestOf([])).toBeUndefined();
  });
});

describe('filterByKind', () => {
  it('keeps everything for "all"', () => {
    expect(filterByKind(rows, 'all')).toHaveLength(4);
  });

  it('splits property rows from document rows', () => {
    expect(filterByKind(rows, 'property').map(r => r.id)).toEqual(['a', 'c', 'd']);
    expect(filterByKind(rows, 'documents').map(r => r.id)).toEqual(['b']);
  });
});

describe('groupByDay', () => {
  it('groups newest day first and newest row first within a day', () => {
    const groups = groupByDay(rows);
    expect(groups.map(g => g.items.map(r => r.id))).toEqual([['c', 'b'], ['d'], ['a']]);
    expect(groups.map(g => g.day)).toEqual(['2026-09-29', '2026-09-22', '2026-09-18']);
  });

  it('does not mutate its input', () => {
    const copy = [...rows];
    groupByDay(rows);
    expect(rows).toEqual(copy);
  });

  it('is empty for no rows', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('entryKind', () => {
  it('does not call a document row with no changes a notification', () => {
    expect(entryKind({ appraisalPropertyId: null, changes: [] })).not.toBe('notify');
  });

  const doc = (changes: { field: string; from: string | null; to: string | null }[]) => ({
    appraisalPropertyId: null,
    changes,
  });

  it('classifies each kind of row', () => {
    expect(entryKind({ appraisalPropertyId: 'p1', changes: [] })).toBe('property');
    expect(
      entryKind(
        doc([
          { field: 'AppraisalSummary', from: null, to: 'Regeneration requested' },
          { field: 'ExternalNotification', from: null, to: 'LOS' },
        ]),
      ),
    ).toBe('regenerate');
    expect(entryKind(doc([{ field: 'ExternalNotification', from: null, to: 'LOS' }]))).toBe(
      'notify',
    );
    expect(entryKind(doc([{ field: 'D005', from: null, to: 'a.pdf' }]))).toBe('attach');
    expect(entryKind(doc([{ field: 'D007', from: 'old.pdf', to: null }]))).toBe('delete');
    expect(entryKind(doc([{ field: 'D005', from: 'a.pdf', to: 'b.pdf' }]))).toBe('replace');
    // Replace across two types: one key loses its file, the other gains one.
    expect(
      entryKind(
        doc([
          { field: 'D005', from: 'a.pdf', to: null },
          { field: 'D006', from: null, to: 'b.pdf' },
        ]),
      ),
    ).toBe('replace');
  });
});

describe('propertyFieldLabel', () => {
  it('uses the edit form label for the last path segment', () => {
    expect(propertyFieldLabel('Land.LandOffice')).toBe('Land Office');
    expect(propertyFieldLabel('Land.Title[5f1c].TitleNumber')).toBe('Title Number');
  });

  it('keeps DOPA fields apart from their title-address twins', () => {
    expect(propertyFieldLabel('Land.SubDistrict')).toBe('Sub District');
    expect(propertyFieldLabel('Land.DopaSubDistrict')).toBe('Sub District (DOPA)');
  });

  it('humanizes a field no form labels', () => {
    expect(propertyFieldLabel('Land.SomethingNew')).toBe('Something New');
  });

  it('names the table and the row before the column', () => {
    expect(propertyFieldLabel('Land.Titles[#1234].Rai')).toBe('Land titles #1234 · Rai');
    expect(propertyFieldLabel('Titles[#1234].Ngan')).toBe('Land titles #1234 · Ngan');
  });

  it('keeps a business key that contains dots whole', () => {
    expect(propertyFieldLabel('Land.Titles[#12.5].Rai')).toBe('Land titles #12.5 · Rai');
  });

  it('shows a row position as it stands in the audit path, which counts from 1', () => {
    expect(propertyFieldLabel('Land.Deductions[1].AreaInSqWa')).toBe(
      'Land area deductions #1 · Area In Sq Wa',
    );
  });

  it('labels a whole row added or removed by its table and row', () => {
    expect(propertyFieldLabel('Land.Deductions[2]')).toBe('Land area deductions #2');
    expect(propertyFieldLabel('Land.Titles[#1234]')).toBe('Land titles #1234');
  });

  it('names every table on the way to a nested row', () => {
    const path = 'Building.DepreciationDetails[1].DepreciationPeriods[2].DepreciationPerYear';
    expect(propertyFieldLabel(path)).toBe('Depreciation #1 · Periods #2 · Depreciation Per Year');
  });

  it('ignores the row id older audit rows recorded', () => {
    expect(propertyFieldLabel('Land.Title[5f1c-0a].Rai')).toBe('Rai');
  });

  it('keeps the DOPA suffix on a column inside a row', () => {
    expect(propertyFieldLabel('Land.Titles[#1].DopaSubDistrict')).toBe(
      'Land titles #1 · Sub District (DOPA)',
    );
  });
});
