import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from './dashboardApi';
import type { NotesResponse } from './types';

const DASHBOARD_STALE_TIME = 30 * 1000; // 30 seconds

export const dashboardKeys = {
  all: ['dashboard'] as const,
  taskSummary: () => [...dashboardKeys.all, 'task-summary'] as const,
  appraisalCounts: (period: string) => [...dashboardKeys.all, 'appraisal-counts', period] as const,
  appraisalStatusSummary: () => [...dashboardKeys.all, 'appraisal-status-summary'] as const,
  teamWorkload: () => [...dashboardKeys.all, 'team-workload'] as const,
  companyAppraisalSummary: () => [...dashboardKeys.all, 'company-appraisal-summary'] as const,
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
    queryKey: dashboardKeys.appraisalCounts(period),
    queryFn: () => dashboardApi.getAppraisalCounts(period, from, to),
    staleTime: DASHBOARD_STALE_TIME,
  });
};

export const useAppraisalStatusSummary = () => {
  return useQuery({
    queryKey: dashboardKeys.appraisalStatusSummary(),
    queryFn: () => dashboardApi.getAppraisalStatusSummary(),
    staleTime: DASHBOARD_STALE_TIME,
  });
};

export const useTeamWorkload = () => {
  return useQuery({
    queryKey: dashboardKeys.teamWorkload(),
    queryFn: () => dashboardApi.getTeamWorkload(),
    staleTime: DASHBOARD_STALE_TIME,
  });
};

export const useCompanyAppraisalSummary = () => {
  return useQuery({
    queryKey: dashboardKeys.companyAppraisalSummary(),
    queryFn: () => dashboardApi.getCompanyAppraisalSummary(),
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
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.notes() });
      const snapshot = queryClient.getQueryData<NotesResponse>(dashboardKeys.notes());
      queryClient.setQueryData<NotesResponse>(dashboardKeys.notes(), (old) => {
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
      queryClient.setQueryData<NotesResponse>(dashboardKeys.notes(), (old) => ({
        items: (old?.items ?? []).map((note) =>
          note.id === id ? { ...note, content, updatedAt: new Date().toISOString() } : note
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.notes() });
      const snapshot = queryClient.getQueryData<NotesResponse>(dashboardKeys.notes());
      queryClient.setQueryData<NotesResponse>(dashboardKeys.notes(), (old) => ({
        items: (old?.items ?? []).filter((note) => note.id !== id),
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
