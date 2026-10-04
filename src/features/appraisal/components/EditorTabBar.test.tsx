import { useRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorTabBar } from './EditorIdentityCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const tabs = [
  { id: 'land', label: 'Land' },
  { id: 'building', label: 'Building' },
];

function Harness({
  withAnchor = true,
  mode = 'tabs',
  onSelect = () => undefined,
  items = tabs,
}: {
  withAnchor?: boolean;
  mode?: 'tabs' | 'sections';
  onSelect?: (id: string) => void;
  items?: typeof tabs;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  return (
    <div data-testid="scroller">
      <div ref={anchorRef} data-testid="anchor" />
      <EditorTabBar
        tabs={items}
        activeId="land"
        label="sections"
        mode={mode}
        onSelect={onSelect}
        scrollAnchorRef={withAnchor ? anchorRef : undefined}
      />
    </div>
  );
}

/** happy-dom does no layout: give the scroller a scroll position and the anchor a height. */
function arrange(scrollTop: number, anchorHeight = 120) {
  const scroller = screen.getByTestId('scroller');
  const scrollTo = vi.fn();
  Object.defineProperty(scroller, 'scrollTop', { value: scrollTop, writable: true });
  scroller.scrollTo = scrollTo as unknown as typeof scroller.scrollTo;
  Object.defineProperty(screen.getByTestId('anchor'), 'offsetHeight', { value: anchorHeight });
  return scrollTo;
}

describe('EditorTabBar scroll to anchor', () => {
  it('scrolls to the anchor height when a tab is picked below it', async () => {
    render(<Harness />);
    const scrollTo = arrange(600);
    await userEvent.click(screen.getByText('Building'));
    expect(scrollTo).toHaveBeenCalledWith({ top: 120 });
  });

  it('does the same for the tab that is already open', async () => {
    render(<Harness />);
    const scrollTo = arrange(600);
    await userEvent.click(screen.getByText('Land'));
    expect(scrollTo).toHaveBeenCalledWith({ top: 120 });
  });

  it('leaves the scroller alone when it is not below the anchor', async () => {
    render(<Harness />);
    const scrollTo = arrange(40);
    await userEvent.click(screen.getByText('Building'));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('never scrolls without an anchor, but still reports the pick', async () => {
    // A handler that throws surfaces as a window error event rather than failing the click.
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener('error', onError);
    const onSelect = vi.fn();
    render(<Harness withAnchor={false} onSelect={onSelect} />);
    const scrollTo = arrange(600);
    await userEvent.click(screen.getByText('Building'));
    window.removeEventListener('error', onError);
    expect(errors).toEqual([]);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith('building');
  });

  it('does not scroll a sections bar, which jumps to its own target', async () => {
    render(<Harness mode="sections" />);
    const scrollTo = arrange(600);
    await userEvent.click(screen.getByText('Building'));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('EditorTabBar roles', () => {
  it('is a tab list with tabs when there are two or more', () => {
    render(<Harness />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Land' })).toHaveAttribute('aria-selected', 'true');
  });

  it('is a plain strip with one button for a single tab, and still scrolls to the anchor', async () => {
    render(<Harness items={[tabs[0]]} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    const scrollTo = arrange(600);
    await userEvent.click(screen.getByRole('button', { name: 'Land' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 120 });
  });
});
