import { describe, it, expect } from 'vitest';
import {
  buildSegmentSet,
  filterCoveringCompanies,
  getMissingSegments,
  getSegmentGaps,
  searchCompanies,
} from './segmentCoverage';

describe('buildSegmentSet', () => {
  it('dedupes case-insensitively, drops blanks and sorts ignoring case', () => {
    expect(buildSegmentSet(['Retail', 'retail', 'IBG', null, undefined, ' ', 'IBG '])).toEqual([
      'IBG',
      'Retail',
    ]);
    expect(buildSegmentSet(['sme', 'Retail', 'IBG'])).toEqual(['IBG', 'Retail', 'sme']);
  });

  it('keeps the ordinal-smallest spelling of case-insensitive duplicates, in either input order', () => {
    expect(buildSegmentSet(['Retail', 'RETAIL', 'retail'])).toEqual(['RETAIL']);
    expect(buildSegmentSet(['retail', 'RETAIL', 'Retail'])).toEqual(['RETAIL']);
    expect(buildSegmentSet(['ibg', 'Retail', 'IBG'])).toEqual(['IBG', 'Retail']);
  });
});

describe('getSegmentGaps', () => {
  const a = { companyId: 'a', missingSegments: ['IBG'] };
  const b = { companyId: 'b', missingSegments: [] };
  const c = { companyId: 'c', missingSegments: undefined };

  it('keeps only companies with missing segments', () => {
    expect(getSegmentGaps([a, b, c])).toEqual([a]);
  });

  it('tolerates a missing list and null missingSegments', () => {
    expect(getSegmentGaps(undefined)).toEqual([]);
    expect(getSegmentGaps(null)).toEqual([]);
    expect(getSegmentGaps([{ missingSegments: null }])).toEqual([]);
  });
});

describe('searchCompanies', () => {
  const alpha = { companyName: 'Alpha Co', companyNameLocal: 'อัลฟา' };
  const beta = { companyName: 'Beta Co', companyNameLocal: null };

  it('returns everyone for a blank query', () => {
    expect(searchCompanies([alpha, beta], '  ')).toEqual([alpha, beta]);
  });

  it('matches name or local name, case-insensitively', () => {
    expect(searchCompanies([alpha, beta], ' BETA ')).toEqual([beta]);
    expect(searchCompanies([alpha, beta], 'อัลฟา')).toEqual([alpha]);
  });
});

describe('filterCoveringCompanies', () => {
  const retail = { companyName: 'Alpha Co', companyNameLocal: 'อัลฟา', loanTypes: ['Retail'] };
  const both = { companyName: 'Beta Co', companyNameLocal: null, loanTypes: ['retail', 'IBG'] };
  const companies = [retail, both];

  it('keeps only companies covering the whole set', () => {
    expect(filterCoveringCompanies(companies, ['Retail', 'IBG'])).toEqual([both]);
  });

  it('lists everyone for an empty set', () => {
    expect(filterCoveringCompanies(companies, [])).toEqual(companies);
  });

  it('composes with searchCompanies (search applies to the covering list)', () => {
    expect(searchCompanies(filterCoveringCompanies(companies, ['IBG']), 'alpha')).toEqual([]);
    expect(searchCompanies(filterCoveringCompanies(companies, ['IBG']), 'beta')).toEqual([both]);
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
    expect(getMissingSegments([], [])).toEqual([]);
    expect(getMissingSegments([], ['Retail'])).toEqual([]);
  });
});
