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
  QuotationTaskSummaryResponse,
} from './types';

export const dashboardApi = {
  getTaskSummary: async (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const url = qs ? `/dashboard/task-summary?${qs}` : '/dashboard/task-summary';
    const { data } = await axios.get<TaskSummaryResponse>(url);
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

  getCalendar: async (from: string, to: string, types?: string[]) => {
    const params = new URLSearchParams({ from, to });
    if (types && types.length > 0) params.set('type', types.join(','));
    const { data } = await axios.get<CalendarResponse>(`/dashboard/calendar?${params}`);
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

  getQuotationTaskSummary: async () => {
    const { data } = await axios.get<QuotationTaskSummaryResponse>(
      '/dashboard/quotation-task-summary',
    );
    return data;
  },
};
