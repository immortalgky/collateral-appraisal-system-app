import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// Mirrors Common.Application.Features.JobSchedules.JobScheduleDto
export interface JobScheduleDto {
  jobId: string;
  /** Owning module, derived from the DbContext name (e.g. "Appraisal"). */
  module: string;
  /** The cron actually in force — the stored row, else the code default. */
  effectiveCron: string;
  defaultCron: string;
  isOverridden: boolean;
  /** Stored override; null means "use the application timezone". */
  timeZoneId: string | null;
  effectiveTimeZoneId: string;
  isEnabled: boolean;
  description: string | null;
  /** False when no override row exists yet (startup seeds one per known job). */
  hasRow: boolean;
}

export interface UpdateJobScheduleBody {
  cronExpression: string;
  timeZoneId?: string | null;
  isEnabled: boolean;
}

const BASE = '/admin/job-schedules';

export const jobScheduleKeys = {
  all: ['job-schedules'] as const,
  list: () => [...jobScheduleKeys.all, 'list'] as const,
};

export const useListJobSchedules = () =>
  useQuery({
    queryKey: jobScheduleKeys.list(),
    queryFn: async (): Promise<JobScheduleDto[]> => {
      const { data } = await axios.get<JobScheduleDto[]>(BASE);
      return data ?? [];
    },
    staleTime: 30_000,
  });

export const useUpdateJobSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      body,
    }: {
      jobId: string;
      body: UpdateJobScheduleBody;
    }): Promise<JobScheduleDto> => {
      const { data } = await axios.put<JobScheduleDto>(
        `${BASE}/${encodeURIComponent(jobId)}`,
        body,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: jobScheduleKeys.all }),
  });
};
