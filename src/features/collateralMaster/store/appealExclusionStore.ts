import { create } from 'zustand';

/**
 * Stores the most-recent prior company id for appeal exclusion.
 * Populated when the collateral lookup hits during request creation.
 *
 * Business rule: an appeal excludes only the company that did the most recent
 * appraisal — not the full history. Older companies remain eligible.
 *
 * Source: lookupResult.lastEngagement.appraisalCompanyId.
 *
 * Session-scoped — cleared on TitleInformationForm mount to prevent cross-flow leak.
 */
interface AppealExclusionStore {
  excludedCompanyId: string | null;
  setExcludedCompanyId: (id: string | null) => void;
  clearExclusions: () => void;
}

export const useAppealExclusionStore = create<AppealExclusionStore>(set => ({
  excludedCompanyId: null,
  setExcludedCompanyId: id => set({ excludedCompanyId: id }),
  clearExclusions: () => set({ excludedCompanyId: null }),
}));
