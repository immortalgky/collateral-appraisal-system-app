import { Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Navbar from '@shared/components/Navbar';
import AppraisalSidebar, { MobileAppraisalSidebar } from '@shared/components/AppraisalSidebar';
import Breadcrumb from '@shared/components/Breadcrumb';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import Logo from '@assets/logo-lh-bank.svg';
import { useParametersQuery } from '@shared/api/parameters';
import { useAddressesQuery } from '@shared/api/addresses';
import LoadingOverlay from '@shared/components/LoadingOverlay';
import { AppraisalProvider } from '@features/appraisal/context/AppraisalContext';
import { ActivityMenuSync } from '@features/menuManagement/ActivityMenuSync';
import { useGetAppraisalById } from '@features/appraisal/api/appraisal';
import { useGetRequestById } from '@features/request/api/requests';
import type { TaskDetailResult } from '@features/appraisal/api/workflow';
import { useGetTaskById } from '@features/appraisal/api/workflow';
import { useAdminUnlockTask, useHeartbeatTaskLock, useUnlockTask } from '@features/task/api';
import type { PoolTaskUpdateEvent } from '@features/task/hooks/useWorkflowHub';
import { useWorkflowHub } from '@features/task/hooks/useWorkflowHub';
import { useAuthStore } from '@features/auth/store';
import { DetailPageSkeleton } from '@shared/components/Skeleton';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import AppraisalRightMenu from '@features/appraisal/components/AppraisalRightMenu';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { useUIStore } from '@shared/store';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Keeps a pool-task lock alive while the user is on the page.
 * Sends a DELETE on beforeunload so the lock is released if the tab closes.
 */
function useTaskLockHeartbeat(taskId: string | undefined, isLockOwner: boolean) {
  const { mutate: heartbeat } = useHeartbeatTaskLock();
  const { mutate: unlock } = useUnlockTask();
  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;
  const isOwnerRef = useRef(isLockOwner);
  isOwnerRef.current = isLockOwner;
  const pendingUnlockRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLockOwner || !taskId) return;

    // Cancel any unlock scheduled by a React Strict Mode artificial cleanup
    if (pendingUnlockRef.current !== null) {
      clearTimeout(pendingUnlockRef.current);
      pendingUnlockRef.current = null;
    }

    const capturedTaskId = taskId;

    const intervalId = setInterval(() => {
      if (taskIdRef.current && isOwnerRef.current) {
        heartbeat(taskIdRef.current);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      // Defer the unlock so React Strict Mode's artificial re-mount can cancel it.
      // On a real unmount (navigation), nothing cancels the timeout and it fires.
      pendingUnlockRef.current = setTimeout(() => {
        pendingUnlockRef.current = null;
        unlock(capturedTaskId);
      }, 0);
    };
    // Only re-run when ownership or taskId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLockOwner, taskId]);
}

const userNavigation = [
  { name: 'Your profile', nameKey: 'userMenu.yourProfile', href: '#' },
  {
    name: 'Sign out',
    nameKey: 'userMenu.signOut',
    href: `${import.meta.env.VITE_API_URL}/connect/logout?client_id=spa&post_logout_redirect_uri=${import.meta.env.VITE_APP_URL}/`,
  },
];

const routeLabels: Record<string, { label: string; icon: string }> = {
  request: { label: 'Request Information', icon: 'folder-open' },
  administration: { label: 'Administration', icon: 'user-tie' },
  appointment: { label: 'Appointment & Fee', icon: 'calendar-check' },
  summary: { label: 'Summary & Decision', icon: 'clipboard-check' },
  property: { label: 'Property Information', icon: 'buildings' },
  'property-pma': { label: 'Property Information (PMA)', icon: 'buildings' },
  documents: { label: 'Document Checklist', icon: 'file-circle-check' },
  groups: { label: 'Groups', icon: 'layer-group' },
  'provide-documents': { label: 'Provide Additional Documents', icon: 'file-circle-plus' },
};

const propertySubRouteLabels: Record<string, { label: string; icon: string }> = {
  land: { label: 'Land', icon: 'map-location-dot' },
  building: { label: 'Building', icon: 'building' },
  condo: { label: 'Condominium', icon: 'city' },
  'land-building': { label: 'Land & Building', icon: 'house-chimney' },
  'market-comparable': { label: 'Market Comparable', icon: 'magnifying-glass-location' },
  'law-and-regulation': { label: 'Law & Regulation', icon: 'gavel' },
};

function ParameterLoader() {
  useParametersQuery();
  return null;
}

function AddressLoader() {
  useAddressesQuery();
  return null;
}

function TaskLayout() {
  const { taskId } = useParams<{ taskId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen: isRightMenuOpen, onToggle: toggleRightMenu } = useDisclosure({
    defaultIsOpen: true,
  });
  const sidebarCollapsed = useUIStore(state => state.sidebarCollapsed);
  const currentUsername = useAuthStore(s => s.user?.username);
  const currentUser = useAuthStore(s => s.user);

  // Step 1: Fetch task detail (validates ownership)
  const {
    data: taskData,
    isLoading: isTaskLoading,
    isError: isTaskError,
    error: taskError,
  } = useGetTaskById(taskId);

  // Step 2: Fetch appraisal data using appraisalId from task (may be null before appraisal is created)
  const appraisalId = taskData?.appraisalId ?? undefined;
  const {
    data: appraisalData,
    isLoading: isAppraisalLoading,
    isError: isAppraisalError,
    error: appraisalError,
  } = useGetAppraisalById(appraisalId);

  // Step 3: Fetch request data — via appraisal when available, else directly from task
  const requestId = appraisalData?.requestId ?? taskData?.requestId;
  const { data: requestData } = useGetRequestById(requestId);

  const isLoading = isTaskLoading || (!!appraisalId && isAppraisalLoading);

  // Pool task lock awareness
  const isPoolTask = taskData?.assignedType === '2';
  const lockOwner = taskData?.workingBy ?? null;
  const isLockOwner = isPoolTask && !!lockOwner && lockOwner === currentUsername;
  const isLockedByOther = isPoolTask && !!lockOwner && lockOwner !== currentUsername;
  const isAdmin = currentUser?.permissions?.includes('TASK_LOCK_MANAGE') ?? false;

  // Heartbeat — only active when this user holds the lock
  useTaskLockHeartbeat(isLockOwner ? taskId : undefined, isLockOwner);

  const { mutate: adminUnlock, isPending: isAdminUnlocking } = useAdminUnlockTask();

  // Real-time SignalR: keep lock state in sync while on the task page
  const queryClient = useQueryClient();
  const poolGroups = isPoolTask && taskData?.assigneeUserId ? [taskData.assigneeUserId] : [];

  useWorkflowHub({
    poolGroups,
    onPoolTaskUpdate: useCallback(
      (event: PoolTaskUpdateEvent) => {
        if (event.taskId !== taskId) return;
        if (event.type === 'PoolTaskClaimed') {
          // Task has been permanently claimed by another user — refetch to get updated state
          queryClient.invalidateQueries({ queryKey: ['task', taskId] });
          return;
        }
        queryClient.setQueryData<TaskDetailResult>(['task', taskId], old =>
          old
            ? {
                ...old,
                workingBy: event.type === 'PoolTaskLocked' ? (event.lockedBy ?? null) : null,
                lockedAt: event.type === 'PoolTaskLocked' ? event.timestamp : null,
              }
            : old,
        );
      },
      [queryClient, taskId],
    ),
  });

  // Build breadcrumb
  const breadcrumbItems = useMemo(() => {
    const appraisalNo = appraisalData?.appraisalNumber || appraisalId || taskId;
    const items = [
      { label: 'Task', href: '/tasks', icon: 'list-check' },
      { label: appraisalNo || '...', href: `/tasks/${taskId}`, icon: 'file-certificate' },
    ];

    const pathSegments = location.pathname.split('/').filter(Boolean);
    // Path: /tasks/:taskId/administration etc.
    if (pathSegments.length >= 3) {
      const pageSegment = pathSegments[2];
      const pageInfo = routeLabels[pageSegment];
      if (pageInfo) {
        const isPropertyRoute = pageSegment === 'property' || pageSegment === 'property-pma';

        let propertyHrefSuffix = '';
        if (isPropertyRoute && pathSegments.length >= 4) {
          const propertyType = pathSegments[3];
          if (propertyType === 'market-comparable') propertyHrefSuffix = '?tab=markets';
          else if (propertyType === 'law-and-regulation') propertyHrefSuffix = '?tab=laws';
        }

        if (pageSegment === 'groups' && pathSegments.includes('pricing-analysis')) {
          items.push({
            label: 'Property Information',
            href: `/tasks/${taskId}/property`,
            icon: 'buildings',
          });
          items.push({ label: 'Pricing Analysis', href: location.pathname, icon: 'chart-mixed' });
          return items;
        }

        items.push({
          label: pageInfo.label,
          href: `/tasks/${taskId}/${pageSegment}${propertyHrefSuffix}`,
          icon: pageInfo.icon,
        });

        if (isPropertyRoute && pathSegments.length >= 4) {
          const propertyType = pathSegments[3];
          const propertyInfo = propertySubRouteLabels[propertyType];
          if (propertyInfo) {
            const isNew = pathSegments[4] === 'new';
            const pmaLabel = pageSegment === 'property-pma' ? ' (PMA)' : '';
            items.push({
              label: isNew
                ? `New ${propertyInfo.label}${pmaLabel}`
                : `${propertyInfo.label}${pmaLabel}`,
              href: location.pathname,
              icon: propertyInfo.icon,
            });
          }
        }
      }
    }

    return items;
  }, [appraisalData, appraisalId, taskId, location.pathname]);

  // Build context with workflow fields (must be before early returns — Rules of Hooks)
  const contextValue = useMemo(() => {
    const commonWorkflowFields = {
      facilityLimit: (requestData as any)?.detail?.loanDetail?.facilityLimit ?? 0,
      hasAppraisalBook: (requestData as any)?.detail?.hasAppraisalBook ?? false,
      workflowInstanceId: taskData?.workflowInstanceId,
      activityId: taskData?.activityId,
      isTaskOwner: taskData?.isOwner ?? false,
      basePath: `/tasks/${taskId}`,
    };

    if (appraisalData) {
      // Full appraisal context (task has an appraisal)
      return {
        appraisal: {
          appraisalId: appraisalData.id ?? appraisalId ?? '',
          requestId: appraisalData.requestId ?? '',
          appraisalReportNo: appraisalData.appraisalNumber ?? undefined,
          status: appraisalData.status ?? undefined,
          appraisalType: appraisalData.appraisalType ?? undefined,
          priority: appraisalData.priority ?? undefined,
          isPma: (appraisalData as any).isPma ?? true,
          isBlockCondo: (appraisalData as any).purpose === '07',
          ...commonWorkflowFields,
        },
        isLoading: false,
        isError: false,
        error: null,
      };
    }

    // No appraisal yet — provide request-level context so nav and right menu still work
    const effectiveRequestId = requestId ?? '';
    return {
      appraisal: effectiveRequestId
        ? {
            appraisalId: '',
            requestId: effectiveRequestId,
            ...commonWorkflowFields,
          }
        : null,
      isLoading: false,
      isError: false,
      error: null,
    };
  }, [appraisalData, appraisalId, taskData, taskId, requestData, requestId]);

  if (!taskId) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <MobileAppraisalSidebar appraisalId={appraisalId ?? taskId} logo={Logo} />
        <AppraisalSidebar appraisalId={appraisalId ?? taskId} logo={Logo} />
        <div
          className={`${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-[256px]'} flex-1 flex flex-col min-h-0 transition-all duration-300`}
        >
          <Navbar userNavigation={userNavigation} />
          <main className="py-4 flex-1 flex flex-col min-h-0">
            <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col min-h-0">
              <DetailPageSkeleton contentSections={2} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Task error: 403 (not owner) or 404 (not found)
  if (isTaskError) {
    const status = (taskError as any)?.response?.status;
    const is403 = status === 403;

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <Icon
          style="solid"
          name={is403 ? 'lock' : 'circle-exclamation'}
          className={`size-16 ${is403 ? 'text-amber-500' : 'text-red-500'}`}
        />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          {is403 ? 'Access Denied' : 'Task Not Found'}
        </h2>
        <p className="mt-2 text-gray-500 text-center max-w-md">
          {is403
            ? 'This task is not assigned to you. You do not have permission to view or work on this task.'
            : 'The task you are looking for does not exist or has already been completed.'}
        </p>
        <Button className="mt-6" onClick={() => navigate('/tasks')}>
          <Icon style="solid" name="arrow-left" className="size-4 mr-2" />
          Back to Tasks
        </Button>
      </div>
    );
  }

  // Appraisal fetch error (only relevant when appraisalId is present; without it the query is disabled)
  if (appraisalId && isAppraisalError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <Icon style="solid" name="triangle-exclamation" className="size-16 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Failed to load appraisal</h2>
        <p className="mt-2 text-gray-500">
          {(appraisalError as Error)?.message || 'Unknown error'}
        </p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          <Icon style="solid" name="rotate-right" className="size-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <AppraisalProvider value={contextValue}>
      <ParameterLoader />
      <AddressLoader />
      <ActivityMenuSync activityId={taskData?.activityId} />
      <div className="h-screen flex flex-col">
        <MobileAppraisalSidebar appraisalId={appraisalId ?? taskId!} logo={Logo} />
        <AppraisalSidebar appraisalId={appraisalId ?? taskId!} logo={Logo} />

        <div
          className={`${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-[256px]'} flex-1 flex flex-col min-h-0 transition-all duration-300`}
        >
          <Navbar userNavigation={userNavigation} />

          <div className="flex-1 flex min-h-0">
            <main className="py-4 flex-1 flex flex-col min-h-0 min-w-0">
              <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col min-h-0 min-w-0">
                <Breadcrumb items={breadcrumbItems} className="mb-4 shrink-0" />

                {/* Pool task lock banners */}
                {isLockedByOther && (
                  <div className="mb-4 shrink-0 flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    <Icon
                      style="solid"
                      name="lock"
                      className="size-4 text-amber-500 flex-shrink-0"
                    />
                    <span className="flex-1">
                      This task is currently being edited by <strong>{lockOwner}</strong>. You are
                      viewing in read-only mode.
                    </span>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-300 text-amber-700 hover:bg-amber-100"
                        disabled={isAdminUnlocking}
                        onClick={() => adminUnlock(taskId!)}
                      >
                        {isAdminUnlocking ? (
                          <Icon
                            style="solid"
                            name="spinner"
                            className="size-3.5 animate-spin mr-1.5"
                          />
                        ) : (
                          <Icon style="solid" name="lock-open" className="size-3.5 mr-1.5" />
                        )}
                        Release Lock
                      </Button>
                    )}
                  </div>
                )}

                {isLockOwner && (
                  <div className="mb-4 shrink-0 flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                    <Icon
                      style="solid"
                      name="lock"
                      className="size-4 text-blue-500 flex-shrink-0"
                    />
                    <span>You are currently editing this pool task. Lock is active.</span>
                  </div>
                )}

                <div className="flex-1 min-h-0 min-w-0">
                  <ErrorBoundary>
                    <Outlet />
                  </ErrorBoundary>
                </div>
              </div>
            </main>

            {isRightMenuOpen ? (
              <aside
                className="hidden lg:flex w-72 shrink-0 border-l border-gray-100 bg-white flex-col overflow-hidden"
                style={{ height: '100%' }}
              >
                <AppraisalRightMenu onClose={toggleRightMenu} />
              </aside>
            ) : (
              <div className="hidden lg:flex shrink-0 border-l border-gray-100 bg-white">
                <button
                  type="button"
                  onClick={toggleRightMenu}
                  className="w-10 h-full flex items-start justify-center pt-4 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Show application details"
                >
                  <Icon style="solid" name="chevron-left" className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <LoadingOverlay />
      </div>
    </AppraisalProvider>
  );
}

/**
 * Redirect to the appropriate default page for this task type.
 * For 'provide-additional-documents' tasks, redirect to the followup page.
 * For all other tasks, redirect to the request information page.
 */
export const TaskIndexRedirect = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { data: taskData } = useGetTaskById(taskId);
  const appraisalId = taskData?.appraisalId ?? undefined;
  const { data: appraisalData } = useGetAppraisalById(appraisalId);
  // Use requestId from appraisal when available, fall back to task's own requestId
  const requestId = appraisalData?.requestId ?? taskData?.requestId;

  // Followup task lands on the provide-documents page
  if (taskData?.activityId === 'provide-additional-documents') {
    return <Navigate to={`/tasks/${taskId}/provide-documents`} replace />;
  }

  if (requestId) {
    return <Navigate to={`/tasks/${taskId}/request/${requestId}`} replace />;
  }

  return null;
};

export default TaskLayout;
