import clsx from 'clsx';
import { useUIStore } from '../store';
import type { SidebarScope } from '../types';
import BrandLogo from './BrandLogo';
import Icon from './Icon';

/**
 * Desktop sidebar top: brand block plus the pin toggle. It sits outside the scrolling menu, so
 * both stay put while the menu scrolls. One layout in every state — the rail only clips it — so
 * the menu below never shifts when hovering opens it. The pin shows only while the menu is open.
 */
export default function SidebarHeader({
  logo,
  expanded,
  scope,
}: {
  logo: string;
  expanded: boolean;
  scope: SidebarScope;
}) {
  const pinned = !useUIStore(state => state.sidebarCollapsed[scope]);
  const toggleSidebar = useUIStore(state => state.toggleSidebar);
  const label = pinned ? 'Unpin sidebar' : 'Pin sidebar';

  return (
    <div className="shrink-0 flex items-start gap-1 px-2 py-4">
      <div className="flex-1 min-w-0">
        <BrandLogo logo={logo} />
      </div>
      {expanded && (
        <button
          type="button"
          onClick={() => toggleSidebar(scope)}
          title={label}
          aria-label={label}
          aria-pressed={pinned}
          className={clsx(
            'shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-base-200',
            pinned
              ? 'text-primary'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300',
          )}
        >
          <Icon
            style={pinned ? 'solid' : 'regular'}
            name="thumbtack"
            className={clsx('size-3.5 transition-transform', !pinned && 'rotate-45')}
          />
        </button>
      )}
    </div>
  );
}
