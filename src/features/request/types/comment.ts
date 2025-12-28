/**
 * Comment type that supports both local (form state) and API modes
 */
export interface LocalComment {
  id?: string; // undefined for new local comments, set after API returns
  tempId?: string; // local tracking ID before API call
  requestId?: string; // undefined when no requestId yet
  comment: string;
  commentedBy: string;
  commentedByName: string;
  commentedAt: string;
  lastModifiedAt: string | null;
  isLocal?: boolean; // true = not yet saved to API
}
