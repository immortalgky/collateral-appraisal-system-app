import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useColumnVisibility } from './useColumnVisibility';
import type { ColumnLayoutConfig } from './types';

type K = 'a' | 'b' | 'c' | 'd';
const base: ColumnLayoutConfig<K> = { columns: ['a', 'b', 'c', 'd'], pinnedColumn: 'a' };
const pinnable: ColumnLayoutConfig<K> = { ...base, pinnable: true };
const KEY = 'test-columns';
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? 'null');

beforeEach(() => localStorage.clear());

describe('useColumnVisibility pinning', () => {
  it('without pinnable nothing changes: no pins, the two-key shape stored', () => {
    const { result } = renderHook(() => useColumnVisibility(KEY, base));
    expect(result.current.pinnedColumns).toEqual([]);
    act(() => result.current.toggleColumn('c'));
    act(() => result.current.togglePin('b'));
    expect(result.current.visibleColumns).toEqual(['a', 'b', 'd']);
    expect(stored()).toEqual({ hidden: ['c'], order: ['a', 'b', 'c', 'd'] });
  });

  it('starts with the pinned column as the one pin', () => {
    const { result } = renderHook(() => useColumnVisibility(KEY, pinnable));
    expect(result.current.pinnedColumns).toEqual(['a']);
    expect(result.current.visibleColumns).toEqual(['a', 'b', 'c', 'd']);
  });

  it('moves a pinned column to the front, after the earlier pins, and back on unpin', () => {
    const { result } = renderHook(() => useColumnVisibility(KEY, pinnable));
    act(() => result.current.togglePin('c'));
    expect(result.current.pinnedColumns).toEqual(['a', 'c']);
    expect(result.current.visibleColumns).toEqual(['a', 'c', 'b', 'd']);
    act(() => result.current.togglePin('d'));
    expect(result.current.visibleColumns).toEqual(['a', 'c', 'd', 'b']);
    act(() => result.current.togglePin('c'));
    expect(result.current.visibleColumns).toEqual(['a', 'd', 'b', 'c']);
  });

  it('lets the pinned column itself be unpinned (it stays first, as the forced first column)', () => {
    const { result } = renderHook(() => useColumnVisibility(KEY, pinnable));
    act(() => result.current.togglePin('c'));
    act(() => result.current.togglePin('a'));
    expect(result.current.pinnedColumns).toEqual(['c']);
    expect(result.current.visibleColumns).toEqual(['c', 'a', 'b', 'd']);
  });

  it('keeps a hidden pinned column out of the table but in the pins', () => {
    const { result } = renderHook(() => useColumnVisibility(KEY, pinnable));
    act(() => result.current.togglePin('c'));
    act(() => result.current.toggleColumn('c'));
    expect(result.current.pinnedColumns).toEqual(['a', 'c']);
    expect(result.current.visibleColumns).toEqual(['a', 'b', 'd']);
  });

  it('reorders pins among themselves and the rest among themselves, never across', () => {
    const { result } = renderHook(() => useColumnVisibility(KEY, pinnable));
    act(() => result.current.togglePin('c'));
    act(() => result.current.reorderColumns('c', 'a'));
    expect(result.current.pinnedColumns).toEqual(['c', 'a']);
    act(() => result.current.reorderColumns('d', 'b'));
    expect(result.current.visibleColumns).toEqual(['c', 'a', 'd', 'b']);
    // across the two groups: ignored
    act(() => result.current.reorderColumns('b', 'a'));
    expect(result.current.pinnedColumns).toEqual(['c', 'a']);
    expect(result.current.visibleColumns).toEqual(['c', 'a', 'd', 'b']);
  });

  it('persists pins, restores them, and reset puts the pinned column back', () => {
    const first = renderHook(() => useColumnVisibility(KEY, pinnable));
    act(() => first.result.current.togglePin('d'));
    expect(stored().pinned).toEqual(['a', 'd']);
    first.unmount();

    const again = renderHook(() => useColumnVisibility(KEY, pinnable));
    expect(again.result.current.visibleColumns).toEqual(['a', 'd', 'b', 'c']);
    act(() => again.result.current.resetToDefault());
    expect(again.result.current.pinnedColumns).toEqual(['a']);
    expect(again.result.current.visibleColumns).toEqual(['a', 'b', 'c', 'd']);
  });

  it('reads a layout saved before pins existed as the default pin', () => {
    localStorage.setItem(KEY, JSON.stringify({ hidden: ['b'], order: ['a', 'c', 'b', 'd'] }));
    const { result } = renderHook(() => useColumnVisibility(KEY, pinnable));
    expect(result.current.pinnedColumns).toEqual(['a']);
    expect(result.current.visibleColumns).toEqual(['a', 'c', 'd']);
  });

  it('drops stored pins that are not columns any more, and duplicates', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ hidden: [], order: [], pinned: ['zzz', 'c', 'c', 'b'] }),
    );
    const { result } = renderHook(() => useColumnVisibility(KEY, pinnable));
    expect(result.current.pinnedColumns).toEqual(['c', 'b']);
  });
});
