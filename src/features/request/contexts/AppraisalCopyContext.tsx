import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type {
  ConstructionBlockReason,
  ConstructionChainStatus,
  PriorAppraisal,
} from '@/features/appraisal/api/priorAppraisal';

interface AppraisalCopyHandlers {
  /** `chain` is what the search modal read for a construction-inspection purpose (never blocked). */
  onSelect: (template: PriorAppraisal, chain?: ConstructionChainStatus) => void | Promise<void>;
  /** The reference is being cleared; the caller also removes the files carried from it. */
  onClear: () => void | Promise<void>;
  /** A pick is loading: the selector is locked so no second pick or clear can overlap it. */
  disabled: boolean;
  /**
   * The next Construction Inspection round, display-only: kept out of the form, where a reset (a
   * save's refetch) would drop it. null when there is none to show.
   */
  round: number | null;
  /** The chain status of the picked prior, display-only like `round`. null when there is none. */
  chain: ConstructionChainStatus | null;
  /** Why the API refused the last submit, while it still concerns the picked prior. */
  rejection: ConstructionBlockReason | null;
  /** Swaps the prior for another appraisal of its chain (the banner's "use X instead"). */
  onUseLatest?: (appraisalId: string) => void | Promise<void>;
}

const AppraisalCopyContext = createContext<AppraisalCopyHandlers | null>(null);

export function AppraisalCopyProvider({
  onCopySelect,
  onClear,
  disabled,
  round = null,
  chain = null,
  rejection = null,
  onUseLatest,
  children,
}: {
  onCopySelect: AppraisalCopyHandlers['onSelect'];
  onClear: AppraisalCopyHandlers['onClear'];
  disabled: boolean;
  round?: number | null;
  chain?: ConstructionChainStatus | null;
  rejection?: ConstructionBlockReason | null;
  onUseLatest?: AppraisalCopyHandlers['onUseLatest'];
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ onSelect: onCopySelect, onClear, disabled, round, chain, rejection, onUseLatest }),
    [onCopySelect, onClear, disabled, round, chain, rejection, onUseLatest],
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
