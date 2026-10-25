import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { WebhookDeliveryDetail } from '../types';
import { webhookDeliveryKeys } from './useGetWebhookDeliveries';

/** `enabled` off keeps the cached delivery readable but stops refetching (a closed drawer). */
export const useGetWebhookDelivery = (id: string | null, enabled = true) => {
  return useQuery({
    queryKey: webhookDeliveryKeys.detail(id ?? ''),
    queryFn: async (): Promise<WebhookDeliveryDetail> => {
      const { data } = await axios.get<WebhookDeliveryDetail>(`/webhook-deliveries/${id}`);
      return data;
    },
    enabled: !!id && enabled,
  });
};
