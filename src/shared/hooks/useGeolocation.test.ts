import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGeolocation } from './useGeolocation';

/**
 * jsdom declares `navigator.geolocation` and leaves it null, which is exactly the shape a browser
 * takes when the API is blocked. `locate()` has to answer null rather than throw inside its
 * promise — a throw there is an unhandled rejection that fails the whole vitest run even though
 * every test passes.
 */
describe('useGeolocation', () => {
  it('resolves null when the browser exposes no geolocation object', async () => {
    expect(navigator.geolocation).toBeFalsy();

    const { result } = renderHook(() => useGeolocation());

    let coords: unknown = 'not called';
    await act(async () => {
      coords = await result.current.locate();
    });

    expect(coords).toBeNull();
    expect(result.current.locating).toBe(false);
  });
});
