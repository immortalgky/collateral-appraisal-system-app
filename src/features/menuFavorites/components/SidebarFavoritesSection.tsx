import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import { getIconBgClass } from '@shared/components/icon-bg';
import { useLocalStorage } from '@shared/hooks/useLocalStorage';
import { useFavorites } from '../useFavorites';
import type { MenuTreeNode } from '@features/menuManagement/types';

interface SidebarFavoritesSectionProps {
  /**
   * Sidebar is the icon rail: same layout (so nothing shifts on hover); only the header's star
   * shows there, and the header can't be toggled until the menu is open. A list
   * the user folded stays folded on the rail too — deliberately: showing it there would push every
   * item below down the moment hover opens the menu and hides it again.
   */
  collapsed: boolean;
}

interface FavoriteItemRowProps {
  node: MenuTreeNode;
  lang: string;
}

function FavoriteItemRow({ node, lang }: FavoriteItemRowProps) {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { remove } = useFavorites();
  const label = node.labels[lang] ?? node.labels['en'] ?? node.itemKey;
  const isActive = node.path != null && location.pathname === node.path;

  return (
    <li>
      <Link
        to={node.path!}
        className={clsx(
          'group flex items-center gap-2.5 py-2 px-2.5 rounded-xl transition-all duration-200',
          isActive ? 'bg-primary/10' : 'hover:bg-gray-50',
        )}
      >
        <div
          className={clsx(
            'w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm',
            getIconBgClass(node.iconColor),
            'group-hover:scale-105',
          )}
        >
          <Icon
            name={node.iconName}
            style={node.iconStyle}
            className={clsx('size-3.5', node.iconColor ?? 'text-gray-500')}
          />
        </div>
        <span className="text-xs font-medium text-gray-700 truncate">{label}</span>
        <button
          type="button"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            remove(node.id);
          }}
          aria-label={t('favorites.aria.removeFromFavorites')}
          className="ml-auto flex-shrink-0 p-0.5 rounded text-amber-400 hover:text-amber-500 transition-colors"
        >
          <Icon name="star" style="solid" className="size-3" />
        </button>
      </Link>
    </li>
  );
}

export function SidebarFavoritesSection({ collapsed }: SidebarFavoritesSectionProps) {
  const { t, i18n } = useTranslation('common');
  const lang = i18n.language ?? 'en';
  const { favoriteItems, isLoading } = useFavorites();
  const [expanded, setExpanded] = useLocalStorage<boolean>('menu.favorites.sidebarExpanded', true);

  // Hide entirely if no favorites
  if (!isLoading && favoriteItems.length === 0) return null;

  return (
    <div className="mb-2">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={clsx(
          'flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-all group',
          collapsed && 'pointer-events-none',
        )}
        aria-expanded={expanded}
        tabIndex={collapsed ? -1 : undefined}
      >
        {/* Same box and gap as an item's icon, so the star sits in the icon column (centred on the
            rail, marking the icons below as favorites) and the title lines up with item labels —
            which also puts it just past the rail's clip. */}
        <span className="flex items-center gap-2.5">
          <span className="w-7 flex justify-center">
            <Icon name="star" style="solid" className="size-2.5 text-amber-400" />
          </span>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {t('favorites.sidebar.title')}
          </span>
        </span>
        <Icon
          name="chevron-down"
          style="solid"
          className={clsx(
            'size-2.5 text-gray-300 transition-transform duration-200',
            expanded ? '' : '-rotate-90',
          )}
        />
      </button>

      {/* Items */}
      <div
        className={clsx(
          'grid transition-all duration-200 ease-in-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <ul className="overflow-hidden flex flex-col gap-1 mt-0.5">
          {favoriteItems.map(node => (
            <FavoriteItemRow key={node.id} node={node} lang={lang} />
          ))}
        </ul>
      </div>

      {/* Divider */}
      <div className="mx-2 mt-2 border-t border-gray-100" aria-hidden="true" />
    </div>
  );
}
