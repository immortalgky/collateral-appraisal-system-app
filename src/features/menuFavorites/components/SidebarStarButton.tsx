import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { useFavorites } from '../useFavorites';
import type { NavItem } from '@shared/config/navigationTypes';

interface SidebarStarButtonProps {
  item: NavItem;
}

export function SidebarStarButton({ item }: SidebarStarButtonProps) {
  const { t } = useTranslation('common');
  const { isPinned, toggle } = useFavorites();

  // Only render when the item has a backend id and is pinnable
  if (!item.id || !item.pinnable) return null;

  const pinned = isPinned(item.id);

  return (
    <button
      type="button"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        toggle(item.id!);
      }}
      aria-label={
        pinned ? t('favorites.aria.removeFromFavorites') : t('favorites.aria.addToFavorites')
      }
      className={`flex-shrink-0 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ${
        pinned
          ? 'text-amber-400 hover:text-amber-500 !opacity-100'
          : 'text-gray-300 hover:text-amber-400'
      }`}
    >
      <Icon name="star" style={pinned ? 'solid' : 'regular'} className="size-3" />
    </button>
  );
}
