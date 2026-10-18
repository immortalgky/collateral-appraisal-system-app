import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@features/auth/store';
import { saveTaskListUrl, taskListUrl } from './taskReturn';

const loginAs = (id: string | null) =>
  useAuthStore.setState({ user: id ? ({ id } as never) : null });

beforeEach(() => loginAs('u1'));
afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  loginAs(null);
});

describe('taskListUrl', () => {
  it('returns the saved url and does not consume it', () => {
    expect(saveTaskListUrl('/tasks?tab=pool&search=a')).toBe(true);
    expect(taskListUrl('/x')).toBe('/tasks?tab=pool&search=a');
    expect(taskListUrl('/x')).toBe('/tasks?tab=pool&search=a');
  });
  it('the latest save wins', () => {
    saveTaskListUrl('/tasks?tab=pool');
    saveTaskListUrl('/tasks?tab=personal');
    expect(taskListUrl()).toBe('/tasks?tab=personal');
  });
  it('does not leak to another user', () => {
    saveTaskListUrl('/tasks?assigneeUserId=boss');
    loginAs('u2');
    expect(taskListUrl('/x')).toBe('/x');
  });
  it('without a user nothing is saved and the fallback is returned', () => {
    loginAs(null);
    expect(saveTaskListUrl('/tasks?tab=pool')).toBe(false);
    expect(taskListUrl('/x')).toBe('/x');
    loginAs('u1');
    expect(taskListUrl('/x')).toBe('/x');
  });
  it('returns the fallback when nothing is saved', () => {
    expect(taskListUrl()).toBe('/tasks');
  });
  it('returns the fallback when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(taskListUrl('/x')).toBe('/x');
  });
});
