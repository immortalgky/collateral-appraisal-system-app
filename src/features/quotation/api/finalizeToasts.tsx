import toast from 'react-hot-toast';
import i18n from '@/i18n';
import Icon from '@/shared/components/Icon';
import type { FinalizeQuotationResponse } from './quotation';

/**
 * The finalize result toasts. They are raised from the mutation's hook-level callbacks, not from the
 * Finalize dialog's per-call ones: the backend commits Finalized before the auto-assign loop, so the
 * status can flip and unmount the dialog while the request is still running, and TanStack drops
 * per-call callbacks once their component is gone.
 */

const notifyWarning = (message: string) =>
  toast(message, {
    duration: 8000,
    icon: <Icon name="triangle-exclamation" style="solid" className="text-amber-500" />,
  });

export const notifyFinalizeSuccess = (res: FinalizeQuotationResponse, autoAssignSent: boolean) => {
  // The plain award text tells the admin to click Assign on the task; that is wrong when it was done.
  if (!autoAssignSent) {
    toast.success(i18n.t('quotation:toasts.quotationAwarded'));
    return;
  }
  toast.success(i18n.t('quotation:toasts.quotationAwardedAutoAssign'));

  const results = res.autoAssignResults ?? [];
  const count = (code: string) => results.filter(r => r.result === code).length;
  // An appraisal without a result means some outcome is unknown: never report that as done.
  if (res.appraisalIds.some(id => !results.some(r => r.appraisalId === id))) {
    notifyWarning(i18n.t('quotation:finalize.autoAssign.toastNoResults'));
    return;
  }
  // Skipped is not a problem: those appraisals were never meant to be assigned.
  if (results.some(r => r.result === 'Failed' || r.result === 'Parked')) {
    notifyWarning(
      i18n.t('quotation:finalize.autoAssign.toastIncomplete', {
        assigned: count('Assigned'),
        failed: count('Failed'),
        parked: count('Parked'),
        skipped: count('Skipped'),
      }),
    );
  }
};

/**
 * @param mayHaveCompleted auto-assign was requested and the request got no answer from the API itself
 *   (timeout, dropped connection, gateway giving up), so the award and some assignments may have
 *   gone through. The hook has already queued a refresh on settle.
 */
export const notifyFinalizeError = (err: unknown, mayHaveCompleted: boolean) => {
  if (mayHaveCompleted) {
    notifyWarning(i18n.t('quotation:finalize.autoAssign.mayHaveCompleted'));
    return;
  }
  // The response interceptor lifts the API's problem details into `apiError`.
  const detail = (err as { apiError?: { detail?: string } } | null)?.apiError?.detail;
  toast.error(detail?.trim() || i18n.t('quotation:toasts.awardFailed'));
};
