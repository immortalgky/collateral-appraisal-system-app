import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import toast from 'react-hot-toast';
import { webhookDeliveryKeys } from './useGetWebhookDeliveries';

export const useRetryWebhookDelivery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.post(`/v1/webhook-deliveries/${id}/retry`);
    },
    onSuccess: (_data, id) => {
      toast.success('Webhook delivery queued for retry');
      void queryClient.invalidateQueries({ queryKey: webhookDeliveryKeys.all });
      void queryClient.invalidateQueries({ queryKey: webhookDeliveryKeys.detail(id) });
    },
    onError: () => {
      toast.error('Failed to retry webhook delivery');
    },
  });
};
