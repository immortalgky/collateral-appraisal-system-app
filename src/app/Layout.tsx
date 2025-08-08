import { Outlet } from 'react-router-dom';

import Navbar from '@shared/components/Navbar';
import Sidebar, { MobileSidebar } from '@shared/components/Sidebar';
import Logo from '@assets/logo-lh-bank.svg';
import Icon from '@shared/components/Icon';
import { useAllParameters } from '@/shared/api/parameters';
import { useEffect } from 'react';
import { useParameterStore } from '@/shared/store';

const navigation = [
  {
    name: 'Dashboard',
    href: '#',
    icon: () => <Icon style="duotone" name="chart-line" />,
    current: true,
  },
  {
    name: 'Task',
    href: '#',
    icon: () => <Icon style="duotone" name="bars-progress" />,
    current: false,
  },
  {
    name: 'Notification',
    href: '#',
    icon: () => <Icon style="duotone" name="bell" />,
    current: false,
  },
  {
    name: 'Appraisal Search',
    href: '#',
    icon: () => <Icon style="duotone" name="magnifying-glass" />,
    current: false,
  },
  {
    name: 'Standalone',
    href: '#',
    icon: () => <Icon style="light" name="chart-line" />,
    current: false,
  },
  {
    name: 'Parameter',
    href: '#',
    icon: () => <Icon style="light" name="chart-line" />,
    current: false,
  },
];

const userNavigation = [
  { name: 'Your profile', href: '#' },
  { name: 'Sign out', href: '#' },
];

function Layout() {
  const { data, isSuccess } = useAllParameters();
  const { setParameters } = useParameterStore();
  useEffect(() => {
    if (isSuccess && data !== undefined) {
      setParameters(data);
    }
  }, [data, isSuccess, setParameters]);

  return (
    <>
      <div>
        <MobileSidebar navigation={navigation} logo={Logo} />

        <Sidebar navigation={navigation} logo={Logo} />

        <div className="lg:pl-72">
          <Navbar userNavigation={userNavigation} />

          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default Layout;
