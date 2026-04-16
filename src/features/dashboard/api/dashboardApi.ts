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
    const { data } = await axios.get<AppraisalCountsResponse>(`/dashboard/appraisal-counts?${params}`);
    return data;
  },

  getAppraisalStatusSummary: async () => {
    const { data } = await axios.get<AppraisalStatusSummaryResponse>('/dashboard/appraisal-status-summary');
    return data;
  },

  getTeamWorkload: async () => {
    const { data } = await axios.get<TeamWorkloadResponse>('/dashboard/team-workload');
    return data;
  },

  getCompanyAppraisalSummary: async () => {
    const { data } = await axios.get<CompanyAppraisalSummaryResponse>('/dashboard/company-appraisal-summary');
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
