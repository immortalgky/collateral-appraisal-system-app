import { useLayoutEffect, useState } from 'react';

/**
 * The width of an element's box, kept current as it resizes. Read before the first paint, so a
 * layout that depends on it does not flash in the wrong mode.
 *
 * Hands back a CALLBACK ref (held in state), not a ref object: the element can be swapped, or
 * mount later than the component (a page that shows an error view first), and the observer has to
 * follow whichever one is mounted.
 */
export function useElementWidth<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!element) return;
    const read = () => setWidth(element.clientWidth);
    read();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(read);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [element]);
  return [setElement, width] as const;
}
