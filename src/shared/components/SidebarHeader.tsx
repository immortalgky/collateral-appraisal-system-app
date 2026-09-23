import clsx from 'clsx';
import { useUIStore } from '../store';
import BrandLogo from './BrandLogo';
import Icon from './Icon';

/**
 * Desktop sidebar top: brand block plus the collapse toggle. It sits outside the scrolling
 * menu, so both stay put while the menu scrolls. Collapsed, the toggle stacks under the logo
 * because the 56px rail has no room beside it.
 */
export default function SidebarHeader({ logo }: { logo: string }) {
  const collapsed = useUIStore(state => state.sidebarCollapsed);
  const toggleSidebar = useUIStore(state => state.toggleSidebar);
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <div
      className={clsx(
        'shrink-0 flex py-4 transition-all duration-300',
        collapsed ? 'flex-col items-center gap-1 px-2' : 'items-start gap-1 px-3',
      )}
    >
      <div className={clsx(!collapsed && 'flex-1 min-w-0')}>
        <BrandLogo logo={logo} collapsed={collapsed} />
      </div>
      <button
        type="button"
        onClick={toggleSidebar}
        title={label}
        aria-label={label}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-base-200 transition-colors"
      >
        <Icon style="regular" name="sidebar" className="size-3.5" />
      </button>
    </div>
  );
}
