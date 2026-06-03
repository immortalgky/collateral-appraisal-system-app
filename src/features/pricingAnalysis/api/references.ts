import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { pricingAnalysisKeys } from './queryKeys';

// ── SubjectType enum (mirrors backend PricingAnalysisSubjectType) ──────────────
export const PricingAnalysisSubjectType = {
  PropertyGroup: 0,
  ProjectModel: 1,
  MachineryCostRef: 2,
  IncomeLandRef: 3,
  LeaseholdLandRef: 4,
  RoomIncomeRef: 5,
  ProfitRentRef: 6,
} as const;

export type PricingAnalysisSubjectType =
  (typeof PricingAnalysisSubjectType)[keyof typeof PricingAnalysisSubjectType];

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreateOrGetReferenceRequest {
  subjectType: PricingAnalysisSubjectType;
  anchorId: string;
  anchorRefKey?: string | null;
  hostMethodId?: string | null;
}

export interface CreateOrGetReferenceResponse {
  pricingAnalysisId: string;
  marketApproachId: string;
  wasCreated: boolean;
}

export interface ReferenceMethodDto {
  methodId: string;
  methodType: string;
  finalValue: number | null;
  valuePerUnit: number | null;
}

export interface ReferenceDto {
  pricingAnalysisId: string;
  subjectType: PricingAnalysisSubjectType;
  anchorId: string;
  anchorRefKey: string | null;
  hostMethodId: string | null;
  status: string;
  methods: ReferenceMethodDto[];
}

export interface GetReferencesResponse {
  references: ReferenceDto[];
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * GET /pricing-analysis/references?subjectType=&anchorId=&anchorRefKey=
 * Returns all saved reference analyses for an anchor.
 */
export function useGetReferences(
  subjectType: PricingAnalysisSubjectType | undefined,
  anchorId: string | undefined,
  anchorRefKey?: string | null,
) {
  return useQuery({
    queryKey: pricingAnalysisKeys.references(subjectType ?? 0, anchorId ?? '', anchorRefKey),
    queryFn: async (): Promise<GetReferencesResponse> => {
      const params: Record<string, string> = {
        subjectType: String(subjectType),
        anchorId: anchorId!,
      };
      if (anchorRefKey != null) {
        params.anchorRefKey = anchorRefKey;
      }
      const { data } = await axios.get('/pricing-analysis/references', { params });
      return data as GetReferencesResponse;
    },
    enabled: subjectType != null && !!anchorId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
  });
}

/**
 * POST /pricing-analysis/references
 * Idempotent: finds or creates a reference PricingAnalysis (with a Market approach).
 */
export function useCreateOrGetReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateOrGetReferenceRequest,
    ): Promise<CreateOrGetReferenceResponse> => {
      const { data } = await axios.post('/pricing-analysis/references', request);
      return data as CreateOrGetReferenceResponse;
    },
    onSuccess: (_data, variables) => {
      // Invalidate the list so the new reference appears immediately
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.references(
          variables.subjectType,
          variables.anchorId,
          variables.anchorRefKey,
        ),
      });
    },
  });
}

/**
 * GET /pricing-analysis/{pricingAnalysisId}/references
 * Returns all reference analyses whose HostMethodId belongs to the group's pricing analysis.
 */
export function useGetGroupReferences(pricingAnalysisId: string | undefined) {
  return useQuery({
    queryKey: pricingAnalysisKeys.groupReferences(pricingAnalysisId ?? ''),
    queryFn: async (): Promise<GetReferencesResponse> => {
      const { data } = await axios.get(`/pricing-analysis/${pricingAnalysisId}/references`);
      return data as GetReferencesResponse;
    },
    enabled: !!pricingAnalysisId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
  });
}

/**
 * DELETE /pricing-analysis/{pricingAnalysisId}
 * Deletes a reference analysis entirely.
 * (The backend already exposes a delete-pricing-analysis endpoint; we reuse it.)
 */
export function useDeleteReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pricingAnalysisId,
    }: {
      pricingAnalysisId: string;
      subjectType: PricingAnalysisSubjectType;
      anchorId: string;
      anchorRefKey?: string | null;
      /** Group PA id — when provided, also invalidates the group references list. */
      groupPricingAnalysisId?: string;
    }): Promise<void> => {
      await axios.delete(`/pricing-analysis/${pricingAnalysisId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.references(
          variables.subjectType,
          variables.anchorId,
          variables.anchorRefKey,
        ),
      });
      if (variables.groupPricingAnalysisId) {
        queryClient.invalidateQueries({
          queryKey: pricingAnalysisKeys.groupReferences(variables.groupPricingAnalysisId),
        });
      }
    },
  });
}
