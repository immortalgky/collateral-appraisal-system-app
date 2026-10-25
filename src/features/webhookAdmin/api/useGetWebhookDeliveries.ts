import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  GetWebhookDeliveriesParams,
  WebhookDeliveryListResult,
  WebhookDeliverySummaryParams,
} from '../types';

export const webhookDeliveryKeys = {
  all: ['webhook-deliveries'] as const,
  list: (params: GetWebhookDeliveriesParams) => ['webhook-deliveries', 'list', params] as const,
  detail: (id: string) => ['webhook-deliveries', 'detail', id] as const,
  summary: (params: WebhookDeliverySummaryParams) =>
    ['webhook-deliveries', 'summary', params] as const,
};

/** Query-string form of the shared filters, so the list and the summary can never disagree. */
export const deliveryFilterParams = (params: WebhookDeliverySummaryParams) => ({
  systemCode: params.systemCode || undefined,
  eventType: params.eventType || undefined,
  search: params.search || undefined,
  fromDate: params.fromDate || undefined,
  toDate: params.toDate || undefined,
});

export const useGetWebhookDeliveries = (params: GetWebhookDeliveriesParams = {}) => {
  return useQuery({
    queryKey: webhookDeliveryKeys.list(params),
    // A tab or filter change keeps the rows on screen until the new page lands, instead of a skeleton flash.
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<WebhookDeliveryListResult> => {
      const { data } = await axios.get<WebhookDeliveryListResult>('/webhook-deliveries', {
        params: {
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 20,
          status: params.status || undefined,
          subscriptionId: params.subscriptionId || undefined,
          ...deliveryFilterParams(params),
        },
      });
      return data;
    },
  });
};
