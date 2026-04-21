import { useMemo, useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '../store';
import Icon from './Icon';
import clsx from 'clsx';
import type { NavItem } from '@shared/config/navigationTypes';
import { useAppraisalNavigation, useNavigation } from '@shared/hooks/useNavigation';
import {
  useAppraisalIsBlockCondo,
  useAppraisalIsPma,
  useAppraisalRequestId,
  useAppraisalStatus,
  useBasePath,
} from '@features/appraisal/context/AppraisalContext';

type AppraisalSidebarProps = {
  appraisalId: string;
  logo: string;
  hideGeneralNav?: boolean;
};

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
    'text-indigo-500': 'bg-indigo-50',
    'text-sky-500': 'bg-sky-50',
  };
  return colorMap[iconColor] || 'bg-gray-100';
};

function CompactMenuItem({
  item,
  collapsed = false,
}: {
  item: NavItem & { canEdit?: boolean };
  collapsed?: boolean;
}) {
  const location = useLocation();
  const to = item.href;
  const isActive = location.pathname === item.href;
  const isReadOnly = item.canEdit === false;
  const iconStyle = (item.iconStyle || 'solid') as
    | 'solid'
    | 'regular'
    | 'light'
    | 'thin'
    | 'duotone'
    | 'brands';

  const iconWithBadge = (
    <div
      className={clsx(
        'relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
        isActive ? 'bg-primary/10' : getIconBgClass(item.iconColor),
        'group-hover:scale-105',
      )}
    >
      <Icon
        name={item.icon}
        style={iconStyle}
        className={clsx('size-3.5', item.iconColor || 'text-gray-500')}
      />
      {isReadOnly && (
        <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-white flex items-center justify-center">
          <Icon name="lock" style="solid" className="size-1.5 text-gray-400" />
        </div>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <Link
        to={to}
        title={item.name}
        className={clsx(
          'group flex items-center justify-center py-2 px-2.5 rounded-lg transition-all duration-200',
          isActive ? 'bg-primary/10' : 'hover:bg-gray-50',
        )}
      >
        {iconWithBadge}
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={clsx(
        'group flex items-center gap-2.5 py-2 px-2.5 rounded-lg transition-all duration-200',
        isActive ? 'bg-primary/10' : 'hover:bg-gray-50',
      )}
    >
      {iconWithBadge}
      <span className={clsx('text-sm font-medium', isActive ? 'text-primary' : 'text-gray-700')}>
        {item.name}
      </span>
    </Link>
  );
}

function ExpandableSection({
  title,
  items,
  initialVisibleCount = 3,
  collapsed = false,
}: {
  title: string;
  items: NavItem[];
  initialVisibleCount?: number;
  collapsed?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const visibleItems = isExpanded ? items : items.slice(0, initialVisibleCount);
  const hasMoreItems = items.length > initialVisibleCount;
  const hiddenActiveItem =
    !isExpanded && items.slice(initialVisibleCount).some(item => location.pathname === item.href);

  if (collapsed) {
    return (
      <div className="mb-3">
        <ul className="flex flex-col gap-0.5">
          {items.map(item => (
            <li key={item.href}>
              <CompactMenuItem item={item} collapsed />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="px-2.5 mb-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {visibleItems.map(item => (
          <li key={item.href}>
            <CompactMenuItem item={item} />
          </li>
        ))}
      </ul>
      {hasMoreItems && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx(
            'flex items-center gap-2 py-1.5 px-2.5 mt-1 text-xs font-medium rounded-md transition-all duration-200 w-full',
            hiddenActiveItem
              ? 'text-primary bg-primary/5'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
          )}
        >
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            style="solid"
            className="size-2.5"
          />
          <span>
            {isExpanded ? 'Show less' : `Show ${items.length - initialVisibleCount} more`}
          </span>
        </button>
      )}
    </div>
  );
}

export function MobileAppraisalSidebar({
  appraisalId,
  logo,
}: AppraisalSidebarProps): React.ReactNode {
  const sidebarOpen = useUIStore(state => state.sidebarOpen);
  const setSidebarOpen = useUIStore(state => state.setSidebarOpen);
  const requestId = useAppraisalRequestId();
  const basePath = useBasePath();
  const isPma = useAppraisalIsPma();
  const isBlockCondo = useAppraisalIsBlockCondo();
  const status = useAppraisalStatus();

  const navContext = useMemo(
    () => ({ isPma, isBlockCondo, status, basePath, requestId }),
    [isPma, isBlockCondo, status, basePath, requestId],
  );

  const applicationNav = useAppraisalNavigation(navContext);
  const mainNav = useNavigation();

  // Use first 3 main nav items as "general" compact links
  const generalItems = mainNav.slice(0, 3);

  return (
    <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />

      <div className="fixed inset-0 flex">
        <DialogPanel
          transition
          className="relative mr-16 flex w-full max-w-[256px] flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
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
                    style={{
                      background:
                        'linear-gradient(to right, #CED629, #47B9C0, #8B3F92, #ED8068, #0080BE, #F5BF0E, #F08D1D)',
                    }}
                  />
                  <span className="text-[10px] font-medium text-gray-400">
                    Collateral Appraisal System
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-1 flex-col px-3 py-2">
              {/* GENERAL Section */}
              <ExpandableSection title="General" items={generalItems} initialVisibleCount={3} />

              {/* APPLICATION Section */}
              <div className="pt-3 border-t border-gray-100">
                <div className="px-2.5 mb-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Application
                  </span>
                </div>
                <ul className="flex flex-col gap-0.5">
                  {applicationNav.map(item => (
                    <li key={item.href + item.itemKey}>
                      <CompactMenuItem item={item} />
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default function AppraisalSidebar({
  appraisalId,
  logo,
  hideGeneralNav = false,
}: AppraisalSidebarProps): React.ReactNode {
  const requestId = useAppraisalRequestId();
  const basePath = useBasePath();
  const isPma = useAppraisalIsPma();
  const isBlockCondo = useAppraisalIsBlockCondo();
  const status = useAppraisalStatus();
  const sidebarCollapsed = useUIStore(state => state.sidebarCollapsed);
  const toggleSidebar = useUIStore(state => state.toggleSidebar);

  const navContext = useMemo(
    () => ({ isPma, isBlockCondo, status, basePath, requestId }),
    [isPma, isBlockCondo, status, basePath, requestId],
  );

  const applicationNav = useAppraisalNavigation(navContext);
  const mainNav = useNavigation();
  const generalItems = mainNav.slice(0, 3);

  return (
    <aside
      className={clsx(
        'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300',
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-[256px]',
      )}
    >
      <div className="flex grow flex-col overflow-y-auto border-r border-gray-100 bg-white shadow-sm">
        {/* Logo Area */}
        <div
          className={clsx('py-5 transition-all duration-300', sidebarCollapsed ? 'px-2' : 'px-5')}
        >
          <div className={clsx('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-4')}>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 flex items-center justify-center shadow-sm shrink-0">
              <img alt="LHBank" src={logo} className="h-7 w-auto" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-black bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-tight">
                  CAS
                </span>
                <div
                  className="w-12 h-1 rounded-full my-0.5"
                  style={{
                    background:
                      'linear-gradient(to right, #CED629, #47B9C0, #8B3F92, #ED8068, #0080BE, #F5BF0E, #F08D1D)',
                  }}
                />
                <span className="text-[10px] font-medium text-gray-400">
                  Collateral Appraisal System
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav
          className={clsx(
            'flex flex-1 flex-col py-2 transition-all duration-300',
            sidebarCollapsed ? 'px-1' : 'px-3',
          )}
        >
          {/* GENERAL Section */}
          {!hideGeneralNav && (
            <ExpandableSection
              title="General"
              items={generalItems}
              initialVisibleCount={3}
              collapsed={sidebarCollapsed}
            />
          )}

          {/* APPLICATION Section */}
          <div
            className={clsx(
              'pt-3',
              !sidebarCollapsed && !hideGeneralNav && 'border-t border-gray-100',
            )}
          >
            {!sidebarCollapsed && (
              <div className="px-2.5 mb-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Application
                </span>
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {applicationNav.map(item => (
                <li key={item.href + item.itemKey}>
                  <CompactMenuItem item={item} collapsed={sidebarCollapsed} />
                </li>
              ))}
            </ul>
          </div>

          {/* Toggle Button */}
          <div className="mt-auto pt-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="mt-2 w-full flex items-center justify-center py-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon
                style="solid"
                name={sidebarCollapsed ? 'chevron-right' : 'chevron-left'}
                className="size-4"
              />
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}
