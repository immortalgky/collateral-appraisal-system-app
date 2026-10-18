import { describe, expect, it } from 'vitest';
import { formatFileSize } from './formatUtils';

describe('formatFileSize', () => {
  it('keeps "Bytes" below a kilobyte, and zero as 0 Bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1)).toBe('1 Bytes');
    expect(formatFileSize(999)).toBe('999 Bytes');
  });

  it('uses the 1024 base, with at most 2 decimals, trimmed', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2 MB');
    expect(formatFileSize(1.5 * 1024 ** 3)).toBe('1.5 GB');
    expect(formatFileSize(1234567)).toBe('1.18 MB');
  });

  it('steps up a unit once the value reaches 1000 of the current one', () => {
    expect(formatFileSize(1000)).toBe('0.98 KB');
    expect(formatFileSize(1000 * 1024)).toBe('0.98 MB');
    expect(formatFileSize(1000 * 1024 * 1024)).toBe('0.98 GB');
    expect(formatFileSize(999 * 1024 * 1024)).toBe('999 MB');
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    expect(formatFileSize(1000 * 1024 ** 4)).toBe('1000 TB'); // TB is the last unit
  });

  it('shows a dash when there is no size', () => {
    expect(formatFileSize(null)).toBe('—');
    expect(formatFileSize(undefined)).toBe('—');
    expect(formatFileSize(NaN)).toBe('—');
    expect(formatFileSize(-5)).toBe('—');
  });
});
