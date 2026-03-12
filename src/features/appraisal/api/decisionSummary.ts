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
export type GetApprovalListResponse = z.infer<typeof schemas.GetApprovalListResponse>;
export type ApprovalListItem = z.infer<typeof schemas.ApprovalListItem>;
export type AssignCommitteeResponse = z.infer<typeof schemas.AssignCommitteeResponse>;
export type SubmitVoteRequest = z.infer<typeof schemas.SubmitVoteRequest>;
export type SubmitVoteResponse = z.infer<typeof schemas.SubmitVoteResponse>;

// ==================== Query Keys ====================

export const decisionSummaryKeys = {
  detail: (appraisalId: string) => ['appraisal', appraisalId, 'decision-summary'] as const,
  approvalList: (appraisalId: string) => ['appraisal', appraisalId, 'approval-list'] as const,
};

// ==================== Queries ====================

/**
 * Fetch decision summary data
 * GET /appraisals/{appraisalId}/decision-summary
 */
export const useGetDecisionSummary = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: decisionSummaryKeys.detail(appraisalId!),
    queryFn: async (): Promise<GetDecisionSummaryResponse> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/decision-summary`);
      return data;
    },
    enabled: !!appraisalId,
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
      const { data } = await axios.post(
        `/appraisals/${appraisalId}/decision-summary`,
        body,
      );
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
 * Get approval list with polling
 * GET /appraisals/{appraisalId}/approval-list
 */
export const useGetApprovalList = (appraisalId: string | undefined) => {
  return useQuery({
    queryKey: decisionSummaryKeys.approvalList(appraisalId!),
    queryFn: async (): Promise<GetApprovalListResponse> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/approval-list`);
      return data;
    },
    enabled: !!appraisalId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.reviewStatus === 'Pending') return 10_000;
      return false;
    },
  });
};

/**
 * Assign committee
 * POST /appraisals/{appraisalId}/reviews/assign-committee
 */
export const useAssignCommittee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appraisalId }: { appraisalId: string }): Promise<AssignCommitteeResponse> => {
      const { data } = await axios.post(`/appraisals/${appraisalId}/reviews/assign-committee`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: decisionSummaryKeys.approvalList(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: decisionSummaryKeys.detail(variables.appraisalId),
      });
    },
  });
};

/**
 * Submit vote
 * POST /appraisals/{appraisalId}/reviews/{reviewId}/votes
 */
export const useSubmitVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appraisalId,
      reviewId,
      body,
    }: {
      appraisalId: string;
      reviewId: string;
      body: SubmitVoteRequest;
    }): Promise<SubmitVoteResponse> => {
      const { data } = await axios.post(
        `/appraisals/${appraisalId}/reviews/${reviewId}/votes`,
        body,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: decisionSummaryKeys.approvalList(variables.appraisalId),
      });
      queryClient.invalidateQueries({
        queryKey: decisionSummaryKeys.detail(variables.appraisalId),
      });
    },
  });
};
