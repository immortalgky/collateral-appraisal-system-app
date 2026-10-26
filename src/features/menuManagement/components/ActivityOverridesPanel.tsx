import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NativeSelect from '@/shared/components/inputs/NativeSelect';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import ActionBar from '@shared/components/ActionBar';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { useGetRoles, useGetRoleById } from '@/features/userManagement/api/roles';
import {
  useActivitiesList,
  useActivityOverrides,
  useUpdateActivityOverrides,
} from '../hooks/useActivityOverrides';
import { useMenuList } from '../hooks/useMenuList';
import {
  accessFromRow,
  effectiveWithRole,
  rowFromAccess,
  type EffectiveState,
  type OverrideAccess,
} from '../overrideAccess';
import { OverrideAccessSelect } from './OverrideAccessSelect';
import { ActivityPreviewPane, type PreviewItem } from './ActivityPreviewPane';
import { SortableTh } from './SortableTh';
import { visibleMenuIds } from '../utils/menuVisibility';
import type { MenuItemAdminDto } from '../types';
import { nextSort, type SortDir } from '../tableSort';

const EFFECTIVE_BADGE = {
  editable: {
    cls: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    labelKey: 'activityOverrides.effective.editable',
  },
  readonly: {
    cls: 'bg-(--palette-warn-wash) text-(--palette-warn)',
    labelKey: 'activityOverrides.effective.readonly',
  },
  hidden: {
    cls: 'bg-(--palette-surface-3) text-(--palette-gray-500)',
    labelKey: 'activityOverrides.effective.hidden',
  },
  noRoleAccess: {
    cls: 'bg-(--palette-req-wash) text-(--palette-danger)',
    labelKey: 'activityOverrides.effective.noRoleAccess',
  },
} as const satisfies Record<EffectiveState, { cls: string; labelKey: string }>;

/**
 * Admin panel for configuring activity-scoped menu overrides (restrict-only).
 *
 * Left: a per-menu 3-state access control (Inherit / Read-only / Hidden) with an
 * Effective column computed against a chosen role. Right: a live sidebar preview.
 * Overrides only restrict — role permissions are the ceiling — so the role context
 * makes the result legible and surfaces "override has no effect" cases.
 */
export function ActivityOverridesPanel() {
  const { t } = useTranslation(['menuManagement', 'common']);
  const { data: activities, isLoading: isLoadingActivities } = useActivitiesList();
  const [activityId, setActivityId] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId && activities && activities.length > 0) {
      setActivityId(activities[0].activityId);
    }
  }, [activities, activityId]);

  const { data, isLoading, isError, refetch } = useActivityOverrides(activityId);
  const { data: menus } = useMenuList('Appraisal');
  const { data: rolesResult } = useGetRoles({ pageSize: 100 });
  const updateMutation = useUpdateActivityOverrides();

  // Preview role + its permission codes
  const [roleId, setRoleId] = useState<string | null>(null);
  const { data: role } = useGetRoleById(roleId);
  const roleCodes = useMemo(
    () => (role ? new Set(role.permissions.map(p => p.permissionCode)) : null),
    [role],
  );

  // Per-menu permission metadata (codes + icon) keyed by menuItemId.
  const menuMeta = useMemo(() => {
    const map = new Map<
      string,
      {
        editCode: string | null;
        iconName: string;
        iconStyle: PreviewItem['iconStyle'];
        iconColor: string | null;
      }
    >();
    // Recursive, like visibleMenuIds: a nested item must get its edit code and icon too.
    const add = (items: MenuItemAdminDto[]) =>
      items.forEach(m => {
        map.set(m.id, {
          editCode: m.editPermissionCode,
          iconName: m.iconName,
          iconStyle: m.iconStyle,
          iconColor: m.iconColor,
        });
        add(m.children ?? []);
      });
    add(menus ?? []);
    return map;
  }, [menus]);

  // What the previewed role actually sees — the same rule as the backend (utils/menuVisibility).
  const roleVisibleIds = useMemo(
    () => (roleCodes && menus ? visibleMenuIds(menus, roleCodes) : null),
    [menus, roleCodes],
  );

  // Draft holds only changed rows (menuItemId → access).
  const [draft, setDraft] = useState<Record<string, OverrideAccess>>({});
  useEffect(() => {
    if (data) setDraft({});
  }, [data]);

  const [filterText, setFilterText] = useState('');
  const [onlyRestricted, setOnlyRestricted] = useState(false);

  // Guard against losing unsaved edits when switching activity.
  const [pendingActivityId, setPendingActivityId] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.rows.map(row => {
      // No override row = inherit the role, regardless of the fallback flags the API carries.
      const base = row.hasOverride ? accessFromRow(row) : 'inherit';
      const access = draft[row.menuItemId] ?? base;
      const meta = menuMeta.get(row.menuItemId);
      const roleCanView = roleVisibleIds ? roleVisibleIds.has(row.menuItemId) : false;
      const roleCanEdit = roleCodes && meta?.editCode ? roleCodes.has(meta.editCode) : false;
      const effective: EffectiveState | null = roleCodes
        ? effectiveWithRole(access, roleCanView, roleCanEdit)
        : null;
      const noEffect = roleCodes ? !roleCanView && access !== 'inherit' : false;
      return { row, access, base, effective, noEffect, meta, roleCanView };
    });
  }, [data, draft, menuMeta, roleCodes, roleVisibleIds]);

  const filteredRows = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return rows.filter(r => {
      if (onlyRestricted && r.access === 'inherit') return false;
      if (!q) return true;
      return r.row.label.toLowerCase().includes(q) || r.row.itemKey.toLowerCase().includes(q);
    });
  }, [rows, filterText, onlyRestricted]);

  const [sort, setSort] = useState<{ key: string | null; dir: SortDir }>({ key: null, dir: 'asc' });
  const sortedRows = useMemo(() => {
    if (!sort.key) return filteredRows;
    const arr = [...filteredRows];
    arr.sort((a, b) => {
      const av = sort.key === 'effective' ? (a.effective ?? '') : a.row.label;
      const bv = sort.key === 'effective' ? (b.effective ?? '') : b.row.label;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filteredRows, sort]);
  const onSort = (key: string) => setSort(prev => nextSort(prev, key));

  const changeCount = rows.filter(r => r.access !== r.base).length;
  const restrictedCount = rows.filter(r => r.access !== 'inherit').length;
  const inheritCount = rows.length - restrictedCount;
  const isDirty = changeCount > 0;

  const requestActivityChange = (next: string | null) => {
    if (next === activityId) return;
    if (isDirty) setPendingActivityId(next);
    else setActivityId(next);
  };

  const setAccess = (menuItemId: string, next: OverrideAccess) => {
    const base = rows.find(r => r.row.menuItemId === menuItemId)?.base;
    setDraft(prev => {
      const copy = { ...prev };
      if (next === base) delete copy[menuItemId];
      else copy[menuItemId] = next;
      return copy;
    });
  };

  const bulkSet = (next: OverrideAccess) => {
    setDraft(prev => {
      const copy = { ...prev };
      filteredRows.forEach(r => {
        if (next === r.base) delete copy[r.row.menuItemId];
        else copy[r.row.menuItemId] = next;
      });
      return copy;
    });
  };

  const handleSave = () => {
    if (!activityId || !data) return;
    updateMutation.mutate(
      {
        activityId,
        body: {
          rows: rows.map(r => ({ menuItemId: r.row.menuItemId, ...rowFromAccess(r.access) })),
        },
      },
      {
        onSuccess: () => {
          setDraft({});
          refetch();
        },
      },
    );
  };

  const previewItems: PreviewItem[] = useMemo(
    () =>
      rows
        .filter(r => r.meta)
        .map(r => ({
          menuItemId: r.row.menuItemId,
          label: r.row.label,
          iconName: r.meta!.iconName,
          iconStyle: r.meta!.iconStyle,
          iconColor: r.meta!.iconColor,
          access: r.access,
          roleCanView: r.roleCanView,
          editCode: r.meta!.editCode,
        })),
    [rows],
  );

  const activeActivity = activities?.find(a => a.activityId === activityId);

  return (
    <div className="space-y-4 pb-20">
      {/* Header: activity picker + summary */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[16rem] max-w-md">
          <label className="block text-xs font-medium text-(--palette-gray-600) mb-1">
            {t('activityOverrides.activityLabel')}
          </label>
          <NativeSelect
            className="w-full"
            value={activityId ?? ''}
            onChange={e => requestActivityChange(e.target.value || null)}
            disabled={isLoadingActivities}
          >
            {isLoadingActivities && <option>{t('activityOverrides.activityLoadingOption')}</option>}
            {!isLoadingActivities && (activities?.length ?? 0) === 0 && (
              <option value="">{t('activityOverrides.activityNoneOption')}</option>
            )}
            {activities?.map(a => (
              <option key={a.activityId} value={a.activityId}>
                {a.label} — {a.activityId}
              </option>
            ))}
          </NativeSelect>
        </div>

        {/* Preview-as-role */}
        <div className="flex-1 min-w-[14rem] max-w-xs">
          <label className="block text-xs font-medium text-(--palette-gray-600) mb-1">
            {t('activityOverrides.previewAsRole')}
          </label>
          <NativeSelect
            className="w-full"
            value={roleId ?? ''}
            onChange={e => setRoleId(e.target.value || null)}
          >
            <option value="">{t('activityOverrides.previewAsRolePlaceholder')}</option>
            {rolesResult?.items.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        {data && (
          <div className="pb-2 text-xs text-(--palette-gray-500)">
            {t('activityOverrides.summary', { restricted: restrictedCount, inherit: inheritCount })}
          </div>
        )}
      </div>

      {data && activeActivity && (
        <p className="text-xs text-(--palette-gray-500)">{t('activityOverrides.overridesHint')}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Config table */}
        <div className="lg:col-span-2 space-y-3">
          {/* Toolbar: search + filter + bulk */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[12rem]">
              <Icon
                name="magnifying-glass"
                style="solid"
                className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-(--palette-gray-400)"
              />
              <input
                type="text"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                placeholder={t('activityOverrides.filter.search')}
                className="w-full rounded-lg border border-(--palette-line-strong) pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-(--palette-gray-600) select-none">
              <input
                type="checkbox"
                className="size-3.5 rounded border-(--palette-line-strong) text-(--palette-primary-text) focus:ring-primary"
                checked={onlyRestricted}
                onChange={e => setOnlyRestricted(e.target.checked)}
              />
              {t('activityOverrides.filter.onlyRestricted')}
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => bulkSet('hidden')}
                className="rounded-md border border-(--palette-line) px-2 py-1 text-xs text-(--palette-gray-600) hover:bg-(--palette-surface-2)"
              >
                {t('activityOverrides.bulk.hideAll')}
              </button>
              <button
                type="button"
                onClick={() => bulkSet('readonly')}
                className="rounded-md border border-(--palette-line) px-2 py-1 text-xs text-(--palette-gray-600) hover:bg-(--palette-surface-2)"
              >
                {t('activityOverrides.bulk.readonlyAll')}
              </button>
              <button
                type="button"
                onClick={() => bulkSet('inherit')}
                className="rounded-md border border-(--palette-line) px-2 py-1 text-xs text-(--palette-gray-600) hover:bg-(--palette-surface-2)"
              >
                {t('activityOverrides.bulk.resetAll')}
              </button>
            </div>
          </div>

          <div className="bg-(--palette-surface) rounded-xl border border-(--palette-line) overflow-hidden">
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-(--palette-line) border-t-primary" />
              </div>
            )}

            {isError && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Icon name="triangle-exclamation" style="solid" className="size-10 text-red-400" />
                <p className="text-sm text-(--palette-gray-500)">
                  {t('errors.failedToLoadOverrides')}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="text-sm text-(--palette-primary-text) hover:underline"
                >
                  {t('common:actions.retry')}
                </button>
              </div>
            )}

            {!isLoading && !isError && data && (
              <table className="w-full text-sm">
                <thead className="bg-(--palette-surface-2) border-b border-(--palette-line) text-(--palette-gray-600) font-medium">
                  <tr>
                    <SortableTh
                      label={t('activityOverrides.columns.appraisalMenu')}
                      sortKey="menu"
                      activeKey={sort.key}
                      dir={sort.dir}
                      onSort={onSort}
                      className="text-left py-2.5 w-full"
                    />
                    <th className="text-xs text-center px-4 py-2.5 whitespace-nowrap font-semibold">
                      {t('activityOverrides.columns.access')}
                    </th>
                    <SortableTh
                      label={t('activityOverrides.effective.label')}
                      sortKey="effective"
                      activeKey={sort.key}
                      dir={sort.dir}
                      onSort={onSort}
                      className="text-left w-36 py-2.5"
                    />
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map(({ row, access, base, effective, noEffect, meta }) => {
                    const touched = access !== base;
                    const badge = effective ? EFFECTIVE_BADGE[effective] : null;
                    return (
                      <tr
                        key={row.menuItemId}
                        className="border-b border-(--palette-line-soft) last:border-b-0 hover:bg-(--palette-surface-2)/70 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {meta && (
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-(--palette-surface-2)">
                                <Icon
                                  name={meta.iconName}
                                  style={meta.iconStyle}
                                  className={clsx(
                                    'size-3.5',
                                    meta.iconColor ?? 'text-(--palette-gray-500)',
                                  )}
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-(--palette-ink)">{row.label}</span>
                                {touched && (
                                  <span
                                    className="size-1.5 rounded-full bg-amber-500"
                                    title={t('activityOverrides.status.unsaved')}
                                  />
                                )}
                              </div>
                              <span className="text-(--palette-gray-400) font-mono text-[11px]">
                                {row.itemKey}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-center">
                            <OverrideAccessSelect
                              value={access}
                              onChange={next => setAccess(row.menuItemId, next)}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {badge ? (
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={clsx(
                                  'inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                  badge.cls,
                                )}
                              >
                                <span className="size-1.5 rounded-full bg-current opacity-70" />
                                {t(badge.labelKey)}
                              </span>
                              {noEffect && (
                                <span className="text-[10px] text-(--palette-gray-400)">
                                  {t('activityOverrides.effective.roleNote')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-(--palette-gray-300)">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-10 text-center text-sm text-(--palette-gray-400)"
                      >
                        {t('activityOverrides.preview.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-1 lg:sticky lg:top-4">
          {data && (
            <ActivityPreviewPane items={previewItems} roleCodes={roleCodes} roleName={role?.name} />
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      {data && (
        <ActionBar>
          <ActionBar.Left>
            <ActionBar.UnsavedIndicator show={isDirty} />
            {isDirty && (
              <span className="text-xs text-(--palette-gray-500)">
                {t('activityOverrides.unsavedCount', { count: changeCount })}
              </span>
            )}
          </ActionBar.Left>
          <ActionBar.Right>
            <button
              type="button"
              onClick={() => setDraft({})}
              disabled={!isDirty || updateMutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-(--palette-line) text-(--palette-ink) hover:bg-(--palette-surface-2) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('activityOverrides.actions.discard')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateMutation.isPending && (
                <Icon name="spinner" style="solid" className="size-4 animate-spin" />
              )}
              {t('activityOverrides.actions.saveChanges')}
            </button>
          </ActionBar.Right>
        </ActionBar>
      )}

      <ConfirmDialog
        isOpen={pendingActivityId !== null}
        variant="warning"
        title={t('activityOverrides.confirmSwitch.title')}
        message={t('activityOverrides.confirmSwitch.message')}
        confirmText={t('activityOverrides.actions.discard')}
        cancelText={t('common:actions.cancel')}
        onClose={() => setPendingActivityId(null)}
        onConfirm={() => {
          setDraft({});
          setActivityId(pendingActivityId);
          setPendingActivityId(null);
        }}
      />
    </div>
  );
}
