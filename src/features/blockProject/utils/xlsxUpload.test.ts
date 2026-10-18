import { describe, expect, it } from 'vitest';
import { checkXlsx, MAX_XLSX_UPLOAD_MB } from './xlsxUpload';

const file = (name: string, bytes = 1) => {
  const f = new File(['x'], name);
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
};

describe('checkXlsx', () => {
  it('accepts .xlsx in any case, up to the limit', () => {
    expect(checkXlsx(file('a.xlsx'), MAX_XLSX_UPLOAD_MB)).toBeNull();
    expect(
      checkXlsx(file('A.XLSX', MAX_XLSX_UPLOAD_MB * 1024 * 1024), MAX_XLSX_UPLOAD_MB),
    ).toBeNull();
  });

  it('refuses other types, including a dotless name', () => {
    expect(checkXlsx(file('a.xls'), 5)).toBe('invalidType');
    expect(checkXlsx(file('a.csv'), 5)).toBe('invalidType');
    expect(checkXlsx(file('xlsx'), 5)).toBe('invalidType');
  });

  it('refuses a file over the limit, and the limit is per caller', () => {
    const big = file('a.xlsx', 7 * 1024 * 1024);
    expect(checkXlsx(big, 5)).toBe('tooLarge');
    expect(checkXlsx(big, 10)).toBeNull();
  });
});
