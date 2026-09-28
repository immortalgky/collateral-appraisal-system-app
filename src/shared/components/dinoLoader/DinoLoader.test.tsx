import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import DinoLoader from './DinoLoader';
import type { DinoPhase } from './dinoGame';

// DinoLoader drives its canvas through dinoLoop. Stand in for it so the test decides whether the
// game has armed — happy-dom has no 2D context, so the real loop would never start.
const loopState = vi.hoisted(() => ({ phase: 'ambient' as DinoPhase, jumps: 0 }));
vi.mock('./dinoLoop', () => ({
  startDinoLoop: vi.fn(() => ({
    jump: () => {
      loopState.jumps += 1;
    },
    phase: () => loopState.phase,
    stop: () => {},
  })),
}));

const press = (target: Element, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', {
    code: 'Space',
    key: ' ',
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};

beforeEach(() => {
  loopState.phase = 'armed';
  loopState.jumps = 0;
});

describe('DinoLoader keyboard', () => {
  // The loader cannot tell a control reached on purpose from one left behind it, so it never
  // guesses: a focused control keeps Space wherever it is — a search box on the page (where Thai
  // and Chinese input methods need Space too), or a Cancel in the dialog the loader sits in.
  it('leaves Space to a focused control, wherever it is', () => {
    const { getByRole } = render(
      <>
        <input aria-label="Search" />
        <div role="dialog" aria-label="Loading">
          <div role="status">
            <DinoLoader interactive />
          </div>
          <button type="button">Cancel</button>
        </div>
      </>,
    );

    for (const control of [
      getByRole('textbox', { name: 'Search' }),
      getByRole('button', { name: 'Cancel' }),
    ]) {
      expect(press(control).defaultPrevented).toBe(false);
    }
    expect(loopState.jumps).toBe(0);
  });

  // Headless UI's Dialog focuses its own root (role="dialog", tabIndex -1) by default. That is
  // focus, but not a control: the dino should still answer Space there.
  it('jumps when what has focus is not a control', () => {
    const { getByRole } = render(
      <div role="dialog" aria-label="Loading" tabIndex={-1}>
        <DinoLoader interactive />
      </div>,
    );

    expect(press(getByRole('dialog')).defaultPrevented).toBe(true);
    expect(loopState.jumps).toBe(1);
  });

  // Auto-repeat keydowns used to slip through untouched and scroll whatever was behind the loader.
  it('swallows a held Space without jumping again', () => {
    render(<DinoLoader interactive />);

    const first = press(document.body);
    const held = press(document.body, { repeat: true });
    expect(first.defaultPrevented).toBe(true);
    expect(held.defaultPrevented).toBe(true);
    expect(loopState.jumps).toBe(1);
  });

  // A backstop for widgets missing from keyBelongsToFocus's list: one that already used the key
  // (and said so with preventDefault) must not also make the dino jump.
  it('leaves alone a key that a widget has already handled', () => {
    const { getByTestId } = render(
      <>
        <div data-testid="widget" />
        <DinoLoader interactive />
      </>,
    );
    const widget = getByTestId('widget');
    widget.addEventListener('keydown', event => event.preventDefault());

    press(widget);
    expect(loopState.jumps).toBe(0);
  });
});
