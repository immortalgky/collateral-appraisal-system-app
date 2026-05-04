import { useMemo } from 'react';
import { useGetPropertyGroupById } from '@features/appraisal/api/propertyGroup';
import type {
  PricingAnalysisReadinessDto,
  RuleViolationDto,
} from '../types/readiness';

/**
 * Convenience hook over GET /appraisals/{id}/property-groups/{groupId} that exposes
 * the readiness projection in a UI-friendly shape:
 *
 *   - canStartPricingAnalysis: bind to the AP button's `disabled` prop
 *   - violations: render at the page level (warning banner)
 *   - violationsByProperty: render as chips next to each property card
 *   - isLoading: hide the button until the first response arrives
 */
export function useReadiness(
  appraisalId: string | undefined,
  groupId: string | undefined,
) {
  const query = useGetPropertyGroupById(appraisalId, groupId);

  // The readiness field is appended by GetPropertyGroupByIdQueryHandler. Until the
  // OpenAPI/zod schemas are regenerated it isn't on the inferred response type, so
  // we narrow once and keep the rest of the hook strongly typed.
  const readiness = (query.data as { readiness?: PricingAnalysisReadinessDto } | undefined)
    ?.readiness;

  const violationsByProperty = useMemo(() => {
    const map = new Map<string, RuleViolationDto[]>();
    for (const v of readiness?.violations ?? []) {
      if (!v.propertyId) continue;
      const list = map.get(v.propertyId) ?? [];
      list.push(v);
      map.set(v.propertyId, list);
    }
    return map;
  }, [readiness]);

  const groupLevelViolations = useMemo(
    () => (readiness?.violations ?? []).filter(v => !v.propertyId),
    [readiness],
  );

  return {
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    canStartPricingAnalysis: readiness?.canStartPricingAnalysis ?? false,
    violations: readiness?.violations ?? [],
    violationsByProperty,
    groupLevelViolations,
    refetch: query.refetch,
  };
}
