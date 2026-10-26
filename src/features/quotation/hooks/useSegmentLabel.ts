import { useCallback, useMemo } from 'react';

import { useParametersByGroup } from '@/shared/utils/parameterUtils';

/** Resolves a Banking Segment code to its parameter label (case-insensitive), falling back to the code. */
export function useSegmentLabel() {
  const params = useParametersByGroup('BankingSegment');
  const byCode = useMemo(
    () => new Map(params.map(p => [p.code.toLowerCase(), p.description])),
    [params],
  );
  return useCallback((code: string) => byCode.get(code.trim().toLowerCase()) ?? code, [byCode]);
}
