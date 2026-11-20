import { describe, expect, it } from 'vitest';
import { hasLandAccessibilityAnswer, isLandlocked, isLandNotAccessible } from './landlocked';

describe('isLandlocked', () => {
  it('follows the land accessibility when there is an answer: only 02 (cannot be reached)', () => {
    expect(isLandlocked('02', false)).toBe(true);
    expect(isLandlocked('01', true)).toBe(false);
    expect(isLandlocked('03', true)).toBe(false);
    expect(isLandlocked('04', null)).toBe(false);
    // The code is compared trimmed.
    expect(isLandlocked(' 02 ', false)).toBe(true);
  });

  it('keeps the old flag when there is no answer: null, absent, or the blank the land form saves', () => {
    for (const none of [null, undefined, '', '  ']) {
      expect(isLandlocked(none, true)).toBe(true);
      expect(isLandlocked(none, false)).toBe(false);
    }
  });

  it('says nothing when there is no answer and no flag', () => {
    for (const none of [null, undefined, '']) {
      expect(isLandlocked(none, null)).toBeNull();
      expect(isLandlocked(none, undefined)).toBeNull();
    }
  });
});

describe('land accessibility answer', () => {
  it('is any code that is not blank', () => {
    expect(hasLandAccessibilityAnswer('01')).toBe(true);
    for (const none of [null, undefined, '', '  '])
      expect(hasLandAccessibilityAnswer(none)).toBe(false);
  });

  it('says "cannot be reached" for 02, trimmed, and for nothing else', () => {
    expect(isLandNotAccessible('02')).toBe(true);
    expect(isLandNotAccessible(' 02 ')).toBe(true);
    for (const other of ['01', '03', '04', '', null, undefined])
      expect(isLandNotAccessible(other)).toBe(false);
  });
});
