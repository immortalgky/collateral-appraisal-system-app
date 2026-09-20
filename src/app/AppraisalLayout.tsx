import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import SuspenseOutlet from '@shared/components/SuspenseOutlet';
import { useSidebarCssVar } from '@shared/hooks/useSidebarCssVar';

import Navbar from '@shared/components/Navbar';
import AppraisalSidebar, { MobileAppraisalSidebar } from '@shared/components/AppraisalSidebar';
import Breadcrumb from '@shared/components/Breadcrumb';
import { useAppraisalBreadcrumb } from './useAppraisalBreadcrumb';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import Logo from '@assets/logo-lh-bank.svg';
import { useParametersQuery } from '@shared/api/parameters';
import { useDealersQuery } from '@shared/api/dealers';
import { useAddressesQuery } from '@shared/api/addresses';
import LoadingOverlay from '@shared/components/LoadingOverlay';
import UploadProgressPanel from '@shared/components/UploadProgressPanel';
import { AppraisalProvider } from '@features/appraisal/context/AppraisalContext';
import { useGetAppraisalById } from '@features/appraisal/api/appraisal';
import { useGetRequestById } from '@features/request/api/requests';
import { DetailPageSkeleton } from '@shared/components/Skeleton';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import AppraisalRightMenu from '@features/appraisal/components/AppraisalRightMenu';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { useMenuStore } from '@features/menuManagement/store';
import { PageReadOnlyContext } from '@shared/contexts/PageReadOnlyContext';
import { userNavigation } from '@shared/config/userNavigation';
import { APPRAISAL_SEARCH_ROUTE, RETURN_PATH_KEY } from '@shared/constants/search';

/**
 * Resolve the return path for the Exit button.
 * Priority: location.state (fresh entry) → sessionStorage (internal navigation) → fallback.
 * Persists to sessionStorage so sidebar navigation doesn't lose the original returnPath.
 */
function resolveReturnPath(appraisalId: string, locationState: unknown): string {
  const fromState = (locationState as any)?.returnPath as string | undefined;
  if (fromState) {
    sessionStorage.setItem(RETURN_PATH_KEY, JSON.stringify({ appraisalId, returnPath: fromState }));
    return fromState;
  }
  try {
    const stored = sessionStorage.getItem(RETURN_PATH_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.appraisalId?.toLowerCase() === appraisalId?.toLowerCase()) {
        return parsed.returnPath ?? APPRAISAL_SEARCH_ROUTE;
      }
    }
  } catch { /* ignore */ }
  return APPRAISAL_SEARCH_ROUTE;
}

/**
 * Non-rendering component that handles parameter loading.
 * useParametersQuery fetches once and hydrates the Zustand store inside queryFn.
 */
function ParameterLoader() {
  useParametersQuery();
  return null;
}

/**
 * Non-rendering component that handles dealer loading.
 * useDealersQuery fetches once and hydrates the Zustand store inside queryFn.
 */
function DealerLoader() {
  useDealersQuery();
  return null;
}

/**
 * Non-rendering component that handles address loading.
 * useAddressesQuery fetches once and hydrates the Zustand store inside queryFn.
 */
function AddressLoader() {
  useAddressesQuery();
  return null;
}

function AppraisalLayout() {
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen: isRightMenuOpen, onToggle: toggleRightMenu } = useDisclosure({
    defaultIsOpen: true,
  });
  useSidebarCssVar();

  // /appraisals/:appraisalId/* is always read-only — editable work happens under /tasks/:taskId/*.
  // Persist returnPath in sessionStorage so internal sidebar navigation doesn't lose it.
  const returnPath = useMemo(
    () => resolveReturnPath(appraisalId!, location.state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appraisalId, location.state],
  );

  // Fetch appraisal data to get requestId and other info
  const {
    data: appraisalData,
    isLoading: isAppraisalLoading,
    isError: isAppraisalError,
    error: appraisalError,
  } = useGetAppraisalById(appraisalId);

  const { data: requestData } = useGetRequestById(appraisalData?.requestId);

  const isMenuLoaded = useMenuStore(s => s.isLoaded);
  const activeActivityId = useMenuStore(s => s.activeActivityId);

  // Breadcrumb: built from the URL, the sidebar menu and the page's own leaf.
  const breadcrumbItemsWithExtras = useAppraisalBreadcrumb({
    basePath: `/appraisals/${appraisalId}`,
    number: appraisalData?.appraisalNumber || appraisalData?.id || appraisalId || '...',
    returnPath,
  });

  // If no appraisalId, this shouldn't render
  if (!appraisalId) {
    return null;
  }

  // Prepare context value - map API response to AppraisalData shape
  const contextValue = useMemo(
    () => ({
      appraisal: appraisalData
        ? {
            appraisalId: appraisalData.id ?? appraisalId ?? '',
            requestId: appraisalData.requestId ?? '',
            appraisalReportNo: appraisalData.appraisalNumber ?? undefined,
            status: appraisalData.status ?? undefined,
            appraisalType: appraisalData.appraisalType ?? undefined,
            priority: appraisalData.priority ?? undefined,
            isPma: appraisalData?.isPma ?? true,
            isBlock: appraisalData?.isBlock ?? false,
            blockProjectType: appraisalData?.blockProjectType ?? undefined,
            facilityLimit: (requestData as any)?.detail?.loanDetail?.facilityLimit ?? 0,
            hasAppraisalBook: (requestData as any)?.detail?.hasAppraisalBook ?? false,
            inspectionNumber: (appraisalData as any)?.inspectionNumber ?? null,
            appraisalValue: (appraisalData as any)?.appraisalValue ?? null,
            basePath: `/appraisals/${appraisalId}`,
          }
        : null,
      isLoading: isAppraisalLoading,
      isError: isAppraisalError,
      error: appraisalError as Error | null,
    }),
    [appraisalData, appraisalId, isAppraisalLoading, isAppraisalError, appraisalError, requestData],
  );

  const isMenuSettledForReadOnly = isMenuLoaded && activeActivityId === null;
  const isPageLoading = isAppraisalLoading || !isMenuSettledForReadOnly;

  // Show loading skeleton while fetching appraisal data
  if (isPageLoading) {
    return (
      <AppraisalProvider value={contextValue}>
        <div className="h-screen flex flex-col">
          <MobileAppraisalSidebar logo={Logo} loading />
          <AppraisalSidebar logo={Logo} loading />
          <div className={"lg:pl-[var(--cas-sidebar-w)] flex-1 flex flex-col min-h-0 transition-all duration-300"}>
            <Navbar userNavigation={userNavigation} />
            <main className="py-4 flex-1 flex flex-col min-h-0">
              <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col min-h-0">
                <DetailPageSkeleton contentSections={2} />
              </div>
            </main>
          </div>
        </div>
      </AppraisalProvider>
    );
  }

  // Show error state if appraisal fetch failed
  if (isAppraisalError) {
    return (
      <AppraisalProvider value={contextValue}>
        <div className="h-screen flex flex-col">
          <MobileAppraisalSidebar logo={Logo} loading />
          <AppraisalSidebar logo={Logo} loading />
          <div className={"lg:pl-[var(--cas-sidebar-w)] flex-1 flex flex-col min-h-0 transition-all duration-300"}>
            <Navbar userNavigation={userNavigation} />
            <main className="py-4 flex-1 flex flex-col min-h-0">
              <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col items-center justify-center min-h-0">
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
            </main>
          </div>
        </div>
      </AppraisalProvider>
    );
  }

  return (
    <AppraisalProvider value={contextValue}>
      <ParameterLoader />
      <DealerLoader />
      <AddressLoader />
      <div className="h-screen flex flex-col">
        <MobileAppraisalSidebar logo={Logo} />
        <AppraisalSidebar logo={Logo} />

        <div className={"lg:pl-[var(--cas-sidebar-w)] flex-1 flex flex-col min-h-0 transition-all duration-300"}>
          <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200 shrink-0">
              <div className="flex items-center gap-2">
                <Icon name="lock" style="solid" className="size-3.5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Read-Only Mode</span>
                <span className="text-sm text-amber-600">— View Only</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem(RETURN_PATH_KEY);
                  navigate(returnPath);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <Icon name="xmark" style="solid" className="size-3.5" />
                Exit
              </button>
            </div>
          <Navbar userNavigation={userNavigation} />

          <PageReadOnlyContext.Provider value={true}>
          <div className="flex-1 flex min-h-0">
            {/* Main Content */}
            <main className="py-4 has-[[data-page-actions]]:pb-0 flex-1 flex flex-col min-h-0 min-w-0">
              <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col min-h-0 min-w-0">
                <Breadcrumb items={breadcrumbItemsWithExtras} className="mb-4 shrink-0" />
                <div className="flex-1 min-h-0 min-w-0">
                  <ErrorBoundary>
                      <SuspenseOutlet />
                  </ErrorBoundary>
                </div>
              </div>
            </main>

            {/* Right Menu */}
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
          </PageReadOnlyContext.Provider>
        </div>

        <LoadingOverlay />
        <UploadProgressPanel />
      </div>
    </AppraisalProvider>
  );
}

export default AppraisalLayout;
