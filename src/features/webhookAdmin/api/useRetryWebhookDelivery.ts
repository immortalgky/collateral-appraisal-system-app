import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from '@shared/api/axiosInstance';
import toast from 'react-hot-toast';
import { webhookDeliveryKeys } from './useGetWebhookDeliveries';

export const useRetryWebhookDelivery = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('webhookAdmin');

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.post(`/webhook-deliveries/${id}/retry`);
    },
    onSuccess: (_data, id) => {
      toast.success(t('retry.successToast'));
      void queryClient.invalidateQueries({ queryKey: webhookDeliveryKeys.all });
      void queryClient.invalidateQueries({ queryKey: webhookDeliveryKeys.detail(id) });
    },
    onError: () => {
      toast.error(t('retry.errorToast'));
    },
  });
};
