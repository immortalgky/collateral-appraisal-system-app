import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { PINNED_TASK_FILTERS } from '../components/list/taskFilters';
import type { ActiveTab } from '../config/resolveInitialTab';
import { useTaskFilterPins } from './useTaskFilterPins';

const known = ['activityId', 'status', 'appointment', 'purpose', 'channel', 'propertyType'];

const setup = (tab: ActiveTab = 'personal', keys: string[] = known) =>
  renderHook(({ tab: t, keys: k }) => useTaskFilterPins(t, k), { initialProps: { tab, keys } });

afterEach(() => localStorage.clear());

describe('useTaskFilterPins', () => {
  it("starts on each tab's defaults", () => {
    const { result, rerender } = setup();
    expect(result.current.pinned).toEqual(PINNED_TASK_FILTERS.personal);
    expect(result.current.controls.canReset).toBe(false);
    rerender({ tab: 'pool', keys: known });
    expect(result.current.pinned).toEqual(PINNED_TASK_FILTERS.pool);
  });

  it('pins a filter last and unpins one, and keeps it after a reload', () => {
    const { result } = setup();
    act(() => result.current.controls.onTogglePin('propertyType'));
    expect(result.current.pinned).toEqual([...PINNED_TASK_FILTERS.personal, 'propertyType']);
    act(() => result.current.controls.onTogglePin('status'));
    expect(result.current.pinned).not.toContain('status');
    expect(result.current.controls.canReset).toBe(true);

    const again = setup();
    expect(again.result.current.pinned).toEqual(result.current.pinned);
  });

  it('is back on the defaults, with nothing to reset, once the pins equal them again', () => {
    const { result } = setup();
    act(() => result.current.controls.onTogglePin('status'));
    expect(result.current.controls.canReset).toBe(true);
    act(() => result.current.controls.onTogglePin('status'));
    // status comes back last, so the order differs from the defaults until it is moved home
    act(() => result.current.controls.onReorderPins('status', PINNED_TASK_FILTERS.personal[2]));
    expect(result.current.pinned).toEqual(PINNED_TASK_FILTERS.personal);
    expect(result.current.controls.canReset).toBe(false);
    expect(localStorage.getItem('task-filter-pins-personal@1')).toBeNull();
  });

  it('keeps each tab to itself', () => {
    const { result, rerender } = setup();
    act(() => result.current.controls.onTogglePin('activityId'));
    rerender({ tab: 'pool', keys: known });
    expect(result.current.pinned).toEqual(PINNED_TASK_FILTERS.pool);
    expect(result.current.controls.canReset).toBe(false);
  });

  it('moves a pinned filter to where another one is', () => {
    const { result } = setup();
    const [a, b, c] = PINNED_TASK_FILTERS.personal;
    act(() => result.current.controls.onReorderPins(c, a));
    expect(result.current.pinned).toEqual([c, a, b]);
    act(() => result.current.controls.onReorderPins(c, 'purpose')); // not pinned: nothing moves
    expect(result.current.pinned).toEqual([c, a, b]);
  });

  it('resets the tab to its defaults', () => {
    const { result } = setup();
    act(() => result.current.controls.onTogglePin('status'));
    act(() => result.current.controls.onResetPins());
    expect(result.current.pinned).toEqual(PINNED_TASK_FILTERS.personal);
    expect(result.current.controls.canReset).toBe(false);
  });

  it('drops a saved filter that no longer exists, and ignores a corrupt value', () => {
    localStorage.setItem('task-filter-pins-personal@1', JSON.stringify(['gone', 'status']));
    expect(setup().result.current.pinned).toEqual(['status']);

    localStorage.setItem('task-filter-pins-personal@1', '{oops');
    expect(setup().result.current.pinned).toEqual(PINNED_TASK_FILTERS.personal);
  });

  it('allows no pins at all', () => {
    localStorage.setItem('task-filter-pins-personal@1', '[]');
    const { result } = setup();
    expect(result.current.pinned).toEqual([]);
    expect(result.current.controls.canReset).toBe(true);
  });
});
