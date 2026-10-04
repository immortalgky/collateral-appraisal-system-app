import { useCallback, useMemo } from 'react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';

interface Options {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Also let the edge of any scrolling panel the field sits in decide whether the calendar flips
   * above, not only the viewport: the calendar is portalled to <body>, so by default only the
   * viewport limits it.
   */
  clipToScrollParent?: boolean;
}

/**
 * Placement and interactions shared by both date pickers' calendars (portalled to <body>, since
 * react-day-picker builds a <table> that the form grid must never see inside a field).
 *
 * The REFERENCE is the field's wrapper (input + calendar button), so a press, a focus or an Escape
 * on either counts as "on the field", not outside it. The calendar hangs right-aligned under it
 * with a 4px gap, flips above when it does not fit below, stays inside the viewport, re-measures as
 * the page scrolls, resizes or the month panel opens, and is dismissed by an outside press or
 * Escape. Focus is handled by the caller's FloatingFocusManager.
 */
export function useCalendarFloating({ open, onOpenChange, clipToScrollParent = false }: Options) {
  const { refs, floatingStyles, isPositioned, context } = useFloating({
    open,
    onOpenChange,
    strategy: 'fixed',
    placement: 'bottom-end',
    middleware: [
      offset(4),
      // Only the FLIP looks at the field's clipping ancestors (`altBoundary`); the viewport applies
      // either way. Not `bestFit`: when neither side fits the panel, stay below rather than open
      // upwards past the top of the viewport.
      flip({ altBoundary: clipToScrollParent, fallbackStrategy: 'initialPlacement' }),
      // The viewport alone keeps it on screen, sideways (a panel narrower than the calendar must
      // not pin it to the panel's edge) and, with `crossAxis`, vertically.
      shift({ padding: 8, crossAxis: true }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  const role = useRole(context, { role: 'dialog' });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role]);

  // The reference props split in two: the key handlers belong on the wrapper (an Escape typed in
  // the input is handled here, and stopped before an enclosing popover panel can close on it); the
  // aria-* state belongs on the button that opens the calendar.
  const handlers: Record<string, unknown> = {};
  const triggerProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(getReferenceProps())) {
    (key.startsWith('on') ? handlers : triggerProps)[key] = value;
  }

  // Where focus lands when the calendar opens, read when the focus manager asks (the day buttons
  // exist by then): the day react-day-picker keeps tabbable — the selected day when it is enabled,
  // else today, else the first enabled day — else the first enabled day, else (null) the popover.
  const initialFocusRef = useMemo(
    () => ({
      get current(): HTMLElement | null {
        const pop = refs.floating.current;
        return (
          pop?.querySelector<HTMLElement>('td button[tabindex="0"]') ??
          pop?.querySelector<HTMLElement>('td button:not([disabled])') ??
          null
        );
      },
      set current(_value: HTMLElement | null) {
        // Read-only: derived from the popover's DOM.
      },
    }),
    [refs.floating],
  );

  // For an action that removes or disables the button that held focus (picking a month closes the
  // month / year panel, Clear disables itself): focus would fall to <body> with the calendar still
  // open and the Tab trap skipped. Send it to the day grid once the new state has rendered.
  const focusDays = useCallback(() => {
    requestAnimationFrame(() => (initialFocusRef.current ?? refs.floating.current)?.focus());
  }, [initialFocusRef, refs.floating]);

  return {
    context,
    /** For the field's wrapper; the calendar anchors to it. */
    setReference: refs.setReference,
    /** For the popover element. */
    setFloating: refs.setFloating,
    /** The popover element, once mounted. */
    floating: refs.floating,
    /** The field's wrapper (input + calendar button), once mounted. */
    reference: refs.domReference,
    initialFocusRef,
    focusDays,
    /** Spread on the wrapper. */
    referenceProps: handlers,
    /** Spread on the calendar button: aria-expanded / aria-haspopup / aria-controls. */
    triggerProps,
    /** Position + role/id; faded out (but still focusable) until the first measurement. */
    floatingProps: getFloatingProps({
      'aria-label': 'Calendar',
      style: {
        ...floatingStyles,
        // Not `visibility: hidden`: a hidden element cannot take the initial focus.
        opacity: isPositioned ? 1 : 0,
        pointerEvents: isPositioned ? undefined : 'none',
      },
    }),
  };
}
