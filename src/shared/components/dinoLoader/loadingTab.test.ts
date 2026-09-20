import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Window as HappyWindow } from 'happy-dom';
import type { Element as HappyElement } from 'happy-dom';
import { startDinoLoop } from './dinoLoop';
import { openLoadingTab } from './loadingTab';
import type { DinoPhase } from './dinoGame';
import type { LoadingTabStrings } from './loadingTab';

// A stand-in for the game rather than a game: happy-dom has no 2D context, and the loop itself is
// covered by dinoLoop.test.ts. `loopState` lets each test decide whether the game has armed.
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

const strings: LoadingTabStrings = {
  title: 'Opening file',
  message: 'Opening the file…',
  hint: 'Press Space to jump',
  gameOver: 'Game over',
  errorTitle: 'Could not open the file',
  downloaded: 'The file has been downloaded. You can close this tab.',
  close: 'Close this tab',
  cancel: 'Cancel',
};

/** Opens the loading tab into a happy-dom window whose width the test controls. */
const openTab = (width = 1200) => {
  const tab = new HappyWindow();
  let innerWidth = width;
  Object.defineProperty(tab, 'innerWidth', { configurable: true, get: () => innerWidth });
  Object.defineProperty(tab, 'opener', { configurable: true, writable: true, value: null });
  vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);

  const handle = openLoadingTab(strings);
  const resizeTo = (next: number) => {
    innerWidth = next;
    tab.dispatchEvent(new tab.Event('resize'));
  };
  const pressSpace = (target: HappyElement) => {
    const event = new tab.KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
  };
  return { tab, handle, resizeTo, pressSpace };
};

beforeEach(() => {
  loopState.phase = 'ambient';
  loopState.jumps = 0;
});

describe('openLoadingTab', () => {
  // Above ~816px the canvas width is pinned at its 720px cap, so most resizes change nothing the
  // game depends on. Restarting on every one of them wiped a run in progress whenever only the
  // height moved — docking DevTools, showing the bookmarks bar.
  it('restarts the game on resize only when the canvas width changes', () => {
    const { handle, resizeTo } = openTab(1200);
    expect(handle).not.toBeNull();
    expect(startDinoLoop).toHaveBeenCalledTimes(1);

    resizeTo(1200); // height-only: the width is unchanged
    resizeTo(1000); // narrower, but still above the cap
    expect(startDinoLoop).toHaveBeenCalledTimes(1);

    resizeTo(500); // a width the canvas actually follows
    expect(startDinoLoop).toHaveBeenCalledTimes(2);

    handle?.close();
  });

  // Once the game arms it takes Space for jumps. A keyboard user who tabbed onto Cancel pressed
  // Space and the dino jumped instead — the download kept running.
  it('lets a focused Cancel button keep Space once the game has armed', () => {
    loopState.phase = 'armed';
    const { tab, handle, pressSpace } = openTab();
    const cancel = tab.document.querySelector('.cancel');
    expect(cancel).not.toBeNull();

    const onButton = pressSpace(cancel as HappyElement);
    expect(onButton.defaultPrevented).toBe(false); // the button still gets its Space
    expect(loopState.jumps).toBe(0);

    const onPage = pressSpace(tab.document.body);
    expect(onPage.defaultPrevented).toBe(true);
    expect(loopState.jumps).toBe(1);

    handle?.close();
  });
});

describe('openLoadingTab after an early failure', () => {
  // The tab re-measures itself on its first frame. When the download failed before that frame, the
  // queued re-measure used to start a fresh game on a torn-down page — a loop drawing onto a hidden
  // canvas, with no input, until the tab was closed.
  it('does not start a game once the page has been torn down', () => {
    const tab = new HappyWindow();
    let innerWidth = 0; // measured in the same turn as window.open
    const frames: (() => void)[] = [];
    Object.defineProperty(tab, 'innerWidth', { configurable: true, get: () => innerWidth });
    Object.defineProperty(tab, 'opener', { configurable: true, writable: true, value: null });
    Object.defineProperty(tab, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: () => void) => frames.push(callback),
    });
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);

    const handle = openLoadingTab(strings);
    expect(startDinoLoop).toHaveBeenCalledTimes(1);

    handle?.showError('offline'); // fails before the first frame, which tears the page down
    innerWidth = 1200; // by now the tab has been laid out
    frames.splice(0).forEach(run => run()); // the queued re-measure fires

    expect(startDinoLoop).toHaveBeenCalledTimes(1);
  });
});
