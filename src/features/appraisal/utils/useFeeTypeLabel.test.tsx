import { describe, expect, it } from 'vitest';
import { renderHook } from '@/test/test-utils';
import { useFeeTypeLabel } from './useFeeTypeLabel';

/** The test i18n returns keys, so a known code reads as its `feePreview.type.*` key. */
describe('useFeeTypeLabel', () => {
  const label = () => renderHook(() => useFeeTypeLabel()).result.current;

  it('labels the three codes it knows', () => {
    const typeLabel = label();
    expect(typeLabel('01')).toBe('feePreview.type.01');
    expect(typeLabel('02')).toBe('feePreview.type.02');
    expect(typeLabel('99')).toBe('feePreview.type.99');
  });

  it('shows a code it does not know as it is, never as "other"', () => {
    expect(label()('07')).toBe('07');
  });

  it('shows nothing for no code', () => {
    const typeLabel = label();
    expect(typeLabel(null)).toBe('');
    expect(typeLabel(undefined)).toBe('');
  });
});
