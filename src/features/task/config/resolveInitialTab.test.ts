import { describe, expect, it } from 'vitest';
import { readStoredTab, resolveInitialTab } from './resolveInitialTab';

const KEYS = ['activityId', 'assigneeUserId'];
const run = (qs: string, stored: string | null = null) =>
  resolveInitialTab(new URLSearchParams(qs), stored, KEYS);

describe('resolveInitialTab', () => {
  it('tab param wins over stored and filters', () => {
    expect(run('tab=pool', 'personal')).toBe('pool');
    expect(run('tab=personal&activityId=x', 'pool')).toBe('personal');
  });
  it('ignores an invalid tab param', () => {
    expect(run('tab=nope', 'pool')).toBe('pool');
    expect(run('tab=nope')).toBe('personal');
  });
  it('filter or search params force personal', () => {
    expect(run('activityId=x', 'pool')).toBe('personal');
    expect(run('search=abc', 'pool')).toBe('personal');
  });
  it('empty filter params are not drill-downs', () => {
    expect(run('activityId=&search=', 'pool')).toBe('pool');
  });
  it('uses the stored tab', () => {
    expect(run('', 'pool')).toBe('pool');
  });
  it('defaults to personal', () => {
    expect(run('')).toBe('personal');
    expect(run('', 'garbage')).toBe('personal');
  });
  it('personal when storage throws', () => {
    const spy = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('blocked');
      },
    });
    try {
      expect(run('', readStoredTab('u1'))).toBe('personal');
    } finally {
      Object.defineProperty(globalThis, 'localStorage', spy);
    }
  });
});
