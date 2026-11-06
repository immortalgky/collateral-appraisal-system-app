import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import type { ActiveTab } from '../../config/resolveInitialTab';

const TABS = [
  { value: 'personal', labelKey: 'page.tabMy', icon: 'user' },
  { value: 'pool', labelKey: 'page.tabPool', icon: 'users' },
] as const;

interface TaskTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  counts: Record<ActiveTab, number | null>;
  trailing?: ReactNode;
}

/** The My / Pool switch: an underline tab bar at the top of the list card. */
export function TaskTabs({ activeTab, onTabChange, counts, trailing }: TaskTabsProps) {
  const { t } = useTranslation('task');
  return (
    <div className="mt-3 flex w-full justify-between px-3 shadow-[inset_0_-1px_0_var(--palette-line)]">
      <div role="tablist" aria-label={t('page.tabsLabel')} className="flex items-stretch gap-1.5">
        {TABS.map(({ value, labelKey, icon }) => {
          const selected = activeTab === value;
          const count = counts[value];
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTabChange(value)}
              className={clsx(
                'inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                selected
                  ? 'border-(--palette-accent) text-(--palette-accent-ink)'
                  : 'border-transparent text-(--palette-ink-2) hover:text-(--palette-ink)',
              )}
            >
              <Icon style="solid" name={icon} className="text-xs" />
              {t(labelKey)}
              {count !== null && (
                <span
                  className={clsx(
                    'rounded-full px-2 py-0.5 text-xs tabular-nums',
                    selected
                      ? 'bg-primary/10 text-(--palette-primary-text)'
                      : 'bg-(--palette-surface-3) text-(--palette-ink-2)',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {trailing && <div className="flex items-center">{trailing}</div>}
    </div>
  );
}
