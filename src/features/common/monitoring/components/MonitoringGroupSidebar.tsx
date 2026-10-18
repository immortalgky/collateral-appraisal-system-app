import { useTranslation } from 'react-i18next';
import GroupSidebar from '@shared/components/GroupSidebar';
import { useLocalizedCompanyName } from '@shared/utils/companyName';
import type { MonitoringGroupRow, GroupByField } from '../api/types';

interface MonitoringGroupSidebarProps {
  groups: MonitoringGroupRow[];
  isLoading: boolean;
  groupBy: GroupByField;
  activeKey: string | null;
  onSelect: (group: MonitoringGroupRow | null) => void;
}

const GROUP_BY_LABEL_KEY: Record<
  GroupByField,
  'common.groupBy.pic' | 'common.groupBy.company' | 'common.groupBy.activity'
> = {
  pic: 'common.groupBy.pic',
  company: 'common.groupBy.company',
  activity: 'common.groupBy.activity',
};

/** The monitoring tabs' wording and company-name localisation around the shared GroupSidebar. */
function MonitoringGroupSidebar({
  groups,
  isLoading,
  groupBy,
  activeKey,
  onSelect,
}: MonitoringGroupSidebarProps) {
  const { t } = useTranslation('monitoring');
  const localizeCompanyName = useLocalizedCompanyName();

  return (
    <GroupSidebar
      caption={t('common.groupBy.label')}
      title={t(GROUP_BY_LABEL_KEY[groupBy])}
      groups={groups.map(g => ({
        ...g,
        label: localizeCompanyName(g.label || g.key, g.labelLocal),
      }))}
      isLoading={isLoading}
      activeKeys={activeKey === null ? [] : [activeKey]}
      onSelect={item => onSelect(item ? (groups.find(g => g.key === item.key) ?? null) : null)}
      emptyLabel={t('common.noRecords')}
    />
  );
}

export default MonitoringGroupSidebar;
