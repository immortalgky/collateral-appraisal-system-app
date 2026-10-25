import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from '@shared/api/axiosInstance';
import { runLimited } from '@shared/utils/runLimited';
import { webhookDeliveryKeys } from './useGetWebhookDeliveries';

/** How many retries are in flight at once. */
const RETRY_CONCURRENCY = 3;

export interface BulkRetryResult {
  succeeded: number;
  failed: number;
}

/**
 * Retries each id through the single-retry endpoint, 3 at a time, and reports once. There is no bulk
 * endpoint: a failed id must not stop the rest, so each call is caught here instead of in `runLimited`.
 */
export const useBulkRetryWebhookDeliveries = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('webhookAdmin');

  return useMutation({
    mutationFn: async (ids: string[]): Promise<BulkRetryResult> => {
      const outcomes = await runLimited(
        ids.map(
          id => () =>
            axios.post(`/webhook-deliveries/${id}/retry`).then(
              () => true,
              () => false,
            ),
        ),
        RETRY_CONCURRENCY,
      );
      const succeeded = outcomes.filter(Boolean).length;
      return { succeeded, failed: outcomes.length - succeeded };
    },
    onSuccess: ({ succeeded, failed }) => {
      if (failed === 0) toast.success(t('bulk.successToast', { count: succeeded }));
      else if (succeeded > 0) toast.success(t('bulk.partialToast', { count: succeeded, failed }));
      else toast.error(t('bulk.failedToast', { count: failed }));
    },
    // Some may have been queued even on a thrown error, so the list is refreshed either way.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: webhookDeliveryKeys.all });
    },
  });
};
