import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import { useGetRoles, useGetRoleById } from '@/features/userManagement/api/roles';
import { useGetPermissions } from '@/features/userManagement/api/permissions';
import { MenuTreeTable } from '../components/MenuTreeTable';
import { MenuTreePreviewPane } from '../components/MenuTreePreviewPane';
import { ActivityOverridesPanel } from '../components/ActivityOverridesPanel';
import { useMenuList } from '../hooks/useMenuList';
import type { MenuItemAdminDto, MenuScope } from '../types';

type Tab = MenuScope | 'Activities';

/** Collect every parent id (items that have children) and the total node count. */
function collectTreeInfo(items: MenuItemAdminDto[]): { parentIds: string[]; total: number } {
  const parentIds: string[] = [];
  let total = 0;
  const walk = (nodes: MenuItemAdminDto[]) => {
    nodes.forEach(n => {
      total += 1;
      if (n.children?.length) {
        parentIds.push(n.id);
        walk(n.children);
      }
    });
  };
  walk(items);
  return { parentIds, total };
}

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

  // Toolbar state (Main/Appraisal tabs)
  const [searchText, setSearchText] = useState('');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const { data: rolesResult } = useGetRoles({ pageSize: 100 });
  const { data: role } = useGetRoleById(roleId);
  const { data: permsResult } = useGetPermissions({ pageSize: 500 });

  const roleCodes = useMemo(
    () => (role ? new Set(role.permissions.map(p => p.permissionCode)) : null),
    [role],
  );
  const validCodes = useMemo(
    () => new Set((permsResult?.items ?? []).map(p => p.permissionCode)),
    [permsResult],
  );
  const { parentIds, total } = useMemo(() => collectTreeInfo(items ?? []), [items]);

  const changeTab = (next: Tab) => {
    setTab(next);
    setSearchText('');
    setCollapsedIds(new Set());
  };

  const toggleCollapse = (id: string) =>
    setCollapsedIds(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(items ?? [], null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menus-${tab.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">{t('page.title')}</h3>
            {tab !== 'Activities' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                {total}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {tab === 'Activities' ? t('page.subtitleActivities') : t('page.subtitle')}
          </p>
        </div>
        {tab !== 'Activities' && (
          <Link
            to="/admin/menus/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Icon name="plus" style="solid" className="size-3.5" />
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
            onClick={() => changeTab(key)}
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

          {!isLoading && !isError && items && items.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">
              {t('empty.noItems', { scope: tab })}
            </div>
          )}

          {!isLoading && !isError && items && items.length > 0 && (
            <>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[12rem]">
                  <Icon
                    name="magnifying-glass"
                    style="solid"
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
                  />
                  <input
                    type="text"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder={t('tree.searchPlaceholder')}
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <select
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={roleId ?? ''}
                  onChange={e => setRoleId(e.target.value || null)}
                  title={t('activityOverrides.previewAsRole')}
                >
                  <option value="">{t('activityOverrides.previewAsRolePlaceholder')}</option>
                  {rolesResult?.items.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setCollapsedIds(new Set())}
                  className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  {t('tree.expandAll')}
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsedIds(new Set(parentIds))}
                  className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  {t('tree.collapseAll')}
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <Icon name="download" style="solid" className="size-3" />
                  {t('tree.export')}
                </button>

                <span className="ml-auto text-xs text-gray-400">
                  {t('tree.count', { count: total })}
                </span>
              </div>

              <div
                className={roleId ? 'grid grid-cols-1 xl:grid-cols-4 gap-4 items-start' : undefined}
              >
                <div className={roleId ? 'xl:col-span-3 min-w-0' : undefined}>
                  <MenuTreeTable
                    key={tab}
                    items={items}
                    onReordered={() => refetch()}
                    validCodes={validCodes}
                    roleCodes={roleCodes}
                    searchText={searchText}
                    collapsedIds={collapsedIds}
                    onToggleCollapse={toggleCollapse}
                  />
                </div>
                {roleId && (
                  <div className="xl:col-span-1 xl:sticky xl:top-4">
                    <MenuTreePreviewPane
                      items={items}
                      roleCodes={roleCodes}
                      roleName={role?.name}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
