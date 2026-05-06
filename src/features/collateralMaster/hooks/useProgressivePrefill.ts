import { useConstructionInspectionWorkDetails } from '../api/hooks';
import type { ConstructionWorkDetailDto } from '../api/types';

/**
 * For Progressive appraisal start:
 * - Fetches prior work details from `lastConstructionInspectionId`
 * - Provides a `buildSeedRows` function that maps prior work details into
 *   new row seeds: `PreviousProgressPct = prior.CurrentProgressPct`
 *
 * Match priority:
 * 1. By `constructionWorkItemId` (template FK)
 * 2. Fallback by `workItemName` (free-text items)
 *
 * For summary-mode inspections: copies `summaryCurrentProgressPct → new summaryPreviousProgressPct`.
 */
export function useProgressivePrefill(inspectionId: string | null | undefined) {
  const { data: priorDetails, isLoading, isError } = useConstructionInspectionWorkDetails(
    inspectionId,
  );

  /**
   * Builds seed rows for the new construction inspection.
   * Returns null when data is not yet ready or not available.
   */
  function buildSeedRows(
    /** Optionally pass a partial template list to match against — if omitted all prior rows are returned */
    templateItems?: Array<{
      constructionWorkItemId?: string | null;
      workItemName?: string | null;
    }>,
  ): Array<Partial<ConstructionWorkDetailDto>> | null {
    if (!priorDetails) return null;

    if (priorDetails.isFullDetail && priorDetails.workDetails) {
      // Match prior rows to template (if provided), else return all prior rows
      const rows = templateItems
        ? templateItems.map(tmpl => {
            // Try match by constructionWorkItemId first
            const byId = priorDetails.workDetails!.find(
              d => d.constructionWorkItemId && d.constructionWorkItemId === tmpl.constructionWorkItemId,
            );
            // Fallback by workItemName
            const byName = !byId
              ? priorDetails.workDetails!.find(
                  d =>
                    d.workItemName.trim().toLowerCase() ===
                    (tmpl.workItemName ?? '').trim().toLowerCase(),
                )
              : null;

            const matched = byId ?? byName;
            if (!matched) return null;

            return {
              constructionWorkItemId: matched.constructionWorkItemId ?? undefined,
              constructionWorkGroupId: matched.constructionWorkGroupId ?? undefined,
              workItemName: matched.workItemName,
              proportionPct: matched.proportionPct,
              constructionValue: matched.constructionValue ?? undefined,
              displayOrder: matched.displayOrder,
              previousProgressPct: matched.currentProgressPct, // <-- key: prior current → new previous
              currentProgressPct: 0,
            };
          }).filter(Boolean) as Array<Partial<ConstructionWorkDetailDto>>
        : priorDetails.workDetails.map(d => ({
            constructionWorkItemId: d.constructionWorkItemId ?? undefined,
            constructionWorkGroupId: d.constructionWorkGroupId ?? undefined,
            workItemName: d.workItemName,
            proportionPct: d.proportionPct,
            constructionValue: d.constructionValue ?? undefined,
            displayOrder: d.displayOrder,
            previousProgressPct: d.currentProgressPct,
            currentProgressPct: 0,
          }));

      return rows;
    }

    // Summary mode — return a single summary seed
    return [
      {
        workItemName: 'Summary',
        previousProgressPct: priorDetails.summaryCurrentProgressPct ?? 0,
        currentProgressPct: 0,
        proportionPct: 100,
        displayOrder: 0,
      },
    ];
  }

  return {
    priorDetails,
    isLoading,
    isError,
    buildSeedRows,
    isSummaryMode: priorDetails ? !priorDetails.isFullDetail : false,
    summaryPreviousProgressPct: priorDetails?.summaryCurrentProgressPct ?? null,
  };
}
