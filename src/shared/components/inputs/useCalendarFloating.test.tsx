import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCalendarFloating } from './useCalendarFloating';

/**
 * Placement guard for the calendars. jsdom has no layout, so the rects are stubbed per element
 * (by `data-testid`) and the popover is a fixed 200 x 240 box; floating-ui itself is not under
 * test, only that this helper's configuration keeps the behaviour the pickers promise:
 * right-aligned under the field with a 4px gap, flipped above when there is no room below, and,
 * with `clipToScrollParent`, limited by the scrolling panel the field sits in.
 */

type Rect = { top: number; bottom: number; left: number; right: number };
const rects: Record<string, Rect> = {};

const box = (r: Rect) =>
  ({
    ...r,
    width: r.right - r.left,
    height: r.bottom - r.top,
    x: r.left,
    y: r.top,
    toJSON() {},
  }) as DOMRect;

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const id = this.dataset.testid;
    if (id === 'popover') return box({ top: 0, bottom: 240, left: 0, right: 200 });
    return box((id && rects[id]) || { top: 0, bottom: 0, left: 0, right: 0 });
  });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.dataset.testid === 'popover' ? 200 : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.dataset.testid === 'popover' ? 240 : 0;
  });
  // A scroll container's visible box is its client size.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    const r = rects[this.dataset.testid ?? ''];
    return r ? r.right - r.left : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    const r = rects[this.dataset.testid ?? ''];
    return r ? r.bottom - r.top : 0;
  });
  Object.defineProperty(document.documentElement, 'clientWidth', {
    value: 1000,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, 'clientHeight', {
    value: 800,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const k of Object.keys(rects)) delete rects[k];
});

function Harness({ clip = false, scroller = false }: { clip?: boolean; scroller?: boolean }) {
  const c = useCalendarFloating({ open: true, onOpenChange: () => {}, clipToScrollParent: clip });
  const field: ReactNode = <input data-testid="field" ref={c.setReference} />;
  return (
    <>
      {scroller ? (
        <div data-testid="scroller" style={{ overflow: 'auto' }}>
          {field}
        </div>
      ) : (
        field
      )}
      <div data-testid="popover" ref={c.setFloating} {...c.floatingProps} />
    </>
  );
}

const placed = async () => {
  const pop = screen.getByTestId('popover');
  await waitFor(() => expect(pop).toHaveStyle({ opacity: '1' }));
  return pop.style.transform;
};

describe('useCalendarFloating placement', () => {
  it('hangs right-aligned under the field with a 4px gap', async () => {
    rects.field = { top: 100, bottom: 130, left: 500, right: 700 };
    render(<Harness />);

    // right edge 700 - width 200 = 500; top = field bottom 130 + 4.
    expect(await placed()).toBe('translate(500px, 134px)');
  });

  it('flips above the field when there is no room below', async () => {
    rects.field = { top: 700, bottom: 730, left: 500, right: 700 };
    render(<Harness />);

    // top = field top 700 - height 240 - 4.
    expect(await placed()).toBe('translate(500px, 456px)');
  });

  it('ignores a scrolling panel unless the picker clips to it', async () => {
    rects.field = { top: 200, bottom: 230, left: 500, right: 700 };
    rects.scroller = { top: 100, bottom: 300, left: 400, right: 800 };
    render(<Harness scroller />);

    expect(await placed()).toBe('translate(500px, 234px)');
  });

  it('flips above by the panel edge when the clipped picker has room there', async () => {
    rects.field = { top: 260, bottom: 290, left: 500, right: 700 };
    rects.scroller = { top: 0, bottom: 300, left: 400, right: 800 };
    render(<Harness scroller clip />);

    // 294..534 spills below the panel (300); 16..256 fits inside it.
    expect(await placed()).toBe('translate(500px, 16px)');
  });

  it('stays below, not upwards past the viewport, when the panel has no room on either side', async () => {
    rects.field = { top: 60, bottom: 90, left: 500, right: 700 };
    rects.scroller = { top: 40, bottom: 100, left: 400, right: 800 };
    render(<Harness scroller clip />);

    // Neither side fits the 60px-high panel; above would start at 60 - 244 = -184, off screen
    // (bestFit took that side). The initial placement wins: 94..334, inside the viewport.
    expect(await placed()).toBe('translate(500px, 94px)');
  });

  it('is kept on screen by the viewport, not pinned to a panel narrower than the calendar', async () => {
    rects.field = { top: 200, bottom: 230, left: 450, right: 540 };
    rects.scroller = { top: 100, bottom: 600, left: 400, right: 550 };
    render(<Harness scroller clip />);

    // Right edge 540 - width 200 = 340: left of the 150px panel, still inside the 1000px viewport.
    expect(await placed()).toBe('translate(340px, 234px)');
  });
});
