import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { LogDetail } from '../types';

/** GET /admin/logs/{id} — full row including messageTemplate and the raw Properties JSON,
 * used by the drawer's "Properties JSON" tab. */
export const useGetLogById = (id: number | null) =>
  useQuery({
    queryKey: ['admin-logs', 'detail', id],
    queryFn: async ({ signal }): Promise<LogDetail> => {
      const { data } = await axios.get<LogDetail>(`/admin/logs/${id}`, { signal });
      return data;
    },
    enabled: id != null,
    staleTime: 30_000,
  });
