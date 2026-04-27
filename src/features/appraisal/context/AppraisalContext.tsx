import { createContext, useContext, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { isTerminalStatus } from '@shared/config/navigationTypes';
import { useMenuStore } from '@features/menuManagement/store';
import type { MenuTreeNode } from '@features/menuManagement/types';

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

  /** Whether this appraisal is a Block (Condo) appraisal (Purpose = '07') */
  isBlockCondo?: boolean;

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
 * Hook to get the isBlockCondo flag from appraisal context
 * Returns true when Purpose = '07'
 */
export function useAppraisalIsBlockCondo(): boolean {
  const context = useContext(AppraisalContext);
  return context?.appraisal?.isBlockCondo ?? false;
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
 * Maps legacy pageName labels (as used in router.tsx's AppraisalReadOnlyWrapper)
 * to the seeded ItemKey of the corresponding appraisal menu item. The hook uses
 * this to look up canEdit on the server-filtered menu tree for page-level
 * authorization. Unknown pageNames fail CLOSED (isReadOnly=true) so that adding
 * a new page without a mapping cannot accidentally open up editing.
 */
const PAGE_NAME_TO_ITEM_KEY: Record<string, string> = {
  Administration: 'appraisal.administration',
  'Appointment & Fee': 'appraisal.appointment',
  'Property Information': 'appraisal.property',
  'Document Checklist': 'appraisal.documents',
  'Summary & Decision': 'appraisal.summary',
  '360 Summary': 'appraisal.360',
  'Request Information': 'appraisal.request',
};

function findByItemKey(nodes: MenuTreeNode[], itemKey: string): MenuTreeNode | undefined {
  for (const node of nodes) {
    if (node.itemKey === itemKey) return node;
    if (node.children?.length) {
      const hit = findByItemKey(node.children, itemKey);
      if (hit) return hit;
    }
  }
  return undefined;
}

/**
 * Hook to determine if the appraisal page is in read-only mode.
 * Read-only if any of the following is true:
 * 1. Terminal status (completed/approved/rejected/cancelled)
 * 2. User lacks edit permission for the page (canEdit=false on the menu node)
 * 3. The page name has no ItemKey mapping (fail closed)
 *
 * Pass the legacy display-name pageName (e.g. 'Property Information') — the hook
 * resolves it to an ItemKey internally against PAGE_NAME_TO_ITEM_KEY.
 */
export function useAppraisalReadOnly(pageName?: string): {
  isReadOnly: boolean;
  isTerminalStatus: boolean;
  status: string | undefined;
} {
  const context = useContext(AppraisalContext);
  const status = context?.appraisal?.status;
  const terminal = isTerminalStatus(status);
  const appraisalTree = useMenuStore(state => state.appraisal);

  if (terminal) return { isReadOnly: true, isTerminalStatus: true, status };

  // No pageName → caller only wants the terminal-status check (e.g. header components).
  if (!pageName) return { isReadOnly: false, isTerminalStatus: false, status };

  const itemKey = PAGE_NAME_TO_ITEM_KEY[pageName];
  // Fail closed on unknown pageName — safer than silently allowing edits.
  if (!itemKey) return { isReadOnly: true, isTerminalStatus: false, status };

  const node = findByItemKey(appraisalTree, itemKey);
  // Menu not loaded yet OR user has no view permission for the item: keep read-only.
  if (!node) return { isReadOnly: true, isTerminalStatus: false, status };

  return { isReadOnly: !node.canEdit, isTerminalStatus: false, status };
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
  if (context?.appraisal?.basePath) return context.appraisal.basePath;
  const id = context?.appraisal?.appraisalId;
  return id ? `/appraisals/${id}` : '';
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
