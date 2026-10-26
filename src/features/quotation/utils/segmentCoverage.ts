/**
 * Segment Coverage: a company covers a quotation when its Banking Segments
 * (Company.loanTypes) include every segment in the quotation's Segment Set. Extra company segments
 * are fine and the comparison is case-insensitive. Mirrors the API's SegmentCoverage — the API is
 * authoritative (Send guard); this only drives filtering and warnings in the UI.
 */

import type { ApiError } from '@/shared/types/api';

const norm = (s: string) => s.trim().toLowerCase();

/** errorCode the API returns when Send is refused because an invited company lacks a segment. */
export const SEGMENT_COVERAGE_MISMATCH = 'SEGMENT_COVERAGE_MISMATCH';

export const isSegmentCoverageMismatch = (err: unknown) =>
  (err as { apiError?: ApiError })?.apiError?.errorCode === SEGMENT_COVERAGE_MISMATCH;

/**
 * Distinct, non-blank segments, like the API: among case-insensitive duplicates the ordinal-smallest
 * spelling is kept ('RETAIL' over 'Retail'), whatever the input order, then the set is sorted
 * ordinal-ignore-case.
 */
export function buildSegmentSet(segments: ReadonlyArray<string | null | undefined>): string[] {
  const byKey = new Map<string, string>();
  for (const s of segments) {
    const trimmed = s?.trim();
    if (!trimmed) continue;
    const key = norm(trimmed);
    const kept = byKey.get(key);
    // JS string comparison is by UTF-16 code unit, i.e. ordinal.
    if (kept === undefined || trimmed < kept) byKey.set(key, trimmed);
  }
  // OrdinalIgnoreCase upper-cases, so compare upper-cased UTF-16 units (lower-casing would reorder
  // the punctuation between 'Z' and 'a').
  return [...byKey.values()].sort((a, b) => {
    const ka = a.toUpperCase();
    const kb = b.toUpperCase();
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

/** Invited companies that cannot appraise part of the quotation's Segment Set (blocks Send). */
export function getSegmentGaps<T extends { missingSegments?: ReadonlyArray<string> | null }>(
  invitedCompanies: ReadonlyArray<T> | null | undefined,
): T[] {
  return (invitedCompanies ?? []).filter(c => (c.missingSegments ?? []).length > 0);
}

/** Segments in the set the company cannot appraise. Empty array = the company covers the set. */
export function getMissingSegments(
  segmentSet: ReadonlyArray<string>,
  companyLoanTypes: ReadonlyArray<string> | null | undefined,
): string[] {
  const owned = new Set((companyLoanTypes ?? []).filter(l => l?.trim()).map(norm));
  return segmentSet.filter(s => !owned.has(norm(s)));
}

/** Name / local-name search (blank = all). */
export function searchCompanies<
  T extends { companyName: string; companyNameLocal?: string | null },
>(companies: ReadonlyArray<T>, query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...companies];
  return companies.filter(
    c => c.companyName.toLowerCase().includes(q) || c.companyNameLocal?.toLowerCase().includes(q),
  );
}

/** Companies covering the whole Segment Set; pair with `searchCompanies` for the picker's search box. */
export function filterCoveringCompanies<T extends { loanTypes: string[] }>(
  companies: ReadonlyArray<T>,
  segmentSet: ReadonlyArray<string>,
): T[] {
  return companies.filter(c => getMissingSegments(segmentSet, c.loanTypes).length === 0);
}
