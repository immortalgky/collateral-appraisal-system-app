import { useMemo } from 'react';
import {
  type MachineryCountSet,
  useGetMachinerySummary,
  useGetMachinerySummarySuggestedCounts,
} from '../api/machinerySummary';

/**
 * Where the appraisal-level machinery summary stands:
 * - `none`  — nothing saved yet (the API answers 404, which the hook turns into `null`)
 * - `done`  — saved, and its head-counts still agree with the machines on the appraisal
 * - `drift` — saved, but a count the appraiser typed no longer matches what the machine list adds
 *             up to — usually because machines were added or changed after the summary was saved
 */
export type MachinerySummaryStatus = 'none' | 'done' | 'drift';

export const SUMMARY_COUNT_NAMES = [
  'surveyedNumber',
  'appraisalNumber',
  'installedAndUseCount',
  'appraisalScrapCount',
  'appraisedByDocumentCount',
  'notInstalledCount',
] as const satisfies readonly (keyof MachineryCountSet)[];

export type SummaryCountName = (typeof SUMMARY_COUNT_NAMES)[number];

export interface CountMismatch {
  name: SummaryCountName;
  saved: number;
  derived: number;
}

export interface MachinerySummaryState {
  /** `null` while loading, or when the appraisal has no machinery and nothing was asked for. */
  status: MachinerySummaryStatus | null;
  mismatches: CountMismatch[];
  saved: Partial<Record<SummaryCountName, number | null>> | null;
  derived: MachineryCountSet | null;
}

/**
 * Pass `undefined` to skip both requests — the Properties tab does that when the appraisal holds
 * no machinery, so an appraisal of land never asks for a machinery summary. The queries are the
 * same ones the summary form runs, so opening the form reads them from the cache.
 */
export function useMachinerySummaryStatus(appraisalId: string | undefined): MachinerySummaryState {
  const { data: summary, isLoading } = useGetMachinerySummary(appraisalId);
  const { data: derived } = useGetMachinerySummarySuggestedCounts(appraisalId);

  return useMemo<MachinerySummaryState>(() => {
    if (!appraisalId || isLoading || summary === undefined) {
      return { status: null, mismatches: [], saved: null, derived: derived ?? null };
    }
    if (summary === null) {
      return { status: 'none', mismatches: [], saved: null, derived: derived ?? null };
    }
    // A count left blank means "use the derived number" in the form, so only a typed number that
    // differs counts as drift.
    const mismatches: CountMismatch[] = derived
      ? SUMMARY_COUNT_NAMES.flatMap(name => {
          const saved = summary[name];
          return saved != null && saved !== derived[name]
            ? [{ name, saved, derived: derived[name] }]
            : [];
        })
      : [];
    return {
      status: mismatches.length > 0 ? 'drift' : 'done',
      mismatches,
      saved: summary,
      derived: derived ?? null,
    };
  }, [appraisalId, isLoading, summary, derived]);
}
