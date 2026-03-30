import { createContext, useContext, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { isTerminalStatus } from '@shared/config/navigation';
import { canEditAppraisalPage } from '@shared/config/appraisalNavigation';
import { useUserStore } from '@shared/store';

/**
 * Appraisal data returned from the backend
 */
export interface AppraisalData {
  appraisalId: string;
  requestId: string;
  appraisalReportNo?: string;

  // Status & Workflow
  status?: string;
  appraisalType?: string;
  priority?: string;

  /** Whether this appraisal is a PMA (Property Market Assessment) */
  isPma?: boolean;

  /** Facility limit from the request's loan detail */
  facilityLimit?: number;

  /** Whether the request has an appraisal book */
  hasAppraisalBook?: boolean;

  // Workflow task context (set when opened from task list)
  workflowInstanceId?: string;
  activityId?: string;
  isTaskOwner?: boolean;

  /** Base path for navigation: '/tasks/{taskId}' or '/appraisals/{appraisalId}' */
  basePath?: string;
}

interface AppraisalContextValue {
  /** The appraisal data fetched from backend */
  appraisal: AppraisalData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  isError: boolean;
  /** Error object */
  error: Error | null;
}

const AppraisalContext = createContext<AppraisalContextValue | null>(null);

interface AppraisalProviderProps {
  children: ReactNode;
  value: AppraisalContextValue;
}

/**
 * Provider component for appraisal context
 */
export function AppraisalProvider({ children, value }: AppraisalProviderProps) {
  return <AppraisalContext.Provider value={value}>{children}</AppraisalContext.Provider>;
}

/**
 * Hook to access appraisal context
 * @throws Error if used outside of AppraisalProvider
 */
export function useAppraisalContext(): AppraisalContextValue {
  const context = useContext(AppraisalContext);
  if (!context) {
    throw new Error('useAppraisalContext must be used within an AppraisalProvider');
  }
  return context;
}

/**
 * Hook to get the requestId from appraisal context
 * Returns undefined if not in appraisal context or still loading
 */
export function useAppraisalRequestId(): string | undefined {
  const context = useContext(AppraisalContext);
  return context?.appraisal?.requestId;
}

/**
 * Hook to get the isPma flag from appraisal context
 * Returns false if not in appraisal context or still loading
 */
export function useAppraisalIsPma(): boolean {
  const context = useContext(AppraisalContext);
  return context?.appraisal?.isPma ?? false;
}

/**
 * Hook to get the facility limit from appraisal context
 */
export function useAppraisalFacilityLimit(): number {
  const context = useContext(AppraisalContext);
  return context?.appraisal?.facilityLimit ?? 0;
}

/**
 * Hook to get the hasAppraisalBook flag from appraisal context
 */
export function useAppraisalHasAppraisalBook(): boolean {
  const context = useContext(AppraisalContext);
  return context?.appraisal?.hasAppraisalBook ?? false;
}

/**
 * Hook to get the appraisal status
 * Returns undefined if not in appraisal context or still loading
 */
export function useAppraisalStatus(): string | undefined {
  const context = useContext(AppraisalContext);
  return context?.appraisal?.status;
}

/**
 * Hook to determine if the appraisal is in read-only mode.
 * Combines terminal status check with per-page role-based edit permission.
 * @param pageName - Optional page name to also check role-based edit permission
 */
export function useAppraisalReadOnly(pageName?: string): {
  isReadOnly: boolean;
  isTerminalStatus: boolean;
  status: string | undefined;
} {
  const context = useContext(AppraisalContext);
  const role = useUserStore(state => state.user?.role ?? 'viewer');
  const status = context?.appraisal?.status;
  const terminal = isTerminalStatus(status);

  let isReadOnly = terminal;
  if (!isReadOnly && pageName) {
    isReadOnly = !canEditAppraisalPage(pageName, role, { status });
  }

  return { isReadOnly, isTerminalStatus: terminal, status };
}

/**
 * Hook to get appraisalId from URL params or context.
 * Works in both /appraisals/:appraisalId and /tasks/:taskId routes.
 */
export function useAppraisalId(): string | undefined {
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const context = useContext(AppraisalContext);
  return appraisalId ?? context?.appraisal?.appraisalId;
}

/**
 * Hook to get the navigation base path
 * Returns '/appraisals/{id}' or '/tasks/{id}' depending on entry point
 */
export function useBasePath(): string {
  const context = useContext(AppraisalContext);
  return context?.appraisal?.basePath ?? `/appraisals/${context?.appraisal?.appraisalId ?? ''}`;
}

/**
 * Hook to get the workflowInstanceId from appraisal context
 */
export function useWorkflowInstanceId(): string | undefined {
  const context = useContext(AppraisalContext);
  return context?.appraisal?.workflowInstanceId;
}

/**
 * Hook to get the activityId from appraisal context
 */
export function useActivityId(): string | undefined {
  const context = useContext(AppraisalContext);
  return context?.appraisal?.activityId;
}

/**
 * Hook to get whether the current user is the task owner
 */
export function useIsTaskOwner(): boolean {
  const context = useContext(AppraisalContext);
  return context?.appraisal?.isTaskOwner ?? false;
}
