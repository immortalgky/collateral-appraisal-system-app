import { Link } from 'react-router-dom';
import Icon from './Icon';
import type { BreadcrumbItem } from '@shared/types';
import clsx from 'clsx';

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

function Breadcrumb({ items, className = '' }: BreadcrumbProps): React.ReactNode {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1">
        {/* Home icon */}
        <li className="flex items-center">
          <Link
            to="/"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-(--palette-gray-400) hover:text-(--palette-gray-600) hover:bg-(--palette-surface-3) transition-all"
          >
            <Icon name="house" style="solid" className="size-4 shrink-0" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${index}:${item.href}`} className="flex items-center">
              <Icon
                name="chevron-right"
                style="solid"
                className="size-3 shrink-0 text-(--palette-gray-300) mx-1"
                aria-hidden="true"
              />
              {isLast ? (
                <span
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                    'text-sm font-medium text-(--palette-primary-text) bg-(--palette-primary-wash)',
                  )}
                  aria-current="page"
                >
                  {item.icon && <Icon name={item.icon} style="solid" className="size-3.5" />}
                  {/* Names can be long (a property's address): cut, and shown whole on hover. */}
                  <span className="max-w-[16rem] truncate" title={item.label}>
                    {item.label}
                  </span>
                </span>
              ) : (
                <Link
                  to={item.href}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                    'text-sm font-medium text-(--palette-gray-500) hover:text-(--palette-ink) hover:bg-(--palette-surface-3) transition-all',
                  )}
                >
                  {item.icon && <Icon name={item.icon} style="regular" className="size-3.5" />}
                  {/* Names can be long (a property's address): cut, and shown whole on hover. */}
                  <span className="max-w-[16rem] truncate" title={item.label}>
                    {item.label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
