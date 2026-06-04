import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { AuditLogResult, GetAuditLogsParams } from '../types';

const QUERY_KEY = 'auditLogs';

export const useGetAuditLogs = (params: GetAuditLogsParams = {}) => {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: async (): Promise<AuditLogResult> => {
      const { data } = await axios.get<AuditLogResult>('/auth/audit-logs', {
        params: {
          entityType: params.entityType || undefined,
          entityId: params.entityId || undefined,
          actorUserId: params.actorUserId || undefined,
          from: params.from || undefined,
          to: params.to || undefined,
          action: params.action || undefined,
          pageNumber: params.pageNumber ?? 0,
          pageSize: params.pageSize ?? 20,
        },
      });
      return data;
    },
  });
};
