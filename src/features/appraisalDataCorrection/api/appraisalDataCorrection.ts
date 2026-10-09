import {
  useMutation,
  useQuery,
  useQueryClient,
  useQueries,
  type QueryClient,
} from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { appraisalDocumentKeys } from '@/features/appraisal/api/appraisalDocuments';
import { propertyGroupKeys } from '@/features/appraisal/api/propertyGroup';
import type {
  AppraisalSearchParams,
  AppraisalSearchResponse,
} from '@/features/appraisal/api/appraisalSearch';
import type {
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
  correctionContext: (appraisalId: string) =>
    ['appraisal-data-correction', appraisalId, 'correction-context'] as const,
  /** Prefix of the property pages' own queries, e.g. `['appraisals', id, 'land-properties', …]`. */
  propertyPages: (appraisalId: string) => ['appraisals', appraisalId] as const,
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
      // The property pages' own key, so a correction's `propertyGroupKeys.all` invalidation also
      // refreshes the rail (a corrected property name) and the cache is shared with those pages.
      queryKey: propertyGroupKeys.detail(appraisalId ?? '', groupId),
      queryFn: async (): Promise<GetPropertyGroupByIdResponseType> => {
        const { data } = await axios.get(`/appraisals/${appraisalId}/property-groups/${groupId}`);
        return data;
      },
      enabled: !!appraisalId,
    })),
  });

  const isLoading = groupsQuery.isLoading || detailQueries.some(q => q.isLoading);
  // A failed load must not read as "no properties" (a block appraisal) — callers show an error.
  // Only a load that left nothing to show: a failed background refetch (the one a save triggers)
  // keeps the cached list, so the rail and the open editor stay on screen.
  const isError = groupsQuery.isLoadingError || detailQueries.some(q => q.isLoadingError);
  const refetch = () => {
    if (groupsQuery.isError) void groupsQuery.refetch();
    detailQueries.forEach(q => {
      if (q.isError) void q.refetch();
    });
  };
  const properties = detailQueries.flatMap(q => q.data?.properties ?? []);

  // The flat `properties` carry no group id, so the rail's grouping comes from the details themselves.
  const propertyGroups = detailQueries.flatMap(q => (q.data ? [q.data] : []));

  return {
    properties,
    propertyGroups,
    isLoading,
    isError,
    refetch,
  };
}

// ── Apply a correction ───────────────────────────────────────
// (No dedicated detail hooks here — the detail page fetches every property type, vehicle/vessel
// included, through the generic `useGetPropertyDetail` in appraisal/api/propertyGroup.ts.)

/** What the correction endpoint reports back: the audit row's field paths (`Land.OwnerName`). */
export interface CorrectPropertyDataResponse {
  changedFieldCount: number;
  changedFields: string[];
}

/**
 * PUT …/data-correction/{suffix}, where the suffix is the property's own detail route
 * (`land-detail`, `lease-agreement-condo-detail`, …) and `data` is the body that route's real PUT
 * takes. That update overwrites the whole record, so `data` must be the complete page payload —
 * never a diff of what was edited.
 *
 * Failures worth branching on, by `errorCode` (see `readApiError`): 409 `APPRAISAL_NOT_COMPLETED`
 * (reopened or cancelled meanwhile) and 400 `NO_CHANGES` (the record already holds these values).
 */
export function useCorrectPropertyData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      suffix: string;
      reason: string;
      data: unknown;
    }): Promise<CorrectPropertyDataResponse> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/data-correction/${params.suffix}`,
        { reason: params.reason, data: params.data },
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
      // The record just changed — everything the appraisal screens read must be refetched,
      // not just this feature's own cache: the property detail this editor is seeded from,
      // the property groups, and the property pages' own per-type queries.
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.propertyDetail(variables.appraisalId, variables.propertyId),
      });
      queryClient.invalidateQueries({ queryKey: propertyGroupKeys.all(variables.appraisalId) });
      queryClient.invalidateQueries({
        queryKey: appraisalDataCorrectionKeys.propertyPages(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: appraisalDataCorrectionKeys.properties(variables.appraisalId),
      });
    },
  });
}

// ── Valuation documents + summary regeneration ───────────────

/** add only = attach, removeId only = delete, both = replace. */
export interface CorrectAppraisalDocumentsRequest {
  reason: string;
  removeId?: string | null;
  /** Name, mime and size are read server-side from the stored upload. */
  add?: {
    documentTypeCode: string;
    /** From the `POST /documents` upload that precedes this call. */
    documentId: string;
  } | null;
}

// Both actions write a history row and change what the documents list shows.
const invalidateDocumentCorrectionQueries = (queryClient: QueryClient, appraisalId: string) => {
  queryClient.invalidateQueries({ queryKey: appraisalDataCorrectionKeys.historyAll(appraisalId) });
  queryClient.invalidateQueries({ queryKey: appraisalDocumentKeys.list(appraisalId) });
};

export function useCorrectAppraisalDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      data: CorrectAppraisalDocumentsRequest;
    }): Promise<{ addedId: string | null }> => {
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/document-corrections`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) =>
      invalidateDocumentCorrectionQueries(queryClient, variables.appraisalId),
  });
}

/** Resolves on 202: the job is only enqueued, the new file arrives later. */
export function useRegenerateAppraisalSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      reason: string;
      /** false = attach the summary but do not tell the source system to collect again. */
      notifyExternal: boolean;
    }): Promise<{ jobId: string }> => {
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/documents/regenerate-summary`,
        { reason: params.reason, notifyExternal: params.notifyExternal },
      );
      return data;
    },
    onSuccess: (_, variables) =>
      invalidateDocumentCorrectionQueries(queryClient, variables.appraisalId),
  });
}

// ── Source system (the external system that raised the request) ──

/** Non-null only when the appraisal came from an external system that can be notified. */
export function useGetCorrectionContext(appraisalId: string | undefined) {
  return useQuery({
    queryKey: appraisalDataCorrectionKeys.correctionContext(appraisalId ?? ''),
    enabled: !!appraisalId,
    // One small call for what GetAppraisalById does not carry: the source system (null when nobody
    // would be notified) and the committee approval time.
    queryFn: async (): Promise<{ externalSystem: string | null; completedAt: string | null }> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/correction-context`);
      return data;
    },
  });
}

/** Tells the source system to collect the current documents again; writes one history row. */
export function useNotifyExternalSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      reason: string;
    }): Promise<{ externalSystem: string }> => {
      const { data } = await axios.post(
        `/appraisals/${params.appraisalId}/documents/notify-external`,
        { reason: params.reason },
      );
      return data;
    },
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: appraisalDataCorrectionKeys.historyAll(variables.appraisalId),
      }),
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
