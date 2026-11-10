import { useTranslation } from 'react-i18next';
import SectionHeader from '@/shared/components/sections/SectionHeader';
import { FavoritesRow } from '@features/menuFavorites';
import type { ActiveTab } from '../../config/resolveInitialTab';

interface TaskListHeaderProps {
  /** Picks the subtitle: the My and Pool tabs describe themselves differently. */
  activeTab: ActiveTab;
  /** An activity page names itself; the default is the All Tasks title and tab subtitle. */
  title?: string;
  subtitle?: string;
}

/**
 * The page header (SectionHeader: title, subtitle) with the quick-access row at the right.
 * The My / Pool tabs sit in the list card below it (TaskTabs).
 */
export function TaskListHeader({ activeTab, title, subtitle }: TaskListHeaderProps) {
  const { t } = useTranslation(['task', 'common']);
  return (
    <SectionHeader
      // the page's own gap spaces it, not the section header's bottom margin. Without an icon
      // SectionHeader reads as an in-card section (text-sm title, divider line); this is still
      // the page header, so keep the text-base title and hide the divider from here.
      className="mb-0! shrink-0 [&_h3]:text-base [&>hr]:hidden"
      title={title ?? t('task:page.title')}
      subtitle={
        subtitle ?? t(activeTab === 'pool' ? 'task:page.subtitlePool' : 'task:page.subtitleMy')
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
