import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * For a strip that scrolls sideways (a tab bar): which edges still hide something, so the strip can
 * show a fade there, and the active entry scrolled into view when `activeKey` changes.
 *
 * Attach `ref` to the scrolling element. The active entry is the first descendant matching
 * `activeSelector`. Entries added or removed are picked up. Without ResizeObserver (a test DOM) the edges are reported as not hiding anything.
 */
export function useScrollCue<T extends HTMLElement>(
  activeKey: string | undefined,
  activeSelector = '[aria-selected="true"], [aria-current]',
) {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 1px of slack: scrollLeft is fractional at some zoom levels.
    const start = el.scrollLeft > 1;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges(prev => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    el.addEventListener('scroll', measure, { passive: true });
    // The strip itself and each entry in it: an entry added, removed or relabelled moves the edges
    // without the strip changing size.
    const observer = new ResizeObserver(measure);
    const watchEntries = () => {
      observer.disconnect();
      observer.observe(el);
      for (const entry of Array.from(el.children)) observer.observe(entry);
      measure();
    };
    watchEntries();
    const mutations =
      typeof MutationObserver === 'undefined' ? null : new MutationObserver(watchEntries);
    mutations?.observe(el, { childList: true });
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
      mutations?.disconnect();
    };
  }, [measure]);

  useEffect(() => {
    const el = ref.current;
    const active = el?.querySelector<HTMLElement>(activeSelector);
    if (!el || !active) return;
    // Centre it (clamped by the browser), measured from rects so no positioned ancestor is assumed.
    const left =
      active.getBoundingClientRect().left -
      el.getBoundingClientRect().left +
      el.scrollLeft -
      (el.clientWidth - active.offsetWidth) / 2;
    if (typeof el.scrollTo === 'function') el.scrollTo({ left, behavior: 'smooth' });
    else el.scrollLeft = left;
  }, [activeKey, activeSelector]);

  return { ref, canScrollStart: edges.start, canScrollEnd: edges.end };
}
