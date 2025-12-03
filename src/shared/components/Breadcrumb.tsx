import { Link } from 'react-router-dom';
import Icon from './Icon';
import type { BreadcrumbItem } from '@shared/types';

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

function Breadcrumb({ items, className = '' }: BreadcrumbProps): React.ReactNode {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2">
        {/* Home icon */}
        <li className="flex items-center">
          <Link to="/" className="flex items-center text-gray-400 hover:text-gray-500">
            <Icon name="house" className="size-4 shrink-0" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.href} className="flex items-center">
              <Icon
                name="chevron-right"
                className="size-4 shrink-0 text-gray-400"
                aria-hidden="true"
              />
              {isLast ? (
                <span
                  className="ml-2 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500"
                  aria-current="page"
                >
                  {item.icon && <Icon name={item.icon} className="size-4" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="ml-2 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  {item.icon && <Icon name={item.icon} className="size-4" />}
                  {item.label}
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
