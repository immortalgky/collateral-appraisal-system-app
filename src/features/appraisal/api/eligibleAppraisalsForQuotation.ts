import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { AppraisalDto } from './appraisalSearch';

// ── Types ──────────────────────────────────────────────────

export interface EligibleAppraisalsParams {
  customerName?: string;
  appraisalNumber?: string;
  purpose?: string;
  requestedAtFrom?: string;
  requestedAtTo?: string;
  channel?: string;
  status?: string;
  bankingSegment?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  pageNumber: number;
  pageSize: number;
}

export interface EligibleAppraisalsResponse {
  items: AppraisalDto[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

// ── Query Keys ─────────────────────────────────────────────

export const eligibleAppraisalKeys = {
  all: ['eligible-appraisals-for-quotation'] as const,
  list: (params: EligibleAppraisalsParams) =>
    ['eligible-appraisals-for-quotation', 'list', params] as const,
};

// ── Hook ───────────────────────────────────────────────────

export function useEligibleAppraisalsForQuotation(params: EligibleAppraisalsParams) {
  return useQuery({
    queryKey: eligibleAppraisalKeys.list(params),
    queryFn: async () => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null),
      );
      const { data } = await axios.get<EligibleAppraisalsResponse>(
        '/appraisals/eligible-for-quotation',
        { params: cleanParams },
      );
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
