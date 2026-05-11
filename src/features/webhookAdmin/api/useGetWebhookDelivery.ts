import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { WebhookDeliveryDetail } from '../types';
import { webhookDeliveryKeys } from './useGetWebhookDeliveries';

export const useGetWebhookDelivery = (id: string | null) => {
  return useQuery({
    queryKey: webhookDeliveryKeys.detail(id ?? ''),
    queryFn: async (): Promise<WebhookDeliveryDetail> => {
      const { data } = await axios.get<WebhookDeliveryDetail>(`/v1/webhook-deliveries/${id}`);
      return data;
    },
    enabled: !!id,
  });
};
