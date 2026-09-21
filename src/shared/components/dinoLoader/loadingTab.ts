/**
 * The "please wait" page for a document opened in its own browser tab.
 *
 * A document viewer has to call window.open() *inside* the click gesture or Safari blocks it, but
 * the blob URL only exists once the file has finished downloading. The tab therefore opens empty
 * and is pointed at the blob later — and in between the user is looking at about:blank with no
 * indication that anything is happening, or that anything went wrong.
 *
 * This module fills that gap: it writes a self-contained loading document into the freshly opened
 * tab (the dino, a progress bar and a message), hands back a small handle to drive it, and leaves
 * the tab showing a readable error instead of silently closing when the download fails.
 *
 * Self-contained is deliberate. The new window has none of the app's stylesheets, and pulling
 * Tailwind and the font faces across for a page that lives for a few seconds is not worth it, so
 * the palette is resolved to literals here — the same trade-off dinoRenderer already makes for
 * the canvas.
 */

import { ARM_AFTER_MS } from './dinoGame';
import { keyBelongsToFocus } from './dinoInput';
import { startDinoLoop } from './dinoLoop';
import type { DinoLoop } from './dinoLoop';

const MIN_WIDTH = 280;
const MAX_WIDTH = 720;

/**
 * How often to check whether the user has closed the tab. Polling is the only way once the tab
 * has been pointed at the blob: from that moment our listeners live in a document that no longer
 * exists, and `win.closed` is all that is left to read.
 */
const CLOSE_POLL_MS = 1000;

/**
 * Once the tab has arrived at the file, the only thing left to watch for is it closing — which
 * nobody is waiting on. A viewer left open all afternoon should not keep a one-second timer alive
 * in the opener for it.
 */
const SETTLED_POLL_MS = 5000;

/**
 * How long to keep waiting for the tab to arrive at the document it was pointed at. It may never:
 * a .docx or a .zip is downloaded rather than displayed, and the tab then sits on this loading
 * page for good.
 *
 * Eight ticks rather than sixty. Assigning `location.href` starts the fetch within a turn, so a
 * navigation that is going to commit has done so long before this — waiting a full minute only
 * meant a file already sitting in the Downloads folder left "Opening the file…" on screen for the
 * rest of it. Overshooting is harmless in the other direction too: if the navigation does commit
 * later, its own document replaces whatever this page says.
 */
const ARRIVAL_GRACE_MS = 8_000;

export type LoadingTabStrings = {
  /** Tab title while loading. */
  title: string;
  /** Headline under the dino, e.g. "Opening file…". */
  message: string;
  /** Shown once the game arms. */
  hint: string;
  gameOver: string;
  /** Tab title once the download has failed. */
  errorTitle: string;
  /**
   * Shown when the tab is still here after the file arrived — the browser downloaded it rather
   * than displaying it, which is what happens to a .docx or a .zip, and this page would otherwise
   * sit on "opening…" for good.
   */
  downloaded: string;
  /** Label of the button offered on the error screen. */
  close: string;
  /** Label of the button that gives up on the download. */
  cancel: string;
};

export type LoadingTab = {
  /** False once the user has closed the tab — there is nothing left to show anything in. */
  isOpen: () => boolean;
  /** `total` is null when the response has no Content-Length — the bar goes indeterminate. */
  setProgress: (loaded: number, total: number | null) => void;
  /** Point the tab at the finished file. */
  navigate: (url: string) => void;
  /** Leave the tab up with an explanation rather than closing it under the user. */
  showError: (message: string) => void;
  /**
   * Runs `callback` once, when the tab has gone. Survives `navigate`, which is the point: it is
   * what releases a resource the tab was using, at the moment it stops being used.
   */
  onceClosed: (callback: () => void) => void;
  close: () => void;
};

const CSS = `
  /*
   * Dark regardless of the app's theme. This page exists for the second or two before the tab
   * becomes a document, and the viewer it hands over to — Chrome's PDF reader — paints its own
   * dark chrome. Following the app into light mode would mean a white flash on the way there.
   */
  :root {
    /* base-200 rather than base-100: a touch off black, which both gives the skyline something to
       be seen against and lands nearer the grey the PDF viewer paints next. */
    --bg: oklch(22% 0.005 265);
    --ink: #e5e7eb;
    --muted: #9ca3af;
    --accent: #2DD4BF;
    --line: #374151;
    --danger: #F87171;
    --progress: #2DD4BF;
    --progress-track: #115E59;
  }
  * { box-sizing: border-box; }
  /* The UA stylesheet's [hidden] rule loses to any author rule, and .game sets display:flex —
     so hiding it for reduced motion left an unsized 300x150 canvas holding the layout open. */
  [hidden] { display: none !important; }
  body {
    margin: 0;
    touch-action: manipulation;
    user-select: none;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    color: var(--ink);
    font-family: 'Sarabun', 'Roboto', ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  /* No card: the loader sits straight on the page background, the way a browser's own
     "waiting for…" screen does. A panel would only draw a box around empty space. */
  .stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    animation: appear 0.25s ease-out;
  }
  /* The game is one block and the download is another, and the gap between them says so. Inside
     each block the parts sit close enough to read as a single thought. */
  .game { display: flex; flex-direction: column; align-items: center; margin-bottom: 36px; }
  canvas { image-rendering: pixelated; touch-action: none; user-select: none; }
  .hint {
    margin: 6px 0 0;
    height: 16px;
    font-size: 12px;
    font-weight: 500;
    color: var(--accent);
  }
  .status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 360px;
    max-width: 100%;
  }
  .message { margin: 0; font-size: 17px; font-weight: 600; text-align: center; line-height: 1.4; }
  .bar {
    position: relative;
    width: 100%;
    height: 10px;
    border-radius: 999px;
    background: var(--progress-track);
    overflow: hidden;
  }
  /* The stripes are the point of the whole thing: a bar that has stopped moving is the first
     sign of trouble, and a flat fill at 70% looks identical whether bytes are arriving or not. */
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: 0;
    border-radius: 999px;
    background-color: var(--progress);
    background-image: linear-gradient(
      45deg,
      rgb(255 255 255 / 0.25) 25%,
      transparent 25%,
      transparent 50%,
      rgb(255 255 255 / 0.25) 50%,
      rgb(255 255 255 / 0.25) 75%,
      transparent 75%,
      transparent
    );
    background-size: 20px 20px;
    transition: width 0.2s linear;
    animation: stripes 0.7s linear infinite;
  }
  .bar[data-mode='indeterminate'] .fill {
    width: 40%;
    transition: none;
    animation:
      stripes 0.7s linear infinite,
      slide 1.4s ease-in-out infinite;
  }
  .detail {
    margin: 0;
    min-height: 18px;
    font-size: 13px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  @keyframes slide {
    0% { transform: translateX(-110%); }
    100% { transform: translateX(260%); }
  }
  @keyframes stripes {
    from { background-position: 20px 0; }
    to { background-position: 0 0; }
  }
  @keyframes appear {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: none; }
  }
  .close,
  .cancel {
    margin-top: 28px;
    border-radius: 8px;
    font: inherit;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background-color 0.15s;
  }
  .close {
    padding: 9px 22px;
    border: 0;
    background: var(--accent);
    color: #ffffff;
    font-weight: 600;
  }
  /* Grey until you mean it: giving up is the rarer intent and sits next to a running game, so it
     stays quiet — and turns red under the pointer, where the intent is no longer in doubt. */
  .cancel {
    padding: 7px 18px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    font-weight: 500;
  }
  .cancel:hover {
    border-color: var(--danger);
    color: var(--danger);
  }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  /* Anything that is not still loading — an error, or a file the browser downloaded — drops the
     game and the progress and offers the way out instead. */
  body:not([data-state='loading']) .game,
  body:not([data-state='loading']) .bar,
  body:not([data-state='loading']) .detail,
  body:not([data-state='loading']) .cancel { display: none; }
  body[data-state='loading'] .close { display: none; }
  body[data-state='error'] .message { color: var(--danger); }
  @media (prefers-reduced-motion: reduce) {
    .stage { animation: none; }
    /* Both selectors are needed: a media query adds no specificity, so the bare .fill rule loses
       to .bar[data-mode='indeterminate'] .fill and the stripes would keep sliding. */
    .fill,
    .bar[data-mode='indeterminate'] .fill { transition: none; animation: none; }
  }
`;

const BODY = `
  <main class="stage">
    <div class="game" aria-hidden="true">
      <canvas></canvas>
      <p class="hint"></p>
    </div>
    <div class="status">
      <!-- The live region is this line alone. On <main> it would have cost the landmark and, being
           atomic, would have re-read the buttons every time the text changed. -->
      <p class="message" role="status" aria-live="polite"></p>
      <!-- A progressbar rather than a live region: the percentage is there to be looked up, not
           announced a few times a second. Left readable — aria-hidden would have removed it from
           the accessibility tree entirely, so nobody could ask how far along it is. -->
      <div class="bar" data-mode="indeterminate" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span class="fill"></span></div>
      <p class="detail"></p>
    </div>
    <button class="cancel" type="button"></button>
    <button class="close" type="button"></button>
  </main>
`;

const measureWidth = (view: Window) =>
  Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, view.innerWidth - 96)));

/** Bytes as MB (or KB below a megabyte) — the numbers people recognise from a file listing. */
const formatSize = (bytes: number): string => {
  const mb = bytes / 1_000_000;
  if (mb < 1) return `${Math.round(bytes / 1000)} KB`;
  return `${mb.toFixed(1)} MB`;
};

/**
 * Opens a tab and fills it with the loading page. Must be called synchronously from the click
 * that asked for the document. Returns null when the popup was blocked — the caller should say so
 * rather than fail silently.
 */
export function openLoadingTab(
  strings: LoadingTabStrings,
  onCancel?: () => void,
): LoadingTab | null {
  const win = window.open('', '_blank');
  if (!win) return null;
  // Sever the opener link so the viewed document (e.g. an HTML blob) can't reach window.opener.
  win.opener = null;

  const doc = win.document;
  /** What this tab's URL reads while it is showing the loading page — about:blank, in practice. */
  const loadingUrl = win.location.href;

  const viewport = doc.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1';
  const style = doc.createElement('style');
  style.textContent = CSS;
  doc.head.append(viewport, style);
  doc.title = strings.title;
  doc.body.dataset.state = 'loading';
  doc.body.innerHTML = BODY;

  const game = doc.querySelector<HTMLDivElement>('.game');
  const canvas = doc.querySelector<HTMLCanvasElement>('canvas');
  const message = doc.querySelector<HTMLParagraphElement>('.message');
  const detail = doc.querySelector<HTMLParagraphElement>('.detail');
  const hint = doc.querySelector<HTMLParagraphElement>('.hint');
  const bar = doc.querySelector<HTMLDivElement>('.bar');
  const fill = doc.querySelector<HTMLSpanElement>('.fill');
  const closeButton = doc.querySelector<HTMLButtonElement>('.close');
  const cancelButton = doc.querySelector<HTMLButtonElement>('.cancel');

  if (message) message.textContent = strings.message;
  if (closeButton) {
    closeButton.textContent = strings.close;
    closeButton.addEventListener('click', () => win.close());
  }
  if (cancelButton) {
    cancelButton.textContent = strings.cancel;
    // Closing the tab is the cancel: the pagehide below reports it exactly once, whether the
    // user pressed this button or the tab's own X.
    cancelButton.addEventListener('click', () => win.close());
  }

  const reduceMotion = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let loop: DinoLoop | null = null;
  /** The width the running game was sized for. A resize that keeps it needs no restart. */
  let loopWidth = 0;
  let torndown = false;

  const startGame = () => {
    // A resize can be queued before teardown and fire after it — an error that arrives within the
    // first frame is enough — and restarting here would leave a loop running for the life of the
    // tab, drawing on a canvas the error state has hidden.
    if (!canvas || reduceMotion || torndown) return;
    loop?.stop();
    loopWidth = measureWidth(win);
    loop = startDinoLoop({
      canvas,
      width: loopWidth,
      theme: 'dark',
      view: win,
      armAfterMs: ARM_AFTER_MS,
      onPhaseChange: phase => {
        if (!hint) return;
        hint.textContent =
          phase === 'armed' ? strings.hint : phase === 'gameOver' ? strings.gameOver : '';
      },
    });
  };

  if (reduceMotion && game) game.hidden = true;
  startGame();

  const armed = () => {
    const phase = loop?.phase();
    return phase !== undefined && phase !== 'ambient';
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (event.code !== 'Space' && event.code !== 'ArrowUp') return;
    if (!armed()) return;
    // Space activates whatever control has focus, and this page has two — Cancel and Close. The
    // game arms after five seconds, exactly the waits where someone is most likely to reach for
    // Cancel, so a keyboard user must not find that key eaten by the dino.
    if (keyBelongsToFocus(event.target)) return;
    event.preventDefault();
    loop?.jump();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!armed()) return;
    // Same rule as onKeyDown, and it matters more here: preventDefault on pointerdown swallows the
    // click that follows it on a touch device, so without this a tap on Cancel five seconds into a
    // slow transfer would do nothing at all.
    if (keyBelongsToFocus(event.target)) return;
    event.preventDefault();
    loop?.jump();
  };

  // Only a width change needs a new game — the canvas and the world are sized to it. Restarting on
  // every resize meant a height-only change (docking DevTools, the bookmarks bar) wiped a run in
  // progress, since above ~816px the width is pinned at the 720px cap anyway.
  const onResize = () => {
    // Torn down already: the re-measure queued at open can land after a failure that came first.
    if (!loop) return;
    if (measureWidth(win) !== loopWidth) startGame();
  };

  doc.addEventListener('keydown', onKeyDown);
  // The whole page, not just the canvas: this tab exists only to be waited on, and the dino is
  // an 80px strip in the middle of it — a tap anywhere is meant as a jump.
  doc.addEventListener('pointerdown', onPointerDown);
  win.addEventListener('resize', onResize);
  // A tab measured in the same turn as window.open can still report innerWidth 0, and one that
  // opens at its final size never fires resize to correct it — so take the measurement again on
  // the next frame, when the tab has been laid out. onResize restarts only if the width moved.
  win.requestAnimationFrame(onResize);

  // Covers every way this document can go away — the user closing the tab, and our own
  // navigation to the blob — so the loop never outlives the canvas it draws on.
  const teardown = () => {
    torndown = true;
    loop?.stop();
    loop = null;
    doc.removeEventListener('keydown', onKeyDown);
    doc.removeEventListener('pointerdown', onPointerDown);
    win.removeEventListener('resize', onResize);
  };

  let navigating = false;
  let cancelled = false;
  /** The blob URL this tab was pointed at, once it has been. */
  let shownUrl: string | null = null;
  /** Set once the tab has actually arrived at that URL, so a slow commit is not read as a exit. */
  let arrived = false;
  /** Set once the page has been switched to "the file was downloaded", so it is done once. */
  let downloadedShown = false;
  /**
   * The user has walked away from the download. Nothing else can notice this: the request runs in
   * the opener's context and a closed tab does not stop it, so a 500 MB transfer would otherwise
   * keep running with nowhere to go.
   */
  const reportCancel = () => {
    if (cancelled || navigating) return;
    cancelled = true;
    onCancel?.();
  };

  win.addEventListener('pagehide', event => {
    // persisted means the document is being frozen, not discarded — iOS Safari does this when the
    // browser is backgrounded. Treating that as "the user walked away" would cancel the download
    // of someone who simply switched apps for a moment and will come back to it.
    if (event.persisted) return;
    teardown();
    reportCancel();
  });

  /** The file went to the downloads folder; this page is all that is left to explain that. */
  const showDownloaded = () => {
    if (win.closed) return;
    doc.title = strings.downloaded;
    doc.body.dataset.state = 'done';
    if (message) message.textContent = strings.downloaded;
  };

  const alive = () => {
    // Safety net for a tab that went away without a pagehide (a discarded background tab).
    if (win.closed) reportCancel();
    return !win.closed;
  };

  return {
    isOpen: alive,
    setProgress: (loaded, total) => {
      if (!alive() || !bar || !fill || !detail) return;
      if (total && total > 0) {
        const percent = Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
        bar.dataset.mode = 'determinate';
        fill.style.width = `${percent}%`;
        bar.setAttribute('aria-valuenow', String(percent));
        detail.textContent = `${percent}% · ${formatSize(loaded)} / ${formatSize(total)}`;
      } else {
        bar.dataset.mode = 'indeterminate';
        // No valuenow at all is how a progressbar says "indeterminate"; the text still says how
        // much has arrived, which is all that is known.
        bar.removeAttribute('aria-valuenow');
        detail.textContent = formatSize(loaded);
      }
      bar.setAttribute('aria-valuetext', detail.textContent);
    },
    navigate: url => {
      if (!alive()) return;
      navigating = true;
      shownUrl = url;
      // Deliberately no teardown here. When the navigation commits, pagehide runs it; when it does
      // not — a .docx or a .zip the browser downloads rather than displays — nothing commits, and
      // tearing down now would leave a dead canvas under "Opening the file…" until the grace
      // deadline notices. Letting the dino run costs nothing and keeps the page honest.
      win.location.href = url;
    },
    showError: text => {
      if (!alive()) return;
      teardown();
      doc.title = strings.errorTitle;
      doc.body.dataset.state = 'error';
      if (message) message.textContent = text;
    },
    onceClosed: callback => {
      /**
       * Whether the tab has moved off the document we gave it. `win.closed` cannot tell that apart
       * from a tab still showing the file, and a plain deadline would revoke under a reader who is
       * still reading. Reading location works while the tab is on our blob (same origin); once it
       * is on someone else's page the read throws, and that is the answer.
       */
      const startedAt = Date.now();

      let poll = 0;
      let settled = false;
      const stopPolling = () => window.clearInterval(poll);
      /** Nothing is being waited for any more; keep watching for the close, but leisurely. */
      const slowDown = () => {
        if (settled) return;
        settled = true;
        stopPolling();
        poll = window.setInterval(tick, SETTLED_POLL_MS);
      };
      const release = () => {
        stopPolling();
        callback();
      };

      const tick = () => {
        if (win.closed) return release();

        // Reading location works while the tab is on our blob (same origin); once it is on
        // someone else's page the read throws, and that is the answer.
        let here: string | null = null;
        let unreadable = false;
        try {
          here = win.location.href;
        } catch {
          unreadable = true;
        }

        // Compared without the fragment: a PDF viewer writes #page=N as the reader moves through
        // the document, and treating that as "the tab left" would revoke the URL under them.
        const sameDocument = (a: string, b: string) => a.split('#')[0] === b.split('#')[0];

        if (!unreadable && here !== null && shownUrl !== null && sameDocument(here, shownUrl)) {
          arrived = true;
          slowDown();
          return;
        }

        // Anywhere else — including a page we cannot read — only proves the tab left if we saw it
        // arrive first; before that the navigation may simply still be in flight.
        if (arrived) return release();

        // It never arrived. Either the browser downloaded the file instead of displaying it, or
        // the tab went elsewhere within the first tick. Waiting longer cannot distinguish them —
        // but if this document is still the one on screen, the first is what happened, and saying
        // so beats leaving a frozen dino over "Opening the file…" indefinitely.
        if (Date.now() - startedAt >= ARRIVAL_GRACE_MS) {
          // Only "the file was downloaded" if this tab is still showing the loading page. The
          // earlier branches have already ruled out our blob, so without this test the condition
          // would be vacuously true and a tab that had gone somewhere else entirely — or one whose
          // location cannot be read — would be told its file had downloaded.
          if (!unreadable && here !== null && sameDocument(here, loadingUrl)) {
            // The game stops — nothing is being waited for any more — and the page says what
            // happened. The URL is *not* released here: this branch is also what a navigation
            // that has not committed yet looks like, and a commit landing afterwards would find
            // its own URL gone. Polling simply carries on, and the release happens where it
            // always does, when the tab closes or leaves.
            if (!downloadedShown) {
              downloadedShown = true;
              teardown();
              showDownloaded();
              slowDown();
            }
            return;
          }

          // A location we cannot read proves nothing about whether the file is still being looked
          // at — Firefox can land a PDF on a viewer of its own — so keep polling rather than
          // revoking under a reader. The tab closing is still visible from here, and that is when
          // the URL goes; and since `arrived` can never flip for such a tab, this is where it
          // earns the slower interval.
          if (unreadable) {
            slowDown();
            return;
          }

          release();
        }
      };

      poll = window.setInterval(tick, CLOSE_POLL_MS);
    },
    close: () => {
      if (alive()) win.close();
    },
  };
}
