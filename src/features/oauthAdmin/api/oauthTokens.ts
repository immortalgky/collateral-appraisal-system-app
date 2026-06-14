import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from '@shared/api/axiosInstance';
import type {
  OAuthAuthorization,
  OAuthToken,
  PaginatedResult,
  TokenViewerParams,
} from '../types';

export const oauthTokenKeys = {
  authorizations: (params: TokenViewerParams) => ['oauth-authorizations', params] as const,
  tokens: (params: TokenViewerParams) => ['oauth-tokens', params] as const,
};

const toQuery = (params: TokenViewerParams) => ({
  clientId: params.clientId || undefined,
  subject: params.subject || undefined,
  status: params.status || undefined,
  pageNumber: params.pageNumber ?? 1,
  pageSize: params.pageSize ?? 20,
});

export const useGetAuthorizations = (params: TokenViewerParams = {}, enabled = true) => {
  return useQuery({
    queryKey: oauthTokenKeys.authorizations(params),
    enabled,
    queryFn: async (): Promise<PaginatedResult<OAuthAuthorization>> => {
      const { data } = await axios.get<PaginatedResult<OAuthAuthorization>>('/auth/authorizations', {
        params: toQuery(params),
      });
      return data;
    },
  });
};

export const useGetTokens = (params: TokenViewerParams = {}, enabled = true) => {
  return useQuery({
    queryKey: oauthTokenKeys.tokens(params),
    enabled,
    queryFn: async (): Promise<PaginatedResult<OAuthToken>> => {
      const { data } = await axios.get<PaginatedResult<OAuthToken>>('/auth/tokens', {
        params: toQuery(params),
      });
      return data;
    },
  });
};

export const useRevokeAuthorization = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('oauthAdmin');
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.post(`/auth/authorizations/${id}/revoke`);
    },
    onSuccess: () => {
      toast.success(t('tokens.revoke.successToast'));
      void queryClient.invalidateQueries({ queryKey: ['oauth-authorizations'] });
      void queryClient.invalidateQueries({ queryKey: ['oauth-tokens'] });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('tokens.revoke.errorToast')),
  });
};

export const useRevokeToken = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('oauthAdmin');
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.post(`/auth/tokens/${id}/revoke`);
    },
    onSuccess: () => {
      toast.success(t('tokens.revoke.successToast'));
      void queryClient.invalidateQueries({ queryKey: ['oauth-tokens'] });
    },
    onError: (err: any) => toast.error(err?.apiError?.detail ?? t('tokens.revoke.errorToast')),
  });
};
