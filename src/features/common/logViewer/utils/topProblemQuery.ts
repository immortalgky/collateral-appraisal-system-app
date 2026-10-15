import type { LogTopProblem } from '../types';

// Same lenient shape used elsewhere in this feature: 8 hex, dash, then any 27 chars from the
// remaining hex/dash alphabet (covers "4-4-4-12" exactly).
const GUID_OR_DIGITS_SPLIT = /[0-9a-f]{8}-[0-9a-f-]{27}|\d{4,}/gi;
const PLACEHOLDER_SPLIT = /\{[^}]*\}/;

const MIN_PREFERRED_LENGTH = 8;
const QUOTE_SPLIT = /["“”]/;

/** Picks the single longest contiguous piece — never joins two non-adjacent pieces back
 * together, since that could match rows that never contained both together. Prefers a piece of
 * at least `MIN_PREFERRED_LENGTH` chars when one exists, so a short common word like "to" doesn't
 * win just because it happened to be the longest remaining scrap. Also splits (never strips) on
 * embedded quote characters — a message quoting a type/property name (e.g. EF Core's own
 * warnings) would otherwise wrap into a phrase the BE's parser closes early, and simply deleting
 * the quotes would make the phrase no longer a literal substring of the real stored message
 * either. Splitting instead just treats the quote as another boundary, the same as a placeholder
 * or a GUID. */
function longestSegment(parts: string[]): string {
  const cleaned = parts
    .flatMap(p => p.split(QUOTE_SPLIT))
    .map(p => p.trim())
    .filter(Boolean);
  if (cleaned.length === 0) return '';
  const preferred = cleaned.filter(p => p.length >= MIN_PREFERRED_LENGTH);
  const pool = preferred.length > 0 ? preferred : cleaned;
  return pool.reduce((best, p) => (p.length > best.length ? p : best));
}

/**
 * Turns a top-problem into a search phrase that actually matches the group, built from the
 * TEMPLATE rather than one sample instance — a sample's own GUID/id would only ever match that
 * one row again. Splits on the template's `{Placeholder}` markers and quotes the longest literal
 * segment between them.
 *
 * Falls back to splitting `sampleMessage` on GUIDs, 4+-digit runs, and quotes instead whenever
 * the template has nothing usable: either there were no placeholders at all (older rows never
 * got a real template — it's just the message text), or every literal segment between them was
 * empty (a bare `{Message}`, or back-to-back placeholders like `{A}{B}`). `sampleMessage`, not
 * `template`, is the source for this fallback: the BE truncates `template` at a fixed length for
 * the summary aggregation, which can cut a static (no-placeholder) message off mid-word —
 * `sampleMessage` is never truncated, and is the same static text in the no-placeholder case
 * since there's no templating variance to differ on.
 *
 * Returns '' (append nothing) rather than a raw, useless template like `{A}{B}` when neither
 * source has any usable text — both fields are null-guarded, since real data isn't as clean as
 * the type claims.
 */
export function topProblemToQuery(problem: LogTopProblem): string {
  const template = problem.template ?? '';
  const sampleMessage = problem.sampleMessage ?? '';

  const byPlaceholder = template.split(PLACEHOLDER_SPLIT);
  const fromTemplate = byPlaceholder.length > 1 ? longestSegment(byPlaceholder) : '';
  const messagePhrase = fromTemplate || longestSegment(sampleMessage.split(GUID_OR_DIGITS_SPLIT));

  const parts = messagePhrase ? [`"${messagePhrase}"`] : [];
  // An error group is template + exceptionType together — appending the message phrase alone
  // would also match rows sharing that message but thrown from a different exception type.
  // Free text searches Message + Exception, so quoting the type here narrows to the same group.
  if (problem.exceptionType) parts.push(`"${problem.exceptionType}"`);
  return parts.join(' ');
}
