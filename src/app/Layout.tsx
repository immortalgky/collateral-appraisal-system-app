import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from '@shared/components/Navbar';
import Sidebar, { MobileSidebar } from '@shared/components/Sidebar';
import Breadcrumb from '@shared/components/Breadcrumb';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import Logo from '@assets/logo-lh-bank.svg';
import { mainNavigation, userNavigation } from '@shared/config/navigation';
import { useAllParameters } from '@shared/api/parameters';
import { useParameterStore } from '@shared/store';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';

function Layout() {
  const { data, isSuccess } = useAllParameters();
  const { setParameters } = useParameterStore();
  const { items: breadcrumbItems } = useBreadcrumb();

  useEffect(() => {
    if (isSuccess && data !== undefined) {
      setParameters(data);
    }
  }, [data, isSuccess, setParameters]);

  return (
    <div>
      <MobileSidebar navigation={mainNavigation} logo={Logo} />
      <Sidebar navigation={mainNavigation} logo={Logo} />

      <div className="lg:pl-72">
        <Navbar userNavigation={userNavigation} />

        <main className="py-4">
          <div className="px-4 sm:px-6 lg:px-8">
            <Breadcrumb items={breadcrumbItems} className="mb-4" />
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
