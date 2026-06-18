import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { UserAccessMatrixResult, GetUserAccessMatrixParams } from '../types';

const QUERY_KEY = 'userAccessMatrix';

export const useGetUserAccessMatrix = (params: GetUserAccessMatrixParams = {}) => {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async (): Promise<UserAccessMatrixResult> => {
      const { data } = await axios.get<UserAccessMatrixResult>('/auth/reports/user-access', {
        params: {
          scope: params.scope || undefined,
          companyId: params.companyId || undefined,
          roleName: params.roleName || undefined,
          groupId: params.groupId || undefined,
          teamId: params.teamId || undefined,
          isActive: params.isActive,
          search: params.search || undefined,
          pageNumber: params.pageNumber ?? 0,
          pageSize: params.pageSize ?? 20,
        },
      });
      return data;
    },
  });
};

/**
 * Triggers a CSV download of the user access report with the current filters.
 * The backend streams the file; we receive it as a blob and trigger a browser download.
 */
export const exportUserAccessReport = async (params: GetUserAccessMatrixParams = {}) => {
  const response = await axios.get('/auth/reports/user-access/export', {
    params: {
      scope: params.scope || undefined,
      companyId: params.companyId || undefined,
      roleName: params.roleName || undefined,
      groupId: params.groupId || undefined,
      teamId: params.teamId || undefined,
      isActive: params.isActive,
      search: params.search || undefined,
    },
    responseType: 'blob',
  });

  const url = URL.createObjectURL(new Blob([response.data as BlobPart]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `user-access-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
