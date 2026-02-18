import { createContext, useContext, type ReactNode } from 'react';

/**
 * Appraisal data returned from the backend
 */
export interface AppraisalData {
  appraisalId: string;
  requestId: string;
  appraisalReportNo?: string;

  // Status & Workflow
  status?: string;
  appraisalType?: string;
  priority?: string;
}

interface AppraisalContextValue {
  /** The appraisal data fetched from backend */
  appraisal: AppraisalData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  isError: boolean;
  /** Error object */
  error: Error | null;
}

const AppraisalContext = createContext<AppraisalContextValue | null>(null);

interface AppraisalProviderProps {
  children: ReactNode;
  value: AppraisalContextValue;
}

/**
 * Provider component for appraisal context
 */
export function AppraisalProvider({ children, value }: AppraisalProviderProps) {
  return <AppraisalContext.Provider value={value}>{children}</AppraisalContext.Provider>;
}

/**
 * Hook to access appraisal context
 * @throws Error if used outside of AppraisalProvider
 */
export function useAppraisalContext(): AppraisalContextValue {
  const context = useContext(AppraisalContext);
  if (!context) {
    throw new Error('useAppraisalContext must be used within an AppraisalProvider');
  }
  return context;
}

/**
 * Hook to get the requestId from appraisal context
 * Returns undefined if not in appraisal context or still loading
 */
export function useAppraisalRequestId(): string | undefined {
  const context = useContext(AppraisalContext);
  return context?.appraisal?.requestId;
}
