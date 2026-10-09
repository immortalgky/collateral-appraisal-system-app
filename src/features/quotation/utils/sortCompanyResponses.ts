/**
 * Shared row order for the company-response comparison tables across the quotation feature
 * (Company Responses, Admin Review, RM shortlisted bids, sent-to-RM view): Quoted (Submitted)
 * bids surface first since they're what admins/RMs actually compare, cheaper bids before pricier
 * ones within a status, and anything without a comparable bid yet (still drafting, or never
 * responded) sinks to the bottom regardless of amount.
 *
 * Ranks on the raw backend status and the raw (non-localized) company name, never the translated
 * display label — row order must not silently change depending on the viewer's language.
 */
const STATUS_RANK: Record<string, number> = {
  Submitted: 1, // displayed as "Quoted"
  UnderReview: 2,
  Tentative: 3,
  Negotiating: 4,
  Accepted: 5,
  Declined: 6,
  Rejected: 7,
  Withdrawn: 8,
  Draft: 9,
  PendingCheckerReview: 9,
  Pending: 9, // synthetic: no CompanyQuotation record at all yet
};

/** Bottom bucket — also the fallback for any status this table doesn't know about. */
const NO_BID_RANK = 9;

export interface CompanyResponseSortKey {
  /** Raw backend status, or the synthetic 'Pending' key for a company with no CompanyQuotation record. */
  status: string;
  /** cq.totalQuotedPrice — null/undefined when there's no comparable bid yet. */
  totalNetAmount: number | null | undefined;
  /** Raw (non-localized) company name — the tiebreak must stay stable across languages. */
  companyName: string;
}

function statusRank(status: string): number {
  return STATUS_RANK[status] ?? NO_BID_RANK;
}

export function compareCompanyResponses(
  a: CompanyResponseSortKey,
  b: CompanyResponseSortKey,
): number {
  const rankA = statusRank(a.status);
  const rankB = statusRank(b.status);
  if (rankA !== rankB) return rankA - rankB;

  // The bottom bucket has nothing comparable to price — skip straight to the name tiebreak.
  if (rankA !== NO_BID_RANK) {
    const amountA = a.totalNetAmount ?? Number.POSITIVE_INFINITY;
    const amountB = b.totalNetAmount ?? Number.POSITIVE_INFINITY;
    if (amountA !== amountB) return amountA - amountB;
  }

  return a.companyName.localeCompare(b.companyName);
}

/** Sorts a copy of `rows` by the shared company-response order; never mutates the input. */
export function sortCompanyResponses<T>(
  rows: T[],
  getSortKey: (row: T) => CompanyResponseSortKey,
): T[] {
  return [...rows].sort((a, b) => compareCompanyResponses(getSortKey(a), getSortKey(b)));
}
