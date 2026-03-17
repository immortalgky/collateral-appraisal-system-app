import { Outlet } from 'react-router-dom';
import { useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import Navbar from '@shared/components/Navbar';
import Sidebar, { MobileSidebar } from '@shared/components/Sidebar';
import Breadcrumb from '@shared/components/Breadcrumb';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import Icon from '@shared/components/Icon';
import Logo from '@assets/logo-lh-bank.svg';
import { useParametersQuery } from '@shared/api/parameters';
import { useAddressesQuery } from '@shared/api/addresses';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';
import { useNavigation } from '@shared/hooks/useNavigation';
import LoadingOverlay from '@shared/components/LoadingOverlay';
import {
  RightMenuPortalProvider,
  useRightMenuPortal,
} from '@shared/contexts/RightMenuPortalContext';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { useUIStore } from '@shared/store';

const userNavigation = [
  { name: 'Your profile', nameKey: 'userMenu.yourProfile', href: '#' },
  {
    name: 'Sign out',
    nameKey: 'userMenu.signOut',
    href: `${import.meta.env.VITE_API_URL}/connect/logout?client_id=spa&post_logout_redirect_uri=${import.meta.env.VITE_APP_URL}/`,
  },
];

/**
 * Component that conditionally renders the right menu toggle button
 * Only shows when there's content registered via RightMenuPortal
 */
function RightMenuToggle() {
  const portalContext = useRightMenuPortal();

  if (!portalContext?.hasContent || portalContext.isOpen) {
    return null;
  }

  return (
    <div className="hidden lg:flex shrink-0 border-l border-gray-100 bg-white">
      <button
        type="button"
        onClick={portalContext.onToggle}
        className="w-10 h-full flex items-start justify-center pt-4 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        title="Show details panel"
      >
        <Icon style="solid" name="chevron-left" className="size-4" />
      </button>
    </div>
  );
}

/**
 * Component that renders the right menu container with portal target
 * Always renders the portal target div so ref is available, but hides aside when no content
 */
function RightMenuContainer({ portalRef }: { portalRef: React.RefObject<HTMLDivElement | null> }) {
  const portalContext = useRightMenuPortal();
  const showSidebar = portalContext?.hasContent && portalContext.isOpen;

  return (
    <aside
      className={`${showSidebar ? 'lg:flex' : 'hidden'} hidden w-72 shrink-0 border-l border-gray-100 bg-white flex-col overflow-hidden`}
      style={{ height: '100%' }}
    >
      <div ref={portalRef} className="flex flex-col flex-1 min-h-0 overflow-hidden" />
    </aside>
  );
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
 * Non-rendering component that handles address loading.
 * useAddressesQuery fetches once and hydrates the Zustand store inside queryFn.
 */
function AddressLoader() {
  useAddressesQuery();
  return null;
}

function Layout() {
  const { items: breadcrumbItems } = useBreadcrumb();
  const { isOpen: isRightMenuOpen, onToggle: toggleRightMenu } = useDisclosure({
    defaultIsOpen: true,
  });
  const rightMenuPortalRef = useRef<HTMLDivElement>(null);
  const sidebarCollapsed = useUIStore(state => state.sidebarCollapsed);

  // Get role-based navigation
  const navigation = useNavigation();

  return (
    <RightMenuPortalProvider
      portalRef={rightMenuPortalRef}
      isOpen={isRightMenuOpen}
      onToggle={toggleRightMenu}
    >
      <ParameterLoader />
      <AddressLoader />
      <div className="h-screen flex flex-col">
        <MobileSidebar navigation={navigation} logo={Logo} />
        <Sidebar navigation={navigation} logo={Logo} />

        <div className={`${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-72'} flex-1 flex flex-col min-h-0 min-w-0 transition-all duration-300`}>
          <Navbar userNavigation={userNavigation} />

          <div className="flex-1 flex min-h-0 min-w-0">
            {/* Main Content */}
            <main className="py-4 flex-1 flex flex-col min-h-0 min-w-0 pr-4">
              <div className="px-4 sm:px-6 lg:px-6 flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
                <Breadcrumb items={breadcrumbItems} className="mb-4 shrink-0" />
                <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
                  <ErrorBoundary>
                    <Outlet />
                  </ErrorBoundary>
                </div>
              </div>
            </main>

            {/* Right Menu */}
            <RightMenuContainer portalRef={rightMenuPortalRef} />
            <RightMenuToggle />
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
    </RightMenuPortalProvider>
  );
}

export default Layout;
