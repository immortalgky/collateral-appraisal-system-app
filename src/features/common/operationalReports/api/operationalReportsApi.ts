import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { useCallback, useRef, useState } from 'react';
import type { AnyReportRow, BaseReportFilter, PaginatedResult, SortDir } from './types';

// ─── Query key factory ────────────────────────────────────────────────────────

export const operationalReportKeys = {
  all: ['reports', 'operational'] as const,
  list: (slug: string, filter: BaseReportFilter) =>
    ['reports', 'operational', slug, filter] as const,
};

// ─── Filter → query params ────────────────────────────────────────────────────

function buildParams(filter: BaseReportFilter): Record<string, string | number | undefined> {
  const params: Record<string, string | number | undefined> = {
    pageNumber: filter.pageNumber ?? 0,
    pageSize: filter.pageSize ?? 20,
  };

  if (filter.sortBy) params.sortBy = filter.sortBy;
  if (filter.sortDir) params.sortDir = filter.sortDir;
  if (filter.appraisalNumber) params.appraisalNumber = filter.appraisalNumber;
  if (filter.createdFrom) params.createdFrom = filter.createdFrom;
  if (filter.createdTo) params.createdTo = filter.createdTo;
  if (filter.approvedFrom) params.approvedFrom = filter.approvedFrom;
  if (filter.approvedTo) params.approvedTo = filter.approvedTo;
  if (filter.status) params.status = filter.status;
  if (filter.bankingSegment) params.bankingSegment = filter.bankingSegment;
  if (filter.appraisalCompany) params.appraisalCompany = filter.appraisalCompany;
  if (filter.internalStaff) params.internalStaff = filter.internalStaff;
  if (filter.channel) params.channel = filter.channel;
  if (filter.reviewType) params.reviewType = filter.reviewType;
  if (filter.stage) params.stage = filter.stage;
  if (filter.customerName) params.customerName = filter.customerName;
  if (filter.evaluationStatus) params.evaluationStatus = filter.evaluationStatus;
  if (filter.payType) params.payType = filter.payType;
  if (filter.feeStatus) params.feeStatus = filter.feeStatus;
  if (filter.assignType) params.assignType = filter.assignType;

  return params;
}

// ─── Preview (paginated list) hook ────────────────────────────────────────────

export function useOperationalReport<T extends AnyReportRow = AnyReportRow>(
  slug: string,
  filter: BaseReportFilter = {},
) {
  return useQuery({
    queryKey: operationalReportKeys.list(slug, filter),
    queryFn: async (): Promise<PaginatedResult<T>> => {
      const { data } = await axios.get(`/reports/operational/${slug}`, {
        params: buildParams(filter),
      });
      return data.result ?? data;
    },
    enabled: Boolean(slug),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ─── Export hook ──────────────────────────────────────────────────────────────

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

interface UseReportExportReturn {
  exportReport: (format: ExportFormat) => Promise<void>;
  isExporting: boolean;
}

/**
 * Triggers a real browser file download by fetching the export endpoint as a
 * blob (so the auth header from axiosInstance is included) and creating an
 * <a download> element. This is required because the endpoint is auth-gated and
 * cannot be opened via a plain window.open / href navigation.
 */
export function useReportExport(slug: string, filter: BaseReportFilter = {}): UseReportExportReturn {
  // Ref guards against re-entrant calls; state drives the UI (disabled buttons + spinner).
  const isExportingRef = useRef(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportReport = useCallback(
    async (format: ExportFormat) => {
      if (isExportingRef.current) return;
      isExportingRef.current = true;
      setIsExporting(true);

      try {
        // Build export params without pagination — server returns all matching rows
        const exportParams: Record<string, string | number | undefined> = { format };
        if (filter.sortBy) exportParams.sortBy = filter.sortBy;
        if (filter.sortDir) exportParams.sortDir = filter.sortDir;
        if (filter.appraisalNumber) exportParams.appraisalNumber = filter.appraisalNumber;
        if (filter.createdFrom) exportParams.createdFrom = filter.createdFrom;
        if (filter.createdTo) exportParams.createdTo = filter.createdTo;
        if (filter.approvedFrom) exportParams.approvedFrom = filter.approvedFrom;
        if (filter.approvedTo) exportParams.approvedTo = filter.approvedTo;
        if (filter.status) exportParams.status = filter.status;
        if (filter.bankingSegment) exportParams.bankingSegment = filter.bankingSegment;
        if (filter.appraisalCompany) exportParams.appraisalCompany = filter.appraisalCompany;
        if (filter.internalStaff) exportParams.internalStaff = filter.internalStaff;
        if (filter.channel) exportParams.channel = filter.channel;
        if (filter.reviewType) exportParams.reviewType = filter.reviewType;
        if (filter.stage) exportParams.stage = filter.stage;
        if (filter.customerName) exportParams.customerName = filter.customerName;
        if (filter.evaluationStatus) exportParams.evaluationStatus = filter.evaluationStatus;
        if (filter.payType) exportParams.payType = filter.payType;
        if (filter.feeStatus) exportParams.feeStatus = filter.feeStatus;
        if (filter.assignType) exportParams.assignType = filter.assignType;
        const params = exportParams;

        const response = await axios.get(`/reports/operational/${slug}/export`, {
          params,
          responseType: 'blob',
        });

        // Derive filename from Content-Disposition if present, else fall back
        const disposition = response.headers['content-disposition'] as string | undefined;
        let filename = `${slug}-report.${format}`;
        if (disposition) {
          const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
          if (match?.[1]) {
            filename = match[1].replace(/['"]/g, '');
          }
        }

        const url = URL.createObjectURL(response.data as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } finally {
        isExportingRef.current = false;
        setIsExporting(false);
      }
    },
    [slug, filter],
  );

  return { exportReport, isExporting };
}

export type { BaseReportFilter, SortDir };
