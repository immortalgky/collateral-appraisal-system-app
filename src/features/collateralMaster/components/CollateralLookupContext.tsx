import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CollateralLookupResult } from '../api/types';

/**
 * Carries the most-recent collateral lookup result across components.
 * The appeal company exclusion filter reads `priorAppraisalCompanyIds` from here.
 * Populated by TitleInformationForm when a lookup hit occurs.
 */
interface CollateralLookupContextValue {
  lookupResult: CollateralLookupResult | null;
  setLookupResult: (result: CollateralLookupResult | null) => void;
  /** Convenience accessor — set populated by the active lookup */
  priorAppraisalCompanyIds: string[];
}

const CollateralLookupContext = createContext<CollateralLookupContextValue>({
  lookupResult: null,
  setLookupResult: () => {},
  priorAppraisalCompanyIds: [],
});

export function CollateralLookupProvider({ children }: { children: ReactNode }) {
  const [lookupResult, setLookupResult] = useState<CollateralLookupResult | null>(null);

  return (
    <CollateralLookupContext.Provider
      value={{
        lookupResult,
        setLookupResult,
        priorAppraisalCompanyIds: lookupResult?.priorAppraisalCompanyIds ?? [],
      }}
    >
      {children}
    </CollateralLookupContext.Provider>
  );
}

export function useCollateralLookup() {
  return useContext(CollateralLookupContext);
}
