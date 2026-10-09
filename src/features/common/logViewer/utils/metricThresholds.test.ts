import { describe, it, expect } from 'vitest';
import { levelFor, worstLevel } from './metricThresholds';

describe('levelFor', () => {
  it('is ok below the warn threshold', () => {
    expect(levelFor('cpu', 69)).toBe('ok');
  });

  it('is warn at and above the warn threshold, below bad', () => {
    expect(levelFor('cpu', 70)).toBe('warn');
    expect(levelFor('cpu', 84.9)).toBe('warn');
  });

  it('is bad at and above the bad threshold', () => {
    expect(levelFor('cpu', 85)).toBe('bad');
    expect(levelFor('cpu', 100)).toBe('bad');
  });

  it('treats a null or missing value (no samples — the API omits the key) as ok', () => {
    expect(levelFor('p95', null)).toBe('ok');
    expect(levelFor('p95', undefined)).toBe('ok');
  });

  it('uses the right threshold per metric', () => {
    expect(levelFor('queue', 10)).toBe('warn');
    expect(levelFor('queue', 50)).toBe('bad');
    expect(levelFor('p95', 1500)).toBe('warn');
    expect(levelFor('p95', 5000)).toBe('bad');
    expect(levelFor('http5xx', 3)).toBe('warn');
    expect(levelFor('http5xx', 10)).toBe('bad');
    expect(levelFor('memory', 80)).toBe('warn');
    expect(levelFor('memory', 90)).toBe('bad');
  });
});

describe('worstLevel', () => {
  it('picks bad over warn over ok', () => {
    expect(worstLevel(['ok', 'warn', 'bad'])).toBe('bad');
    expect(worstLevel(['ok', 'warn'])).toBe('warn');
    expect(worstLevel(['ok', 'ok'])).toBe('ok');
    expect(worstLevel([])).toBe('ok');
  });
});
