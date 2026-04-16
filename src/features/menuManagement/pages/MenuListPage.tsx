import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@shared/components/Icon';
import { MenuTreeTable } from '../components/MenuTreeTable';
import { useMenuList } from '../hooks/useMenuList';
import type { MenuScope } from '../types';

const SCOPES: MenuScope[] = ['Main', 'Appraisal'];

/**
 * Admin page listing all menu items for a given scope.
 * URL: /admin/menus
 * Requires MENU_MANAGE permission (enforced in router via RoleProtectedRoute).
 */
export default function MenuListPage() {
  const [scope, setScope] = useState<MenuScope>('Main');
  const { data: items, isLoading, isError, refetch } = useMenuList(scope);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Menu Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage navigation menu items. Drag to reorder.
          </p>
        </div>
        <Link
          to="/admin/menus/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Icon name="plus" style="solid" className="size-4" />
          New Item
        </Link>
      </div>

      {/* Scope switcher */}
      <div className="flex gap-2 border-b border-gray-200">
        {SCOPES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              scope === s
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Icon name="triangle-exclamation" style="solid" className="size-10 text-red-400" />
          <p className="text-sm text-gray-500">Failed to load menu items</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading &&
        !isError &&
        items &&
        (items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No menu items found for {scope} scope.
          </div>
        ) : (
          <MenuTreeTable key={scope} items={items} onReordered={() => refetch()} />
        ))}
    </div>
  );
}
