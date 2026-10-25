import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import type { IconStyle } from '../types';
import { effectiveIntent, effectiveWithRole, type OverrideAccess } from '../overrideAccess';

export interface PreviewItem {
  menuItemId: string;
  label: string;
  iconName: string;
  iconStyle: IconStyle;
  iconColor: string | null;
  access: OverrideAccess;
  /** Whether the previewed role sees this item before overrides (see utils/menuVisibility). */
  roleCanView: boolean;
  editCode: string | null;
}

interface ActivityPreviewPaneProps {
  items: PreviewItem[];
  /** Permission codes held by the previewed role, or null when no role is chosen. */
  roleCodes: Set<string> | null;
  roleName?: string;
}

/**
 * Live mock of the appraisal sidebar a user sees while on this activity, computed
 * as role-base ∩ override. Hidden items disappear; read-only items show the lock
 * badge (mirroring AppraisalSidebar's CompactMenuItem).
 */
export function ActivityPreviewPane({ items, roleCodes, roleName }: ActivityPreviewPaneProps) {
  const { t } = useTranslation('menuManagement');

  const visible = items
    .map(item => {
      const eff = roleCodes
        ? effectiveWithRole(
            item.access,
            item.roleCanView,
            !!item.editCode && roleCodes.has(item.editCode),
          )
        : effectiveIntent(item.access);
      return { item, eff };
    })
    .filter(({ eff }) => eff === 'editable' || eff === 'readonly');

  return (
    <div className="rounded-xl border border-(--palette-line) bg-(--palette-surface-2)/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-(--palette-line) bg-(--palette-surface)">
        <div className="flex items-center gap-2">
          <Icon name="eye" style="solid" className="size-3.5 text-(--palette-gray-400)" />
          <span className="text-xs font-semibold text-(--palette-ink)">
            {t('activityOverrides.preview.title')}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-(--palette-gray-500)">
          {roleCodes
            ? t('activityOverrides.preview.asRole', { role: roleName ?? '' })
            : t('activityOverrides.preview.intentNote')}
        </p>
      </div>

      <div className="p-2.5 space-y-1">
        {visible.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-(--palette-gray-400)">
            {t('activityOverrides.preview.empty')}
          </p>
        )}
        {visible.map(({ item, eff }) => {
          const locked = eff === 'readonly';
          return (
            <div
              key={item.menuItemId}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 bg-(--palette-surface) border border-(--palette-line-soft)"
            >
              <div className="relative">
                <div className="flex size-7 items-center justify-center rounded-lg bg-(--palette-surface-2)">
                  <Icon
                    name={item.iconName}
                    style={item.iconStyle}
                    className={clsx('size-3.5', item.iconColor ?? 'text-(--palette-gray-500)')}
                  />
                </div>
                {locked && (
                  <div className="absolute -bottom-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-(--palette-surface)">
                    <Icon
                      name="lock"
                      style="solid"
                      className="size-1.5 text-(--palette-gray-400)"
                    />
                  </div>
                )}
              </div>
              <span className="flex-1 truncate text-sm text-(--palette-ink)">{item.label}</span>
              {locked && (
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  {t('activityOverrides.effective.readonly')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
