import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';

/**
 * Open state for a collapsed strip that floats its full content as an overlay while in use —
 * shared by the app sidebar (useSidebarHover) and the pricing property rail. Spread `hoverProps`
 * on the element that holds both the strip and the overlay.
 *
 * The open delay keeps a cursor merely crossing the strip from popping the overlay. Keyboard
 * focus opens it too, so Tab never lands on a hidden control; only :focus-visible counts, so a
 * mouse click inside doesn't hold it open. Touch has no hover: the first tap on the strip opens
 * it (that tap is swallowed, so it doesn't also fire the control under the finger), a link tap
 * follows the link and closes it, a tap outside closes it.
 */
export function useHoverOverlay(collapsed: boolean, openDelayMs: number) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tapped, setTapped] = useState(false);
  const swallowClick = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const root = useRef<HTMLElement | null>(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  // A focused control that unmounts (e.g. removing a favorite) drops focus to <body> without a
  // blur, which would leave the overlay stuck open. Re-check where focus is on the user's next
  // key or click, so keyboard-only users aren't left with it covering the page.
  useEffect(() => {
    if (!focused) return;
    const recheck = () => {
      if (!root.current?.contains(document.activeElement)) setFocused(false);
    };
    document.addEventListener('keydown', recheck, true);
    document.addEventListener('pointerdown', recheck, true);
    // onBlur skips blurs while the window is in the background; confirm on the way back.
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('keydown', recheck, true);
      document.removeEventListener('pointerdown', recheck, true);
      window.removeEventListener('focus', recheck);
    };
  }, [focused]);
  useEffect(() => {
    if (!tapped) return;
    const outside = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) setTapped(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [tapped]);
  // pointerleave alone can be missed (the layout re-rendering the strip under the cursor), which
  // left the overlay stuck open with the mouse elsewhere; while hover holds it open, confirm on
  // every move that the pointer is still inside.
  useEffect(() => {
    if (!hovered) return;
    const check = (e: globalThis.PointerEvent) => {
      if (e.pointerType === 'mouse' && !root.current?.contains(e.target as Node)) {
        clearTimeout(timer.current);
        setHovered(false);
      }
    };
    document.addEventListener('pointermove', check, true);
    return () => document.removeEventListener('pointermove', check, true);
  }, [hovered]);
  // Pinning/unpinning shouldn't leave a tap-opened overlay behind. `hovered` is left alone: it
  // tracks the pointer, so a user who unpins while over the strip keeps it open until they leave.
  useEffect(() => {
    clearTimeout(timer.current);
    setTapped(false);
  }, [collapsed]);

  const open = hovered || focused || tapped;
  // Closing back to the strip hides whatever held focus, so don't leave keyboard focus on a
  // control nobody can see. Pinned, everything stays visible.
  const releaseFocus = () => {
    if (collapsed) (document.activeElement as HTMLElement | null)?.blur();
  };

  return {
    open,
    hoverProps: {
      // Hover is mouse-only: a touch "enter" would open the overlay over the page the tap is
      // navigating to, with no pointer left to close it. Touch opens it via onPointerDown.
      onPointerEnter: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType !== 'mouse') return;
        root.current = e.currentTarget;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setHovered(true), openDelayMs);
      },
      onPointerLeave: (e: PointerEvent<HTMLElement>) => {
        clearTimeout(timer.current);
        setHovered(false);
        // Same lost-focus case as above, for a mouse user.
        if (!e.currentTarget.contains(document.activeElement)) setFocused(false);
      },
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        root.current = e.currentTarget;
        // Set on every press, and only acted on in the click: a press that turns into a scroll
        // never clicks, so it neither opens the overlay nor leaves a click armed to be swallowed.
        swallowClick.current = e.pointerType !== 'mouse' && collapsed && !open;
      },
      onClickCapture: (e: MouseEvent<HTMLElement>) => {
        // Only a real pointer click (detail > 0) is the tap being swallowed; a keyboard Enter is
        // never swallowed, and any click disarms a press that ended as a scroll instead.
        const swallow = swallowClick.current && e.detail > 0;
        swallowClick.current = false;
        if (swallow) {
          e.preventDefault();
          e.stopPropagation();
          setTapped(true);
        } else {
          // Nearest control, not any ancestor: a favorite's remove-star is a button inside a link.
          const control = (e.target as Element).closest('a, button');
          // Picking a link is done with the overlay: don't leave it over the new page (focus
          // stays on the link, so no blur would ever close a keyboard-opened one). A link that
          // opens a new tab or window (target="_blank", or a modifier-click) leaves this page in
          // place, so the overlay and focus stay put.
          const newTab =
            (control as HTMLAnchorElement | null)?.target === '_blank' ||
            e.metaKey ||
            e.ctrlKey ||
            e.shiftKey;
          if (control?.tagName !== 'A' || newTab) return;
          setTapped(false);
          setFocused(false);
          releaseFocus();
        }
      },
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        if (e.key !== 'Escape') return;
        setFocused(false);
        setTapped(false);
        releaseFocus();
      },
      onFocus: (e: FocusEvent<HTMLElement>) => {
        root.current = e.currentTarget;
        if (e.target.matches(':focus-visible')) setFocused(true);
      },
      onBlur: (e: FocusEvent<HTMLElement>) => {
        // Switching window or tab (e.g. a target="_blank" link opening in front) blurs with no
        // relatedTarget, but focus returns to the same element on the way back — keep it open.
        if (!document.hasFocus()) return;
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      },
    },
  };
}
