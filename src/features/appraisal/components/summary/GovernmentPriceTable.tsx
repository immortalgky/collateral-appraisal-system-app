import { formatNumber } from '@/shared/utils/formatUtils';
import type { GovernmentPriceRow } from '../../api/decisionSummary';
import { useTranslation } from 'react-i18next';
import GovernmentPriceTableShell from './GovernmentPriceTableShell';

interface GovernmentPriceTableProps {
  rows: GovernmentPriceRow[];
  /** Total land area of all titles, including missing-from-survey. */
  totalArea: number;
  /** Non-missing area the AVG is computed over (shown under the AVG). */
  surveyedArea: number;
  avgPerSqWa: number;
}

/**
 * Column widths shared across the header/body/footer sub-tables so columns align.
 * Must be kept in sync with the number of <th>/<td> elements below.
 */
const COL_WIDTHS = ['40%', '20%', '20%', '20%'];

/**
 * Read-only table for land government appraisal prices (Sq.Wa), rendered via
 * the shared GovernmentPriceTableShell. See GovernmentPriceTableShell for the
 * expand/collapse and footer-hiding behaviour.
 */
const GovernmentPriceTable = ({
  rows,
  totalArea,
  surveyedArea,
  avgPerSqWa,
}: GovernmentPriceTableProps) => {
  const { t } = useTranslation('appraisal');
  const totalPrice = rows
    .filter(row => !row.isMissingFromSurvey)
    .reduce((sum, row) => sum + (row.governmentPrice ?? 0), 0);

  return (
    <GovernmentPriceTableShell
      rows={rows}
      colWidths={COL_WIDTHS}
      headerCells={
        <>
          <th className="px-3 py-2 text-left text-xs font-semibold text-(--palette-gray-600)">
            {t('governmentPriceTable.columns.titleDeedNo')}
          </th>
          <th className="px-3 py-2 text-right text-xs font-semibold text-(--palette-gray-600)">
            {t('governmentPriceTable.columns.sqWa')}
          </th>
          <th className="px-3 py-2 text-right text-xs font-semibold text-(--palette-gray-600)">
            {t('governmentPriceTable.columns.bahtPerSqWa')}
          </th>
          <th className="px-3 py-2 text-right text-xs font-semibold text-(--palette-gray-600)">
            {t('governmentPriceTable.columns.landPrice')}
          </th>
        </>
      }
      renderRow={(row, idx) => (
        <tr
          key={idx}
          className={
            row.isMissingFromSurvey
              ? 'bg-(--palette-req-wash) hover:bg-red-100 dark:hover:bg-red-500/20'
              : 'hover:bg-(--palette-surface-2)'
          }
        >
          <td className="px-3 py-2 text-(--palette-ink)">
            <div className="flex items-center gap-2 min-w-0">
              <span className="min-w-0 break-words">{row.titleNumber ?? '-'}</span>
              {row.isMissingFromSurvey && (
                <span className="inline-flex items-center rounded-full bg-(--palette-warn-wash) px-2 py-0.5 text-[10px] font-medium text-(--palette-warn) ring-1 ring-amber-200 dark:ring-amber-500/30">
                  {t('governmentPriceTable.missingFromSurvey')}
                </span>
              )}
            </div>
          </td>
          <td className="px-3 py-2 text-right text-(--palette-ink) tabular-nums">
            {row.areaSquareWa != null ? formatNumber(row.areaSquareWa, 2) : '-'}
          </td>
          <td className="px-3 py-2 text-right text-(--palette-ink) tabular-nums">
            {row.isMissingFromSurvey
              ? '-'
              : row.governmentPricePerSqWa != null
                ? formatNumber(row.governmentPricePerSqWa, 2)
                : '-'}
          </td>
          <td className="px-3 py-2 text-right text-(--palette-ink) tabular-nums">
            {row.isMissingFromSurvey
              ? '-'
              : row.governmentPrice != null
                ? formatNumber(row.governmentPrice, 2)
                : '-'}
          </td>
        </tr>
      )}
      footerCells={
        <>
          <td className="px-3 py-3 text-(--palette-ink) font-bold uppercase tracking-wider text-xs">
            {t('governmentPriceTable.footer.total')}
          </td>
          <td className="px-3 py-3 text-right font-bold text-(--palette-ink) tabular-nums">
            {formatNumber(totalArea, 2)}
          </td>
          <td className="px-3 py-3 text-right text-(--palette-ink) tabular-nums">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-(--palette-gray-400) font-medium mr-1.5">
                {t('governmentPriceTable.footer.avg')}
              </span>
              {formatNumber(avgPerSqWa, 2)}
            </div>
            {surveyedArea !== totalArea && (
              <div className="mt-0.5 text-xs font-medium text-(--palette-warn) tabular-nums">
                {t('governmentPriceTable.footer.avgBasis', {
                  area: formatNumber(surveyedArea, 2),
                })}
              </div>
            )}
          </td>
          <td className="px-3 py-3 text-right font-bold text-(--palette-ink) tabular-nums">
            {formatNumber(totalPrice, 2)}
          </td>
        </>
      }
      showMoreLabel={remaining =>
        t('governmentPriceTable.showMore', {
          remaining,
          defaultValue: 'Show more ({{remaining}}) deeds',
        })
      }
      showLessLabel={t('governmentPriceTable.showLess', { defaultValue: 'Show less' })}
    />
  );
};

export default GovernmentPriceTable;
