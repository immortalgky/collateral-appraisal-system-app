import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from './dashboardApi';
import type { NotesResponse } from './types';

const DASHBOARD_STALE_TIME = 30 * 1000; // 30 seconds

export type AppraisalCountsFilters = {
  period?: string;
  from?: string;
  to?: string;
};

export type AppraisalStatusSummaryFilters = {
  from?: string;
  to?: string;
  assigneeId?: string;
  bankingSegment?: string;
};

export type TeamWorkloadFilters = {
  from?: string;
  to?: string;
};

export type CompanyAppraisalSummaryFilters = {
  from?: string;
  to?: string;
};

export const dashboardKeys = {
  all: ['dashboard'] as const,
  taskSummary: () => [...dashboardKeys.all, 'task-summary'] as const,
  appraisalCounts: (filters: AppraisalCountsFilters) =>
    [...dashboardKeys.all, 'appraisal-counts', filters] as const,
  appraisalStatusSummary: (filters: AppraisalStatusSummaryFilters = {}) =>
    [...dashboardKeys.all, 'appraisal-status-summary', filters] as const,
  teamWorkload: (filters: TeamWorkloadFilters = {}) =>
    [...dashboardKeys.all, 'team-workload', filters] as const,
  companyAppraisalSummary: (filters: CompanyAppraisalSummaryFilters = {}) =>
    [...dashboardKeys.all, 'company-appraisal-summary', filters] as const,
  reminders: () => [...dashboardKeys.all, 'reminders'] as const,
  calendar: (month: string) => [...dashboardKeys.all, 'calendar', month] as const,
  notes: () => [...dashboardKeys.all, 'notes'] as const,
};

export const useTaskSummary = () => {
  return useQuery({
    queryKey: dashboardKeys.taskSummary(),
    queryFn: () => dashboardApi.getTaskSummary(),
    staleTime: DASHBOARD_STALE_TIME,
  });
};

export const useAppraisalCounts = (period = 'monthly', from?: string, to?: string) => {
  return useQuery({
    queryKey: dashboardKeys.appraisalCounts({ period, from, to }),
    queryFn: () => dashboardApi.getAppraisalCounts(period, from, to),
    staleTime: DASHBOARD_STALE_TIME,
  });
};

export const useAppraisalStatusSummary = (
  filters: AppraisalStatusSummaryFilters = {},
  options: { enabled?: boolean } = {},
) => {
  return useQuery({
    queryKey: dashboardKeys.appraisalStatusSummary(filters),
    queryFn: () => dashboardApi.getAppraisalStatusSummary(filters),
    staleTime: DASHBOARD_STALE_TIME,
    enabled: options.enabled ?? true,
  });
};

export const useTeamWorkload = (filters: TeamWorkloadFilters = {}) => {
  return useQuery({
    queryKey: dashboardKeys.teamWorkload(filters),
    queryFn: () => dashboardApi.getTeamWorkload(filters),
    staleTime: DASHBOARD_STALE_TIME,
  });
};

export const useCompanyAppraisalSummary = (filters: CompanyAppraisalSummaryFilters = {}) => {
  return useQuery({
    queryKey: dashboardKeys.companyAppraisalSummary(filters),
    queryFn: () => dashboardApi.getCompanyAppraisalSummary(filters),
    staleTime: DASHBOARD_STALE_TIME,
  });
};

export const useReminders = () => {
  return useQuery({
    queryKey: dashboardKeys.reminders(),
    queryFn: () => dashboardApi.getReminders(),
    staleTime: DASHBOARD_STALE_TIME,
  });
};

export const useCalendarEvents = (month: string) => {
  return useQuery({
    queryKey: dashboardKeys.calendar(month),
    queryFn: () => dashboardApi.getCalendar(month),
    staleTime: DASHBOARD_STALE_TIME,
  });
};

export const useNotes = () => {
  return useQuery({
    queryKey: dashboardKeys.notes(),
    queryFn: () => dashboardApi.getNotes(),
    staleTime: DASHBOARD_STALE_TIME,
  });
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => dashboardApi.createNote(content),
    onMutate: async content => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.notes() });
      const snapshot = queryClient.getQueryData<NotesResponse>(dashboardKeys.notes());
      queryClient.setQueryData<NotesResponse>(dashboardKeys.notes(), old => {
        const optimistic = {
          id: `optimistic-${Date.now()}`,
          content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { items: [optimistic, ...(old?.items ?? [])] };
      });
      return { snapshot };
    },
    onError: (_err, _content, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(dashboardKeys.notes(), context.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.notes() });
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      dashboardApi.updateNote(id, content),
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.notes() });
      const snapshot = queryClient.getQueryData<NotesResponse>(dashboardKeys.notes());
      queryClient.setQueryData<NotesResponse>(dashboardKeys.notes(), old => ({
        items: (old?.items ?? []).map(note =>
          note.id === id ? { ...note, content, updatedAt: new Date().toISOString() } : note,
        ),
      }));
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(dashboardKeys.notes(), context.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.notes() });
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dashboardApi.deleteNote(id),
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.notes() });
      const snapshot = queryClient.getQueryData<NotesResponse>(dashboardKeys.notes());
      queryClient.setQueryData<NotesResponse>(dashboardKeys.notes(), old => ({
        items: (old?.items ?? []).filter(note => note.id !== id),
      }));
      return { snapshot };
    },
    onError: (_err, _id, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(dashboardKeys.notes(), context.snapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.notes() });
    },
  });
};
