import { describe, expect, it } from 'vitest';
import { parseFileName } from './contentDisposition';

describe('parseFileName', () => {
  it('reads the plain and the RFC 5987 forms, preferring the latter', () => {
    expect(parseFileName('attachment; filename="unit-prices.xlsx"')).toBe('unit-prices.xlsx');
    expect(
      parseFileName(
        `attachment; filename=fallback.xlsx; filename*=UTF-8''%E0%B8%A3%E0%B8%B2%E0%B8%84%E0%B8%B2.xlsx`,
      ),
    ).toBe('ราคา.xlsx');
  });

  it('is null without a header or a name', () => {
    expect(parseFileName(undefined)).toBeNull();
    expect(parseFileName('attachment')).toBeNull();
  });
});
