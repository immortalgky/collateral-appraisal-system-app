import { createContext, useContext, useEffect, useRef } from 'react';
import type { MissingFieldsSummary, RevealFn } from './types';

export interface MissingFieldsValue {
  /** null until the first parse of the form has run */
  summary: MissingFieldsSummary | null;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  /** Re-check the form now and open the popover (a failed Save or Submit). */
  show: () => void;
  /** How many times `show` has been called: the chip announces the count on each (a failed Save). */
  shown: number;
  /** Text of the green pill when nothing is missing; defaults to `common:missing.complete`. */
  completeLabel?: string;
}

export const MissingFieldsContext = createContext<MissingFieldsValue | null>(null);

/** The missing-fields state, or null when no provider is above (the chip then renders nothing). */
export const useMissingFields = () => useContext(MissingFieldsContext);

export interface RevealApi {
  register: (fn: RevealFn) => () => void;
  reveal: RevealFn;
}

// Separate from the state above and never changing: a page that registers a reveal (the tab
// header) must not re-render every time the summary does.
export const MissingRevealContext = createContext<RevealApi | null>(null);

export const useMissingReveal = () => useContext(MissingRevealContext);

/** Is there a provider above? Unlike `useMissingFields`, does not re-render when the summary does. */
export const useHasMissingFields = () => useMissingReveal() !== null;

/**
 * Registers how this page brings a field on screen before the jump scrolls to it (switching to the
 * tab it sits on). The latest `reveal` is always the one called; there is no need to memoise it.
 */
export function useRegisterMissingReveal(reveal: RevealFn) {
  const api = useMissingReveal();
  const latest = useRef(reveal);
  useEffect(() => {
    latest.current = reveal;
  });
  useEffect(() => api?.register(path => latest.current(path)), [api]);
}
