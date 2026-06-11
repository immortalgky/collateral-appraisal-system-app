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
  viewCode: string;
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
            roleCodes.has(item.viewCode),
            !!item.editCode && roleCodes.has(item.editCode),
          )
        : effectiveIntent(item.access);
      return { item, eff };
    })
    .filter(({ eff }) => eff === 'editable' || eff === 'readonly');

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
            : t('activityOverrides.preview.intentNote')}
        </p>
      </div>

      <div className="p-2.5 space-y-1">
        {visible.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-gray-400">
            {t('activityOverrides.preview.empty')}
          </p>
        )}
        {visible.map(({ item, eff }) => {
          const locked = eff === 'readonly';
          return (
            <div
              key={item.menuItemId}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 bg-white border border-gray-100"
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
              <span className="flex-1 truncate text-sm text-gray-800">{item.label}</span>
              {locked && (
                <span className="text-[10px] font-medium text-amber-600">
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
