import axios from '@shared/api/axiosInstance';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type ReportGenerationMode = 'Sync' | 'Async';

export interface ReportDefinition {
  reportTypeKey: string;
  displayNameTh: string;
  displayNameEn: string;
  category: string;
  generationMode: ReportGenerationMode;
}

export type ReportJobStatus = 'Pending' | 'Running' | 'Completed' | 'Failed';

export interface ReportJobDetail {
  jobId: string;
  reportTypeKey: string;
  entityId: string;
  status: ReportJobStatus;
  requestedAt: string;
  startedAt: string | null | undefined;
  completedAt: string | null | undefined;
  fileSizeBytes: number | null | undefined;
  durationMs: number | null | undefined;
  errorMessage: string | null | undefined;
}

export interface ReportJobSummary {
  jobId: string;
  reportTypeKey: string;
  entityId: string;
  status: ReportJobStatus;
  requestedAt: string;
  completedAt: string | null | undefined;
  fileSizeBytes: number | null | undefined;
  errorMessage: string | null | undefined;
}

// ──────────────────────────────────────────────────────────────────────────────
// Query key factory
// ──────────────────────────────────────────────────────────────────────────────

export const reportKeys = {
  definitions: () => ['reportDefinitions'] as const,
  jobs: () => ['reportJobs'] as const,
  job: (jobId: string) => ['reportJob', jobId] as const,
};

// ──────────────────────────────────────────────────────────────────────────────
// Sync report APIs (existing — kept as-is)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a report PDF as a Blob (Bearer auth auto-attached by axiosInstance).
 */
export const fetchReportPdf = async (
  reportTypeKey: string,
  entityId: string,
): Promise<Blob> => {
  const response = await axios.get(`/reports/${reportTypeKey}/${entityId}`, {
    params: { download: false },
    responseType: 'blob',
  });
  return response.data as Blob;
};

/**
 * Fetches the PDF and triggers a browser download.
 * Mirrors exportUserAccessReport in userManagement/api/reports.ts.
 */
export const downloadReportPdf = async (
  reportTypeKey: string,
  entityId: string,
): Promise<void> => {
  const response = await axios.get(`/reports/${reportTypeKey}/${entityId}`, {
    params: { download: true },
    responseType: 'blob',
  });
  const blob = response.data as Blob;
  const url = URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportTypeKey}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ──────────────────────────────────────────────────────────────────────────────
// Async report APIs
// ──────────────────────────────────────────────────────────────────────────────

/** GET /reports/definitions */
export const getReportDefinitions = async (): Promise<ReportDefinition[]> => {
  const { data } = await axios.get<ReportDefinition[]>('/reports/definitions');
  return data;
};

/** POST /reports/{reportTypeKey}/{entityId}/jobs → 202 { jobId } */
export const enqueueReportJob = async (
  reportTypeKey: string,
  entityId: string,
): Promise<{ jobId: string }> => {
  const { data } = await axios.post<{ jobId: string }>(
    `/reports/${reportTypeKey}/${entityId}/jobs`,
  );
  return data;
};

/** GET /reports/jobs/{jobId} */
export const getReportJob = async (jobId: string): Promise<ReportJobDetail> => {
  const { data } = await axios.get<ReportJobDetail>(`/reports/jobs/${jobId}`);
  return data;
};

/** GET /reports/jobs — owner-scoped list, newest first, ≤50 */
export const listReportJobs = async (): Promise<ReportJobSummary[]> => {
  const { data } = await axios.get<ReportJobSummary[]>('/reports/jobs');
  return data;
};

/**
 * GET /reports/jobs/{jobId}/download → PDF blob.
 * Returns 409 if not ready, 410 if artifact gone — callers should handle those.
 */
export const downloadReportJobPdf = async (jobId: string): Promise<Blob> => {
  const { data } = await axios.get<Blob>(`/reports/jobs/${jobId}/download`, {
    responseType: 'blob',
  });
  return data;
};
