import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { MenuTreeTable } from '../components/MenuTreeTable';
import { ActivityOverridesPanel } from '../components/ActivityOverridesPanel';
import { useMenuList } from '../hooks/useMenuList';
import type { MenuScope } from '../types';

type Tab = MenuScope | 'Activities';

/**
 * Admin page listing all menu items for a given scope.
 * URL: /admin/menus
 * Requires MENU_MANAGE permission (enforced in router via RoleProtectedRoute).
 */
export default function MenuListPage() {
  const { t } = useTranslation(['menuManagement', 'common']);
  const [tab, setTab] = useState<Tab>('Main');
  const scopeForQuery: MenuScope = tab === 'Activities' ? 'Main' : tab;
  const { data: items, isLoading, isError, refetch } = useMenuList(scopeForQuery);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'Main', label: t('tabs.main') },
    { key: 'Appraisal', label: t('tabs.appraisal') },
    { key: 'Activities', label: t('tabs.activities') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('page.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tab === 'Activities' ? t('page.subtitleActivities') : t('page.subtitle')}
          </p>
        </div>
        {tab !== 'Activities' && (
          <Link
            to="/admin/menus/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Icon name="plus" style="solid" className="size-4" />
            {t('page.newItem')}
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'Activities' ? (
        <ActivityOverridesPanel />
      ) : (
        <>
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Icon name="triangle-exclamation" style="solid" className="size-10 text-red-400" />
              <p className="text-sm text-gray-500">{t('errors.failedToLoad')}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-sm text-primary hover:underline"
              >
                {t('common:actions.retry')}
              </button>
            </div>
          )}

          {!isLoading &&
            !isError &&
            items &&
            (items.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                {t('empty.noItems', { scope: tab })}
              </div>
            ) : (
              <MenuTreeTable key={tab} items={items} onReordered={() => refetch()} />
            ))}
        </>
      )}
    </div>
  );
}
