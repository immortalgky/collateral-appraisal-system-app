import { useCallback, useEffect, useState, type CSSProperties, type RefObject } from 'react';

interface Options {
  isOpen: boolean;
  /** The field the popover hangs off. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Approximate popover size: below this much room it flips to the top / to the left edge. */
  popoverHeight: number;
  popoverWidth: number;
  /** Measure the room inside the nearest scrollable ancestor rather than the viewport. */
  clipToScrollParent?: boolean;
}

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const { overflowX, overflowY } = getComputedStyle(el);
    if (/(auto|scroll|hidden)/.test(overflowX + overflowY)) return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Placement for a popover portalled to <body> and positioned `fixed` from its anchor's viewport
 * rect (the date pickers' calendars). It flips above the field when there is no room below and
 * hangs off the field's right edge unless there is no room to expand leftwards, then keeps
 * following the field: re-measured once per frame while a scroll or a resize moves it.
 *
 * Offsets are measured from the root element's client box, not window.inner*: a `fixed`
 * `right` / `bottom` is relative to the viewport without its scrollbars.
 */
export function usePortalPopoverPosition({
  isOpen,
  anchorRef,
  popoverHeight,
  popoverWidth,
  clipToScrollParent = false,
}: Options) {
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const [align, setAlign] = useState<'left' | 'right'>('right');
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setAnchorRect(rect);

    const root = document.documentElement;
    const scrollParent = clipToScrollParent ? getScrollParent(anchor) : null;
    const bounds = scrollParent
      ? scrollParent.getBoundingClientRect()
      : { top: 0, bottom: root.clientHeight, left: 0, right: root.clientWidth };

    const spaceBelow = bounds.bottom - rect.bottom;
    setPosition(
      spaceBelow < popoverHeight && rect.top - bounds.top > popoverHeight ? 'top' : 'bottom',
    );
    // Hang off the field's right edge, under the icon that opened it; flip to the left edge only
    // when there is no room to expand leftwards but there is to the right.
    setAlign(
      rect.right - bounds.left < popoverWidth && bounds.right - rect.left > popoverWidth
        ? 'left'
        : 'right',
    );
  }, [anchorRef, clipToScrollParent, popoverHeight, popoverWidth]);

  useEffect(() => {
    if (!isOpen) {
      // Forget the old coordinates: a reopened popover must stay hidden until it is measured again.
      setAnchorRect(null);
      return;
    }
    update();
    // Scrolling fires far more often than a frame is painted: measure once per frame.
    let frame = 0;
    const follow = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    window.addEventListener('resize', follow);
    window.addEventListener('scroll', follow, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', follow);
      window.removeEventListener('scroll', follow, true);
    };
  }, [isOpen, update]);

  const root = typeof document === 'undefined' ? null : document.documentElement;
  const style: CSSProperties = {
    position: 'fixed',
    ...(position === 'bottom'
      ? { top: (anchorRect?.bottom ?? 0) + 4 }
      : { bottom: (root?.clientHeight ?? 0) - (anchorRect?.top ?? 0) + 4 }),
    ...(align === 'left'
      ? { left: anchorRect?.left ?? 0 }
      : { right: (root?.clientWidth ?? 0) - (anchorRect?.right ?? 0) }),
    // Hidden until the first measurement, so it never flashes at the wrong place.
    visibility: anchorRect ? 'visible' : 'hidden',
  };

  return { anchorRect, style };
}
