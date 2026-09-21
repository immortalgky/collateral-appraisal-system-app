import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Navbar from '@shared/components/Navbar';
import AppraisalSidebar, { MobileAppraisalSidebar } from '@shared/components/AppraisalSidebar';
import Breadcrumb from '@shared/components/Breadcrumb';
import { useAppraisalBreadcrumb } from './useAppraisalBreadcrumb';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import SuspenseOutlet from '@shared/components/SuspenseOutlet';
import Logo from '@assets/logo-lh-bank.svg';
import { useParametersQuery } from '@shared/api/parameters';
import { useDealersQuery } from '@shared/api/dealers';
import { useAddressesQuery } from '@shared/api/addresses';
import LoadingOverlay from '@shared/components/LoadingOverlay';
import UploadProgressPanel from '@shared/components/UploadProgressPanel';
import { AppraisalProvider } from '@features/appraisal/context/AppraisalContext';
import { ActivityMenuSync } from '@features/menuManagement/ActivityMenuSync';
import { useMenuStore } from '@features/menuManagement/store';
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
import { useSidebarCssVar } from '@shared/hooks/useSidebarCssVar';
import { userNavigation } from '@shared/config/userNavigation';

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

function ParameterLoader() {
  useParametersQuery();
  return null;
}

function DealerLoader() {
  useDealersQuery();
  return null;
}

function AddressLoader() {
  useAddressesQuery();
  return null;
}

function TaskLayout() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { isOpen: isRightMenuOpen, onToggle: toggleRightMenu } = useDisclosure({
    defaultIsOpen: true,
  });
  useSidebarCssVar();

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

  const isMenuLoaded = useMenuStore(s => s.isLoaded);
  const activeActivityId = useMenuStore(s => s.activeActivityId);
  const expectedActivityId = taskData?.activityId ?? null;
  const isMenuSynced = isMenuLoaded && activeActivityId === expectedActivityId;

  const isLoading =
    isTaskLoading || (!!appraisalId && isAppraisalLoading) || (!!taskData && !isMenuSynced);

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

  // Breadcrumb: built from the URL, the sidebar menu and the page's own leaf.
  const breadcrumbItemsWithExtras = useAppraisalBreadcrumb({
    basePath: `/tasks/${taskId}`,
    number:
      appraisalData?.appraisalNumber ||
      requestData?.requestNumber ||
      appraisalId ||
      taskId ||
      '...',
  });

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
          requestedAt: appraisalData.requestedAt ?? undefined,
          appraisalReportNo: appraisalData.appraisalNumber ?? undefined,
          status: appraisalData.status ?? undefined,
          appraisalType: appraisalData.appraisalType ?? undefined,
          priority: appraisalData.priority ?? undefined,
          isPma: appraisalData?.isPma ?? true,
          isBlock: appraisalData?.isBlock ?? false,
          blockProjectType: appraisalData?.blockProjectType ?? undefined,
          inspectionNumber: (appraisalData as any)?.inspectionNumber ?? null,
          appraisalValue: (appraisalData as any)?.appraisalValue ?? null,
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

  let body: ReactNode;

  if (isLoading) {
    body = (
      <div className="h-screen flex flex-col">
        <MobileAppraisalSidebar logo={Logo} loading />
        <AppraisalSidebar logo={Logo} loading />
        <div
          className={"lg:pl-[var(--cas-sidebar-w)] flex-1 flex flex-col min-h-0 transition-all duration-300"}
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
  } else if (isTaskError) {
    const status = (taskError as any)?.response?.status;
    const is403 = status === 403;

    body = (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-base-200">
        <Icon
          style="solid"
          name={is403 ? 'lock' : 'circle-exclamation'}
          className={`size-16 ${is403 ? 'text-amber-500' : 'text-red-500'}`}
        />
        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-base-content">
          {is403 ? 'Access Denied' : 'Task Not Found'}
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400 text-center max-w-md">
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
  } else if (appraisalId && isAppraisalError) {
    body = (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-base-200">
        <Icon style="solid" name="triangle-exclamation" className="size-16 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-base-content">Failed to load appraisal</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {(appraisalError as Error)?.message || 'Unknown error'}
        </p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          <Icon style="solid" name="rotate-right" className="size-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="h-screen flex flex-col">
        <MobileAppraisalSidebar logo={Logo} />
        <AppraisalSidebar logo={Logo} />

        <div
          className={"lg:pl-[var(--cas-sidebar-w)] flex-1 flex flex-col min-h-0 transition-all duration-300"}
        >
          <Navbar userNavigation={userNavigation} />

          <div className="flex-1 flex min-h-0">
            <main className="py-4 has-[[data-page-actions]]:pb-0 flex-1 flex flex-col min-h-0 min-w-0">
              <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col min-h-0 min-w-0">
                <Breadcrumb items={breadcrumbItemsWithExtras} className="mb-4 shrink-0" />

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
                    <SuspenseOutlet />
                  </ErrorBoundary>
                </div>
              </div>
            </main>

            {isRightMenuOpen ? (
              <aside
                className="hidden lg:flex w-72 shrink-0 border-l border-gray-100 dark:border-base-300 bg-white dark:bg-base-100 flex-col overflow-hidden"
                style={{ height: '100%' }}
              >
                <AppraisalRightMenu onClose={toggleRightMenu} />
              </aside>
            ) : (
              <div className="hidden lg:flex shrink-0 border-l border-gray-100 dark:border-base-300 bg-white dark:bg-base-100">
                <button
                  type="button"
                  onClick={toggleRightMenu}
                  className="w-10 h-full flex items-start justify-center pt-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-base-200 transition-colors"
                  title="Show application details"
                >
                  <Icon style="solid" name="chevron-left" className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <LoadingOverlay />
        <UploadProgressPanel />
      </div>
    );
  }

  return (
    <AppraisalProvider value={contextValue}>
      <ActivityMenuSync activityId={taskData?.activityId} />
      <ParameterLoader />
      <DealerLoader />
      <AddressLoader />
      {body}
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

  // Quotation tasks — redirect to the appropriate quotation sub-route.
  // Must be checked BEFORE the provide-additional-documents branch and the request fallback.
  if (taskData?.activityId === 'ext-collect-submissions') {
    return <Navigate to={`/tasks/${taskId}/quotation/submit`} replace />;
  }
  if (taskData?.activityId === 'ext-respond-negotiation') {
    return <Navigate to={`/tasks/${taskId}/quotation/respond-negotiation`} replace />;
  }
  if (taskData?.activityId === 'rm-pick-winner') {
    return <Navigate to={`/tasks/${taskId}/quotation/pick-winner`} replace />;
  }
  if (taskData?.activityId === 'admin-review-submissions') {
    return <Navigate to={`/tasks/${taskId}/quotation/review`} replace />;
  }
  if (taskData?.activityId === 'admin-finalize') {
    return <Navigate to={`/tasks/${taskId}/quotation/finalize`} replace />;
  }

  // Followup task lands on the provide-documents page
  if (taskData?.activityId === 'provide-additional-documents') {
    return <Navigate to={`/tasks/${taskId}/provide-documents`} replace />;
  }

  // Fee & appointment approval task
  if (taskData?.activityId === 'fee-appointment-approval') {
    return <Navigate to={`/tasks/${taskId}/fee-appointment-approval`} replace />;
  }

  if (requestId) {
    return <Navigate to={`/tasks/${taskId}/request/${requestId}`} replace />;
  }

  return null;
};

export default TaskLayout;
