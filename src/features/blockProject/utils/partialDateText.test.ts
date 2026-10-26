import { describe, expect, it } from 'vitest';
import { monthLabel, partialDateText } from './partialDateText';

describe('partialDateText', () => {
  it('is null when empty', () => {
    expect(partialDateText(null, 'en', 'en')).toBeNull();
    expect(partialDateText('', 'th', 'th')).toBeNull();
  });

  it('shows only the stored parts, joined day / month / year, labelled as the dropdowns do', () => {
    expect(partialDateText('2026', 'en', 'en')).toBe('2026');
    expect(partialDateText('2026-03', 'en', 'en')).toBe(`${monthLabel('en', 3)} 2026`);
    expect(partialDateText('2026-03-05', 'en', 'en')).toBe(`5 ${monthLabel('en', 3)} 2026`);
  });

  it('shows the Buddhist Era year in Thai, as the year dropdown does', () => {
    expect(partialDateText('2026', 'th', 'th')).toBe('2569');
    expect(partialDateText('2026-03-05', 'th', 'th')).toBe(`5 ${monthLabel('th', 3)} 2569`);
  });

  it('drops everything from the first invalid part, and does not throw', () => {
    expect(partialDateText('2026-02-30', 'en', 'en')).toBe(`${monthLabel('en', 2)} 2026`);
    expect(partialDateText('2026-13-05', 'en', 'en')).toBe('2026');
    expect(partialDateText('x-03', 'en', 'en')).toBeNull();
    expect(partialDateText('abc', 'en', 'en')).toBeNull();
  });
});
