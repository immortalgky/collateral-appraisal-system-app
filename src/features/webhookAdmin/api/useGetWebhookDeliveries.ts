import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { GetWebhookDeliveriesParams, WebhookDeliveryListResult } from '../types';

export const webhookDeliveryKeys = {
  all: ['webhook-deliveries'] as const,
  list: (params: GetWebhookDeliveriesParams) => ['webhook-deliveries', 'list', params] as const,
  detail: (id: string) => ['webhook-deliveries', 'detail', id] as const,
};

export const useGetWebhookDeliveries = (params: GetWebhookDeliveriesParams = {}) => {
  return useQuery({
    queryKey: webhookDeliveryKeys.list(params),
    queryFn: async (): Promise<WebhookDeliveryListResult> => {
      const { data } = await axios.get<WebhookDeliveryListResult>('/webhook-deliveries', {
        params: {
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 20,
          status: params.status || undefined,
          subscriptionId: params.subscriptionId || undefined,
          eventType: params.eventType || undefined,
          fromDate: params.fromDate || undefined,
          toDate: params.toDate || undefined,
        },
      });
      return data;
    },
  });
};
