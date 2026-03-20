import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { ApproachMatrixGroup } from '../../api/decisionSummary';

interface ApproachMatrixTableProps {
  groups: ApproachMatrixGroup[];
  onGroupClick?: (groupId: string) => void;
}

const APPROACH_COLUMNS = [
  { key: 'Market', label: 'Market Comparison Approach' },
  { key: 'Cost', label: 'Cost Approach' },
  { key: 'Income', label: 'Income Approach' },
  { key: 'Residual', label: 'Residual Approach' },
] as const;

/**
 * Read-only table displaying the decision approach matrix.
 * Each group contains nested approaches with approachType, approachValue, and isSelected.
 */
const ApproachMatrixTable = ({ groups, onGroupClick }: ApproachMatrixTableProps) => {
  const sortedGroups = [...groups].sort((a, b) => a.groupNumber - b.groupNumber);

  // Derive which approaches have at least one selected group
  const selectedApproaches = new Set(
    groups.flatMap(g =>
      (g.approaches ?? [])
        .filter(a => a.isSelected)
        .map(a => a.approachType),
    ),
  );

  const totalSummary = sortedGroups.reduce(
    (sum, group) => sum + (group.groupSummaryValue ?? 0),
    0,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-teal-600 text-white">
            <th className="px-4 py-3 text-left font-medium rounded-tl-lg">Group</th>
            {APPROACH_COLUMNS.map(col => (
              <th key={col.key} className="px-4 py-3 text-right font-medium">
                <div className="flex items-center justify-end gap-2">
                  {selectedApproaches.has(col.key) && (
                    <Icon
                      name="circle-check"
                      style="solid"
                      className="w-4 h-4 text-white shrink-0"
                    />
                  )}
                  {col.label}
                </div>
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium">Summary</th>
            {onGroupClick && (
              <th className="px-4 py-3 text-center font-medium rounded-tr-lg w-10" />
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedGroups.map(group => (
            <tr
              key={group.groupNumber}
              className={onGroupClick ? 'group hover:bg-teal-50/50 cursor-pointer transition-colors' : 'hover:bg-gray-50'}
              onClick={() => onGroupClick?.(group.propertyGroupId)}
            >
              <td className="px-4 py-3 font-medium text-gray-900">
                {group.groupNumber}
              </td>
              {APPROACH_COLUMNS.map(col => {
                const approach = group.approaches?.find(a => a.approachType === col.key);

                return (
                  <td key={col.key} className="px-4 py-3 text-right text-gray-700">
                    {approach?.approachValue != null ? (
                      <span className={approach.isSelected ? 'font-semibold' : ''}>
                        {formatNumber(approach.approachValue, 2)}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right font-medium text-gray-900">
                {group.groupSummaryValue != null ? formatNumber(group.groupSummaryValue, 2) : '-'}
              </td>
              {onGroupClick && (
                <td className="px-4 py-3 text-center">
                  <Icon name="chevron-right" style="solid" className="w-3.5 h-3.5 text-gray-400 group-hover:text-teal-600 transition-colors" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-teal-50 font-semibold border-t-2 border-teal-200">
            <td className="px-4 py-3 text-gray-900 rounded-bl-lg" colSpan={APPROACH_COLUMNS.length + 1}>
              Total
            </td>
            <td className="px-4 py-3 text-right text-teal-700 rounded-br-lg" colSpan={onGroupClick ? 2 : 1}>
              {formatNumber(totalSummary, 2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default ApproachMatrixTable;
