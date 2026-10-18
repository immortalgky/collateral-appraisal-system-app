import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { PriorAppraisal } from '@/features/appraisal/api/priorAppraisal';

interface AppraisalCopyHandlers {
  onSelect: (template: PriorAppraisal) => void | Promise<void>;
  /** The reference is being cleared; the caller also removes the files carried from it. */
  onClear: () => void | Promise<void>;
  /** A pick is loading: the selector is locked so no second pick or clear can overlap it. */
  disabled: boolean;
  /**
   * The next Construction Inspection round, display-only: kept out of the form, where a reset (a
   * save's refetch) would drop it. null when there is none to show.
   */
  round: number | null;
}

const AppraisalCopyContext = createContext<AppraisalCopyHandlers | null>(null);

export function AppraisalCopyProvider({
  onCopySelect,
  onClear,
  disabled,
  round = null,
  children,
}: {
  onCopySelect: AppraisalCopyHandlers['onSelect'];
  onClear: AppraisalCopyHandlers['onClear'];
  disabled: boolean;
  round?: number | null;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ onSelect: onCopySelect, onClear, disabled, round }),
    [onCopySelect, onClear, disabled, round],
  );
  return <AppraisalCopyContext.Provider value={value}>{children}</AppraisalCopyContext.Provider>;
}

/**
 * Returns the pick/clear handlers, or null when outside a provider. Whether the prior may be picked
 * at all is `meta.priorLocked` in the form (a submitted request, an Initiate draft), not this.
 */
export function useAppraisalCopyHandler(): AppraisalCopyHandlers | null {
  return useContext(AppraisalCopyContext);
}
