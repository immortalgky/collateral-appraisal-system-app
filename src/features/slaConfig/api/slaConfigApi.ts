import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// ─── Types (mirror Workflow.Sla SlaConfigEndpoints DTOs) ──────────────────────

export type SlaPolicyScope = 1 | 2 | 3; // Activity | Stage | Workflow

// OwnClock = activity has its own deadline; WindowMember = governed by a group window.
export type ClockMode = 'OwnClock' | 'WindowMember';

// API serializes enums as strings (global JsonStringEnumConverter).
export type AnchorType = 'Assignment' | 'AppointmentDate';

export interface SlaMatrixUmbrella {
  policyId: string | null;
  workflowDefinitionId: string | null;
  durationHours: number | null;
  useBusinessDays: boolean;
  isOverride: boolean;
}

// owner = display group / OLA attribution (Shared | External | Bank)
// scenario = which mutually-exclusive case it runs in (Both | ExternalCase | InHouseCase)
export interface SlaMatrixGroup {
  policyId: string;
  startActivityKey: string;
  endActivityKey: string | null;
  middleActivityKeys: string | null;
  durationHours: number;
  useBusinessDays: boolean;
  isOverride: boolean;
  owner: string;
  scenario: string;
  // Clock anchor and activity membership
  anchorType: string | null;
  members: string[];
}

export interface SlaMatrixActivity {
  activityId: string;
  name: string;
  owner: string;
  scenario: string;
  policyId: string | null;
  durationHours: number | null;
  useBusinessDays: boolean;
  isOverride: boolean;
  coveredByGroup: boolean;
  // Clock mode and anchor fields
  anchorType: string | null;
  clockMode: ClockMode;
  governingWindow: string | null;
}

export interface SlaMatrixResponse {
  loanType: string | null;
  appraisalType: string | null;
  umbrella: SlaMatrixUmbrella;
  groups: SlaMatrixGroup[];
  activities: SlaMatrixActivity[];
}

export interface CreateSlaConfigBody {
  activityId: string;
  durationHours: number;
  useBusinessDays: boolean;
  priority: number;
  loanType?: string | null;
  appraisalType?: string | null;
  scope?: SlaPolicyScope;
  startActivityKey?: string | null;
  endActivityKey?: string | null;
  middleActivityKeys?: string | null;
  workflowDefinitionId?: string | null;
  anchorType?: string | null;
}

export interface UpdateSlaConfigBody {
  durationHours: number;
  useBusinessDays: boolean;
  priority: number;
  loanType?: string | null;
  appraisalType?: string | null;
  scope?: SlaPolicyScope;
  startActivityKey?: string | null;
  endActivityKey?: string | null;
  middleActivityKeys?: string | null;
  workflowDefinitionId?: string | null;
  anchorType?: string | null;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const slaConfigKeys = {
  all: ['sla-configurations'] as const,
  matrix: (loanType: string, appraisalType: string) =>
    [...slaConfigKeys.all, 'matrix', loanType, appraisalType] as const,
};

// Override rows seed below the universal defaults so the specific cell wins.
export const OVERRIDE_PRIORITY = 50;

// ─── GET /api/sla/configurations/matrix?loanType=&appraisalType= ──────────────

export const useGetSlaMatrix = (loanType: string, appraisalType: string) =>
  useQuery({
    queryKey: slaConfigKeys.matrix(loanType, appraisalType),
    enabled: !!loanType && !!appraisalType,
    queryFn: async (): Promise<SlaMatrixResponse> => {
      const { data } = await axios.get<SlaMatrixResponse>('/api/sla/configurations/matrix', {
        params: { loanType, appraisalType },
      });
      return data;
    },
  });

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useCreateSlaPolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSlaConfigBody): Promise<void> => {
      await axios.post('/api/sla/configurations', body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: slaConfigKeys.all }),
  });
};

export const useUpdateSlaPolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateSlaConfigBody }): Promise<void> => {
      await axios.put(`/api/sla/configurations/${id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: slaConfigKeys.all }),
  });
};

export const useDeleteSlaPolicy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.delete(`/api/sla/configurations/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: slaConfigKeys.all }),
  });
};
