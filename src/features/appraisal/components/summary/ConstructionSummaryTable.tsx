import Icon from '@/shared/components/Icon';
import { ConstructionTimelineBar } from '@/shared/components/ConstructionTimelineBar';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { ConstructionSummaryRow } from '../../api/decisionSummary';
import { useTranslation } from 'react-i18next';

interface Props {
  rows: ConstructionSummaryRow[];
  village?: string | null;
}

const ROW_CONFIG: Record<
  string,
  {
    bg: string;
    border: string;
    labelClass: string;
    barColor: string;
    valueClass: string;
    iconName: string;
    iconClass: string;
    isDelta: boolean;
  }
> = {
  Previous: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-b border-blue-100 dark:border-blue-500/20',
    labelClass: 'text-blue-700 dark:text-blue-300',
    barColor: 'bg-blue-400',
    valueClass: 'text-(--palette-ink)',
    iconName: 'clock-rotate-left',
    iconClass: 'text-blue-500',
    isDelta: false,
  },
  'Construction Increased': {
    bg: 'bg-(--palette-warn-wash)',
    border: 'border-b border-amber-100 dark:border-amber-500/20',
    labelClass: 'text-(--palette-warn) font-medium',
    barColor: 'bg-amber-400',
    valueClass: 'text-(--palette-warn) font-medium',
    iconName: 'arrow-trend-up',
    iconClass: 'text-amber-500',
    isDelta: true,
  },
  Current: {
    bg: 'bg-(--palette-accent-wash)',
    border: 'border-b-2 border-teal-300 dark:border-teal-500/40',
    labelClass: 'text-teal-800 dark:text-teal-300 font-semibold',
    barColor: 'bg-teal-500',
    valueClass: 'text-teal-800 dark:text-teal-300 font-semibold',
    iconName: 'bullseye',
    iconClass: 'text-(--palette-accent-ink)',
    isDelta: false,
  },
  'Remaining construction': {
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-b border-orange-100 dark:border-orange-500/20',
    labelClass: 'text-orange-700 dark:text-orange-300',
    barColor: 'bg-orange-400',
    valueClass: 'text-(--palette-ink)',
    iconName: 'hourglass-start',
    iconClass: 'text-orange-500',
    isDelta: false,
  },
  'Complete ( 100% )': {
    bg: 'bg-green-50 dark:bg-green-500/10',
    border: 'border-b border-green-100 dark:border-green-500/20',
    labelClass: 'text-green-800 dark:text-green-300',
    barColor: 'bg-green-500',
    valueClass: 'text-(--palette-ink)',
    iconName: 'flag-checkered',
    iconClass: 'text-green-600 dark:text-green-400',
    isDelta: false,
  },
};

const DEFAULT_CONFIG = ROW_CONFIG['Previous'];

const ConstructionSummaryTable = ({ rows, village }: Props) => {
  const { t } = useTranslation('appraisal');

  const previousRow = rows.find(r => r.label === 'Previous');
  const currentRow = rows.find(r => r.label === 'Current');
  const completeRow = rows.find(r => r.label === 'Complete ( 100% )');

  return (
    <div className="space-y-4">
      {village && (
        <div className="flex items-center gap-2 border-b border-(--palette-line-soft) pb-3 text-sm text-(--palette-ink)">
          <Icon name="house" style="solid" className="size-3.5 text-(--palette-gray-400)" />
          <span className="text-(--palette-gray-500)">
            {t('constructionSummaryTable.villageLabel')}:
          </span>
          <span className="font-medium text-(--palette-ink)">{village}</span>
        </div>
      )}

      <ConstructionTimelineBar
        prevValue={previousRow?.buildingValueConstructing ?? 0}
        currentValue={currentRow?.buildingValueConstructing ?? 0}
        totalValue={completeRow?.buildingValueConstructing ?? 0}
      />

      <div className="overflow-x-auto rounded border border-(--palette-line)">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-(--palette-surface-2) border-b border-(--palette-line)">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-(--palette-gray-600) w-56">
                {t('constructionSummaryTable.columns.milestone')}
              </th>
              <th
                className="px-3 py-2.5 text-right text-xs font-semibold text-(--palette-gray-600) w-40 leading-tight"
                title="Land Value + under-construction value at this milestone + completed buildings"
              >
                {t('constructionSummaryTable.columns.totalAppraisalValue')}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-(--palette-gray-600) w-36 leading-tight">
                {t('constructionSummaryTable.columns.landValue')}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-(--palette-gray-600) w-32 leading-tight">
                {t('constructionSummaryTable.columns.constructionProgress')}
              </th>
              <th
                className="px-3 py-2.5 text-right text-xs font-semibold text-(--palette-gray-600) w-36 leading-tight"
                title="Current under-construction structure value at this milestone (CI only)"
              >
                {t('constructionSummaryTable.columns.buildingValue')}
              </th>
              <th
                className="px-3 py-2.5 text-right text-xs font-semibold text-(--palette-gray-600) w-44 leading-tight"
                title="Completed buildings registered before the construction inspection (non-CI)"
              >
                {t('constructionSummaryTable.columns.buildingValuePreInspection')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const cfg = ROW_CONFIG[row.label] ?? DEFAULT_CONFIG;
              const isCurrent = row.label === 'Current';
              const isLast = idx === rows.length - 1;
              const rowBg = isCurrent ? 'bg-(--palette-accent-wash)/60' : 'bg-(--palette-surface)';
              const borderClass = isLast ? '' : 'border-b border-(--palette-line-soft)';
              const numericClass = `px-3 py-2.5 text-right tabular-nums ${isCurrent ? 'text-teal-800 dark:text-teal-300 font-bold' : 'text-(--palette-ink) font-medium'}`;
              const preInspection = row.totalBuildingValue - row.buildingValueConstructing;
              return (
                <tr key={row.label} className={`${rowBg} ${borderClass}`}>
                  <td className={`px-4 py-2.5 ${cfg.labelClass}`}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full ${cfg.iconClass.replace('text-', 'bg-').replace('-500', '-100').replace('-600', '-100')}`}
                      >
                        <Icon
                          name={cfg.iconName}
                          style="solid"
                          className={`size-3 ${cfg.iconClass}`}
                        />
                      </span>
                      {row.label}
                    </span>
                  </td>
                  <td className={numericClass}>{formatNumber(row.totalAppraisalValue, 2)}</td>
                  <td className={numericClass}>{formatNumber(row.totalLandValue, 2)}</td>
                  <td className={numericClass}>{formatNumber(row.constructionProgressPct, 2)} %</td>
                  <td className={numericClass}>{formatNumber(row.buildingValueConstructing, 2)}</td>
                  <td className={numericClass}>{formatNumber(preInspection, 2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConstructionSummaryTable;
