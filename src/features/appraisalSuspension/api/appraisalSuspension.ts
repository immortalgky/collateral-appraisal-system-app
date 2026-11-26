import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { AppraisalSuspensionLog, AppraisalSuspensionPage, SuspensionFilter } from '../types';

export interface AppraisalSuspensionParams {
  /** Part of an appraisal number (substring match). Combines with `status`. */
  appraisalNumber?: string;
  status: SuspensionFilter;
  pageNumber: number;
  pageSize: number;
}

export const appraisalSuspensionKeys = {
  all: ['appraisal-suspension'] as const,
  list: (params: AppraisalSuspensionParams) => ['appraisal-suspension', 'list', params] as const,
  logs: (appraisalId: string) => ['appraisal-suspension', 'logs', appraisalId] as const,
};

/** Disabled when the API would return nothing: no number and a filter other than Suspended. */
export function useAppraisalSuspensions(params: AppraisalSuspensionParams) {
  return useQuery({
    queryKey: appraisalSuspensionKeys.list(params),
    enabled: !!params.appraisalNumber || params.status === 'Suspended',
    // Keep the current rows while the next search or page loads.
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const { data } = await axios.get<AppraisalSuspensionPage>('/appraisals/suspensions', {
        params: {
          appraisalNumber: params.appraisalNumber || undefined,
          status: params.status,
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
        },
        signal,
      });
      return data;
    },
  });
}

export function useAppraisalSuspensionLogs(appraisalId: string | null) {
  return useQuery({
    queryKey: appraisalSuspensionKeys.logs(appraisalId ?? ''),
    enabled: !!appraisalId,
    queryFn: async ({ signal }) => {
      const { data } = await axios.get<AppraisalSuspensionLog[]>(
        `/appraisals/${appraisalId}/suspension-logs`,
        { signal },
      );
      return data;
    },
  });
}

export function useSetAppraisalSuspension() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { appraisalId: string; isSuspended: boolean; reason: string }) => {
      const { data } = await axios.patch(`/appraisals/${vars.appraisalId}/suspension`, {
        isSuspended: vars.isSuspended,
        reason: vars.reason,
      });
      return data;
    },
    // Also on error: a 409 means the row on screen is stale.
    onSettled: () => queryClient.invalidateQueries({ queryKey: appraisalSuspensionKeys.all }),
  });
}
