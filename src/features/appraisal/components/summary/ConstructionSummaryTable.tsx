import { formatNumber } from '@/shared/utils/formatUtils';
import type { ConstructionSummaryRow } from '../../api/decisionSummary';

interface Props {
  rows: ConstructionSummaryRow[];
}

const ConstructionSummaryTable = ({ rows }: Props) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-[#5f9ea0] text-white">
          <th className="px-4 py-3 text-left font-medium w-44" />
          <th className="px-4 py-3 text-center font-medium">Construction<br />Progress (%)</th>
          <th className="px-4 py-3 text-center font-medium">Total Appraisal Value</th>
          <th className="px-4 py-3 text-center font-medium">Total Land Value</th>
          <th className="px-4 py-3 text-center font-medium">Total Building Value</th>
          <th className="px-4 py-3 text-center font-medium">Building Value<br />Constructing</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const isCurrent = row.label === 'Current';
          return (
            <tr
              key={row.label}
              className={
                isCurrent
                  ? 'bg-gray-100 font-semibold border-b border-gray-200'
                  : 'border-b border-gray-100'
              }
            >
              <td className="px-4 py-3 text-gray-700">{row.label}</td>
              <td className="px-4 py-3 text-right text-gray-700">
                {formatNumber(row.constructionProgressPct, 2)}&nbsp;%
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {formatNumber(row.totalAppraisalValue, 2)}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {formatNumber(row.totalLandValue, 2)}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {formatNumber(row.totalBuildingValue, 2)}
              </td>
              <td className="px-4 py-3 text-right text-gray-700">
                {formatNumber(row.buildingValueConstructing, 2)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default ConstructionSummaryTable;
