/** Statuses in which a quotation is still open (it locks the appraisal's assignment). */
export const NON_TERMINAL_QUOTATION_STATUSES = [
  'Draft',
  'Sent',
  'UnderAdminReview',
  'PendingRmSelection',
  'WinnerTentative',
  'Negotiating',
];

interface PickableQuotation {
  id: string;
  status: string;
  requestDate: string;
  /** When the winner was finalized; null until then. */
  selectedAt?: string | null;
}

/**
 * Which of an appraisal's quotations is "the" one. The list also holds Cancelled ones (e.g. a parked
 * appraisal that was re-quoted), so its first row can be the wrong one. An open quotation wins,
 * since it locks the appraisal; otherwise the most recently finalized one (selectedAt, falling back
 * to requestDate). A missing or unparsable date counts as 0 (oldest); ties go to the newest id.
 * Returns undefined when there is neither: callers decide what to show for Cancelled-only.
 */
export function pickActiveQuotation<T extends PickableQuotation>(quotations: T[]): T | undefined {
  const open = quotations.find(q => NON_TERMINAL_QUOTATION_STATUSES.includes(q.status));
  if (open) return open;

  const finalizedAt = (q: T) => {
    const ms = new Date(q.selectedAt ?? q.requestDate).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  };
  return quotations
    .filter(q => q.status === 'Finalized')
    .sort((a, b) => finalizedAt(b) - finalizedAt(a) || b.id.localeCompare(a.id))[0];
}

/**
 * The most recently requested quotation, by its requestDate whatever order the list comes in (an
 * unparsable date counts as oldest; a tie keeps the earlier row). Undefined for an empty list.
 */
export function newestQuotation<T extends PickableQuotation>(quotations: T[]): T | undefined {
  const requestedAt = (q: T) => {
    const ms = new Date(q.requestDate).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  };
  return quotations.reduce<T | undefined>(
    (newest, q) => (!newest || requestedAt(q) > requestedAt(newest) ? q : newest),
    undefined,
  );
}

/**
 * Which quotation to SHOW for an appraisal: the open (non-terminal) one that locks the appraisal,
 * else the latest Finalized (an older winner stays usable after a newer quotation was cancelled),
 * else the newest by request date (Cancelled-only). Undefined only for an empty list. Callers that
 * must offer "new quotation" compare against `newestQuotation`.
 */
export function pickShownQuotation<T extends PickableQuotation>(quotations: T[]): T | undefined {
  return pickActiveQuotation(quotations) ?? newestQuotation(quotations);
}
