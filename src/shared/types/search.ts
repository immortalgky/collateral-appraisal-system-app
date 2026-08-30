/**
 * Global search always resolves to an appraisal.
 *
 * The old contract returned three independent entity lists (requests / customers / properties),
 * each with its own `navigateTo`. Two of those routes did not exist, so picking a property result
 * always landed on the NotFound page. Every result now carries an appraisal id, and the route is
 * built from that one id.
 */

/** Which group of columns the server searches — not what kind of entity comes back. */
export type SearchScope = 'all' | 'documents' | 'customers' | 'properties';

/** Why a result matched. Drives the group header and the icon. */
export type MatchKind = 'document' | 'customer' | 'property' | 'request';

/** One field that matched, so the row can show the user why it is here. */
export interface SearchMatch {
  field: string;
  value: string;
}

export interface SearchAppraisal {
  appraisalId: string;
  /** Null until an appraisal number is minted — fall back to requestNumber for display. */
  appraisalNumber?: string | null;
  requestId: string;
  requestNumber?: string | null;
  customerName?: string | null;
  status?: string | null;
  /** Comma-joined collateral type codes, e.g. 'B, L'. */
  propertyTypes?: string | null;
  province?: string | null;
  /** Built server-side from appraisalId (or requestId for a request with no appraisal yet). */
  navigateTo: string;
  matchedOn: SearchMatch[];
}

/**
 * One matched value and every appraisal it appears on — a customer name that spans three
 * appraisals is one group of three, not three unrelated rows.
 */
export interface SearchGroup {
  matchKind: MatchKind;
  /** The value that matched, e.g. a customer name or a title deed number. */
  matchLabel: string;
  /** The field it matched in, e.g. 'customerName'. Used for the group's eyebrow. */
  matchField: string;
  appraisalCount: number;
  appraisals: SearchAppraisal[];
}

export interface SearchResponse {
  groups: SearchGroup[];
  /** True when the server capped the result set — the UI offers the full list page. */
  hasMore: boolean;
  totalMatchedAppraisals: number;
}
