import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '../store';
import Icon from './Icon';
import type { NavItem } from '@shared/config/navigation';

type SidebarProps = {
  navigation: NavItem[];
  logo: string;
};

function MenuItem({ item }: { item: NavItem }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = location.pathname === item.href;
  const hasChildren = item.children && item.children.length > 0;
  const iconClass = `size-6 ${item.iconColor || ''}`;
  const iconStyle = item.iconStyle || 'solid';

  if (hasChildren) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between py-2 px-2 transition-colors duration-200"
        >
          <span className="flex items-center gap-3">
            <Icon name={item.icon} style={iconStyle} className={iconClass} />
            {item.name}
          </span>
          <Icon
            name="chevron-down"
            style="solid"
            className={`size-4 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <ul
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {item.children?.map(child => (
            <MenuItem key={child.href} item={child} />
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li>
      <Link to={item.href} className={`py-2 px-2 transition-colors duration-200 ${isActive ? 'menu-active' : ''}`}>
        <Icon name={item.icon} style={iconStyle} className={iconClass} />
        {item.name}
      </Link>
    </li>
  );
}

export function MobileSidebar({ navigation, logo }: SidebarProps): React.ReactNode {
  const sidebarOpen = useUIStore(state => state.sidebarOpen);
  const setSidebarOpen = useUIStore(state => state.setSidebarOpen);

  return (
    <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />

      <div className="fixed inset-0 flex">
        <DialogPanel
          transition
          className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
        >
          <TransitionChild>
            <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
              <button type="button" onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5">
                <span className="sr-only">Close sidebar</span>
                <Icon name="xmark" className="size-6 text-white" />
              </button>
            </div>
          </TransitionChild>

          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-base-100 px-4 pb-4">
            <div className="flex h-16 shrink-0 items-center px-2">
              <img alt="LHBank" src={logo} className="h-8 w-auto" />
            </div>
            <nav className="flex flex-1 flex-col">
              <ul className="menu w-full p-0">
                {navigation.map(item => (
                  <MenuItem key={item.href} item={item} />
                ))}
              </ul>
              <div className="mt-auto">
                <ul className="menu w-full p-0">
                  <li>
                    <Link to="/settings" className="py-2 px-2">
                      <Icon name="gear" style="solid" className="size-6 text-neutral" />
                      Settings
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default function Sidebar({ navigation, logo }: SidebarProps): React.ReactNode {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-100 bg-white px-4 pb-4 shadow-sm">
        <div className="flex h-16 shrink-0 items-center px-2">
          <img alt="LHBank" src={logo} className="h-8 w-auto" />
        </div>
        <nav className="flex flex-1 flex-col">
          <ul className="menu w-full p-0">
            {navigation.map(item => (
              <MenuItem key={item.href} item={item} />
            ))}
          </ul>
          <div className="mt-auto">
            <ul className="menu w-full p-0">
              <li>
                <Link to="/settings" className="py-2 px-2">
                  <Icon name="gear" style="solid" className="size-6 text-neutral" />
                  Settings
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
}
