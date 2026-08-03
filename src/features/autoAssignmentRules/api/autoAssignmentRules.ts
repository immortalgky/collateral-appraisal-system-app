import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// ──────────────────────────────────────────────────────────────────────────────
// Types — mirror Workflow.Services.Configuration.Models.AutoAssignmentRuleModels
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Where a matching appraisal is routed at initial-routing.
 * Must stay in sync with `RoutingDecisions` in
 * `Modules/Workflow/Workflow/Data/Entities/AutoAssignmentRule.cs`.
 */
export const ROUTING_DECISIONS = [
  {
    value: 'AdminReview',
    label: 'Admin review',
    hint: 'Stop at appraisal-assignment so an internal admin decides.',
  },
  { value: 'Internal', label: 'Internal appraiser', hint: 'Straight to int-appraisal-execution.' },
  {
    value: 'ExternalRoundRobin',
    label: 'External round-robin',
    hint: 'Weighted round-robin over the configured company pool.',
  },
  { value: 'Pma', label: 'PMA flow', hint: 'PMA property input first.' },
] as const;

export type RoutingDecision = (typeof ROUTING_DECISIONS)[number]['value'];

export interface AutoAssignmentRuleDto {
  id: string;
  ruleName: string;
  priority: number;
  isActive: boolean;
  /** CSV filters — null/empty means the rule does not constrain that dimension. */
  channels: string | null;
  entrySources: string | null;
  loanTypes: string | null;
  priorities: string | null;
  minFacilityLimit: number | null;
  maxFacilityLimit: number | null;
  conditionExpression: string | null;
  routingDecision: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface SaveAutoAssignmentRuleBody {
  ruleName: string;
  priority: number;
  routingDecision: string;
  channels?: string | null;
  entrySources?: string | null;
  loanTypes?: string | null;
  priorities?: string | null;
  minFacilityLimit?: number | null;
  maxFacilityLimit?: number | null;
  conditionExpression?: string | null;
  isActive: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────────────────────────────────────────

const BASE = '/api/workflow/auto-assignment-rules';

export const autoAssignmentRuleKeys = {
  all: ['auto-assignment-rules'] as const,
  list: () => [...autoAssignmentRuleKeys.all, 'list'] as const,
};

// ──────────────────────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────────────────────

export const useListAutoAssignmentRules = () =>
  useQuery({
    queryKey: autoAssignmentRuleKeys.list(),
    queryFn: async (): Promise<AutoAssignmentRuleDto[]> => {
      const { data } = await axios.get<AutoAssignmentRuleDto[]>(BASE);
      return data ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateAutoAssignmentRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: SaveAutoAssignmentRuleBody): Promise<AutoAssignmentRuleDto> => {
      const { data } = await axios.post<AutoAssignmentRuleDto>(BASE, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: autoAssignmentRuleKeys.all }),
  });
};

export const useUpdateAutoAssignmentRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: SaveAutoAssignmentRuleBody;
    }): Promise<AutoAssignmentRuleDto> => {
      const { data } = await axios.put<AutoAssignmentRuleDto>(`${BASE}/${id}`, body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: autoAssignmentRuleKeys.all }),
  });
};

export const useDeleteAutoAssignmentRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.delete(`${BASE}/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: autoAssignmentRuleKeys.all }),
  });
};
