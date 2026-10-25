import { describe, expect, it } from 'vitest';
import { isSameUser } from './isSameUser';

describe('isSameUser', () => {
  it('ignores case, and is never true for a missing name', () => {
    expect(isSameUser('P5229', 'p5229')).toBe(true);
    expect(isSameUser('P5229', 'P5230')).toBe(false);
    expect(isSameUser(null, undefined)).toBe(false);
    expect(isSameUser('', '')).toBe(false);
    expect(isSameUser('p5229', undefined)).toBe(false);
  });
});
