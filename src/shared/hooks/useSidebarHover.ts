import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { useUIStore } from '@shared/store';
import type { SidebarScope } from '@shared/types';
import { DENSITY_SCALE } from '@shared/components/densityConstants';

const HOVER_OPEN_DELAY_MS = 150;

/**
 * Unpinned (collapsed) sidebar opens as an overlay while hovered: the aside widens but
 * --cas-sidebar-w stays at the rail width, so the page underneath doesn't shift. The short
 * open delay keeps a cursor merely crossing the rail from popping the menu. Keyboard focus opens
 * it too, so Tab never lands on a clipped control and the pin is reachable without a mouse;
 * only :focus-visible counts, so a mouse click inside doesn't hold the overlay open. Touch has
 * no hover: the first tap on the rail opens it (that tap is swallowed, so it doesn't also fire
 * the link under the finger), a link tap navigates and closes it, a tap outside closes it.
 */
export function useSidebarHover(scope: SidebarScope) {
  const collapsed = useUIStore(s => s.sidebarCollapsed[scope]);
  const width = useUIStore(s => s.sidebarWidth);
  const density = useUIStore(s => s.density);
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
    return () => {
      document.removeEventListener('keydown', recheck, true);
      document.removeEventListener('pointerdown', recheck, true);
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
  // pointerleave alone can be missed (the layout re-rendering the sidebar under the cursor), which
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
  // tracks the pointer, so a user who unpins while over the menu keeps it open until they leave.
  useEffect(() => {
    clearTimeout(timer.current);
    setTapped(false);
  }, [collapsed]);

  const open = hovered || focused || tapped;
  // Closing back to the rail clips (and collapses the groups around) whatever held focus, so
  // don't leave keyboard focus on a control nobody can see. Pinned, everything stays visible.
  const releaseFocus = () => {
    if (collapsed) (document.activeElement as HTMLElement | null)?.blur();
  };
  const overlay = collapsed && open;
  const fullWidth = `${width * DENSITY_SCALE[density]}px`;
  return {
    expanded: !collapsed || open,
    overlay,
    width: overlay ? fullWidth : 'var(--cas-sidebar-w)',
    /**
     * Content is always laid out at full width and the rail only clips it, so nothing moves on
     * hover. The clip ends where labels start (3.5rem), leaving the icon column centred in the
     * 4rem rail with no label fragments peeking out.
     */
    contentStyle: {
      width: fullWidth,
      // Unpinned, the clip animates with the aside's 300ms width change so closing reveals the
      // rail as it shrinks instead of blanking the panel first.
      clipPath: !collapsed
        ? undefined
        : open
          ? 'inset(0 0 0 0)'
          : 'inset(0 calc(100% - 3.5rem) 0 0)',
      transition: 'clip-path 300ms',
    },
    hoverProps: {
      // Hover is mouse-only: a touch "enter" would open the overlay over the page the tap is
      // navigating to, with no pointer left to close it. Touch opens it via onPointerDown.
      onPointerEnter: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType !== 'mouse') return;
        root.current = e.currentTarget;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setHovered(true), HOVER_OPEN_DELAY_MS);
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
        } else if ((e.target as Element).closest('a, button')?.tagName === 'A') {
          // Nearest control, not any ancestor: a favorite's remove-star is a button inside a link.
          // Picking a link is done with the menu: don't leave the overlay over the new page
          // (focus stays on the link, so no blur would ever close a keyboard-opened one).
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
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      },
    },
  };
}
