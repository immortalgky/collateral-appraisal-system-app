import { describe, expect, it } from 'vitest';
import { rowGroupRoles, togglePairs } from './rowGroups';

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

describe('togglePairs', () => {
  const toggle = (span: string) => ({ type: 'boolean-toggle', wrapperClassName: span });
  const text = (span: string) => ({ type: 'text-input', wrapperClassName: span });

  it('pairs a toggle with the one field that fills its row (3 + 9), either way round', () => {
    expect(togglePairs([toggle('col-span-3'), text('col-span-9')])).toEqual(
      new Map([[0, { second: 1, toggleFirst: true }]]),
    );
    expect(togglePairs([text('col-span-9'), toggle('col-span-3')])).toEqual(
      new Map([[0, { second: 1, toggleFirst: false }]]),
    );
  });

  it('finds the pair on a later row, after a full row and a chip group', () => {
    const chips = { type: 'checkbox-group', wrapperClassName: 'col-span-12' };
    const pairs = togglePairs([
      text('col-span-12'),
      chips,
      toggle('col-span-3'),
      text('col-span-9'),
    ]);
    expect([...pairs.keys()]).toEqual([2]);
  });

  it('leaves alone a row of three, two toggles, a toggle that does not fill the row, and chips', () => {
    expect(togglePairs([toggle('col-span-4'), toggle('col-span-4'), text('col-span-4')]).size).toBe(
      0,
    );
    expect(togglePairs([toggle('col-span-3'), toggle('col-span-9')]).size).toBe(0);
    expect(togglePairs([toggle('col-span-3'), text('col-span-4')]).size).toBe(0);
    expect(
      togglePairs([toggle('col-span-3'), { type: 'radio-group', wrapperClassName: 'col-span-9' }])
        .size,
    ).toBe(0);
  });
});
