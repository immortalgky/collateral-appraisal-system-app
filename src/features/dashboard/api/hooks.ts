import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './dashboardApi';

const DASHBOARD_STALE_TIME = 30 * 1000; // 30 seconds

export const dashboardKeys = {
  all: ['dashboard'] as const,
  taskSummary: (period: string) => [...dashboardKeys.all, 'task-summary', period] as const,
  appraisalCounts: (period: string) => [...dashboardKeys.all, 'appraisal-counts', period] as const,
  requestStatusSummary: () => [...dashboardKeys.all, 'request-status-summary'] as const,
  teamWorkload: () => [...dashboardKeys.all, 'team-workload'] as const,
  recentTasks: (limit: number) => [...dashboardKeys.all, 'recent-tasks', limit] as const,
  companyAppraisalSummary: () => [...dashboardKeys.all, 'company-appraisal-summary'] as const,
};

export const useTaskSummary = (period = 'monthly', from?: string, to?: string) => {
  return useQuery({
    queryKey: dashboardKeys.taskSummary(period),
    queryFn: () => dashboardApi.getTaskSummary(period, from, to),
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

export const useRequestStatusSummary = () => {
  return useQuery({
    queryKey: dashboardKeys.requestStatusSummary(),
    queryFn: () => dashboardApi.getRequestStatusSummary(),
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

export const useRecentTasks = (limit = 10) => {
  return useQuery({
    queryKey: dashboardKeys.recentTasks(limit),
    queryFn: () => dashboardApi.getRecentTasks(limit),
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
