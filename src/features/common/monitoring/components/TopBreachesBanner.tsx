import { useTranslation } from 'react-i18next';

import Icon from '@shared/components/Icon';

import { useTopBreaches, type TopBreachRow, type TopBreachSectionId } from '../api/monitoringApi';

interface TopBreachesBannerProps {
  /** Sections the user is permitted to see (subset of OLA). Banner is hidden if none. */
  visibleOlaSections: TopBreachSectionId[];
  /** Called when a chip is clicked — parent expands the section + scrolls into view. */
  onChipClick: (row: TopBreachRow) => void;
}

const SECTION_ICON: Record<TopBreachSectionId, { icon: string; tone: string }> = {
  'pending-internal': {
    icon: 'briefcase',
    tone: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10',
  },
  'pending-external': {
    icon: 'building',
    tone: 'text-amber-600 dark:text-amber-400 bg-(--palette-warn-wash)',
  },
  'pending-followup': {
    icon: 'clipboard-list',
    tone: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10',
  },
};

function TopBreachesBanner({ visibleOlaSections, onChipClick }: TopBreachesBannerProps) {
  const { t } = useTranslation('monitoring');
  const enabled = visibleOlaSections.length > 0;

  const { data, isLoading, isError } = useTopBreaches({ enabled, limit: 5 });

  if (!enabled || isLoading || isError) return null;
  const rows = data ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-(--palette-req-line) bg-(--palette-req-wash)/40">
      <span className="inline-flex items-center justify-center size-7 rounded-md bg-red-100 dark:bg-red-500/20 text-(--palette-danger) shrink-0">
        <Icon style="solid" name="triangle-exclamation" className="size-3.5" />
      </span>
      <span className="text-xs font-semibold text-(--palette-req) shrink-0">
        {t('topBreaches.title')}
      </span>
      <div className="flex flex-wrap gap-1.5 min-w-0">
        {rows.map((row, idx) => {
          const tone = SECTION_ICON[row.sectionId];
          const hours = row.olaVarianceHours ?? 0;
          return (
            <button
              key={`${row.sectionId}:${row.appraisalId ?? row.appraisalNumber ?? ''}:${idx}`}
              type="button"
              onClick={() => onChipClick(row)}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-(--palette-surface) border border-(--palette-req-line) rounded-full hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-sm transition-all"
            >
              <span
                className={[
                  'inline-flex items-center justify-center size-4 rounded',
                  tone?.tone ?? 'text-(--palette-gray-500) bg-(--palette-surface-3)',
                ].join(' ')}
              >
                <Icon style="solid" name={tone?.icon ?? 'circle'} className="size-2.5" />
              </span>
              <span className="text-(--palette-primary-text) font-semibold">
                {row.appraisalNumber ?? '—'}
              </span>
              {row.customerName && (
                <span className="text-(--palette-gray-500) max-w-[120px] truncate">
                  {row.customerName}
                </span>
              )}
              <span className="text-(--palette-danger) tabular-nums">
                {t('topBreaches.hoursLate', { hours })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TopBreachesBanner;
