import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { MissingFieldsContext, MissingRevealContext, type RevealApi } from './missingFieldsContext';
import type { MissingFieldsSummary, RevealFn } from './types';

/** What the page can ask of the provider from outside the tree it renders. */
export interface MissingFieldsHandle {
  show: () => void;
}

/**
 * Shares one missing-fields summary with the chip (and whatever else reads it) so the page itself
 * does not re-render when it changes. The summary comes from the caller: `useFormMissingFields` for
 * a schema-driven form, a page's own hook for a special one (Request).
 */
export function MissingFieldsProvider({
  summary,
  refresh,
  handleRef,
  completeLabel,
  children,
}: {
  summary: MissingFieldsSummary | null;
  /** Called before the popover opens, so it shows the form as it is now rather than 300 ms ago. */
  refresh?: () => void;
  handleRef?: Ref<MissingFieldsHandle>;
  completeLabel?: string;
  children: ReactNode;
}) {
  const [isOpen, setOpenState] = useState(false);
  const [shown, setShown] = useState(0);

  // Opening by hand also re-checks: a change that is not a form edit (a toggle that swaps which
  // field is on screen) would otherwise leave the list as it was 300 ms after the last edit.
  const setOpen = useCallback(
    (open: boolean) => {
      if (open) refresh?.();
      setOpenState(open);
    },
    [refresh],
  );

  const show = useCallback(() => {
    refresh?.();
    setOpenState(true);
    setShown(n => n + 1);
  }, [refresh]);

  useImperativeHandle(handleRef, () => ({ show }), [show]);

  const value = useMemo(
    () => ({ summary, isOpen, setOpen, show, shown, completeLabel }),
    [summary, isOpen, setOpen, show, shown, completeLabel],
  );

  // Several parts of a page can each know how to bring some fields on screen (a tab bar, a popover
  // that holds a field): all of them are asked, and each acts only on a path it owns.
  const revealRef = useRef(new Set<RevealFn>());
  const revealApi = useMemo<RevealApi>(
    () => ({
      register: fn => {
        const fns = revealRef.current;
        fns.add(fn);
        return () => {
          fns.delete(fn);
        };
      },
      reveal: path => revealRef.current.forEach(fn => fn(path)),
    }),
    [],
  );

  return (
    <MissingRevealContext.Provider value={revealApi}>
      <MissingFieldsContext.Provider value={value}>{children}</MissingFieldsContext.Provider>
    </MissingRevealContext.Provider>
  );
}
