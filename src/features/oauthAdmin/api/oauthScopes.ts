import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from '@shared/api/axiosInstance';
import type {
  CreateScopeRequest,
  OAuthScopeListResult,
  UpdateScopeRequest,
} from '../types';

interface ListParams {
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export const oauthScopeKeys = {
  all: ['oauth-scopes'] as const,
  list: (params: ListParams) => ['oauth-scopes', 'list', params] as const,
};

export const useGetScopes = (params: ListParams = {}) => {
  return useQuery({
    queryKey: oauthScopeKeys.list(params),
    queryFn: async (): Promise<OAuthScopeListResult> => {
      const { data } = await axios.get<OAuthScopeListResult>('/auth/scopes', {
        params: {
          search: params.search || undefined,
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 50,
        },
      });
      return data;
    },
  });
};

export const useCreateScope = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('oauthAdmin');
  return useMutation({
    mutationFn: async (request: CreateScopeRequest) => {
      const { data } = await axios.post('/auth/scopes', request);
      return data;
    },
    onSuccess: () => {
      toast.success(t('scopes.toasts.created'));
      void queryClient.invalidateQueries({ queryKey: oauthScopeKeys.all });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('scopes.toasts.createFailed')),
  });
};

export const useUpdateScope = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('oauthAdmin');
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: UpdateScopeRequest }) => {
      await axios.put(`/auth/scopes/${id}`, request);
    },
    onSuccess: () => {
      toast.success(t('scopes.toasts.updated'));
      void queryClient.invalidateQueries({ queryKey: oauthScopeKeys.all });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('scopes.toasts.updateFailed')),
  });
};

export const useDeleteScope = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('oauthAdmin');
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/auth/scopes/${id}`);
    },
    onSuccess: () => {
      toast.success(t('scopes.toasts.deleted'));
      void queryClient.invalidateQueries({ queryKey: oauthScopeKeys.all });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('scopes.toasts.deleteFailed')),
  });
};
