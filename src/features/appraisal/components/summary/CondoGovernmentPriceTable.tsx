import { formatNumber } from '@/shared/utils/formatUtils';
import type { CondoGovernmentPriceRow } from '../../api/decisionSummary';
import { useTranslation } from 'react-i18next';
import GovernmentPriceTableShell from './GovernmentPriceTableShell';

interface CondoGovernmentPriceTableProps {
  rows: CondoGovernmentPriceRow[];
  /** Total usable area of all rooms (Sq.M.). */
  totalArea: number;
  /** Server-computed area-weighted average (totalPrice / totalArea) — do not recompute client-side. */
  avgPerSqm: number;
}

/**
 * Column widths shared across the header/body/footer sub-tables so columns align.
 * Must be kept in sync with the number of <th>/<td> elements below.
 */
const COL_WIDTHS = ['28%', '24%', '24%', '24%'];

/**
 * Read-only table for condo government appraisal prices (Sq.M.), rendered via
 * the shared GovernmentPriceTableShell.
 *
 * Unlike the land table, condo has no missing-from-survey concept and a single
 * area total, so it carries neither the red missing-row styling nor the amber
 * avg-basis hint.
 */
const CondoGovernmentPriceTable = ({ rows, totalArea, avgPerSqm }: CondoGovernmentPriceTableProps) => {
  const { t } = useTranslation('appraisal');
  const totalPrice = rows.reduce((sum, row) => sum + (row.governmentPrice ?? 0), 0);

  return (
    <GovernmentPriceTableShell
      rows={rows}
      colWidths={COL_WIDTHS}
      headerCells={
        <>
          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
            {t('governmentPriceTable.condoColumns.room')}
          </th>
          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
            {t('governmentPriceTable.condoColumns.sqm')}
          </th>
          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
            {t('governmentPriceTable.condoColumns.bahtPerSqm')}
          </th>
          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
            {t('governmentPriceTable.condoColumns.price')}
          </th>
        </>
      }
      renderRow={(row, idx) => (
        <tr
          key={idx}
          className={row.isMissingFromSurvey ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
        >
          <td className="px-3 py-2 text-left text-gray-700 tabular-nums">
            <span className="inline-flex items-center gap-2">
              {row.roomNumber ?? '-'}
              {row.isMissingFromSurvey && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                  {t('governmentPriceTable.missingFromSurvey')}
                </span>
              )}
            </span>
          </td>
          <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
            {row.usableArea != null ? formatNumber(row.usableArea, 2) : '-'}
          </td>
          <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
            {row.governmentPricePerSqm != null ? formatNumber(row.governmentPricePerSqm, 2) : '-'}
          </td>
          <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
            {row.governmentPrice != null ? formatNumber(row.governmentPrice, 2) : '-'}
          </td>
        </tr>
      )}
      footerCells={
        <>
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
            {formatNumber(avgPerSqm, 2)}
          </td>
          <td className="px-3 py-3 text-right font-bold text-gray-900 tabular-nums">
            {formatNumber(totalPrice, 2)}
          </td>
        </>
      }
      showMoreLabel={remaining =>
        t('governmentPriceTable.condoShowMore', {
          remaining,
          defaultValue: 'Show more ({{remaining}}) rooms',
        })
      }
      showLessLabel={t('governmentPriceTable.showLess', { defaultValue: 'Show less' })}
    />
  );
};

export default CondoGovernmentPriceTable;
