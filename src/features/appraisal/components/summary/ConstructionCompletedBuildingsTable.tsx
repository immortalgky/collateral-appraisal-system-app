import { formatNumber } from '@/shared/utils/formatUtils';
import type { ConstructionCompletedBuildingRow } from '../../api/decisionSummary';
import { useTranslation } from 'react-i18next';

interface Props {
  rows: ConstructionCompletedBuildingRow[];
}

const thClass = 'px-3 py-2.5 text-right text-xs font-semibold text-gray-600';
const thLeftClass = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-600';
const tdClass = 'px-3 py-2 text-right text-gray-700 tabular-nums';
const tdLeftClass = 'px-3 py-2 text-left text-gray-700';
const thSeqClass =
  'w-20 whitespace-nowrap px-3 py-2.5 text-center text-xs font-semibold text-gray-600';
const tdSeqClass = 'w-20 px-3 py-2 text-center text-gray-700 tabular-nums';

/**
 * Buildings already completed (100%) before the construction inspection —
 * shown separately from the still-under-progress buildings in
 * ConstructionBuildingDetailTable.
 */
const ConstructionCompletedBuildingsTable = ({ rows }: Props) => {
  const { t } = useTranslation('appraisal');

  if (rows.length === 0) return null;

  const totalAppraisalValue = rows.reduce((sum, r) => sum + r.appraisalValue, 0);

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className={thSeqClass}>{t('constructionCompletedBuildingsTable.columns.seqNo')}</th>
            <th className={thLeftClass}>
              {t('constructionCompletedBuildingsTable.columns.houseNumber')}
            </th>
            <th className={thLeftClass}>
              {t('constructionCompletedBuildingsTable.columns.titleNumber')}
            </th>
            <th className={thLeftClass}>
              {t('constructionCompletedBuildingsTable.columns.modelName')}
            </th>
            <th className={thClass}>
              {t('constructionCompletedBuildingsTable.columns.appraisalValue')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, idx) => (
            <tr key={row.appraisalPropertyId}>
              <td className={tdSeqClass}>{idx + 1}</td>
              <td className={tdLeftClass}>{row.houseNumber ?? '-'}</td>
              <td className={tdLeftClass}>{row.titleNumber ?? '-'}</td>
              <td className={tdLeftClass}>{row.modelName ?? '-'}</td>
              <td className={tdClass}>{formatNumber(row.appraisalValue, 2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold border-t border-gray-200">
            <td colSpan={4} className={tdLeftClass}>
              {t('constructionCompletedBuildingsTable.totalRow')}
            </td>
            <td className={tdClass}>{formatNumber(totalAppraisalValue, 2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default ConstructionCompletedBuildingsTable;
