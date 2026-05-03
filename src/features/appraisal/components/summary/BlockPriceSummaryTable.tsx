import { formatNumber } from '@/shared/utils/formatUtils';
import type { BlockModelPriceRow } from '../../api/decisionSummary';

interface BlockPriceSummaryTableProps {
  rows: BlockModelPriceRow[];
  projectTotal: number;
  forceSellingPrice: number;
  buildingInsurance: number;
}

/**
 * Read-only appraisal price summary for block appraisals.
 * Body rows show per-model totals: TotalAppraisalPrice, ForceSellingPrice (= total × 0.70),
 * and BuildingInsurance (= sum of unit CoverageAmount for that model).
 * Footer "Project" row carries the rolled-up grand totals.
 */
const BlockPriceSummaryTable = ({
  rows,
  projectTotal,
  forceSellingPrice,
  buildingInsurance,
}: BlockPriceSummaryTableProps) => (
  <div className="overflow-x-auto border border-gray-200 rounded-sm">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Model</th>
          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Unit Count</th>
          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Total Appraisal Price</th>
          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Force Selling Price</th>
          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Building Insurance</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map(row => (
          <tr key={row.projectModelId} className="hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-900">
              {row.modelName ?? '-'}
            </td>
            <td className="px-3 py-2 text-right text-gray-700">
              {row.unitCount}
            </td>
            <td className="px-3 py-2 text-right text-gray-700">
              {formatNumber(row.totalAppraisalPrice, 2)}
            </td>
            <td className="px-3 py-2 text-right text-gray-700">
              {formatNumber(row.forceSellingPrice, 2)}
            </td>
            <td className="px-3 py-2 text-right text-gray-700">
              {formatNumber(row.buildingInsurance, 2)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
          <td className="px-3 py-2 text-gray-900" colSpan={2}>Project</td>
          <td className="px-3 py-2 text-right text-gray-900">
            {formatNumber(projectTotal, 2)}
          </td>
          <td className="px-3 py-2 text-right text-gray-900">
            {formatNumber(forceSellingPrice, 2)}
          </td>
          <td className="px-3 py-2 text-right text-gray-900">
            {formatNumber(buildingInsurance, 2)}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
);

export default BlockPriceSummaryTable;
