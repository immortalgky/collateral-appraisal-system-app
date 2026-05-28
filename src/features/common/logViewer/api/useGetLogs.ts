import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { GetLogsParams, LogListResult } from '../types';

export const logViewerKeys = {
  all: ['admin-logs'] as const,
  list: (params: GetLogsParams) => ['admin-logs', 'list', params] as const,
};

export const useGetLogs = (params: GetLogsParams = {}) => {
  return useQuery({
    queryKey: logViewerKeys.list(params),
    queryFn: async (): Promise<LogListResult> => {
      const { data } = await axios.get<LogListResult>('/admin/logs', {
        params: {
          pageNumber: params.pageNumber ?? 0,
          pageSize: params.pageSize ?? 20,
          level: params.level || undefined,
          correlationId: params.correlationId || undefined,
          appraisalId: params.appraisalId || undefined,
          requestId: params.requestId || undefined,
          entityId: params.entityId || undefined,
          from: params.from || undefined,
          to: params.to || undefined,
          search: params.search || undefined,
        },
      });
      return data;
    },
    staleTime: 30_000,
  });
};
