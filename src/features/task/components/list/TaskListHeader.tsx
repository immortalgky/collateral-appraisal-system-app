import { useTranslation } from 'react-i18next';
import SectionHeader from '@/shared/components/sections/SectionHeader';
import { FavoritesRow } from '@features/menuFavorites';
import type { ActiveTab } from '../../config/resolveInitialTab';
import { PillSegments } from './PillSegments';

interface TaskListHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  /** The shown tab's total, beside the title; null while not known yet. */
  total: number | null;
  /** Counts on the My / Pool switch; null while not known yet. */
  myCount: number | null;
  poolCount: number | null;
}

/**
 * The page header (SectionHeader: title, subtitle) with the count beside the title, the
 * My / Pool switch beside the text, and the quick-access row at the right.
 */
export function TaskListHeader({
  activeTab,
  onTabChange,
  total,
  myCount,
  poolCount,
}: TaskListHeaderProps) {
  const { t } = useTranslation(['task', 'common']);
  return (
    <SectionHeader
      // the page's own gap spaces it, not the section header's bottom margin. Without an icon
      // SectionHeader reads as an in-card section (text-sm title, divider line); this is still
      // the page header, so keep the text-base title and hide the divider from here.
      className="mb-0! shrink-0 [&_h3]:text-base [&>hr]:hidden"
      title={t('task:page.title')}
      subtitle={t(activeTab === 'pool' ? 'task:page.subtitlePool' : 'task:page.subtitleMy')}
      titleAddon={
        total !== null && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums">
            {total}
          </span>
        )
      }
      afterTitle={
        <div className="ml-1">
          <PillSegments
            label={t('task:page.tabsLabel')}
            value={activeTab}
            onChange={onTabChange}
            options={[
              {
                value: 'personal',
                label: t('task:page.tabMy'),
                icon: 'user',
                count: myCount ?? undefined,
              },
              {
                value: 'pool',
                label: t('task:page.tabPool'),
                icon: 'users',
                count: poolCount ?? undefined,
              },
            ]}
          />
        </div>
      }
      rightIcon={
        // Quick access: label on top, scrolls sideways when there are many
        <div className="flex min-w-0 flex-col">
          <p className="mb-1 text-right text-xs font-semibold tracking-wider text-gray-400 uppercase">
            {t('common:favorites.row.sectionTitle')}
          </p>
          <div className="min-w-0">
            <FavoritesRow />
          </div>
        </div>
      }
    />
  );
}
