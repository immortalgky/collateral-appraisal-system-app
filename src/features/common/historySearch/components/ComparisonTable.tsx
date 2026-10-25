import { useTranslation } from 'react-i18next';
import type { MarketComparablePinDto } from '../types';
import { formatNumber } from '@shared/utils/formatUtils';

interface ComparisonTableProps {
  pins: MarketComparablePinDto[];
  onClose: () => void;
}

/**
 * Comparison table for blue (Market Comparable) pins.
 *
 * v1: shows the single selected MC. Multi-select is a future enhancement.
 * TODO: wire multi-select so user can compare several MCs side-by-side.
 */
export function ComparisonTable({ pins, onClose }: ComparisonTableProps) {
  const { t } = useTranslation('historySearch');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--palette-line) shrink-0">
        <h3 className="text-base font-semibold text-(--palette-ink)">
          {t('comparisonTable.title')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-(--palette-gray-400) hover:text-(--palette-gray-600) transition-colors p-1 rounded"
          aria-label={t('comparisonTable.close')}
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* TODO notice */}
      <div className="mx-4 mt-3 px-3 py-2 bg-(--palette-warn-wash) border border-amber-200 dark:border-amber-500/30 rounded-md">
        <p className="text-xs text-(--palette-warn)">{t('comparisonTable.todoMultiSelect')}</p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-(--palette-surface-2)">
              <th className="text-left px-3 py-2 text-xs font-semibold text-(--palette-gray-600) border border-(--palette-line)">
                {t('comparisonTable.surveyName')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-(--palette-gray-600) border border-(--palette-line)">
                {t('comparisonTable.propertyType')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-(--palette-gray-600) border border-(--palette-line)">
                {t('comparisonTable.infoDateTime')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-(--palette-gray-600) border border-(--palette-line)">
                {t('comparisonTable.offerPrice')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-(--palette-gray-600) border border-(--palette-line)">
                {t('comparisonTable.salePrice')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-(--palette-gray-600) border border-(--palette-line)">
                {t('comparisonTable.distanceKm')}
              </th>
            </tr>
          </thead>
          <tbody>
            {pins.map(pin => (
              <tr key={pin.marketComparableId} className="hover:bg-(--palette-surface-2)">
                <td className="px-3 py-2 border border-(--palette-line) text-(--palette-gray-600)">
                  {pin.surveyName}
                </td>
                <td className="px-3 py-2 border border-(--palette-line) text-(--palette-ink-2)">
                  {pin.propertyType}
                </td>
                <td className="px-3 py-2 border border-(--palette-line) text-(--palette-ink-2)">
                  {pin.infoDateTime
                    ? new Date(pin.infoDateTime).toLocaleDateString('en-GB')
                    : t('common.na')}
                </td>
                <td className="px-3 py-2 border border-(--palette-line) text-right tabular-nums text-(--palette-ink)">
                  {pin.offerPrice != null ? formatNumber(pin.offerPrice, 0) : t('common.na')}
                </td>
                <td className="px-3 py-2 border border-(--palette-line) text-right tabular-nums text-(--palette-ink)">
                  {pin.salePrice != null ? formatNumber(pin.salePrice, 0) : t('common.na')}
                </td>
                <td className="px-3 py-2 border border-(--palette-line) text-right tabular-nums text-(--palette-gray-600)">
                  {pin.distanceKm != null ? pin.distanceKm.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
