import { createContext, useContext, type ReactNode } from 'react';
import { useAppraisalReadOnly } from '@/features/appraisal/context/AppraisalContext';

export const PageReadOnlyContext = createContext<boolean>(false);

export function usePageReadOnly(): boolean {
  return useContext(PageReadOnlyContext);
}

/** For search /view routes — always read-only */
export function ReadOnlyPageWrapper({ children }: { children: ReactNode }) {
  return (
    <PageReadOnlyContext.Provider value={true}>
      {children}
    </PageReadOnlyContext.Provider>
  );
}

/** For appraisal routes — computed from status + role, merged with parent (search-readonly) */
export function AppraisalReadOnlyWrapper({
  pageName,
  children,
}: {
  pageName: string;
  children: ReactNode;
}) {
  const parentReadOnly = useContext(PageReadOnlyContext);
  const { isReadOnly } = useAppraisalReadOnly(pageName);
  return (
    <PageReadOnlyContext.Provider value={parentReadOnly || isReadOnly}>
      {children}
    </PageReadOnlyContext.Provider>
  );
}
