import { formatNumber } from '@/shared/utils/formatUtils';
import type { GovernmentPriceRow } from '../../api/decisionSummary';

interface GovernmentPriceTableProps {
  rows: GovernmentPriceRow[];
  totalArea: number;
  avgPerSqWa: number;
}

/**
 * Read-only table for government appraisal prices.
 */
const GovernmentPriceTable = ({ rows, totalArea, avgPerSqWa }: GovernmentPriceTableProps) => {
  const totalPrice = rows.reduce((sum, row) => sum + (row.governmentPrice ?? 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-teal-600 text-white">
            <th className="px-4 py-3 text-left font-medium rounded-tl-lg">Title Deed No.</th>
            <th className="px-4 py-3 text-right font-medium">Sq.Wa</th>
            <th className="px-4 py-3 text-center font-medium">Miss out on Survey</th>
            <th className="px-4 py-3 text-right font-medium">Price per Sq.Wa</th>
            <th className="px-4 py-3 text-right font-medium rounded-tr-lg">Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-900">
                {row.titleNumber ?? '-'}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {row.areaSquareWa != null ? formatNumber(row.areaSquareWa, 2) : '-'}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={
                    row.isMissingFromSurvey
                      ? 'text-amber-600 font-medium'
                      : 'text-gray-500'
                  }
                >
                  {row.isMissingFromSurvey ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {row.isMissingFromSurvey
                  ? '-'
                  : row.governmentPricePerSqWa != null
                    ? formatNumber(row.governmentPricePerSqWa, 2)
                    : '-'}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {row.isMissingFromSurvey
                  ? '-'
                  : row.governmentPrice != null
                    ? formatNumber(row.governmentPrice, 2)
                    : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t border-gray-200">
            <td className="px-4 py-3 font-medium text-gray-700">Average</td>
            <td className="px-4 py-3 text-right font-medium text-gray-700">
              {formatNumber(totalArea, 2)}
            </td>
            <td className="px-4 py-3" />
            <td className="px-4 py-3 text-right font-medium text-gray-700">
              {formatNumber(avgPerSqWa, 2)}
            </td>
            <td className="px-4 py-3" />
          </tr>
          <tr className="bg-teal-50 font-semibold border-t-2 border-teal-200">
            <td className="px-4 py-3 text-gray-900 rounded-bl-lg" colSpan={4}>
              Total
            </td>
            <td className="px-4 py-3 text-right text-teal-700 rounded-br-lg">
              {formatNumber(totalPrice, 2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default GovernmentPriceTable;
