import { useMutation, useQuery, useQueryClient, useQueries } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  AppraisalSearchParams,
  AppraisalSearchResponse,
} from '@/features/appraisal/api/appraisalSearch';
import type {
  CorrectPropertyDataRequestType,
  CorrectPropertyDataResponseType,
  GetPropertyCorrectionsResponseType,
  GetPropertyGroupByIdResponseType,
  GetPropertyGroupsResponseType,
} from '@shared/schemas/v1';

// ── Query Keys ─────────────────────────────────────────────

export const appraisalDataCorrectionKeys = {
  all: ['appraisal-data-correction'] as const,
  search: (params: AppraisalSearchParams) =>
    ['appraisal-data-correction', 'search', params] as const,
  properties: (appraisalId: string) =>
    ['appraisal-data-correction', appraisalId, 'properties'] as const,
  /** Prefix shared by every history query for this appraisal, regardless of propertyId —
   * invalidate with this (not a specific propertyId) so every open history panel refreshes. */
  historyAll: (appraisalId: string) =>
    ['appraisal-data-correction', appraisalId, 'history'] as const,
  history: (appraisalId: string, propertyId?: string) =>
    [...appraisalDataCorrectionKeys.historyAll(appraisalId), propertyId ?? 'all'] as const,
};

// ── Search (reuses the existing /appraisals endpoint) ───────

/**
 * Search Completed/Cancelled appraisals for correction. Thin wrapper over the same
 * `GET /appraisals` endpoint the main search screen uses, with the status filter
 * pinned so this feature never surfaces appraisals still in flight.
 */
export function useSearchClosedAppraisals(
  params: Omit<AppraisalSearchParams, 'status'>,
  options?: { enabled?: boolean },
) {
  const fullParams: AppraisalSearchParams = { ...params, status: 'Completed' };
  return useQuery({
    queryKey: appraisalDataCorrectionKeys.search(fullParams),
    queryFn: async ({ signal }) => {
      const cleanParams = Object.fromEntries(
        Object.entries(fullParams).filter(([, v]) => v !== undefined && v !== '' && v !== null),
      );
      const { data } = await axios.get<AppraisalSearchResponse>('/appraisals', {
        params: cleanParams,
        signal,
      });
      return data;
    },
    staleTime: 30_000,
    enabled: options?.enabled,
  });
}

// ── Property list (with propertyType) for the left rail ─────

/**
 * GET /appraisals/{appraisalId}/property-groups only returns group-level aggregates
 * (propertyCount) — it does NOT carry propertyType or per-property rows. The property
 * list with propertyType/sequenceInGroup lives on GET .../property-groups/{groupId}.
 * This hook fetches the group list, then each group's detail, and flattens the result —
 * still far cheaper than probing every per-type detail endpoint for every property.
 */
export function useGetAppraisalPropertiesWithType(appraisalId: string | undefined) {
  const groupsQuery = useQuery({
    queryKey: appraisalDataCorrectionKeys.properties(appraisalId ?? ''),
    queryFn: async (): Promise<GetPropertyGroupsResponseType> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/property-groups`);
      return data;
    },
    enabled: !!appraisalId,
  });

  const groupIds = groupsQuery.data?.groups.map(g => g.id) ?? [];

  const detailQueries = useQueries({
    queries: groupIds.map(groupId => ({
      queryKey: ['appraisal-data-correction', appraisalId, 'property-groups', groupId] as const,
      queryFn: async (): Promise<GetPropertyGroupByIdResponseType> => {
        const { data } = await axios.get(`/appraisals/${appraisalId}/property-groups/${groupId}`);
        return data;
      },
      enabled: !!appraisalId,
    })),
  });

  const isLoading = groupsQuery.isLoading || detailQueries.some(q => q.isLoading);
  const properties = detailQueries.flatMap(q => q.data?.properties ?? []);

  return { properties, isLoading, groups: groupsQuery.data?.groups ?? [] };
}

// ── Apply a correction ───────────────────────────────────────
// (No dedicated vehicle/vessel detail hooks here — the detail page fetches every
// property type, vehicle/vessel included, through the generic `useGetPropertyDetail`
// in appraisal/api/propertyGroup.ts. Typed per-type hooks were tried and removed as
// dead code per code review.)

export function useCorrectPropertyData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      data: CorrectPropertyDataRequestType;
    }): Promise<CorrectPropertyDataResponseType> => {
      const { data } = await axios.patch(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/data-correction`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      // Fixed per code review (2026-08-20): invalidating `history(appraisalId)` alone
      // targets the `'all'`-suffixed key, which is not a prefix of the per-propertyId
      // key the history panel actually subscribes with (React Query invalidates by key
      // prefix) — the panel never refreshed after a save. `historyAll` has no propertyId
      // segment, so it's a genuine prefix of every history query for this appraisal.
      queryClient.invalidateQueries({
        queryKey: appraisalDataCorrectionKeys.historyAll(variables.appraisalId),
      });
      // The record just changed — everything the appraisal detail screens read
      // (property detail, property groups) must be refetched, not just this feature's
      // own cache. These key roots mirror the ones invalidated by the create/update
      // hooks in appraisal/api/property.ts and propertyGroup.ts.
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'property', variables.propertyId, 'detail'],
      });
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'property-groups'],
      });
      queryClient.invalidateQueries({
        queryKey: appraisalDataCorrectionKeys.properties(variables.appraisalId),
      });
    },
  });
}

// ── History ───────────────────────────────────────────────────

export function useGetPropertyCorrections(appraisalId: string | undefined, propertyId?: string) {
  return useQuery({
    queryKey: appraisalDataCorrectionKeys.history(appraisalId ?? '', propertyId),
    enabled: !!appraisalId,
    queryFn: async (): Promise<GetPropertyCorrectionsResponseType> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/property-corrections`, {
        params: propertyId ? { propertyId } : undefined,
      });
      return data;
    },
  });
}
