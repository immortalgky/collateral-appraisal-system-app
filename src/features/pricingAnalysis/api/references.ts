import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
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

// The API serializes enums as their STRING name (global JsonStringEnumConverter),
// so `subjectType` arrives as e.g. "IncomeLandRef" — but the rest of the FE
// compares it against the numeric enum. Normalize string → number on read so
// label derivation and manualSubject detection work.
const SUBJECT_TYPE_NAME_TO_VALUE: Record<string, PricingAnalysisSubjectType> = {
  PropertyGroup: 0,
  ProjectModel: 1,
  MachineryCostRef: 2,
  IncomeLandRef: 3,
  LeaseholdLandRef: 4,
  RoomIncomeRef: 5,
  ProfitRentRef: 6,
};

export function normalizeSubjectType(raw: unknown): PricingAnalysisSubjectType {
  if (typeof raw === 'number') return raw as PricingAnalysisSubjectType;
  if (typeof raw === 'string') {
    if (Object.prototype.hasOwnProperty.call(SUBJECT_TYPE_NAME_TO_VALUE, raw))
      return SUBJECT_TYPE_NAME_TO_VALUE[raw];
    const asNum = Number(raw);
    if (!Number.isNaN(asNum)) return asNum as PricingAnalysisSubjectType;
  }
  return 0 as PricingAnalysisSubjectType;
}

function normalizeReferencesResponse(data: GetReferencesResponse): GetReferencesResponse {
  return {
    references: (data.references ?? []).map(r => ({
      ...r,
      subjectType: normalizeSubjectType(r.subjectType),
    })),
  };
}

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

async function fetchReferences(
  subjectType: PricingAnalysisSubjectType,
  anchorId: string,
  anchorRefKey?: string | null,
): Promise<GetReferencesResponse> {
  const params: Record<string, string> = {
    subjectType: String(subjectType),
    anchorId,
  };
  if (anchorRefKey != null) {
    params.anchorRefKey = anchorRefKey;
  }
  const { data } = await axios.get('/pricing-analysis/references', { params });
  return normalizeReferencesResponse(data as GetReferencesResponse);
}

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
    queryFn: () => fetchReferences(subjectType!, anchorId!, anchorRefKey),
    enabled: subjectType != null && !!anchorId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
  });
}

/**
 * The same query as useGetReferences, for MANY anchors at once — one machine per anchor.
 *
 * Deliberately built on the SAME key factory call that useGetReferences uses (anchorRefKey
 * omitted, which the factory stores as null), so the per-cell WQS buttons and any bulk view
 * read and write one cache entry per machine rather than two competing ones: open the bulk
 * dialog and every machine's saved references are already there, and a value applied through
 * either route leaves the other's badge count correct.
 *
 * `enabled` is what keeps this honest — passing the dialog's open state means a table of 40
 * machines issues no requests at all until someone actually asks for the bulk picker.
 */
export function useGetReferencesForAnchors(
  subjectType: PricingAnalysisSubjectType,
  anchorIds: string[],
  enabled = true,
) {
  return useQueries({
    queries: anchorIds.map(anchorId => ({
      queryKey: pricingAnalysisKeys.references(subjectType, anchorId, null),
      queryFn: () => fetchReferences(subjectType, anchorId),
      enabled: enabled && !!anchorId,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000,
    })),
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

// ── CreateReferenceFromMethod ─────────────────────────────────────────────────

export interface CreateReferenceFromMethodRequest {
  subjectType: PricingAnalysisSubjectType;
  anchorId: string;
  hostMethodId: string;
  sourcePricingAnalysisId: string;
  sourceMethodId: string;
  landAreaOverride?: number | null;
}

/**
 * POST /pricing-analysis/references/from-method
 * Clones a Cost-approach method into a new IncomeLandRef reference (idempotent).
 */
export function useCreateReferenceFromMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateReferenceFromMethodRequest,
    ): Promise<CreateOrGetReferenceResponse> => {
      const { data } = await axios.post('/pricing-analysis/references/from-method', request);
      return data as CreateOrGetReferenceResponse;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.references(variables.subjectType, variables.anchorId, null),
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
      return normalizeReferencesResponse(data as GetReferencesResponse);
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
