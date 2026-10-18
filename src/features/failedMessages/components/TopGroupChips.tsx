import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { FailedMessageStatusFilter, TopGroup } from '../types';
import { isTopGroupActive } from '../utils/queueHealth';
import { exceptionTypeLabel, SKIPPED_EXCEPTION_TYPE } from '../utils/labels';

interface TopGroupChipsProps {
  topGroups: TopGroup[];
  activeQueue?: string;
  activeExceptionType?: string;
  // A chip sets queue + exceptionType only — it can never itself be "pressed" while a node or
  // search filter (which it doesn't control) is also applied, or the chip would look selected for
  // a filter combination the user didn't actually pick by clicking it.
  activeNode?: string;
  activeSearch?: string;
  // A chip only ever filters the Pending tab — it can never be "pressed" on another tab either.
  activeStatus: FailedMessageStatusFilter;
  onToggle: (group: TopGroup) => void;
}

const TopGroupChips = ({
  topGroups,
  activeQueue,
  activeExceptionType,
  activeNode,
  activeSearch,
  activeStatus,
  onToggle,
}: TopGroupChipsProps) => {
  const { t } = useTranslation('failedMessages');

  if (topGroups.length === 0) return null;

  const filters = {
    queue: activeQueue ?? '',
    exceptionType: activeExceptionType ?? '',
    node: activeNode ?? '',
    search: activeSearch ?? '',
    status: activeStatus,
  };
  const hasActive =
    !!activeQueue &&
    !!activeExceptionType &&
    isTopGroupActive({ queue: activeQueue, exceptionType: activeExceptionType }, filters);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-[12px] text-gray-500 mr-0.5">{t('topGroups.label')}</span>
      {topGroups.map(group => {
        const pressed = isTopGroupActive(group, filters);
        const isSkipped = group.exceptionType === SKIPPED_EXCEPTION_TYPE;
        return (
          <button
            key={`${group.queue}|${group.exceptionType}`}
            type="button"
            aria-pressed={pressed}
            title={isSkipped ? undefined : group.exceptionType}
            onClick={() => onToggle(group)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-[11px] py-1 text-[12px] shadow-sm transition-colors',
              pressed
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-base-300 bg-base-100 hover:border-primary/40',
            )}
          >
            <b className="text-red-600 dark:text-red-400 tabular-nums">{group.count}</b>
            {exceptionTypeLabel(t, group.exceptionType)}
            <span className="font-mono text-base-content/60">· {group.queue}</span>
          </button>
        );
      })}
      {hasActive && (
        <button
          type="button"
          onClick={() =>
            onToggle({ queue: activeQueue!, exceptionType: activeExceptionType!, count: 0 })
          }
          className="text-[12px] text-gray-600 hover:text-gray-800 px-2 py-1"
        >
          {t('topGroups.clear')}
        </button>
      )}
    </div>
  );
};

export default TopGroupChips;
