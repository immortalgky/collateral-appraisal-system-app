import { useEffect, useRef, useState } from 'react';

/** Narrower than this and the list plus the 300px pane do not fit comfortably. */
export const PANE_MIN_CARD_WIDTH = 900;

/**
 * Whether the element is wide enough to show the preview pane beside the list. It measures the
 * card itself, not the window: the Request page has its own right-hand panel that takes width too.
 * Without ResizeObserver (a test DOM) it reports wide. `minWidth` may be a function, read on every
 * measure, for a threshold that follows the root font size (rem) as the density setting changes it.
 * Pass a stable function.
 */
export const useCardIsWide = (minWidth: number | (() => number) = PANE_MIN_CARD_WIDTH) => {
  const ref = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // 0 means no layout yet (not measured), which reads as wide rather than flashing a drawer
    const measure = (width: number) =>
      setWide(width === 0 || width >= (typeof minWidth === 'function' ? minWidth() : minWidth));
    measure(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [minWidth]);

  return [ref, wide] as const;
};

const STORAGE_KEY = 'request.documentCard.previewPane';

const readShown = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'hidden';
  } catch {
    return true;
  }
};

/** The user's choice to collapse the side pane on a wide card, remembered in this browser. */
export const usePreviewPaneShown = () => {
  const [shown, setShown] = useState(readShown);
  const toggle = () =>
    setShown(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'shown' : 'hidden');
      } catch {
        // storage can be blocked or full; the choice then lasts for this visit only
      }
      return next;
    });
  return [shown, toggle] as const;
};
