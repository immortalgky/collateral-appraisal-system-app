import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import Navbar from '@shared/components/Navbar';
import AppraisalSidebar, { MobileAppraisalSidebar } from '@shared/components/AppraisalSidebar';
import Breadcrumb from '@shared/components/Breadcrumb';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import Logo from '@assets/logo-lh-bank.svg';
import { useParametersQuery } from '@shared/api/parameters';
import { useAddressesQuery } from '@shared/api/addresses';
import LoadingOverlay from '@shared/components/LoadingOverlay';
import { AppraisalProvider } from '@features/appraisal/context/AppraisalContext';
import { useGetAppraisalById } from '@features/appraisal/api/appraisal';
import { useGetRequestById } from '@features/request/api/requests';
import { DetailPageSkeleton } from '@shared/components/Skeleton';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import AppraisalRightMenu from '@features/appraisal/components/AppraisalRightMenu';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { useUIStore } from '@shared/store';
import { useMenuStore } from '@features/menuManagement/store';
import { PageReadOnlyContext } from '@shared/contexts/PageReadOnlyContext';

const RETURN_PATH_KEY = 'appraisalReturnPath';

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
        return parsed.returnPath ?? '/appraisals/search';
      }
    }
  } catch { /* ignore */ }
  return '/appraisals/search';
}

const userNavigation = [
  { name: 'Your profile', nameKey: 'userMenu.yourProfile', href: '#' },
  {
    name: 'Sign out',
    nameKey: 'userMenu.signOut',
    href: `${import.meta.env.VITE_API_URL}/connect/logout?client_id=spa&post_logout_redirect_uri=${import.meta.env.VITE_APP_URL}/`,
  },
];

// Map route segments to page labels
const routeLabels: Record<string, { label: string; icon: string }> = {
  request: { label: 'Request Information', icon: 'folder-open' },
  administration: { label: 'Administration', icon: 'user-tie' },
  appointment: { label: 'Appointment & Fee', icon: 'calendar-check' },
  summary: { label: 'Summary & Decision', icon: 'clipboard-check' },
  'activity-tracking': { label: 'Activity Tracking', icon: 'diagram-project' },
  property: { label: 'Property Information', icon: 'buildings' },
  'property-pma': { label: 'Property Information (PMA)', icon: 'buildings' },
  documents: { label: 'Document Checklist', icon: 'file-circle-check' },
  groups: { label: 'Groups', icon: 'layer-group' },
};

// Labels for property sub-routes
const propertySubRouteLabels: Record<string, { label: string; icon: string }> = {
  land: { label: 'Land', icon: 'map-location-dot' },
  building: { label: 'Building', icon: 'building' },
  condo: { label: 'Condominium', icon: 'city' },
  'land-building': { label: 'Land & Building', icon: 'house-chimney' },
  'market-comparable': { label: 'Market Comparable', icon: 'magnifying-glass-location' },
  'law-and-regulation': { label: 'Law & Regulation', icon: 'gavel' },
};

/**
 * Non-rendering component that handles parameter loading.
 * useParametersQuery fetches once and hydrates the Zustand store inside queryFn.
 */
function ParameterLoader() {
  useParametersQuery();
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
  const sidebarCollapsed = useUIStore(state => state.sidebarCollapsed);

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

  // Build breadcrumb items based on the current route
  const breadcrumbItems = useMemo(() => {
    const appraisalNo = appraisalData?.appraisalNumber || appraisalData?.id || appraisalId;
    const items = [
      { label: 'Appraisal Search', href: returnPath, icon: 'magnifying-glass' },
      { label: appraisalNo || '...', href: `/appraisals/${appraisalId}`, icon: 'file-certificate' },
    ];

    // Get current page from route
    const pathSegments = location.pathname.split('/').filter(Boolean);
    // Path is like: /appraisals/:appraisalId/administration or /appraisals/:appraisalId/property/land/new
    if (pathSegments.length >= 3) {
      const pageSegment = pathSegments[2]; // 'administration', 'property', etc.
      const pageInfo = routeLabels[pageSegment];
      if (pageInfo) {
        const isPropertyRoute = pageSegment === 'property' || pageSegment === 'property-pma';

        // Handle nested property routes: /appraisals/:id/property/land/new
        // Determine which tab the user came from so the breadcrumb links back correctly
        let propertyHrefSuffix = '';
        if (isPropertyRoute && pathSegments.length >= 4) {
          const propertyType = pathSegments[3];
          if (propertyType === 'market-comparable') {
            propertyHrefSuffix = '?tab=markets';
          } else if (propertyType === 'law-and-regulation') {
            propertyHrefSuffix = '?tab=laws';
          }
        }

        // Pricing analysis: /appraisals/:id/groups/:groupId/pricing-analysis[/:pricingAnalysisId]
        if (pageSegment === 'groups' && pathSegments.includes('pricing-analysis')) {
          items.push({
            label: 'Property Information',
            href: `/appraisals/${appraisalId}/property`,
            icon: 'buildings',
          });
          items.push({
            label: 'Pricing Analysis',
            href: location.pathname,
            icon: 'chart-mixed',
          });
          return items;
        }

        // Add page breadcrumb
        items.push({
          label: pageInfo.label,
          href: `/appraisals/${appraisalId}/${pageSegment}${propertyHrefSuffix}`,
          icon: pageInfo.icon,
        });

        // Add property sub-route breadcrumb (for both property and property-pma)
        if (isPropertyRoute && pathSegments.length >= 4) {
          const propertyType = pathSegments[3]; // 'land', 'building', 'condo', 'land-building', 'market-comparable'
          const propertyInfo = propertySubRouteLabels[propertyType];
          if (propertyInfo) {
            const isNew = pathSegments[4] === 'new';
            const pmaLabel = pageSegment === 'property-pma' ? ' (PMA)' : '';
            items.push({
              label: isNew ? `New ${propertyInfo.label}${pmaLabel}` : `${propertyInfo.label}${pmaLabel}`,
              href: location.pathname,
              icon: propertyInfo.icon,
            });
          }
        }
      }
    }

    return items;
  }, [appraisalData, appraisalId, location.pathname, returnPath]);

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
            isPma: (appraisalData as any).isPma ?? true, // TODO: change default back to false once backend returns isPma
            isBlockCondo: (appraisalData as any).purpose === '07',
            facilityLimit: (requestData as any)?.detail?.loanDetail?.facilityLimit ?? 0,
            hasAppraisalBook: (requestData as any)?.detail?.hasAppraisalBook ?? false,
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
          <div className={`${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-[256px]'} flex-1 flex flex-col min-h-0 transition-all duration-300`}>
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
          <div className={`${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-[256px]'} flex-1 flex flex-col min-h-0 transition-all duration-300`}>
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
      <AddressLoader />
      <div className="h-screen flex flex-col">
        <MobileAppraisalSidebar logo={Logo} />
        <AppraisalSidebar logo={Logo} />

        <div className={`${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-[256px]'} flex-1 flex flex-col min-h-0 transition-all duration-300`}>
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
            <main className="py-4 flex-1 flex flex-col min-h-0 min-w-0">
              <div className="px-4 sm:px-6 lg:px-8 flex-1 flex flex-col min-h-0 min-w-0">
                <Breadcrumb items={breadcrumbItems} className="mb-4 shrink-0" />
                <div className="flex-1 min-h-0 min-w-0">
                  <ErrorBoundary>
                      <Outlet />
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
      </div>
    </AppraisalProvider>
  );
}

export default AppraisalLayout;
