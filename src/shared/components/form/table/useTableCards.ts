import { useEffect, useRef, useState } from 'react';

const SHELL = '[class~="@container/form-shell"]';

/**
 * Whether a wide table must draw itself as cards: the element that holds it is narrower than the
 * table's `minWidth` (rem), whatever the shell around it measures. A table that fits stays a table
 * (and scrolls only if the user resizes past it). Attach `ref` to the element that holds the table.
 * The rem threshold is read against the live root font size (the 1920px step-up changes it). Without
 * a form shell around, a ResizeObserver, or a `minWidth`, it is always a table; until the element
 * has been laid out (width 0) it stays a table rather than flash cards.
 */
export function useTableCards(minWidth?: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !el.closest(SHELL) || minWidth == null || typeof ResizeObserver === 'undefined')
      return;
    const min: number = minWidth;
    const observer = new ResizeObserver(entries => {
      const width = entries.at(-1)?.contentRect.width ?? 0;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 14;
      setCards(width > 0 && width < min * rem);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [minWidth]);

  return [ref, cards] as const;
}
