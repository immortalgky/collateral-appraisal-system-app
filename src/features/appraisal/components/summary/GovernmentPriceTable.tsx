import { formatNumber } from '@/shared/utils/formatUtils';
import type { GovernmentPriceRow } from '../../api/decisionSummary';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface GovernmentPriceTableProps {
  rows: GovernmentPriceRow[];
  totalArea: number;
  avgPerSqWa: number;
}

/**
 * Read-only table for government appraisal prices.
 */
const GovernmentPriceTable = ({ rows, totalArea, avgPerSqWa }: GovernmentPriceTableProps) => {
  const { t } = useTranslation('appraisal');
  const totalPrice = rows
    .filter(row => !row.isMissingFromSurvey)
    .reduce((sum, row) => sum + (row.governmentPrice ?? 0), 0);
  const isSingleDeed = rows.length === 1;
  const isExceedDeed = rows.length > 5;
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const visibleRows = isExpanded ? rows : rows.slice(0, 5);

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
              {t('governmentPriceTable.columns.titleDeedNo')}
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
              {t('governmentPriceTable.columns.sqWa')}
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
              {t('governmentPriceTable.columns.bahtPerSqWa')}
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
              {t('governmentPriceTable.columns.landPrice')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visibleRows.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-900">
                <span className="inline-flex items-center gap-2">
                  {row.titleNumber ?? '-'}
                  {row.isMissingFromSurvey && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                      {t('governmentPriceTable.missingFromSurvey')}
                    </span>
                  )}
                </span>
              </td>
              <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                {row.areaSquareWa != null ? formatNumber(row.areaSquareWa, 2) : '-'}
              </td>
              <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                {row.isMissingFromSurvey
                  ? '-'
                  : row.governmentPricePerSqWa != null
                    ? formatNumber(row.governmentPricePerSqWa, 2)
                    : '-'}
              </td>
              <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                {row.isMissingFromSurvey
                  ? '-'
                  : row.governmentPrice != null
                    ? formatNumber(row.governmentPrice, 2)
                    : '-'}
              </td>
            </tr>
          ))}
          {isExceedDeed && (
            <tr>
              <td colSpan={4} className="px-3 py-2 text-center">
                <button
                  type="button"
                  className="text-primary-600 hover:underline cursor-pointer"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Show less' : `Show more (${rows.length - 5}) deeds`}
                </button>
              </td>
            </tr>
          )}
        </tbody>
        {!isSingleDeed && (
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-400">
              <td className="px-3 py-3 text-gray-700 font-bold uppercase tracking-wider text-xs">
                {t('governmentPriceTable.footer.total')}
              </td>
              <td className="px-3 py-3 text-right font-bold text-gray-900 tabular-nums">
                {formatNumber(totalArea, 2)}
              </td>
              <td className="px-3 py-3 text-right text-gray-700 tabular-nums">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mr-1.5">
                  {t('governmentPriceTable.footer.avg')}
                </span>
                {formatNumber(avgPerSqWa, 2)}
              </td>
              <td className="px-3 py-3 text-right font-bold text-gray-900 tabular-nums">
                {formatNumber(totalPrice, 2)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default GovernmentPriceTable;
