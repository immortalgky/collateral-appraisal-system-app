import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { ApproachMatrixGroup } from '../../api/decisionSummary';
import { useTranslation } from 'react-i18next';

interface ApproachMatrixTableProps {
  groups: ApproachMatrixGroup[];
  onGroupClick?: (groupId: string) => void;
}

type ApproachKey = 'Market' | 'Cost' | 'Income' | 'Residual';

const APPROACH_KEYS: ApproachKey[] = ['Market', 'Cost', 'Income', 'Residual'];

/**
 * Read-only table displaying the decision approach matrix.
 * Each group contains nested approaches with approachType, approachValue, and isSelected.
 */
const ApproachMatrixTable = ({ groups, onGroupClick }: ApproachMatrixTableProps) => {
  const { t } = useTranslation('appraisal');

  const approachColumns: { key: ApproachKey; label: string }[] = [
    { key: 'Market', label: t('approachMatrixTable.columns.market') },
    { key: 'Cost', label: t('approachMatrixTable.columns.cost') },
    { key: 'Income', label: t('approachMatrixTable.columns.income') },
    { key: 'Residual', label: t('approachMatrixTable.columns.residual') },
  ];

  const sortedGroups = [...groups].sort((a, b) => a.groupNumber - b.groupNumber);

  // Derive which approaches have at least one selected group
  const selectedApproaches = new Set(
    groups.flatMap(g => (g.approaches ?? []).filter(a => a.isSelected).map(a => a.approachType)),
  );

  const totalSummary = sortedGroups.reduce((sum, group) => sum + (group.groupSummaryValue ?? 0), 0);

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
              {t('approachMatrixTable.columns.group')}
            </th>
            {approachColumns.map(col => (
              <th
                key={col.key}
                className="px-3 py-2 text-right text-xs font-semibold text-gray-600"
              >
                <div className="flex items-center justify-end gap-1.5">
                  {selectedApproaches.has(col.key) && (
                    <Icon
                      name="circle-check"
                      style="solid"
                      className="w-3.5 h-3.5 text-teal-600 shrink-0"
                    />
                  )}
                  {col.label}
                </div>
              </th>
            ))}
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
              {t('approachMatrixTable.columns.summary')}
            </th>
            {onGroupClick && (
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 w-10" />
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedGroups.map(group => (
            <tr
              key={group.groupNumber}
              className={
                onGroupClick
                  ? 'group hover:bg-gray-50 cursor-pointer transition-colors'
                  : 'hover:bg-gray-50'
              }
              onClick={() => onGroupClick?.(group.propertyGroupId)}
            >
              <td className="px-3 py-2 font-medium text-gray-900">{group.groupNumber}</td>
              {APPROACH_KEYS.map(key => {
                const approach = group.approaches?.find(a => a.approachType === key);
                const isSelected = approach?.isSelected ?? false;

                return (
                  <td
                    key={key}
                    className={`px-3 py-2 text-right ${
                      isSelected ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {approach?.approachValue != null ? (
                      formatNumber(approach.approachValue, 2)
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right font-medium text-gray-900">
                {group.groupSummaryValue != null ? formatNumber(group.groupSummaryValue, 2) : '-'}
              </td>
              {onGroupClick && (
                <td className="px-3 py-2 text-center">
                  <Icon
                    name="chevron-right"
                    style="solid"
                    className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors"
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 border-t-2 border-gray-400">
            <td
              className="px-3 py-3 text-gray-700 font-bold uppercase tracking-wider text-xs"
              colSpan={approachColumns.length + 1}
            >
              {t('approachMatrixTable.footer.total')}
            </td>
            <td
              className="px-3 py-3 text-right text-gray-900 font-bold text-base tabular-nums"
              colSpan={onGroupClick ? 2 : 1}
            >
              {formatNumber(totalSummary, 2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default ApproachMatrixTable;
