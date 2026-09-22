import { useHasPermission } from '@/shared/hooks/useHasPermission';

/**
 * Whether this user may open the appraisal workspace at `/appraisals/:appraisalId`.
 *
 * The ONE definition of that rule on the client, because it is expressed in three places — the
 * route guard in `router.tsx`, the "View details" link on the tracking panel, and the "open
 * report" link in History Search's pin drawer — and a link that disagrees with the guard opens a
 * tab that immediately redirects to '/' with no message.
 *
 * Deny the tracking-only audience rather than allow-list `APPRAISAL_VIEW`, mirroring the server's
 * `AppraisalFieldScope.IsTrackingOnly`. The two are not complements: RequestMaker and
 * RequestChecker hold NEITHER code and the guard lets them through, so allow-listing would hide
 * the link from people who are allowed to follow it.
 */
export const useCanOpenAppraisalWorkspace = () => {
  const hasFullView = useHasPermission('APPRAISAL_VIEW');
  const hasTrackingView = useHasPermission('APPRAISAL_TRACKING_VIEW');
  return hasFullView || !hasTrackingView;
};
