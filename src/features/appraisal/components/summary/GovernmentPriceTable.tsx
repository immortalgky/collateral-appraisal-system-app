import { formatNumber } from '@/shared/utils/formatUtils';
import type { GovernmentPriceRow } from '../../api/decisionSummary';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface GovernmentPriceTableProps {
  rows: GovernmentPriceRow[];
  totalArea: number;
  avgPerSqWa: number;
}

const MAX_INITIAL_ROWS = 5;

/**
 * Column widths shared across all three sub-tables so columns align.
 * Must be kept in sync with the number of <col> elements below.
 */
const COL_WIDTHS = ['40%', '20%', '20%', '20%'];

const SharedColGroup = () => (
  <colgroup>
    {COL_WIDTHS.map((w, i) => (
      <col key={i} style={{ width: w }} />
    ))}
  </colgroup>
);

/**
 * Read-only table for government appraisal prices.
 *
 * Behaviour:
 *  - ≤ 5 rows  → all rows visible, no expand button
 *  - > 5 rows  → first 5 shown; "Show more" button appears before the footer
 *  - Expanded  → all rows in a scrollable area (~10 rows tall); "Show less" stays
 *                pinned between the scroll area and the footer
 *
 * Three-table layout keeps column widths consistent between header, body, and footer:
 *   [thead table – fixed]
 *   [scrollable div → tbody table]
 *   [show more/less button row – always visible]   ← before footer
 *   [tfoot table – fixed]
 */
const GovernmentPriceTable = ({ rows, totalArea, avgPerSqWa }: GovernmentPriceTableProps) => {
  const { t } = useTranslation('appraisal');
  const totalPrice = rows
    .filter(row => !row.isMissingFromSurvey)
    .reduce((sum, row) => sum + (row.governmentPrice ?? 0), 0);
  const isSingleDeed = rows.length === 1;
  const isExceedDeed = rows.length > MAX_INITIAL_ROWS;
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleRows = isExpanded ? rows : rows.slice(0, MAX_INITIAL_ROWS);

  return (
    <div className="border border-gray-200 rounded-sm">
      {/* Header (fixed) */}
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <SharedColGroup />
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
      </table>

      {/* Body (scrollable when expanded) */}
      <div className={isExpanded ? 'overflow-y-auto max-h-64' : ''}>
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <SharedColGroup />
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
          </tbody>
        </table>
      </div>

      {/* Show more / Show less (pinned before footer) */}
      {isExceedDeed && (
        <div className="border-t border-gray-100 px-3 py-2 text-center">
          <button
            type="button"
            className="text-primary-600 hover:underline cursor-pointer text-sm"
            onClick={() => setIsExpanded(prev => !prev)}
          >
            {isExpanded ? 'Show less' : `Show more (${rows.length - MAX_INITIAL_ROWS}) deeds`}
          </button>
        </div>
      )}

      {/* Footer (fixed) */}
      {!isSingleDeed && (
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <SharedColGroup />
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
        </table>
      )}
    </div>
  );
};

export default GovernmentPriceTable;
