import { afterEach, describe, expect, it } from 'vitest';
import { loadPdfLayout, savePdfLayout } from './operationalReportsApi';

const KEY = 'operationalReports.pdfLayout';
const DEFAULTS = { orientation: 'landscape', overflow: 'fit', fontSize: 11 };

describe('pdf layout storage', () => {
  afterEach(() => localStorage.clear());

  it('defaults when nothing is stored', () => {
    expect(loadPdfLayout()).toEqual(DEFAULTS);
  });

  it('round-trips a saved choice', () => {
    savePdfLayout({ orientation: 'portrait', overflow: 'split', fontSize: 9 });
    expect(loadPdfLayout()).toEqual({ orientation: 'portrait', overflow: 'split', fontSize: 9 });
  });

  it.each([
    'not json',
    '{"orientation":"sideways","overflow":"fit","fontSize":11}',
    '{"orientation":"portrait","overflow":"fit","fontSize":99}',
  ])('defaults on bad data %s', raw => {
    localStorage.setItem(KEY, raw);
    expect(loadPdfLayout()).toEqual(DEFAULTS);
  });
});
