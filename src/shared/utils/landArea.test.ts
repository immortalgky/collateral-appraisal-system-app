import { describe, it, expect } from 'vitest';
import { toSquareWa } from './landArea';

describe('toSquareWa', () => {
  it('adds rai (400), ngan (100) and square wa', () => {
    expect(toSquareWa(1, 2, 30.5)).toBe(630.5);
    expect(toSquareWa(0, 3, 99)).toBe(399);
  });

  it('counts blank and non-numeric parts as zero', () => {
    expect(toSquareWa(null, undefined, '')).toBe(0);
    expect(toSquareWa('2', 'x', null)).toBe(800);
  });
});
