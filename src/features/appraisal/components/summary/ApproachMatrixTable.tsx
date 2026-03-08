import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { ApproachMatrixRow } from '../../api/decisionSummary';

interface ApproachMatrixTableProps {
  rows: ApproachMatrixRow[];
}

const APPROACH_COLUMNS = [
  { key: 'Market Comparison', label: 'Market Comparison' },
  { key: 'Cost', label: 'Cost' },
  { key: 'Income', label: 'Income' },
  { key: 'Residual', label: 'Residual' },
] as const;

/**
 * Read-only table displaying the decision approach matrix.
 * Pivots rows by groupNumber, columns = approach types + Summary column.
 */
const ApproachMatrixTable = ({ rows }: ApproachMatrixTableProps) => {
  // Group rows by groupNumber
  const groupMap = new Map<number, Map<string, ApproachMatrixRow>>();
  const groupSummaries = new Map<number, number | null>();

  for (const row of rows) {
    if (!groupMap.has(row.groupNumber)) {
      groupMap.set(row.groupNumber, new Map());
    }
    groupMap.get(row.groupNumber)!.set(row.approachType, row);

    // Capture groupSummaryValue (should be same for all rows in a group)
    if (row.groupSummaryValue != null) {
      groupSummaries.set(row.groupNumber, row.groupSummaryValue);
    }
  }

  const sortedGroups = Array.from(groupMap.keys()).sort((a, b) => a - b);

  // Calculate total summary
  const totalSummary = sortedGroups.reduce((sum, groupNum) => {
    const val = groupSummaries.get(groupNum);
    return sum + (val ?? 0);
  }, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-teal-600 text-white">
            <th className="px-4 py-3 text-left font-medium rounded-tl-lg">Group</th>
            {APPROACH_COLUMNS.map(col => (
              <th key={col.key} className="px-4 py-3 text-right font-medium">
                {col.label}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium rounded-tr-lg">Summary</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedGroups.map(groupNum => {
            const approaches = groupMap.get(groupNum)!;
            const summary = groupSummaries.get(groupNum);

            return (
              <tr key={groupNum} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  Group {groupNum}
                </td>
                {APPROACH_COLUMNS.map(col => {
                  const row = approaches.get(col.key);
                  const value = row?.finalValueRounded ?? row?.finalValue;

                  return (
                    <td key={col.key} className="px-4 py-3 text-right text-gray-700">
                      {value != null ? (
                        <div className="flex items-center justify-end gap-2">
                          <Icon
                            name="circle-check"
                            style="solid"
                            className="w-4 h-4 text-teal-500 shrink-0"
                          />
                          <span>{formatNumber(value, 2)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {summary != null ? formatNumber(summary, 2) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-teal-50 font-semibold border-t-2 border-teal-200">
            <td className="px-4 py-3 text-gray-900 rounded-bl-lg" colSpan={APPROACH_COLUMNS.length + 1}>
              Total
            </td>
            <td className="px-4 py-3 text-right text-teal-700 rounded-br-lg">
              {formatNumber(totalSummary, 2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default ApproachMatrixTable;
