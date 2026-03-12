import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import type { SearchResultItem as SearchResultItemType } from '@shared/types/search';

const categoryConfig = {
  requests: { icon: 'folder-open', color: 'text-blue-500', bg: 'bg-blue-50' },
  customers: { icon: 'users', color: 'text-purple-500', bg: 'bg-purple-50' },
  properties: { icon: 'building', color: 'text-amber-500', bg: 'bg-amber-50' },
};

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  active: 'bg-blue-50 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
};

interface Props {
  item: SearchResultItemType;
  isHighlighted: boolean;
  onClick: () => void;
}

export default function SearchResultItem({ item, isHighlighted, onClick }: Props) {
  const config = categoryConfig[item.category];
  const statusStyle = item.status ? statusStyles[item.status] ?? 'bg-gray-100 text-gray-600' : null;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isHighlighted}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 w-full px-3 py-2.5 text-left rounded-lg transition-colors',
        isHighlighted ? 'bg-primary-50' : 'hover:bg-gray-50',
      )}
    >
      <div className={clsx('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
        <Icon name={item.icon ?? config.icon} style="solid" className={clsx('size-4', config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
        <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
      </div>

      {item.status && statusStyle && (
        <span className={clsx('flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium', statusStyle)}>
          {item.status}
        </span>
      )}
    </button>
  );
}
