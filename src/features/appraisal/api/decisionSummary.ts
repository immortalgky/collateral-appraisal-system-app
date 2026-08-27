import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { z } from 'zod';
import { schemas } from '@shared/schemas/v1';

// ==================== Types ====================

export type GetDecisionSummaryResponse = z.infer<typeof schemas.GetDecisionSummaryResponse>;
export type SaveDecisionSummaryRequest = z.infer<typeof schemas.SaveDecisionSummaryRequest>;
export type SaveDecisionSummaryResponse = z.infer<typeof schemas.SaveDecisionSummaryResponse>;
export type ApproachMatrixGroup = z.infer<typeof schemas.ApproachMatrixGroup>;
export type ApproachItem = z.infer<typeof schemas.ApproachItem>;
export type GovernmentPriceRow = z.infer<typeof schemas.GovernmentPriceRow>;

/**
 * Condo government appraisal price row, priced per Sq.M. (land rows are priced
 * per Sq.Wa — the two are separate lists with separate totals, never merged).
 *
 * Hand-typed here alongside `governmentPriceSurveyedArea` below until
 * `@shared/schemas/v1.ts` is regenerated to include it.
 */
export interface CondoGovernmentPriceRow {
  titleNumber: string | null;
  roomNumber: string | null;
  isMissingFromSurvey: boolean | null;
  usableArea: number | null;
  governmentPricePerSqm: number | null;
  governmentPrice: number | null;
}

/**
 * Block appraisal types.
 *
 * `isBlock`, `blockApproachMatrix`, and `blockModelPrices` are new fields on
 * `GetDecisionSummaryResponse` added for the block-appraisal valuation refactor.
 * Hand-typed here until v1.ts is regenerated from the updated OpenAPI spec.
 */
export interface BlockApproachMatrixRow {
  projectModelId: string;
  modelName: string | null;
  marketValue: number | null;
  costValue: number | null;
  incomeValue: number | null;
  residualValue: number | null;
  /** "Market" | "Cost" | "Income" | "Residual" | null */
  selectedApproach: string | null;
  modelTotalAppraisalPrice: number;
}

export interface BlockModelPriceRow {
  projectModelId: string;
  modelName: string | null;
  unitCount: number;
  totalAppraisalPrice: number;
  forceSellingPrice: number;
  buildingInsurance: number;
}

export interface ConstructionSummaryRow {
  label: string;
  constructionProgressPct: number;
  totalAppraisalValue: number;
  totalLandValue: number;
  totalBuildingValue: number;
  buildingValueConstructing: number;
}

export interface ConstructionBuildingRow {
  appraisalPropertyId: string;
  houseNumber: string | null;
  titleNumber: string | null;
  modelName: string | null;
  totalValue: number; // CI value at 100%
  previousValue: number;
  currentValue: number;
  previousProgressPct: number;
  currentProgressPct: number;
}

export interface ConstructionCompletedBuildingRow {
  appraisalPropertyId: string;
  houseNumber: string | null;
  titleNumber: string | null;
  modelName: string | null;
  appraisalValue: number;
}

export interface ConstructionSummary {
  village: string | null;
  rows: ConstructionSummaryRow[];
  buildings: ConstructionBuildingRow[];
  completedBuildings: ConstructionCompletedBuildingRow[];
}

/**
 * Augments the auto-generated `GetDecisionSummaryResponse` with block-appraisal
 * and construction-summary fields that v1.ts has not yet picked up.
 */
export type DecisionSummaryData = GetDecisionSummaryResponse & {
  isBlock: boolean;
  blockApproachMatrix: BlockApproachMatrixRow[] | null;
  blockModelPrices: BlockModelPriceRow[] | null;
  constructionSummary: ConstructionSummary | null;
  appraisalDate: string | null;
  /**
   * Percent (e.g. 70, not 0.7) used to derive `forceSellingPrice` — RESOLVED (override if set,
   * else the system-wide default). Always present, never null. Display only — do NOT bind a
   * form field to this; bind to `forceSellingRateOverride` instead.
   */
  forceSellingRate: number;
  /**
   * The raw per-appraisal override, or null when the appraisal has no override and is
   * inheriting `forceSellingRate` from the system-wide default. This is the field the
   * decision-summary form edits; POSTing null clears the override.
   */
  forceSellingRateOverride: number | null;
  /** Non-missing land area the AVG Baht/Sq.Wa is computed over (govTotalArea includes missing). */
  governmentPriceSurveyedArea: number;
  /** Condo government appraisal prices (Sq.M.) — separate from the land list above. */
  condoGovernmentPrices: CondoGovernmentPriceRow[];
  condoGovernmentPriceTotalArea: number;
  /** Server-computed area-weighted average (totalPrice / totalArea) — do not recompute client-side. */
  condoGovernmentPriceAvgPerSqm: number;
};

/**
 * Workflow-scoped approval list types.
 *
 * The canonical shape lives in the backend's
 * `GetApprovalListEndpoint` projection. The auto-generated zod schemas in
 * `@shared/schemas/v1.ts` lag behind the new workflow-scoped endpoint, so we
 * hand-type the response here until the generator catches up.
 */
export interface ApprovalMember {
  username: string;
  role: string;
  status: 'Voted' | 'Pending';
  vote: string | null;
  comments: string | null;
  votedAt: string | null;
  isCurrentUser: boolean;
}

export interface ApprovalCondition {
  conditionType: 'RoleRequired' | 'MinVotes';
  roleRequired: string | null;
  minVotesRequired: number | null;
  met: boolean;
}

export interface ApprovalMeetingRef {
  meetingId: string;
  title: string;
  scheduledAt: string | null;
  endedAt: string | null;
}

export interface GetApprovalListResponse {
  activityId: string;
  committeeName: string | null;
  committeeCode: string | null;
  tier: number | null;
  totalMembers: number;
  votesReceived: number;
  quorumMet: boolean;
  majorityMet: boolean;
  /** Authoritative, voting-mode-aware round status. Use this rather than re-deriving from
   *  quorumMet/majorityMet (which is not WaitForAll-aware). */
  status: 'Approved' | 'Returned' | 'Pending';
  members: ApprovalMember[];
  conditions: ApprovalCondition[];
  meetingRef: ApprovalMeetingRef | null;
}

// ==================== Query Keys ====================

export const decisionSummaryKeys = {
  detail: (appraisalId: string) => ['appraisal', appraisalId, 'decision-summary'] as const,
  approvalList: (workflowInstanceId: string, activityId: string) =>
    ['workflow', workflowInstanceId, 'activity', activityId, 'approval-list'] as const,
  approvalHistory: (appraisalId: string, activityId: string) =>
    ['appraisal', appraisalId, 'approval-history', activityId] as const,
};

// ==================== Queries ====================

/**
 * Fetch decision summary data
 * GET /appraisals/{appraisalId}/decision-summary
 */
export const useGetDecisionSummary = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: decisionSummaryKeys.detail(appraisalId!),
    queryFn: async (): Promise<DecisionSummaryData> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/decision-summary`);
      return data;
    },
    enabled: !!appraisalId,
    staleTime: 0,
  });
};

// ==================== Mutations ====================

/**
 * Save decision summary
 * POST /appraisals/{appraisalId}/decision-summary
 */
export const useSaveDecisionSummary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      body,
    }: {
      appraisalId: string;
      body: SaveDecisionSummaryRequest;
    }): Promise<SaveDecisionSummaryResponse> => {
      const { data } = await axios.post(`/appraisals/${appraisalId}/decision-summary`, body);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: decisionSummaryKeys.detail(variables.appraisalId),
      });
    },
  });
};

/**
 * Update the Force Selling Price rate override.
 * PUT /appraisals/{appraisalId}/decision-summary/force-sale-rate
 *
 * Dedicated single-writer endpoint — the whole-form `useSaveDecisionSummary` no longer
 * sends `forceSellingRateOverride`. Persisted on blur (see DecisionSummaryPage) so the
 * stored ForcedSaleValue that feeds reports/AS400 never drifts from what the screen shows.
 * `null` clears the override back to the system-wide default.
 */
export const useUpdateForceSaleRate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      forceSellingRateOverride,
    }: {
      appraisalId: string;
      forceSellingRateOverride: number | null;
    }): Promise<void> => {
      await axios.put(`/appraisals/${appraisalId}/decision-summary/force-sale-rate`, {
        forceSellingRateOverride,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: decisionSummaryKeys.detail(variables.appraisalId),
      });
    },
  });
};

/**
 * Get workflow-scoped approval list with polling.
 * GET /api/workflows/instances/{workflowInstanceId}/activities/{activityId}/approval-list
 *
 * Polls every 10s while the round is still pending (backend-authoritative status),
 * so peer votes surface without a manual refresh.
 */
export const useGetApprovalList = (
  workflowInstanceId: string | undefined,
  activityId: string | undefined,
) => {
  return useQuery({
    queryKey: decisionSummaryKeys.approvalList(workflowInstanceId!, activityId!),
    queryFn: async (): Promise<GetApprovalListResponse> => {
      const { data } = await axios.get(
        `/api/workflows/instances/${workflowInstanceId}/activities/${activityId}/approval-list`,
      );
      return data;
    },
    enabled: !!workflowInstanceId && !!activityId,
    refetchInterval: query => {
      const data = query.state.data;
      if (!data) return false;
      // Stop polling once the round has resolved (Approved or Returned); keep polling while Pending.
      return data.status !== 'Pending' ? false : 10_000;
    },
  });
};

/**
 * Fetch immutable approval vote history for a completed appraisal.
 * GET /api/appraisals/{appraisalId}/approval-history?activityId={activityId}
 *
 * Returns 404 when no votes exist (e.g. workflow cancelled before approval).
 * No polling — history never changes after the workflow ends.
 */
export const useGetApprovalHistory = (
  appraisalId: string | undefined,
  activityId: string | undefined,
) => {
  return useQuery({
    queryKey: decisionSummaryKeys.approvalHistory(appraisalId!, activityId!),
    queryFn: async (): Promise<GetApprovalListResponse> => {
      const { data } = await axios.get(`/api/appraisals/${appraisalId}/approval-history`, {
        params: { activityId },
      });
      return data;
    },
    enabled: !!appraisalId && !!activityId,
    // History is immutable and a 404 (no votes / cancelled appraisal) is an
    // expected outcome that hides the card — don't retry it.
    retry: false,
  });
};
