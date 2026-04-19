import axios from '@shared/api/axiosInstance';
import type {
  TaskSummaryResponse,
  AppraisalCountsResponse,
  AppraisalStatusSummaryResponse,
  TeamWorkloadResponse,
  CompanyAppraisalSummaryResponse,
  RemindersResponse,
  CalendarResponse,
  NotesResponse,
  NoteItem,
} from './types';

export const dashboardApi = {
  getTaskSummary: async () => {
    const { data } = await axios.get<TaskSummaryResponse>('/dashboard/task-summary');
    return data;
  },

  getAppraisalCounts: async (period = 'monthly', from?: string, to?: string) => {
    const params = new URLSearchParams({ period });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const { data } = await axios.get<AppraisalCountsResponse>(
      `/dashboard/appraisal-counts?${params}`,
    );
    return data;
  },

  getAppraisalStatusSummary: async (filters?: {
    from?: string;
    to?: string;
    assigneeId?: string;
    bankingSegment?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);
    if (filters?.bankingSegment) params.set('bankingSegment', filters.bankingSegment);
    const qs = params.toString();
    const url = qs
      ? `/dashboard/appraisal-status-summary?${qs}`
      : '/dashboard/appraisal-status-summary';
    const { data } = await axios.get<AppraisalStatusSummaryResponse>(url);
    return data;
  },

  getTeamWorkload: async (filters?: { from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    const qs = params.toString();
    const url = qs ? `/dashboard/team-workload?${qs}` : '/dashboard/team-workload';
    const { data } = await axios.get<TeamWorkloadResponse>(url);
    return data;
  },

  getCompanyAppraisalSummary: async (filters?: { from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    const qs = params.toString();
    const url = qs
      ? `/dashboard/company-appraisal-summary?${qs}`
      : '/dashboard/company-appraisal-summary';
    const { data } = await axios.get<CompanyAppraisalSummaryResponse>(url);
    return data;
  },

  getReminders: async () => {
    const { data } = await axios.get<RemindersResponse>('/dashboard/reminders');
    return data;
  },

  getCalendar: async (month: string) => {
    const { data } = await axios.get<CalendarResponse>(`/dashboard/calendar?month=${month}`);
    return data;
  },

  getNotes: async (): Promise<NotesResponse> => {
    const { data } = await axios.get<NotesResponse>('/dashboard/notes');
    return data;
  },

  createNote: async (content: string): Promise<NoteItem> => {
    const { data } = await axios.post<NoteItem>('/dashboard/notes', { content });
    return data;
  },

  updateNote: async (id: string, content: string): Promise<NoteItem> => {
    const { data } = await axios.put<NoteItem>(`/dashboard/notes/${id}`, { content });
    return data;
  },

  deleteNote: async (id: string): Promise<void> => {
    await axios.delete(`/dashboard/notes/${id}`);
  },
};
