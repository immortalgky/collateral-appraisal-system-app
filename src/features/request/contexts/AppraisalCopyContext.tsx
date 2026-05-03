import { createContext, useContext, type ReactNode } from 'react';
import type { AppraisalCopyTemplate } from '@/features/appraisal/api/copyTemplate';

type AppraisalCopyHandler = (template: AppraisalCopyTemplate) => void;

const AppraisalCopyContext = createContext<AppraisalCopyHandler | null>(null);

export function AppraisalCopyProvider({
  onCopySelect,
  children,
}: {
  onCopySelect: AppraisalCopyHandler;
  children: ReactNode;
}) {
  return (
    <AppraisalCopyContext.Provider value={onCopySelect}>
      {children}
    </AppraisalCopyContext.Provider>
  );
}

/** Returns the copy-select handler, or null when outside a provider (e.g. edit mode). */
export function useAppraisalCopyHandler(): AppraisalCopyHandler | null {
  return useContext(AppraisalCopyContext);
}
