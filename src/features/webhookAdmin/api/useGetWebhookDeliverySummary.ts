import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { WebhookDeliverySummary, WebhookDeliverySummaryParams } from '../types';
import { deliveryFilterParams, webhookDeliveryKeys } from './useGetWebhookDeliveries';

/** Counts per status for the tabs, plus the pending / failure breakdowns. No status filter. */
export const useGetWebhookDeliverySummary = (params: WebhookDeliverySummaryParams = {}) => {
  return useQuery({
    queryKey: webhookDeliveryKeys.summary(params),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<WebhookDeliverySummary> => {
      const { data } = await axios.get<WebhookDeliverySummary>('/webhook-deliveries/summary', {
        params: deliveryFilterParams(params),
      });
      return data;
    },
  });
};
