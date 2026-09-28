import axios from '@shared/api/axiosInstance';
import { SERVER_WORKING_TIMEOUT_MS, downloadBlob } from '@shared/api/blobTransfer';
import type { TransferOptions } from '@shared/api/blobTransfer';

/**
 * Server-side render, no Puppeteer — quick, but not 10-seconds quick on a large book. The same
 * budget blobTransfer gives a server that has not sent its first byte yet, because this renders
 * the same report the PDF route does: a shorter one here would mean a book that opens as a PDF
 * still failing in the preview tab, which is the thing this was raised to prevent.
 */
const REPORT_HTML_TIMEOUT_MS = SERVER_WORKING_TIMEOUT_MS;

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
//
// NOTE: `entityId` here is a human number, not a Guid — an AppraisalNumber, or a MeetingNo
// like "12/2567" for Meeting reports. It is interpolated RAW into the path on purpose: the
// backend route is a catch-all (`/reports/{reportTypeKey}/{*entityId}`) that needs the slash
// intact. Do NOT encodeURIComponent it — an encoded "%2F" is rejected by ASP.NET in the path.

/**
 * Fetches a report PDF as a Blob (Bearer auth auto-attached by axiosInstance).
 */
export const fetchReportPdf = async (
  reportTypeKey: string,
  entityId: string,
  options: TransferOptions = {},
): Promise<Blob> => {
  // Generating the PDF happens before the first byte is sent, so this cannot live under the
  // instance-wide 10s cap. See blobTransfer.
  const response = await downloadBlob(`/reports/${reportTypeKey}/${entityId}`, {
    ...options,
    params: { ...options.params, download: false },
  });
  return response.data;
};

/**
 * Fetches the PDF and triggers a browser download.
 * Mirrors exportUserAccessReport in userManagement/api/reports.ts.
 */
export const downloadReportPdf = async (reportTypeKey: string, entityId: string): Promise<void> => {
  const response = await downloadBlob(`/reports/${reportTypeKey}/${entityId}`, {
    params: { download: true },
  });
  const blob = response.data;
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

/** POST /reports/{reportTypeKey}/jobs/{entityId} → 202 { jobId }.
 *  entityId is the trailing catch-all segment (see the raw-interpolation note above) so a
 *  MeetingNo's slash survives, mirroring the sync GET route. */
export const enqueueReportJob = async (
  reportTypeKey: string,
  entityId: string,
): Promise<{ jobId: string }> => {
  const { data } = await axios.post<{ jobId: string }>(
    `/reports/${reportTypeKey}/jobs/${entityId}`,
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
  const { data } = await downloadBlob(`/reports/jobs/${jobId}/download`);
  return data;
};

// ──────────────────────────────────────────────────────────────────────────────
// HTML preview API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a self-contained HTML preview of a report — images already rewritten to
 * `/documents/{id}/download`, fonts and the logo inlined as data URIs. No Puppeteer step
 * (unlike the PDF job APIs above), so this is fast enough to call on every preview
 * open/refresh. `entityId` is always a Guid for report types that support this (e.g.
 * appraisal-book), so raw interpolation is safe with no slash-encoding concern.
 * GET /reports/{reportTypeKey}/html/{entityId}
 */
export const fetchReportHtml = async (reportTypeKey: string, entityId: string): Promise<string> => {
  const { data } = await axios.get<string>(`/reports/${reportTypeKey}/html/${entityId}`, {
    responseType: 'text',
    // Not a blob, so it cannot use blobTransfer's watchdog — but it renders the same report the
    // PDF route does, and leaving it on the instance-wide 10s cap would mean a book that now opens
    // as a PDF still fails in the preview tab.
    timeout: REPORT_HTML_TIMEOUT_MS,
  });
  return data;
};
