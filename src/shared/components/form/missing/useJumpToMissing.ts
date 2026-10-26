import { useCallback } from 'react';
import { useFormContext, type UseFormReturn } from 'react-hook-form';
import { scrollToField } from '../utils';
import { useMissingReveal } from './missingFieldsContext';
import type { MissingFieldsItem } from './types';

const hasField = (path: string) => {
  const escaped = CSS.escape(path);
  return !!document.querySelector(
    `[data-field="${escaped}"], [data-field^="${escaped}."], [data-field-aliases~="${escaped}"], input[name="${escaped}"], textarea[name="${escaped}"]`,
  );
};

/**
 * Jump to a missing item: let the page reveal it first (the tab it sits on), then, on the next
 * frame so a tab that just switched is showing, scroll to and focus the field. A field the page
 * does not render falls back to `setFocus`, then to its section, then to the top of the form: a
 * click on "go to field" always moves the page somewhere.
 */
export function useJumpToMissing() {
  // Null outside a form: the chip still works there, just without setFocus.
  const form = useFormContext() as UseFormReturn | null;
  const setFocus = form?.setFocus;
  const reveal = useMissingReveal()?.reveal;

  return useCallback(
    (item: MissingFieldsItem, sectionId: string) => {
      const { path } = item;
      if (path) reveal?.(path);
      requestAnimationFrame(() => {
        if (path && hasField(path)) {
          scrollToField(path);
          return;
        }
        if (path) {
          try {
            setFocus?.(path);
          } catch {
            // no registered ref behind this path: the scroll below is the fallback
          }
        }
        // "other" has no element of its own, so fall through to the form, then the window
        const fallback =
          document.getElementById(sectionId) ??
          document.getElementById('form-scroll-container') ??
          document.querySelector('form');
        if (fallback) fallback.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    [reveal, setFocus],
  );
}
