import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { EdgeFades } from '@/shared/components/EdgeFades';
import { useScrollCue } from './useScrollCue';

const Strip = ({ active, ids = ['a', 'b', 'c'] }: { active: string; ids?: string[] }) => {
  const { ref, canScrollStart, canScrollEnd } = useScrollCue<HTMLDivElement>(active);
  return (
    <div className="relative">
      <div ref={ref} data-testid="strip">
        {ids.map(id => (
          <button key={id} role="tab" aria-selected={id === active}>
            {id}
          </button>
        ))}
      </div>
      <EdgeFades start={canScrollStart} end={canScrollEnd} fromClass="from-white" />
    </div>
  );
};

describe('useScrollCue', () => {
  // happy-dom does no layout: the strip is 100 wide with 300 of content.
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        callback: () => void;
        constructor(callback: () => void) {
          this.callback = callback;
        }
        observe() {
          this.callback();
        }
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(300);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fades the end that hides tabs, and the start once scrolled', () => {
    const { container } = render(<Strip active="a" />);
    // At the start: something hidden at the end only.
    expect(container.querySelector('.right-0')).not.toBeNull();
    expect(container.querySelector('.left-0')).toBeNull();

    const strip = screen.getByTestId('strip');
    Object.defineProperty(strip, 'scrollLeft', { configurable: true, value: 200, writable: true });
    act(() => {
      strip.dispatchEvent(new Event('scroll'));
    });
    // Scrolled to the end: the start edge hides tabs now, the end edge no longer does.
    expect(container.querySelector('.left-0')).not.toBeNull();
    expect(container.querySelector('.right-0')).toBeNull();
  });

  it('scrolls the strip to centre the tab that becomes active', () => {
    const { rerender } = render(<Strip active="a" />);
    const strip = screen.getByTestId('strip');
    const scrollTo = vi.fn();
    strip.scrollTo = scrollTo as unknown as typeof strip.scrollTo;

    rerender(<Strip active="c" />);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('measures again when a tab is added', async () => {
    const width = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(100);
    const { container, rerender } = render(<Strip active="a" ids={['a']} />);
    expect(container.querySelector('.right-0')).toBeNull(); // everything fits

    width.mockReturnValue(300);
    rerender(<Strip active="a" ids={['a', 'b', 'c']} />);
    await waitFor(() => expect(container.querySelector('.right-0')).not.toBeNull());
  });
});
