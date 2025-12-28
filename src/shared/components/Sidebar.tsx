import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '../store';
import Icon from './Icon';
import clsx from 'clsx';
import type { NavItem } from '@shared/config/navigation';

type SidebarProps = {
  navigation: NavItem[];
  logo: string;
};

function MenuItem({ item, isChild = false }: { item: NavItem; isChild?: boolean }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = location.pathname === item.href;
  const hasChildren = item.children && item.children.length > 0;
  const iconStyle = (item.iconStyle || 'solid') as 'solid' | 'regular' | 'light' | 'thin' | 'duotone' | 'brands';

  // Get background color class based on icon color
  const getIconBgClass = (iconColor: string | undefined) => {
    if (!iconColor) return 'bg-gray-100';
    const colorMap: Record<string, string> = {
      'text-blue-500': 'bg-blue-50',
      'text-purple-500': 'bg-purple-50',
      'text-amber-500': 'bg-amber-50',
      'text-cyan-500': 'bg-cyan-50',
      'text-emerald-500': 'bg-emerald-50',
      'text-teal-500': 'bg-teal-50',
      'text-rose-500': 'bg-rose-50',
      'text-orange-500': 'bg-orange-50',
    };
    return colorMap[iconColor] || 'bg-gray-100';
  };

  if (hasChildren) {
    const isChildActive = item.children?.some(child => location.pathname === child.href);

    return (
      <li>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'group flex w-full items-center justify-between py-2.5 px-3 rounded-xl transition-all duration-200',
            isChildActive ? 'bg-primary/5' : 'hover:bg-gray-50',
          )}
        >
          <span className="flex items-center gap-3">
            <div
              className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm',
                isChildActive ? 'bg-primary/10' : getIconBgClass(item.iconColor),
                'group-hover:scale-105',
              )}
            >
              <Icon name={item.icon} style={iconStyle} className={clsx('size-4', item.iconColor || 'text-gray-500')} />
            </div>
            <span className={clsx('text-sm font-medium', isChildActive ? 'text-primary' : 'text-gray-700')}>
              {item.name}
            </span>
          </span>
          <Icon
            name="chevron-down"
            style="solid"
            className={clsx(
              'size-4 text-gray-400 transition-transform duration-300 ease-in-out',
              isOpen ? 'rotate-180' : '',
            )}
          />
        </button>
        <ul
          className={clsx(
            'ml-6 pl-3 border-l-2 border-gray-100 overflow-hidden transition-all duration-300 ease-in-out',
            isOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0',
          )}
        >
          {item.children?.map(child => (
            <MenuItem key={child.href} item={child} isChild />
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li>
      <Link
        to={item.href}
        className={clsx(
          'group flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200',
          isActive ? 'bg-primary/10' : 'hover:bg-gray-50',
          isChild && 'py-2',
        )}
      >
        {!isChild && (
          <div
            className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm',
              getIconBgClass(item.iconColor),
              'group-hover:scale-105',
            )}
          >
            <Icon
              name={item.icon}
              style={iconStyle}
              className={clsx('size-4', item.iconColor || 'text-gray-500')}
            />
          </div>
        )}
        {isChild && (
          <div className={clsx('w-2 h-2 rounded-full', isActive ? 'bg-primary' : 'bg-gray-300')} />
        )}
        <span className={clsx('text-sm font-medium text-gray-700', isChild && 'text-sm')}>
          {item.name}
        </span>
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

          <div className="flex grow flex-col overflow-y-auto bg-white">
            {/* Logo Area */}
            <div className="px-5 py-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 flex items-center justify-center shadow-sm">
                  <img alt="LHBank" src={logo} className="h-7 w-auto" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-tight">
                    CAS
                  </span>
                  <div
                    className="w-12 h-1 rounded-full my-0.5"
                    style={{ background: 'linear-gradient(to right, #CED629, #47B9C0, #8B3F92, #ED8068, #0080BE, #F5BF0E, #F08D1D)' }}
                  />
                  <span className="text-[10px] font-medium text-gray-400">
                    Collateral Appraisal System
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-1 flex-col px-4 py-4">
              <div className="px-3 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</span>
              </div>

              <ul className="flex flex-col gap-1">
                {navigation.map(item => (
                  <MenuItem key={item.href} item={item} />
                ))}
              </ul>

              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="px-3 mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">System</span>
                </div>
                <ul className="flex flex-col gap-1">
                  <li>
                    <Link
                      to="/settings"
                      className="group flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 hover:bg-gray-50"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center transition-all duration-200 shadow-sm group-hover:scale-105">
                        <Icon name="gear" style="solid" className="size-4 text-gray-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">Settings</span>
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
  const location = useLocation();
  const isSettingsActive = location.pathname === '/settings';

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col overflow-y-auto border-r border-gray-100 bg-white shadow-sm">
        {/* Logo Area */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 flex items-center justify-center shadow-sm">
              <img alt="LHBank" src={logo} className="h-7 w-auto" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-tight">
                CAS
              </span>
              <div
                className="w-12 h-1 rounded-full my-0.5"
                style={{ background: 'linear-gradient(to right, #CED629, #47B9C0, #8B3F92, #ED8068, #0080BE, #F5BF0E, #F08D1D)' }}
              />
              <span className="text-[10px] font-medium text-gray-400">
                Collateral Appraisal System
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col px-4 py-4">
          {/* Main Menu Label */}
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</span>
          </div>

          <ul className="flex flex-col gap-1">
            {navigation.map(item => (
              <MenuItem key={item.href} item={item} />
            ))}
          </ul>

          {/* Bottom Section */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            <div className="px-3 mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">System</span>
            </div>
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  to="/settings"
                  className={clsx(
                    'group flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200',
                    isSettingsActive ? 'bg-primary/10' : 'hover:bg-gray-50',
                  )}
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center transition-all duration-200 shadow-sm group-hover:scale-105">
                    <Icon name="gear" style="solid" className="size-4 text-gray-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Settings</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
}
