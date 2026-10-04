import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useScopedSelection } from './useScopedSelection';

const select = (r: { current: ReturnType<typeof useScopedSelection<string>> }, key: string) =>
  act(() => r.current[1](prev => new Map(prev).set(key, `item-${key}`)));

describe('useScopedSelection', () => {
  it('a new committed search drops the selection', () => {
    const { result, rerender } = renderHook(
      ({ committed }) => useScopedSelection<string>(committed),
      { initialProps: { committed: 'a' } },
    );

    select(result, 'x');
    expect(result.current[0].size).toBe(1);

    rerender({ committed: 'b' });
    expect(result.current[0].size).toBe(0);
  });

  it('does not bring the selection back when the search returns to its old term', () => {
    const { result, rerender } = renderHook(
      ({ committed }) => useScopedSelection<string>(committed),
      { initialProps: { committed: '' } },
    );

    select(result, 'x');
    rerender({ committed: 'abc' });
    rerender({ committed: '' });
    expect(result.current[0].size).toBe(0);
  });

  it('clear() empties the selection', () => {
    const { result } = renderHook(() => useScopedSelection<string>('a'));

    select(result, 'x');
    act(() => result.current[2]());
    expect(result.current[0].size).toBe(0);
  });
});
