/**
 * Segment Coverage: a company covers a quotation when its Banking Segments
 * (Company.loanTypes) include every segment in the quotation's Segment Set. Extra company segments
 * are fine and the comparison is case-insensitive. Mirrors the API's SegmentCoverage — the API is
 * authoritative (Send guard); this only drives filtering and warnings in the UI.
 */

const norm = (s: string) => s.trim().toLowerCase();

/** Distinct, non-blank segments, first spelling wins. */
export function buildSegmentSet(segments: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of segments) {
    if (!s?.trim()) continue;
    const key = norm(s);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(s.trim());
  }
  return result;
}

/** Segments in the set the company cannot appraise. Empty array = the company covers the set. */
export function getMissingSegments(
  segmentSet: ReadonlyArray<string>,
  companyLoanTypes: ReadonlyArray<string> | null | undefined,
): string[] {
  const owned = new Set((companyLoanTypes ?? []).filter(l => l?.trim()).map(norm));
  return segmentSet.filter(s => !owned.has(norm(s)));
}

export const coversSegments = (
  segmentSet: ReadonlyArray<string>,
  companyLoanTypes: ReadonlyArray<string> | null | undefined,
) => getMissingSegments(segmentSet, companyLoanTypes).length === 0;
