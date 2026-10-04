import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePortalPopoverPosition } from './usePortalPopoverPosition';

const setViewport = (width: number, height: number) => {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    value: width,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, 'clientHeight', {
    value: height,
    configurable: true,
  });
};

const anchorAt = (rect: Partial<DOMRect>) => {
  const el = document.createElement('div');
  el.getBoundingClientRect = () =>
    ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, ...rect }) as DOMRect;
  return { current: el };
};

const OPTS = { popoverHeight: 300, popoverWidth: 400 };

afterEach(() => vi.restoreAllMocks());

describe('usePortalPopoverPosition', () => {
  it('hangs below the field off its right edge, from the root client box', () => {
    setViewport(1000, 800);
    const anchorRef = anchorAt({ top: 100, bottom: 130, left: 500, right: 700 });
    const { result } = renderHook(() =>
      usePortalPopoverPosition({ isOpen: true, anchorRef, ...OPTS }),
    );

    expect(result.current.style).toMatchObject({
      position: 'fixed',
      top: 134,
      right: 300,
      visibility: 'visible',
    });
  });

  it('flips above the field when there is no room below', () => {
    setViewport(1000, 800);
    const anchorRef = anchorAt({ top: 700, bottom: 730, left: 500, right: 700 });
    const { result } = renderHook(() =>
      usePortalPopoverPosition({ isOpen: true, anchorRef, ...OPTS }),
    );

    expect(result.current.style).toMatchObject({ bottom: 800 - 700 + 4 });
    expect(result.current.style.top).toBeUndefined();
  });

  it('flips to the left edge only when it cannot expand leftwards', () => {
    setViewport(1000, 800);
    const anchorRef = anchorAt({ top: 100, bottom: 130, left: 20, right: 220 });
    const { result } = renderHook(() =>
      usePortalPopoverPosition({ isOpen: true, anchorRef, ...OPTS }),
    );

    expect(result.current.style).toMatchObject({ left: 20 });
    expect(result.current.style.right).toBeUndefined();
  });

  it('is hidden until measured, and measures once per frame while scrolling', () => {
    setViewport(1000, 800);
    const anchorRef = anchorAt({ top: 100, bottom: 130, left: 500, right: 700 });
    const measure = vi.spyOn(anchorRef.current, 'getBoundingClientRect');
    let frame: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      frame = cb;
      return 1;
    });
    const { result, rerender } = renderHook(
      ({ isOpen }) => usePortalPopoverPosition({ isOpen, anchorRef, ...OPTS }),
      { initialProps: { isOpen: false } },
    );
    expect(result.current.style.visibility).toBe('hidden');

    rerender({ isOpen: true });
    expect(measure).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('scroll'));
    expect(measure).toHaveBeenCalledTimes(1);
    act(() => frame?.(0));
    expect(measure).toHaveBeenCalledTimes(2);
  });

  it('stays hidden on reopen until measured again, and follows a scroll after that', () => {
    setViewport(1000, 800);
    const anchorRef = anchorAt({ top: 100, bottom: 130, left: 500, right: 700 });
    const seen: string[] = [];
    const { result, rerender } = renderHook(
      ({ isOpen }) => {
        const out = usePortalPopoverPosition({ isOpen, anchorRef, ...OPTS });
        seen.push(String(out.style.visibility));
        return out;
      },
      { initialProps: { isOpen: true } },
    );
    expect(result.current.style.visibility).toBe('visible');

    rerender({ isOpen: false });
    expect(result.current.style.visibility).toBe('hidden');

    // The field moved while the popover was closed: the first reopened render must not show the
    // old coordinates.
    anchorRef.current.getBoundingClientRect = () =>
      ({ top: 300, bottom: 330, left: 500, right: 700 }) as DOMRect;
    seen.length = 0;
    rerender({ isOpen: true });
    expect(seen[0]).toBe('hidden');
    expect(result.current.style).toMatchObject({ top: 334, visibility: 'visible' });

    anchorRef.current.getBoundingClientRect = () =>
      ({ top: 320, bottom: 350, left: 500, right: 700 }) as DOMRect;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 1;
    });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.style).toMatchObject({ top: 354 });
  });
});
