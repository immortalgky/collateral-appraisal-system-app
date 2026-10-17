import { describe, it, expect } from 'vitest';
import { buildSegmentSet, coversSegments, getMissingSegments } from './segmentCoverage';

describe('buildSegmentSet', () => {
  it('dedupes case-insensitively and drops blanks', () => {
    expect(buildSegmentSet(['Retail', 'retail', 'IBG', null, undefined, ' ', 'IBG '])).toEqual([
      'Retail',
      'IBG',
    ]);
  });
});

describe('getMissingSegments', () => {
  it('is empty when the company covers every segment', () => {
    expect(getMissingSegments(['Retail', 'IBG'], ['Retail', 'IBG'])).toEqual([]);
  });

  it('ignores extra company segments', () => {
    expect(getMissingSegments(['Retail', 'IBG'], ['Retail', 'IBG', 'SME'])).toEqual([]);
  });

  it('reports the gap when the company covers only part of the union', () => {
    expect(getMissingSegments(['Retail', 'IBG'], ['Retail'])).toEqual(['IBG']);
  });

  it('is case-insensitive (seed data is mixed-case)', () => {
    expect(getMissingSegments(['Retail', 'IBG'], ['RETAIL', 'ibg'])).toEqual([]);
  });

  it('misses everything for a company with no segments', () => {
    expect(getMissingSegments(['Retail'], [])).toEqual(['Retail']);
    expect(getMissingSegments(['Retail'], undefined)).toEqual(['Retail']);
  });

  it('covers everything when the set is empty (no appraisals picked yet)', () => {
    expect(coversSegments([], [])).toBe(true);
    expect(coversSegments([], ['Retail'])).toBe(true);
  });
});
