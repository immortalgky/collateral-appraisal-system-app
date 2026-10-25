import { formatNumber } from '@/shared/utils/formatUtils';
import type { BlockModelPriceRow } from '../../api/decisionSummary';
import { useTranslation } from 'react-i18next';

interface BlockPriceSummaryTableProps {
  rows: BlockModelPriceRow[];
  projectTotal: number;
  forceSellingPrice: number;
  buildingInsurance: number;
}

/**
 * Read-only appraisal price summary for block appraisals.
 * Body rows show per-model totals. Footer "Project" row carries grand totals.
 */
const BlockPriceSummaryTable = ({
  rows,
  projectTotal,
  forceSellingPrice,
  buildingInsurance,
}: BlockPriceSummaryTableProps) => {
  const { t } = useTranslation('appraisal');

  return (
    <div className="overflow-x-auto border border-(--palette-line) rounded-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-(--palette-surface-2) border-b border-(--palette-line)">
            <th className="px-3 py-2 text-left text-xs font-semibold text-(--palette-gray-600)">
              {t('blockPriceSummaryTable.columns.model')}
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-(--palette-gray-600)">
              {t('blockPriceSummaryTable.columns.unitCount')}
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-(--palette-gray-600)">
              {t('blockPriceSummaryTable.columns.totalAppraisalPrice')}
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-(--palette-gray-600)">
              {t('blockPriceSummaryTable.columns.forceSellingPrice')}
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-(--palette-gray-600)">
              {t('blockPriceSummaryTable.columns.buildingInsurance')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--palette-line-soft)">
          {rows.map(row => (
            <tr key={row.projectModelId} className="hover:bg-(--palette-surface-2)">
              <td className="px-3 py-2 font-medium text-(--palette-ink)">{row.modelName ?? '-'}</td>
              <td className="px-3 py-2 text-right text-(--palette-ink)">{row.unitCount}</td>
              <td className="px-3 py-2 text-right text-(--palette-ink)">
                {formatNumber(row.totalAppraisalPrice, 2)}
              </td>
              <td className="px-3 py-2 text-right text-(--palette-ink)">
                {formatNumber(row.forceSellingPrice, 2)}
              </td>
              <td className="px-3 py-2 text-right text-(--palette-ink)">
                {formatNumber(row.buildingInsurance, 2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-(--palette-surface-2) border-t border-(--palette-line) font-semibold">
            <td className="px-3 py-2 text-(--palette-ink)" colSpan={2}>
              {t('blockPriceSummaryTable.footer.project')}
            </td>
            <td className="px-3 py-2 text-right text-(--palette-ink)">
              {formatNumber(projectTotal, 2)}
            </td>
            <td className="px-3 py-2 text-right text-(--palette-ink)">
              {formatNumber(forceSellingPrice, 2)}
            </td>
            <td className="px-3 py-2 text-right text-(--palette-ink)">
              {formatNumber(buildingInsurance, 2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default BlockPriceSummaryTable;
