import { describe, expect, it } from 'vitest';
import { pickActiveQuotation } from './pickActiveQuotation';

const q = (id: string, status: string, requestDate: string, selectedAt?: string | null) => ({
  id,
  status,
  requestDate,
  selectedAt,
});

describe('pickActiveQuotation', () => {
  it('returns undefined when there is nothing open or finalized', () => {
    expect(pickActiveQuotation([])).toBeUndefined();
    expect(pickActiveQuotation([q('a', 'Cancelled', '2026-01-01')])).toBeUndefined();
  });

  it('prefers an open quotation over a finalized one, whatever the list order', () => {
    const picked = pickActiveQuotation([
      q('fin', 'Finalized', '2026-03-01', '2026-03-02'),
      q('cancelled', 'Cancelled', '2026-04-01'),
      q('open', 'Negotiating', '2026-01-01'),
    ]);
    expect(picked?.id).toBe('open');
  });

  it('takes the most recently finalized one by selectedAt, not by list order', () => {
    const picked = pickActiveQuotation([
      q('old', 'Finalized', '2026-01-01', '2026-01-05'),
      q('cancelled', 'Cancelled', '2026-06-01'),
      q('new', 'Finalized', '2026-01-02', '2026-02-01'),
    ]);
    expect(picked?.id).toBe('new');
  });

  it('falls back to requestDate when selectedAt is null or missing', () => {
    const picked = pickActiveQuotation([
      q('a', 'Finalized', '2026-01-01', null),
      q('b', 'Finalized', '2026-02-01'),
    ]);
    expect(picked?.id).toBe('b');
  });

  it('counts an unparsable date as oldest and breaks ties by the newest id', () => {
    expect(
      pickActiveQuotation([
        q('bad', 'Finalized', 'not-a-date'),
        q('good', 'Finalized', '2026-01-01'),
      ])?.id,
    ).toBe('good');

    expect(
      pickActiveQuotation([
        q('0001', 'Finalized', '2026-01-01', '2026-01-01'),
        q('0002', 'Finalized', '2026-01-01', '2026-01-01'),
      ])?.id,
    ).toBe('0002');
  });
});
