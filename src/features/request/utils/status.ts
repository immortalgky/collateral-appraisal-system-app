/** Statuses in which a request is still owned by the intake screens. */
export const PRE_SUBMIT_STATUSES = ['Draft', 'New'];

/**
 * True once the request has been handed over to the appraisal workflow.
 *
 * A submitted request must not be deleted, saved as a draft or re-submitted: it is driven by the
 * workflow from that point on, and deleting it leaves an orphaned task that can no longer be opened.
 *
 * Mirrors the backend invariant in `Request.HasBeenSubmitted()`: `requestedAt` is stamped on submit
 * and never cleared, so it stays correct even for legacy rows whose status was demoted back to
 * 'New' by the original post-submit-save bug. Pass it wherever it is available — `GET /requests/{id}`
 * returns it, the listing DTO does not.
 *
 * Fails closed — an unknown or missing status is treated as submitted so that destructive actions
 * are never offered on data we could not classify. Callers that also run before the request is
 * loaded (create mode) must guard on edit mode themselves.
 */
export function isRequestSubmitted(
  status: string | undefined,
  requestedAt?: string | null,
): boolean {
  if (requestedAt) return true;
  if (!status) return true;

  return !PRE_SUBMIT_STATUSES.some(s => s.toLowerCase() === status.toLowerCase());
}
