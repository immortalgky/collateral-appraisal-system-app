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
  'pending-internal': { icon: 'briefcase', tone: 'text-indigo-600 bg-indigo-50' },
  'pending-external': { icon: 'building', tone: 'text-amber-600 bg-amber-50' },
  'pending-followup': { icon: 'clipboard-list', tone: 'text-purple-600 bg-purple-50' },
};

function TopBreachesBanner({ visibleOlaSections, onChipClick }: TopBreachesBannerProps) {
  const { t } = useTranslation('monitoring');
  const enabled = visibleOlaSections.length > 0;

  const { data, isLoading, isError } = useTopBreaches({ enabled, limit: 5 });

  if (!enabled || isLoading || isError) return null;
  const rows = data ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-red-200 bg-red-50/40">
      <span className="inline-flex items-center justify-center size-7 rounded-md bg-red-100 text-red-600 shrink-0">
        <Icon style="solid" name="triangle-exclamation" className="size-3.5" />
      </span>
      <span className="text-xs font-semibold text-red-700 shrink-0">{t('topBreaches.title')}</span>
      <div className="flex flex-wrap gap-1.5 min-w-0">
        {rows.map((row, idx) => {
          const tone = SECTION_ICON[row.sectionId];
          const hours = row.olaVarianceHours ?? 0;
          return (
            <button
              key={`${row.sectionId}:${row.appraisalId ?? row.appraisalNumber ?? ''}:${idx}`}
              type="button"
              onClick={() => onChipClick(row)}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-white border border-red-200 rounded-full hover:border-red-300 hover:shadow-sm transition-all"
            >
              <span
                className={[
                  'inline-flex items-center justify-center size-4 rounded',
                  tone?.tone ?? 'text-gray-500 bg-gray-100',
                ].join(' ')}
              >
                <Icon style="solid" name={tone?.icon ?? 'circle'} className="size-2.5" />
              </span>
              <span className="text-primary font-semibold">{row.appraisalNumber ?? '—'}</span>
              {row.customerName && (
                <span className="text-gray-500 max-w-[120px] truncate">{row.customerName}</span>
              )}
              <span className="text-red-600 tabular-nums">
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
