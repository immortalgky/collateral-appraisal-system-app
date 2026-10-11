import { useCallback, useEffect, useState } from 'react';

/**
 * Whether a control group is being used with the pointer, for drawing a focus ring only after the
 * keyboard.
 *
 * Headless UI's `data-focus` follows the page's last input, not the group's: once anything has
 * been typed (a search box, an Esc) it stays "keyboard", so the focus handed back to a trigger when
 * its popover — opened with the mouse — closes would still draw the ring. This turns the ring off
 * from a pointer press inside the group (spread `onPointerDownCapture` on its root) until the next
 * Tab anywhere on the page.
 */
export function usePointerMode() {
  const [pointerMode, setPointerMode] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') setPointerMode(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, []);
  const onPointerDownCapture = useCallback(() => setPointerMode(true), []);
  return { pointerMode, onPointerDownCapture };
}

/**
 * The keyboard focus ring, for a control that draws its own: an inline `outline: none` (the
 * global `:focus-visible` outline in src/index.css is unlayered and beats Tailwind's layered
 * `outline-none`, so only an inline style switches it off) plus a green ring, worn only when
 * `usePointerMode` says the last input was not the pointer.
 *
 * `KEYBOARD_RING` is for Headless UI buttons, which set `data-focus` themselves; `KEYBOARD_RING_PLAIN`
 * is for plain buttons, which only have `:focus-visible`.
 */
export const NO_OUTLINE = { outline: 'none' } as const;
export const KEYBOARD_RING = 'data-focus:ring-2 data-focus:ring-primary';
export const KEYBOARD_RING_PLAIN = 'focus-visible:ring-2 focus-visible:ring-primary';
