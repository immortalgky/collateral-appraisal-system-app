import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import type { MenuItemAdminDto } from '../types';

interface MenuTreePreviewPaneProps {
  items: MenuItemAdminDto[];
  /** Permission codes held by the previewed role, or null when none is chosen. */
  roleCodes: Set<string> | null;
  roleName?: string;
}

interface PreviewNode {
  item: MenuItemAdminDto;
  locked: boolean;
  depth: number;
}

/**
 * Flatten the menu tree to the rows a role actually sees: an item is shown only if
 * the role can view it (and its parent is shown); items the role can't edit get a
 * lock badge. With no role chosen, everything is shown (the full menu).
 */
function buildVisible(
  nodes: MenuItemAdminDto[],
  roleCodes: Set<string> | null,
  depth: number,
  out: PreviewNode[],
) {
  nodes.forEach(item => {
    const canView = roleCodes ? roleCodes.has(item.viewPermissionCode) : true;
    if (!canView) return; // parent hidden → whole subtree unreachable
    const canEdit = roleCodes
      ? !item.editPermissionCode || roleCodes.has(item.editPermissionCode)
      : true;
    out.push({ item, locked: !!roleCodes && !canEdit, depth });
    if (item.children?.length) buildVisible(item.children, roleCodes, depth + 1, out);
  });
}

/**
 * Live mock of the navigation a user sees, computed from role permissions (the
 * ceiling). Mirrors the appraisal-sidebar lock-badge styling so all three menu
 * tabs share one preview language.
 */
export function MenuTreePreviewPane({ items, roleCodes, roleName }: MenuTreePreviewPaneProps) {
  const { t } = useTranslation('menuManagement');
  const visible: PreviewNode[] = [];
  buildVisible(items, roleCodes, 0, visible);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Icon name="eye" style="solid" className="size-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-700">
            {t('activityOverrides.preview.title')}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          {roleCodes
            ? t('activityOverrides.preview.asRole', { role: roleName ?? '' })
            : t('activityOverrides.preview.selectRole')}
        </p>
      </div>

      <div className="p-2.5 space-y-1">
        {visible.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-gray-400">
            {t('activityOverrides.preview.empty')}
          </p>
        )}
        {visible.map(({ item, locked, depth }) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 rounded-lg bg-white border border-gray-100 px-2.5 py-2"
            style={{ marginLeft: depth * 14 }}
          >
            <div className="relative">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gray-50">
                <Icon
                  name={item.iconName}
                  style={item.iconStyle}
                  className={clsx('size-3.5', item.iconColor ?? 'text-gray-500')}
                />
              </div>
              {locked && (
                <div className="absolute -bottom-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-white">
                  <Icon name="lock" style="solid" className="size-1.5 text-gray-400" />
                </div>
              )}
            </div>
            <span className="flex-1 truncate text-sm text-gray-800">
              {item.labels?.en ?? item.itemKey}
            </span>
            {locked && (
              <span className="text-[10px] font-medium text-amber-600">
                {t('activityOverrides.effective.readonly')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
