import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import Navbar from '@shared/components/Navbar';
import AppraisalSidebar, { MobileAppraisalSidebar } from '@shared/components/AppraisalSidebar';
import Breadcrumb from '@shared/components/Breadcrumb';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import Logo from '@assets/logo-lh-bank.svg';
import { useParametersQuery } from '@shared/api/parameters';
import LoadingOverlay from '@shared/components/LoadingOverlay';
import { AppraisalProvider } from '@features/appraisal/context/AppraisalContext';
import { useGetAppraisalById } from '@features/appraisal/api/appraisal';
import { DetailPageSkeleton } from '@shared/components/Skeleton';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import AppraisalRightMenu from '@features/appraisal/components/AppraisalRightMenu';
import { useDisclosure } from '@shared/hooks/useDisclosure';

const userNavigation = [
  { name: 'Your profile', href: '#' },
  { name: 'Sign out', href: '#' },
];

// Map route segments to page labels
const routeLabels: Record<string, { label: string; icon: string }> = {
  request: { label: 'Request Information', icon: 'folder-open' },
  administration: { label: 'Administration', icon: 'user-tie' },
  appointment: { label: 'Appointment & Fee', icon: 'calendar-check' },
  summary: { label: 'Summary & Decision', icon: 'clipboard-check' },
  property: { label: 'Property Information', icon: 'buildings' },
  documents: { label: 'Document Checklist', icon: 'file-circle-check' },
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

function AppraisalLayout() {
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const location = useLocation();
  const { isOpen: isRightMenuOpen, onToggle: toggleRightMenu } = useDisclosure({
    defaultIsOpen: true,
  });

  // Fetch appraisal data to get requestId and other info
  const {
    data: appraisalData,
    isLoading: isAppraisalLoading,
    isError: isAppraisalError,
    error: appraisalError,
  } = useGetAppraisalById(appraisalId);

  // Build breadcrumb items based on the current route
  const breadcrumbItems = useMemo(() => {
    const appraisalNo = appraisalData?.appraisalNumber || appraisalData?.id || appraisalId;
    const items = [
      { label: 'Task', href: '/tasks', icon: 'list-check' },
      { label: appraisalNo || '...', href: `/appraisal/${appraisalId}`, icon: 'file-certificate' },
    ];

    // Get current page from route
    const pathSegments = location.pathname.split('/').filter(Boolean);
    // Path is like: /appraisal/:appraisalId/administration or /appraisal/:appraisalId/property/land/new
    if (pathSegments.length >= 3) {
      const pageSegment = pathSegments[2]; // 'administration', 'property', etc.
      const pageInfo = routeLabels[pageSegment];
      if (pageInfo) {
        // Handle nested property routes: /appraisal/:id/property/land/new
        // Determine which tab the user came from so the breadcrumb links back correctly
        let propertyHrefSuffix = '';
        if (pageSegment === 'property' && pathSegments.length >= 4) {
          const propertyType = pathSegments[3];
          if (propertyType === 'market-comparable') {
            propertyHrefSuffix = '?tab=markets';
          } else if (propertyType === 'law-and-regulation') {
            propertyHrefSuffix = '?tab=laws';
          }
        }

        // Add page breadcrumb
        items.push({
          label: pageInfo.label,
          href: `/appraisal/${appraisalId}/${pageSegment}${propertyHrefSuffix}`,
          icon: pageInfo.icon,
        });

        // Add property sub-route breadcrumb
        if (pageSegment === 'property' && pathSegments.length >= 4) {
          const propertyType = pathSegments[3]; // 'land', 'building', 'condo', 'land-building', 'market-comparable'
          const propertyInfo = propertySubRouteLabels[propertyType];
          if (propertyInfo) {
            const isNew = pathSegments[4] === 'new';
            items.push({
              label: isNew ? `New ${propertyInfo.label}` : propertyInfo.label,
              href: location.pathname,
              icon: propertyInfo.icon,
            });
          }
        }
      }
    }

    return items;
  }, [appraisalData, appraisalId, location.pathname]);

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
          }
        : null,
      isLoading: isAppraisalLoading,
      isError: isAppraisalError,
      error: appraisalError as Error | null,
    }),
    [appraisalData, appraisalId, isAppraisalLoading, isAppraisalError, appraisalError],
  );

  // Show loading skeleton while fetching appraisal data
  if (isAppraisalLoading) {
    return (
      <div className="h-screen flex flex-col">
        <MobileAppraisalSidebar appraisalId={appraisalId} logo={Logo} />
        <AppraisalSidebar appraisalId={appraisalId} logo={Logo} />
        <div className="lg:pl-[256px] flex-1 flex flex-col min-h-0">
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

  // Show error state if appraisal fetch failed
  if (isAppraisalError) {
    return (
      <div className="h-screen flex flex-col">
        <MobileAppraisalSidebar appraisalId={appraisalId} logo={Logo} />
        <AppraisalSidebar appraisalId={appraisalId} logo={Logo} />
        <div className="lg:pl-[256px] flex-1 flex flex-col min-h-0">
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
    );
  }

  return (
    <AppraisalProvider value={contextValue}>
      <ParameterLoader />
      <div className="h-screen flex flex-col">
        <MobileAppraisalSidebar appraisalId={appraisalId} logo={Logo} />
        <AppraisalSidebar appraisalId={appraisalId} logo={Logo} />

        <div className="lg:pl-[256px] flex-1 flex flex-col min-h-0">
          <Navbar userNavigation={userNavigation} />

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
        </div>

        <LoadingOverlay />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#363636',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </AppraisalProvider>
  );
}

export default AppraisalLayout;
