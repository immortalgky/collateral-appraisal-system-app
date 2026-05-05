import { create } from 'zustand';

/**
 * Stores collateral lookup data needed for Progressive appraisal prefill.
 * Populated by TitleLookupIntegration when a Land master with an active
 * construction inspection is found.
 *
 * Session-scoped — values remain until a new lookup overwrites them or the
 * user navigates to a fresh request/appraisal.
 */
interface CollateralPrefillStore {
  /** ID of the last construction inspection from the collateral master.
   *  Used by CreateBuildingPage to seed previousProgressPct values. */
  lastConstructionInspectionId: string | null;
  setLastConstructionInspectionId: (id: string | null) => void;
  clearPrefill: () => void;
}

export const useCollateralPrefillStore = create<CollateralPrefillStore>(set => ({
  lastConstructionInspectionId: null,
  setLastConstructionInspectionId: id => set({ lastConstructionInspectionId: id }),
  clearPrefill: () => set({ lastConstructionInspectionId: null }),
}));
