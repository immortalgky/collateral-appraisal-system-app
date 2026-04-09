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
  members: ApprovalMember[];
  conditions: ApprovalCondition[];
  meetingRef: ApprovalMeetingRef | null;
}

// ==================== Query Keys ====================

export const decisionSummaryKeys = {
  detail: (appraisalId: string) => ['appraisal', appraisalId, 'decision-summary'] as const,
  approvalList: (workflowInstanceId: string, activityId: string) =>
    ['workflow', workflowInstanceId, 'activity', activityId, 'approval-list'] as const,
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
 * Get workflow-scoped approval list with polling.
 * GET /api/workflows/instances/{workflowInstanceId}/activities/{activityId}/approval-list
 *
 * Polls every 10s while the approval is still pending (quorum + majority not
 * yet met AND no member has voted `route_back`) so peer votes surface without
 * a manual refresh.
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
      const routedBack = data.members.some(m => m.vote === 'route_back');
      const decided = (data.quorumMet && data.majorityMet) || routedBack;
      return decided ? false : 10_000;
    },
  });
};
