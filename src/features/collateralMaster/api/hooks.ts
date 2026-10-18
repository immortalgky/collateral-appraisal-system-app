import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { collateralMasterKeys } from './keys';
import type {
  BackfillReportPage,
  CollateralCatalogPage,
  CollateralCatalogParams,
  CollateralEngagementSnapshotDto,
  CollateralEngagementSummaryDto,
  CollateralLookupParams,
  CollateralLookupResult,
  CollateralMasterDto,
  ConstructionInspectionWorkDetailsDto,
  EditCollateralMasterBody,
  HostCollateralIdBackfillResponse,
  InProgressAppraisalDto,
  RestoreBody,
  SoftDeleteBody,
} from './types';

// ─── GET /collateral-masters/lookup ──────────────────────────────────────────

/**
 * The lookup as a query, fetched once by the request's title drawer on save (`fetchQuery`), so a
 * repeat of the same key reuses the cached answer. Returns null on a miss (404).
 */
export const lookupCollateralMasterOptions = (params: CollateralLookupParams) => ({
  queryKey: collateralMasterKeys.lookup(params),
  queryFn: async (): Promise<CollateralLookupResult | null> => {
    try {
      const { data } = await axios.get<CollateralLookupResult>('/collateral-masters/lookup', {
        params: flattenLookupParams(params),
      });
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },
  staleTime: 5 * 60_000,
  // Informational: a failure is read as no match, not retried
  retry: false,
});

// ─── GET /appraisals/in-progress-by-collateral ───────────────────────────────

/**
 * Appraisals still open on the same key as the lookup (same params). Empty means none. Errors
 * throw: callers treat them as "none" (the check only warns, it never blocks).
 */
export const inProgressByCollateralOptions = (params: CollateralLookupParams) => ({
  queryKey: collateralMasterKeys.inProgress(params),
  queryFn: async (): Promise<InProgressAppraisalDto[]> => {
    const { data } = await axios.get<InProgressAppraisalDto[]>(
      '/appraisals/in-progress-by-collateral',
      { params: flattenLookupParams(params) },
    );
    return Array.isArray(data) ? data : [];
  },
  staleTime: 60_000,
  retry: false,
});

/** Flatten the discriminated union params into a flat query-string object */
function flattenLookupParams(params: CollateralLookupParams): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params as unknown as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== '') flat[k] = String(v);
  }
  return flat;
}

// ─── GET /collateral-masters/{id} ────────────────────────────────────────────

export const useCollateralMaster = (id: string | null | undefined) => {
  return useQuery({
    queryKey: collateralMasterKeys.detail(id ?? ''),
    queryFn: async (): Promise<CollateralMasterDto> => {
      const { data } = await axios.get<CollateralMasterDto>(`/collateral-masters/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
};

// ─── GET /collateral-masters (catalog, admin) ─────────────────────────────────

export const useCollateralCatalog = (params: CollateralCatalogParams = {}) => {
  return useQuery({
    queryKey: collateralMasterKeys.catalog(params),
    queryFn: async (): Promise<CollateralCatalogPage> => {
      const { data } = await axios.get<CollateralCatalogPage>('/collateral-masters', {
        params: {
          ...(params.type && { type: params.type }),
          ...(params.province && { province: params.province }),
          ...(params.owner && { owner: params.owner }),
          ...(params.isUnderConstruction != null && {
            isUnderConstruction: params.isUnderConstruction,
          }),
          ...(params.minAppraisals != null && { minAppraisals: params.minAppraisals }),
          ...(params.lastAppraisedFrom && { lastAppraisedFrom: params.lastAppraisedFrom }),
          ...(params.lastAppraisedTo && { lastAppraisedTo: params.lastAppraisedTo }),
          page: params.page ?? 0,
          pageSize: params.pageSize ?? 20,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};

// ─── GET /collateral-masters/{id}/engagements ─────────────────────────────────

export const useCollateralEngagements = (
  masterId: string | null | undefined,
  page = 0,
  pageSize = 10,
) => {
  return useQuery({
    queryKey: [...collateralMasterKeys.engagements(masterId ?? ''), { page, pageSize }],
    queryFn: async (): Promise<{
      items: CollateralEngagementSummaryDto[];
      count: number;
      pageNumber: number;
      pageSize: number;
    }> => {
      const { data } = await axios.get(`/collateral-masters/${masterId}/engagements`, {
        params: { page, pageSize },
      });
      return data;
    },
    enabled: !!masterId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
};

// ─── GET /collateral-masters/{id}/engagements/{engagementId} ─────────────────

export const useEngagementSnapshot = (
  masterId: string | null | undefined,
  engagementId: string | null | undefined,
) => {
  return useQuery({
    queryKey: collateralMasterKeys.engagement(masterId ?? '', engagementId ?? ''),
    queryFn: async (): Promise<CollateralEngagementSnapshotDto> => {
      const { data } = await axios.get(
        `/collateral-masters/${masterId}/engagements/${engagementId}`,
      );
      return data;
    },
    enabled: !!masterId && !!engagementId,
    staleTime: 60_000,
  });
};

// ─── PATCH /collateral-masters/{id} ──────────────────────────────────────────

export const useEditCollateralMaster = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: EditCollateralMasterBody }) => {
      const { data } = await axios.patch(`/collateral-masters/${id}`, body);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: collateralMasterKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: collateralMasterKeys.catalogs() });
    },
  });
};

// ─── DELETE /collateral-masters/{id} ─────────────────────────────────────────

export const useSoftDeleteCollateralMaster = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await axios.delete(`/collateral-masters/${id}`, {
        params: { reason },
      });
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: collateralMasterKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: collateralMasterKeys.catalogs() });
    },
  });
};

// ─── POST /collateral-masters/{id}/restore ───────────────────────────────────

export const useRestoreCollateralMaster = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: RestoreBody }) => {
      const { data } = await axios.post(`/collateral-masters/${id}/restore`, body);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: collateralMasterKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: collateralMasterKeys.catalogs() });
    },
  });
};

// ─── POST /collateral-masters/admin/backfill ──────────────────────────────────

export const useStartBackfill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.post('/collateral-masters/admin/backfill');
      return data as { jobId?: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collateralMasterKeys.backfillReports() });
    },
  });
};

// ─── GET /collateral-masters/admin/backfill-report ───────────────────────────

export const useGetBackfillReport = (
  params: { status?: string; page?: number; pageSize?: number } = {},
) => {
  return useQuery({
    queryKey: collateralMasterKeys.backfillReport(params),
    queryFn: async (): Promise<BackfillReportPage> => {
      const { data } = await axios.get('/collateral-masters/admin/backfill-report', {
        params: {
          ...(params.status && { status: params.status }),
          page: params.page ?? 0,
          pageSize: params.pageSize ?? 20,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
};

// ─── POST /collateral-masters/admin/replay/{appraisalId} ─────────────────────

export const useReplayBackfill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appraisalId: string) => {
      const { data } = await axios.post(`/collateral-masters/admin/replay/${appraisalId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collateralMasterKeys.backfillReports() });
      queryClient.invalidateQueries({ queryKey: collateralMasterKeys.catalogs() });
    },
  });
};

// ─── POST /collateral-masters/admin/backfill-host-collateral-id ──────────────

/**
 * Fire-and-forget admin trigger that backfills the AS400 HostCollateralId onto
 * collateral masters. There is no polling/status endpoint — results are
 * observed server-side (logs), so this mutation just confirms the job started.
 */
export const useBackfillHostCollateralId = () => {
  return useMutation({
    mutationFn: async (): Promise<HostCollateralIdBackfillResponse> => {
      const { data } = await axios.post<HostCollateralIdBackfillResponse>(
        '/collateral-masters/admin/backfill-host-collateral-id',
      );
      return data;
    },
  });
};

// ─── GET /appraisal/construction-inspections/{inspectionId}/work-details ──────

/**
 * Fetch prior construction work details for Progressive appraisal prefill.
 */
export const useConstructionInspectionWorkDetails = (inspectionId: string | null | undefined) => {
  return useQuery({
    queryKey: collateralMasterKeys.inspectionWorkDetails(inspectionId ?? ''),
    queryFn: async (): Promise<ConstructionInspectionWorkDetailsDto> => {
      const { data } = await axios.get(
        `/appraisal/construction-inspections/${inspectionId}/work-details`,
      );
      return data;
    },
    enabled: !!inspectionId,
    staleTime: 60_000,
    retry: false, // 404 means inspection was deleted — UI handles gracefully
  });
};

// ─── Unused body type re-export ───────────────────────────────────────────────

export type { SoftDeleteBody };
