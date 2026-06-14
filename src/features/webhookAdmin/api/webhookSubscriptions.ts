import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from '@shared/api/axiosInstance';
import type {
  CreateWebhookSubscriptionRequest,
  GetWebhookSubscriptionsParams,
  UpdateWebhookSubscriptionRequest,
  WebhookSubscriptionListResult,
} from '../types';

export const webhookSubscriptionKeys = {
  all: ['webhook-subscriptions'] as const,
  list: (params: GetWebhookSubscriptionsParams) =>
    ['webhook-subscriptions', 'list', params] as const,
};

export const useGetWebhookSubscriptions = (params: GetWebhookSubscriptionsParams = {}) => {
  return useQuery({
    queryKey: webhookSubscriptionKeys.list(params),
    queryFn: async (): Promise<WebhookSubscriptionListResult> => {
      const { data } = await axios.get<WebhookSubscriptionListResult>('/webhook-subscriptions', {
        params: {
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 20,
          systemCode: params.systemCode || undefined,
          isActive: params.isActive,
        },
      });
      return data;
    },
  });
};

export const useCreateWebhookSubscription = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('webhookAdmin');
  return useMutation({
    mutationFn: async (request: CreateWebhookSubscriptionRequest) => {
      const { data } = await axios.post('/webhook-subscriptions', request);
      return data;
    },
    onSuccess: () => {
      toast.success(t('subscriptions.toasts.created'));
      void queryClient.invalidateQueries({ queryKey: webhookSubscriptionKeys.all });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('subscriptions.toasts.createFailed')),
  });
};

export const useUpdateWebhookSubscription = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('webhookAdmin');
  return useMutation({
    mutationFn: async ({
      id,
      request,
    }: {
      id: string;
      request: UpdateWebhookSubscriptionRequest;
    }) => {
      await axios.put(`/webhook-subscriptions/${id}`, request);
    },
    onSuccess: () => {
      toast.success(t('subscriptions.toasts.updated'));
      void queryClient.invalidateQueries({ queryKey: webhookSubscriptionKeys.all });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('subscriptions.toasts.updateFailed')),
  });
};

export const useToggleWebhookSubscription = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('webhookAdmin');
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await axios.post(`/webhook-subscriptions/${id}/${isActive ? 'activate' : 'deactivate'}`);
    },
    onSuccess: (_data, { isActive }) => {
      toast.success(
        isActive ? t('subscriptions.toasts.activated') : t('subscriptions.toasts.deactivated'),
      );
      void queryClient.invalidateQueries({ queryKey: webhookSubscriptionKeys.all });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('subscriptions.toasts.toggleFailed')),
  });
};

export const useDeleteWebhookSubscription = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('webhookAdmin');
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/webhook-subscriptions/${id}`);
    },
    onSuccess: () => {
      toast.success(t('subscriptions.toasts.deleted'));
      void queryClient.invalidateQueries({ queryKey: webhookSubscriptionKeys.all });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('subscriptions.toasts.deleteFailed')),
  });
};
