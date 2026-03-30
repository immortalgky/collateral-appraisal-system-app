import axios from '@shared/api/axiosInstance';
import type {
  TaskSummaryResponse,
  AppraisalCountsResponse,
  RequestStatusSummaryResponse,
  TeamWorkloadResponse,
  RecentTasksResponse,
  CompanyAppraisalSummaryResponse,
} from './types';

export const dashboardApi = {
  getTaskSummary: async (period = 'monthly', from?: string, to?: string) => {
    const params = new URLSearchParams({ period });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const { data } = await axios.get<TaskSummaryResponse>(`/dashboard/task-summary?${params}`);
    return data;
  },

  getAppraisalCounts: async (period = 'monthly', from?: string, to?: string) => {
    const params = new URLSearchParams({ period });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const { data } = await axios.get<AppraisalCountsResponse>(`/dashboard/appraisal-counts?${params}`);
    return data;
  },

  getRequestStatusSummary: async () => {
    const { data } = await axios.get<RequestStatusSummaryResponse>('/dashboard/request-status-summary');
    return data;
  },

  getTeamWorkload: async () => {
    const { data } = await axios.get<TeamWorkloadResponse>('/dashboard/team-workload');
    return data;
  },

  getRecentTasks: async (limit = 10) => {
    const { data } = await axios.get<RecentTasksResponse>(`/dashboard/recent-tasks?limit=${limit}`);
    return data;
  },

  getCompanyAppraisalSummary: async () => {
    const { data } = await axios.get<CompanyAppraisalSummaryResponse>('/dashboard/company-appraisal-summary');
    return data;
  },
};
