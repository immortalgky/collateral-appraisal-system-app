import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  GroupByField,
  MeetingFollowup,
  MeetingFollowupFilter,
  MonitoringGroupedResult,
  MonitoringSummary,
  PaginatedResult,
  PendingEvaluation,
  PendingEvaluationFilter,
  PendingExternalFilter,
  PendingExternalTask,
  PendingFollowup,
  PendingFollowupFilter,
  PendingInternalFilter,
  PendingQuotation,
  PendingQuotationFilter,
  PendingTask,
} from './types';

// ─── Query key factory ────────────────────────────────────────────────────────

export const monitoringKeys = {
  all: ['monitoring'] as const,
  taskTypes: ['monitoring', 'task-types'] as const,
  quotations: (filter: PendingQuotationFilter) => ['monitoring', 'quotations', filter] as const,
  pendingInternal: (filter: PendingInternalFilter) =>
    ['monitoring', 'pending-internal', filter] as const,
  pendingExternal: (filter: PendingExternalFilter) =>
    ['monitoring', 'pending-external', filter] as const,
  pendingFollowups: (filter: PendingFollowupFilter) =>
    ['monitoring', 'pending-followups', filter] as const,
  pendingEvaluations: (filter: PendingEvaluationFilter) =>
    ['monitoring', 'pending-evaluations', filter] as const,
  meetingFollowups: (filter: MeetingFollowupFilter) =>
    ['monitoring', 'meeting-followups', filter] as const,
  // Summary keys (omit paging/sort from filter)
  summaryQuotations: (
    filter: Omit<PendingQuotationFilter, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>,
  ) => ['monitoring', 'quotations', 'summary', filter] as const,
  summaryInternal: (
    filter: Omit<PendingInternalFilter, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>,
  ) => ['monitoring', 'pending-internal', 'summary', filter] as const,
  summaryExternal: (
    filter: Omit<PendingExternalFilter, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>,
  ) => ['monitoring', 'pending-external', 'summary', filter] as const,
  summaryFollowups: (
    filter: Omit<PendingFollowupFilter, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>,
  ) => ['monitoring', 'pending-followups', 'summary', filter] as const,
  summaryEvaluations: (
    filter: Omit<PendingEvaluationFilter, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>,
  ) => ['monitoring', 'pending-evaluations', 'summary', filter] as const,
  summaryMeetingFollowups: (
    filter: Omit<MeetingFollowupFilter, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>,
  ) => ['monitoring', 'meeting-followups', 'summary', filter] as const,
  // Grouped keys
  groupedInternal: (
    groupBy: GroupByField,
    filter: Omit<PendingInternalFilter, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>,
  ) => ['monitoring', 'pending-internal', 'grouped', groupBy, filter] as const,
  groupedExternal: (
    groupBy: GroupByField,
    filter: Omit<PendingExternalFilter, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>,
  ) => ['monitoring', 'pending-external', 'grouped', groupBy, filter] as const,
  groupedFollowups: (
    groupBy: GroupByField,
    filter: Omit<PendingFollowupFilter, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>,
  ) => ['monitoring', 'pending-followups', 'grouped', groupBy, filter] as const,
};

// ─── Shared param builder ─────────────────────────────────────────────────────

function buildBaseParams(filter: {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
}) {
  return {
    pageNumber: filter.page ?? 0,
    pageSize: filter.pageSize ?? 25,
    ...(filter.search && { search: filter.search }),
    ...(filter.sortBy && { sortBy: filter.sortBy }),
    ...(filter.sortDir && { sortDir: filter.sortDir }),
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
//
// Hooks intentionally do NOT take an `enabled` permission flag. Sections are
// mount-gated by the same `MONITORING:<TAB>:*` permission prefix that protects
// all three endpoint variants (list / summary / grouped) for that tab, so any
// hook reaching the network from a mounted section is already authorized.
// The lightweight tab-count hooks below ARE gated because they run from
// MonitoringPage before tab selection, when section mount-gating doesn't apply.

export const usePendingQuotations = (filter: PendingQuotationFilter = {}) =>
  useQuery({
    queryKey: monitoringKeys.quotations(filter),
    queryFn: async (): Promise<PaginatedResult<PendingQuotation>> => {
      const { data } = await axios.get('/monitoring/quotations', {
        params: {
          ...buildBaseParams(filter),
          ...(filter.status?.length && { status: filter.status }),
          ...(filter.cutOffTimeFrom && { cutOffTimeFrom: filter.cutOffTimeFrom }),
          ...(filter.cutOffTimeTo && { cutOffTimeTo: filter.cutOffTimeTo }),
        },
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const usePendingInternal = (filter: PendingInternalFilter = {}) =>
  useQuery({
    queryKey: monitoringKeys.pendingInternal(filter),
    queryFn: async (): Promise<PaginatedResult<PendingTask>> => {
      const { data } = await axios.get('/monitoring/pending-internal', {
        params: {
          ...buildBaseParams(filter),
          ...(filter.slaStatus?.length && { slaStatus: filter.slaStatus }),
          ...(filter.slaBucket?.length && { slaBucket: filter.slaBucket }),
          ...(filter.activityId?.length && { activityId: filter.activityId }),
          ...(filter.pic && { pic: filter.pic }),
          ...(filter.purpose?.length && { purpose: filter.purpose }),
          ...(filter.propertyType?.length && { propertyType: filter.propertyType }),
          ...(filter.taskType?.length && { taskType: filter.taskType }),
        },
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const usePendingExternal = (filter: PendingExternalFilter = {}) =>
  useQuery({
    queryKey: monitoringKeys.pendingExternal(filter),
    queryFn: async (): Promise<PaginatedResult<PendingExternalTask>> => {
      const { data } = await axios.get('/monitoring/pending-external', {
        params: {
          ...buildBaseParams(filter),
          ...(filter.slaStatus?.length && { slaStatus: filter.slaStatus }),
          ...(filter.slaBucket?.length && { slaBucket: filter.slaBucket }),
          ...(filter.activityId?.length && { activityId: filter.activityId }),
          ...(filter.pic && { pic: filter.pic }),
          ...(filter.purpose?.length && { purpose: filter.purpose }),
          ...(filter.propertyType?.length && { propertyType: filter.propertyType }),
          ...(filter.taskType?.length && { taskType: filter.taskType }),
          ...(filter.appraisalCompanyId && { appraisalCompanyId: filter.appraisalCompanyId }),
        },
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const usePendingFollowups = (filter: PendingFollowupFilter = {}) =>
  useQuery({
    queryKey: monitoringKeys.pendingFollowups(filter),
    queryFn: async (): Promise<PaginatedResult<PendingFollowup>> => {
      const { data } = await axios.get('/monitoring/pending-followups', {
        params: {
          ...buildBaseParams(filter),
          ...(filter.slaStatus?.length && { slaStatus: filter.slaStatus }),
          ...(filter.slaBucket?.length && { slaBucket: filter.slaBucket }),
          ...(filter.activityId?.length && { activityId: filter.activityId }),
          ...(filter.pic && { pic: filter.pic }),
          ...(filter.purpose?.length && { purpose: filter.purpose }),
          ...(filter.propertyType?.length && { propertyType: filter.propertyType }),
          ...(filter.taskType?.length && { taskType: filter.taskType }),
        },
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const usePendingEvaluations = (filter: PendingEvaluationFilter = {}) =>
  useQuery({
    queryKey: monitoringKeys.pendingEvaluations(filter),
    queryFn: async (): Promise<PaginatedResult<PendingEvaluation>> => {
      const { data } = await axios.get('/monitoring/pending-evaluations', {
        params: {
          ...buildBaseParams(filter),
          ...(filter.evaluationStatus?.length && { evaluationStatus: filter.evaluationStatus }),
          ...(filter.appraisalCompanyId && { appraisalCompanyId: filter.appraisalCompanyId }),
          ...(filter.appraisalStatus?.length && { appraisalStatus: filter.appraisalStatus }),
        },
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const useMeetingFollowups = (filter: MeetingFollowupFilter = {}) =>
  useQuery({
    queryKey: monitoringKeys.meetingFollowups(filter),
    queryFn: async (): Promise<PaginatedResult<MeetingFollowup>> => {
      const { data } = await axios.get('/monitoring/meeting-followups', {
        params: {
          ...buildBaseParams(filter),
          ...(filter.tier?.length && { tier: filter.tier }),
          ...(filter.slaStatus?.length && { slaStatus: filter.slaStatus }),
          ...(filter.slaBucket?.length && { slaBucket: filter.slaBucket }),
          ...(filter.meetingNumber && { meetingNumber: filter.meetingNumber }),
          ...(filter.meetingDateFrom && { meetingDateFrom: filter.meetingDateFrom }),
          ...(filter.meetingDateTo && { meetingDateTo: filter.meetingDateTo }),
        },
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

// ─── Task types hook ─────────────────────────────────────────────────────────

export interface TaskTypeOption {
  value: string;
  label: string;
}

export const useTaskTypes = () =>
  useQuery({
    queryKey: monitoringKeys.taskTypes,
    queryFn: async (): Promise<TaskTypeOption[]> => {
      const { data } = await axios.get('/monitoring/task-types');
      return data.result ?? data;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

// ─── Summary hooks ────────────────────────────────────────────────────────────

type SummaryFilter<T> = Omit<T, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>;

function buildSummaryParams(filter: object) {
  // Remove null/undefined/empty-string, and empty arrays to keep URL clean
  return Object.fromEntries(
    Object.entries(filter).filter(([, v]) => {
      if (v == null || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }),
  );
}

export const useMonitoringQuotationsSummary = (
  filter: SummaryFilter<PendingQuotationFilter> = {},
) =>
  useQuery({
    queryKey: monitoringKeys.summaryQuotations(filter),
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/quotations/summary', {
        params: buildSummaryParams(filter),
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const useMonitoringInternalSummary = (filter: SummaryFilter<PendingInternalFilter> = {}) =>
  useQuery({
    queryKey: monitoringKeys.summaryInternal(filter),
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/pending-internal/summary', {
        params: buildSummaryParams(filter),
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const useMonitoringExternalSummary = (filter: SummaryFilter<PendingExternalFilter> = {}) =>
  useQuery({
    queryKey: monitoringKeys.summaryExternal(filter),
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/pending-external/summary', {
        params: buildSummaryParams(filter),
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const useMonitoringFollowupsSummary = (filter: SummaryFilter<PendingFollowupFilter> = {}) =>
  useQuery({
    queryKey: monitoringKeys.summaryFollowups(filter),
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/pending-followups/summary', {
        params: buildSummaryParams(filter),
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const useMonitoringEvaluationsSummary = (
  filter: SummaryFilter<PendingEvaluationFilter> = {},
) =>
  useQuery({
    queryKey: monitoringKeys.summaryEvaluations(filter),
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/pending-evaluations/summary', {
        params: buildSummaryParams(filter),
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const useMonitoringMeetingFollowupsSummary = (
  filter: SummaryFilter<MeetingFollowupFilter> = {},
) =>
  useQuery({
    queryKey: monitoringKeys.summaryMeetingFollowups(filter),
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/meeting-followups/summary', {
        params: buildSummaryParams(filter),
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

// ─── Grouped hooks ────────────────────────────────────────────────────────────

export const useMonitoringInternalGrouped = (
  groupBy: GroupByField | null,
  filter: SummaryFilter<PendingInternalFilter> = {},
) =>
  useQuery({
    queryKey: groupBy
      ? monitoringKeys.groupedInternal(groupBy, filter)
      : (['monitoring', 'pending-internal', 'grouped', null] as const),
    queryFn: async (): Promise<MonitoringGroupedResult> => {
      const { data } = await axios.get('/monitoring/pending-internal/grouped', {
        params: { ...buildSummaryParams(filter), groupBy },
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    enabled: groupBy != null,
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const useMonitoringExternalGrouped = (
  groupBy: GroupByField | null,
  filter: SummaryFilter<PendingExternalFilter> = {},
) =>
  useQuery({
    queryKey: groupBy
      ? monitoringKeys.groupedExternal(groupBy, filter)
      : (['monitoring', 'pending-external', 'grouped', null] as const),
    queryFn: async (): Promise<MonitoringGroupedResult> => {
      const { data } = await axios.get('/monitoring/pending-external/grouped', {
        params: { ...buildSummaryParams(filter), groupBy },
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    enabled: groupBy != null,
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

export const useMonitoringFollowupsGrouped = (
  groupBy: GroupByField | null,
  filter: SummaryFilter<PendingFollowupFilter> = {},
) =>
  useQuery({
    queryKey: groupBy
      ? monitoringKeys.groupedFollowups(groupBy, filter)
      : (['monitoring', 'pending-followups', 'grouped', null] as const),
    queryFn: async (): Promise<MonitoringGroupedResult> => {
      const { data } = await axios.get('/monitoring/pending-followups/grouped', {
        params: { ...buildSummaryParams(filter), groupBy },
        paramsSerializer: { indexes: null },
      });
      return data.result ?? data;
    },
    enabled: groupBy != null,
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

// ─── Tab counts ───────────────────────────────────────────────────────────────

/**
 * Lightweight count hook for the Monitoring tab badges.
 * Calls the summary endpoint for each tab (one COUNT query per tab on the BE)
 * instead of the list endpoint with pageSize=1. OLA tabs (internal + external)
 * also return `breached` so the page can render red dot indicators.
 */
export interface MonitoringTabPermissions {
  pendingQuotation: boolean;
  pendingInternal: boolean;
  pendingExternal: boolean;
  pendingFollowup: boolean;
  pendingEvaluation: boolean;
  meetingFollowup: boolean;
}

export interface MonitoringTabCounts {
  pendingQuotation?: number;
  pendingInternal?: number;
  pendingInternalBreached?: number;
  pendingInternalAtRisk?: number;
  pendingInternalHealthy?: number;
  pendingExternal?: number;
  pendingExternalBreached?: number;
  pendingExternalAtRisk?: number;
  pendingExternalHealthy?: number;
  pendingFollowup?: number;
  pendingFollowupBreached?: number;
  pendingFollowupAtRisk?: number;
  pendingFollowupHealthy?: number;
  pendingEvaluation?: number;
  meetingFollowup?: number;
  /** Most recent successful fetch timestamp across all enabled summary queries (0 if none). */
  dataUpdatedAt: number;
  isRefetching: boolean;
  refetchAll: () => void;
}

const COUNT_QUERY_OPTIONS = {
  staleTime: 30 * 1000,
  refetchInterval: 60_000,
  refetchOnWindowFocus: false as const,
};

export function useMonitoringTabCounts(perms: MonitoringTabPermissions): MonitoringTabCounts {
  const quotation = useQuery({
    queryKey: ['monitoring', 'quotations', 'tab-count'] as const,
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/quotations/summary');
      return data.result ?? data;
    },
    enabled: perms.pendingQuotation,
    ...COUNT_QUERY_OPTIONS,
  });

  const internal = useQuery({
    queryKey: ['monitoring', 'pending-internal', 'tab-count'] as const,
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/pending-internal/summary');
      return data.result ?? data;
    },
    enabled: perms.pendingInternal,
    ...COUNT_QUERY_OPTIONS,
  });

  const external = useQuery({
    queryKey: ['monitoring', 'pending-external', 'tab-count'] as const,
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/pending-external/summary');
      return data.result ?? data;
    },
    enabled: perms.pendingExternal,
    ...COUNT_QUERY_OPTIONS,
  });

  const followup = useQuery({
    queryKey: ['monitoring', 'pending-followups', 'tab-count'] as const,
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/pending-followups/summary');
      return data.result ?? data;
    },
    enabled: perms.pendingFollowup,
    ...COUNT_QUERY_OPTIONS,
  });

  const evaluation = useQuery({
    queryKey: ['monitoring', 'pending-evaluations', 'tab-count'] as const,
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/pending-evaluations/summary');
      return data.result ?? data;
    },
    enabled: perms.pendingEvaluation,
    ...COUNT_QUERY_OPTIONS,
  });

  const meeting = useQuery({
    queryKey: ['monitoring', 'meeting-followups', 'tab-count'] as const,
    queryFn: async (): Promise<MonitoringSummary> => {
      const { data } = await axios.get('/monitoring/meeting-followups/summary');
      return data.result ?? data;
    },
    enabled: perms.meetingFollowup,
    ...COUNT_QUERY_OPTIONS,
  });

  return {
    pendingQuotation: quotation.data?.total,
    pendingInternal: internal.data?.total,
    pendingInternalBreached: internal.data?.breached ?? undefined,
    pendingInternalAtRisk: internal.data?.atRisk ?? undefined,
    pendingInternalHealthy: internal.data?.healthy ?? undefined,
    pendingExternal: external.data?.total,
    pendingExternalBreached: external.data?.breached ?? undefined,
    pendingExternalAtRisk: external.data?.atRisk ?? undefined,
    pendingExternalHealthy: external.data?.healthy ?? undefined,
    pendingFollowup: followup.data?.total,
    pendingFollowupBreached: followup.data?.breached ?? undefined,
    pendingFollowupAtRisk: followup.data?.atRisk ?? undefined,
    pendingFollowupHealthy: followup.data?.healthy ?? undefined,
    pendingEvaluation: evaluation.data?.total,
    meetingFollowup: meeting.data?.total,
    dataUpdatedAt: Math.max(
      quotation.dataUpdatedAt,
      internal.dataUpdatedAt,
      external.dataUpdatedAt,
      followup.dataUpdatedAt,
      evaluation.dataUpdatedAt,
      meeting.dataUpdatedAt,
    ),
    isRefetching:
      quotation.isRefetching ||
      internal.isRefetching ||
      external.isRefetching ||
      followup.isRefetching ||
      evaluation.isRefetching ||
      meeting.isRefetching,
    refetchAll: () => {
      // Guard each refetch by the corresponding permission flag — React Query's
      // refetch() overrides `enabled: false` and would otherwise fire 403 requests
      // for endpoints the user can't access.
      if (perms.pendingQuotation) void quotation.refetch();
      if (perms.pendingInternal) void internal.refetch();
      if (perms.pendingExternal) void external.refetch();
      if (perms.pendingFollowup) void followup.refetch();
      if (perms.pendingEvaluation) void evaluation.refetch();
      if (perms.meetingFollowup) void meeting.refetch();
    },
  };
}

// ─── Top breaches (page-level critical items banner) ──────────────────────────

export type TopBreachSectionId = 'pending-internal' | 'pending-external' | 'pending-followup';

export interface TopBreachRow {
  appraisalId: string | null;
  appraisalNumber: string | null;
  customerName: string | null;
  sectionId: TopBreachSectionId;
  /** Hours past SLA target. Server returns int. */
  olaVarianceHours: number | null;
  taskType: string | null;
}

export interface UseTopBreachesOptions {
  enabled?: boolean;
  limit?: number;
}

export function useTopBreaches({ enabled = true, limit = 5 }: UseTopBreachesOptions = {}) {
  return useQuery({
    queryKey: ['monitoring', 'top-breaches', limit] as const,
    queryFn: async (): Promise<TopBreachRow[]> => {
      const { data } = await axios.get('/monitoring/top-breaches', {
        params: { limit },
      });
      return (data.result ?? data) as TopBreachRow[];
    },
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}
