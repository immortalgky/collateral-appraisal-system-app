import { useQuery } from '@tanstack/react-query';
import { getReportDefinitions, reportKeys } from '../api/reports';
import type { ReportDefinition, ReportGenerationMode } from '../api/reports';

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────

export interface ReportDefinitionsLookup {
  /** Full definition list, useful for dropdowns. */
  definitions: ReportDefinition[];
  /** Fast key → generationMode lookup. */
  modeByKey: Map<string, ReportGenerationMode>;
  isLoading: boolean;
}

/**
 * Fetches and caches the report definition list with a long stale time (30 min).
 * Returns a Map lookup so components can resolve generationMode in O(1).
 */
export function useReportDefinitions(): ReportDefinitionsLookup {
  const { data, isLoading } = useQuery({
    queryKey: reportKeys.definitions(),
    queryFn: getReportDefinitions,
    staleTime: 1000 * 60 * 30,
    // Treat an empty/error response gracefully — callers fall back to Sync.
    placeholderData: [],
  });

  const definitions = data ?? [];
  const modeByKey = new Map<string, ReportGenerationMode>(
    definitions.map(d => [d.reportTypeKey, d.generationMode]),
  );

  return { definitions, modeByKey, isLoading };
}
