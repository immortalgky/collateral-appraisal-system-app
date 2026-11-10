import clsx from 'clsx';
import type { KeyboardEvent } from 'react';
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
}

/** The My / Pool switch: an underline tab bar at the top of the list card. */
export function TaskTabs({ activeTab, onTabChange, counts }: TaskTabsProps) {
  const { t } = useTranslation('task');
  // Roving focus: only the open tab is in the tab order; arrows, Home and End switch and focus
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = TABS.findIndex(tab => tab.value === activeTab);
    const to =
      e.key === 'ArrowRight'
        ? (at + 1) % TABS.length
        : e.key === 'ArrowLeft'
          ? (at - 1 + TABS.length) % TABS.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? TABS.length - 1
              : -1;
    if (to === -1) return;
    e.preventDefault();
    onTabChange(TABS[to].value);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
  };
  return (
    <div className="mt-3 flex w-full justify-between px-3 shadow-[inset_0_-1px_0_var(--palette-line)]">
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- the tabs inside are the focus stops */}
      <div
        role="tablist"
        aria-label={t('page.tabsLabel')}
        onKeyDown={onKeyDown}
        className="flex items-stretch gap-1.5"
      >
        {TABS.map(({ value, labelKey, icon }) => {
          const selected = activeTab === value;
          const count = counts[value];
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
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
                      ? 'bg-(--palette-primary-wash) text-(--palette-primary-text)'
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
    </div>
  );
}
