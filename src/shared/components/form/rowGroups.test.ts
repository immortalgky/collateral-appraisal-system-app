import { describe, expect, it } from 'vitest';
import { rowGroupRoles } from './rowGroups';

const w = (...spans: string[]) => spans.map(s => ({ wrapperClassName: s }));

describe('rowGroupRoles', () => {
  it('marks the address triple (6 + 3 + 3) as one row', () => {
    expect(rowGroupRoles(w('col-span-6', 'col-span-3', 'col-span-3'))).toEqual([
      'start',
      'member',
      'member',
    ]);
  });

  it('marks latitude / longitude (6 + 6) as a pair', () => {
    expect(rowGroupRoles(w('col-span-6', 'col-span-6'))).toEqual(['start', 'member']);
  });

  it('splits a long run into rows, in order', () => {
    expect(
      rowGroupRoles(w('col-span-4', 'col-span-4', 'col-span-4', 'col-span-6', 'col-span-6')),
    ).toEqual(['start', 'member', 'member', 'start', 'member']);
  });

  it('leaves a lone field, a full row and a run that never fills a row alone', () => {
    expect(rowGroupRoles(w('col-span-12', 'col-span-4', 'col-span-12'))).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(rowGroupRoles(w('col-span-4', 'col-span-4'))).toEqual([undefined, undefined]);
  });

  it('finds the pair after a field that leaves a gap (road distance, latitude, longitude), and ignores responsive spans', () => {
    expect(rowGroupRoles(w('col-span-4', 'col-span-6', 'col-span-6'))).toEqual([
      undefined,
      'start',
      'member',
    ]);
    expect(rowGroupRoles(w('col-span-12 md:col-span-6', 'col-span-6'))).toEqual([
      undefined,
      undefined,
    ]);
  });
});

describe('rowGroupRoles with a toggle or chip group', () => {
  it('only starts the row: the run does not keep its spans', () => {
    expect(
      rowGroupRoles([
        { type: 'boolean-toggle', wrapperClassName: 'col-span-3' },
        { type: 'text-input', wrapperClassName: 'col-span-6' },
        { type: 'text-input', wrapperClassName: 'col-span-3' },
      ]),
    ).toEqual(['start-only', undefined, undefined]);
  });
});

describe('rowGroupRoles with chipsFullRow (Standard)', () => {
  const chip = { type: 'radio-group', wrapperClassName: 'col-span-6' };
  it('a chip group is a full row: it ends the run before it and the fields after pair on their own', () => {
    expect(
      rowGroupRoles(
        [
          { type: 'text-input', wrapperClassName: 'col-span-6' },
          chip,
          { type: 'text-input', wrapperClassName: 'col-span-6' },
          { type: 'text-input', wrapperClassName: 'col-span-6' },
        ],
        true,
      ),
    ).toEqual([undefined, undefined, 'start', 'member']);
  });
  it('is off in Compact: the chip group still counts at its own span', () => {
    expect(rowGroupRoles([chip, { wrapperClassName: 'col-span-6' }])).toEqual([
      'start-only',
      undefined,
    ]);
  });
});
