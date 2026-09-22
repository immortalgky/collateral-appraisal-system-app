/**
 * Query-string keys the pricing analysis page owns.
 *
 * Both layers the page can show live in the URL rather than in state alone, so a reload or a
 * shared link lands where the user was, and the browser's Back button steps out one layer at a
 * time instead of leaving the whole page.
 *
 * Kept here, not in the page, because the components that WRITE these params sit several levels
 * below it (GroupReferencesSection is inside PricingAnalysisMethodBoard, inside the accordion) —
 * importing the page from them would be a cycle.
 */

/** `?method=<approachType>.<methodType>` — a WQS/SAG/DC/... method of the group itself. */
export const METHOD_PARAM = 'method';

/** `?ref=<referencePricingAnalysisId>` — a market reference, opened as its own full page. */
export const REFERENCE_PARAM = 'ref';
