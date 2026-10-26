import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from '@shared/api/axiosInstance';
import type {
  CreateClientRequest,
  CreateClientResponse,
  OAuthClientDetail,
  OAuthClientListResult,
  RotateSecretResponse,
  UpdateClientRequest,
} from '../types';

interface ListParams {
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export const oauthClientKeys = {
  all: ['oauth-clients'] as const,
  list: (params: ListParams) => ['oauth-clients', 'list', params] as const,
  detail: (id: string) => ['oauth-clients', 'detail', id] as const,
};

export const useGetClients = (params: ListParams = {}) => {
  return useQuery({
    queryKey: oauthClientKeys.list(params),
    queryFn: async (): Promise<OAuthClientListResult> => {
      const { data } = await axios.get<OAuthClientListResult>('/auth/clients', {
        params: {
          search: params.search || undefined,
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 20,
        },
      });
      return data;
    },
  });
};

// ponytail: a handful of clients exist, and the API only filters by search text. One unpaged fetch
// feeds the counts, the type tabs, the search, the scope-usage column and the client dropdown.
// Past 200 clients the tab counts and filters would be wrong; add server-side filters then.
export const FETCH_ALL_CLIENTS = { pageNumber: 1, pageSize: 200 };
export const useGetAllClients = () => useGetClients(FETCH_ALL_CLIENTS);

export const useGetClient = (id: string | null) => {
  return useQuery({
    queryKey: oauthClientKeys.detail(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<OAuthClientDetail> => {
      const { data } = await axios.get<OAuthClientDetail>(`/auth/clients/${id}`);
      return data;
    },
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('oauthAdmin');
  return useMutation({
    mutationFn: async (request: CreateClientRequest): Promise<CreateClientResponse> => {
      const { data } = await axios.post<CreateClientResponse>('/auth/clients', request);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: oauthClientKeys.all });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('clients.toasts.createFailed')),
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('oauthAdmin');
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: UpdateClientRequest }) => {
      await axios.put(`/auth/clients/${id}`, request);
    },
    onSuccess: () => {
      toast.success(t('clients.toasts.updated'));
      void queryClient.invalidateQueries({ queryKey: oauthClientKeys.all });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('clients.toasts.updateFailed')),
  });
};

export const useRotateClientSecret = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('oauthAdmin');
  return useMutation({
    mutationFn: async (id: string): Promise<RotateSecretResponse> => {
      const { data } = await axios.post<RotateSecretResponse>(`/auth/clients/${id}/secret`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: oauthClientKeys.all });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('clients.toasts.rotateFailed')),
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('oauthAdmin');
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/auth/clients/${id}`);
    },
    onSuccess: () => {
      toast.success(t('clients.toasts.deleted'));
      void queryClient.invalidateQueries({ queryKey: oauthClientKeys.all });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('clients.toasts.deleteFailed')),
  });
};
