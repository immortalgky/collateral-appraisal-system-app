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

// ─── Holidays ─────────────────────────────────────────────────────────────────
// The business-day SLA clock skips these dates. There is no update endpoint by
// design — a wrong entry is deleted and re-added.

export interface HolidayDto {
  id: string;
  date: string; // DateOnly — "YYYY-MM-DD"
  description: string;
  year: number;
}

export interface CreateHolidayBody {
  date: string; // "YYYY-MM-DD"
  description: string;
}

export const slaHolidayKeys = {
  all: ['sla-holidays'] as const,
  list: (year?: number) => [...slaHolidayKeys.all, 'list', year ?? 'all'] as const,
};

export const useGetHolidays = (year?: number) =>
  useQuery({
    queryKey: slaHolidayKeys.list(year),
    queryFn: async (): Promise<HolidayDto[]> => {
      const { data } = await axios.get<HolidayDto[]>('/api/sla/holidays', {
        params: year ? { year } : undefined,
      });
      return data ?? [];
    },
  });

export const useCreateHoliday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateHolidayBody): Promise<HolidayDto> => {
      const { data } = await axios.post<HolidayDto>('/api/sla/holidays', body);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: slaHolidayKeys.all }),
  });
};

export const useDeleteHoliday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await axios.delete(`/api/sla/holidays/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: slaHolidayKeys.all }),
  });
};

// ─── Business hours ───────────────────────────────────────────────────────────
// A single active window (not per-weekday) plus an optional lunch break, in one
// timezone. POST is an upsert against the active row, so there is no delete.

export interface BusinessHoursDto {
  id: string;
  startTime: string; // TimeOnly — "HH:mm:ss"
  endTime: string;
  lunchStartTime: string | null;
  lunchEndTime: string | null;
  timeZone: string;
  isActive: boolean;
}

export interface UpsertBusinessHoursBody {
  startTime: string;
  endTime: string;
  timeZone: string;
  lunchStartTime?: string | null;
  lunchEndTime?: string | null;
}

export const businessHoursKeys = {
  all: ['sla-business-hours'] as const,
};

export const useGetBusinessHours = () =>
  useQuery({
    queryKey: businessHoursKeys.all,
    queryFn: async (): Promise<BusinessHoursDto | null> => {
      try {
        const { data } = await axios.get<BusinessHoursDto>('/api/sla/business-hours');
        return data;
      } catch (error: unknown) {
        // Never configured yet — the screen renders empty defaults rather than an error.
        if ((error as { response?: { status?: number } })?.response?.status === 404) return null;
        throw error;
      }
    },
  });

export const useUpsertBusinessHours = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpsertBusinessHoursBody): Promise<void> => {
      await axios.post('/api/sla/business-hours', body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: businessHoursKeys.all }),
  });
};
