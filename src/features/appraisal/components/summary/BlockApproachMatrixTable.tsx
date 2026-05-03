import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { BlockApproachMatrixRow } from '../../api/decisionSummary';

interface BlockApproachMatrixTableProps {
  rows: BlockApproachMatrixRow[];
  projectTotal: number;
}

const APPROACH_COLUMNS = [
  { key: 'Market', label: 'Market Comparison Approach', valueKey: 'marketValue' as const },
  { key: 'Cost', label: 'Cost Approach', valueKey: 'costValue' as const },
  { key: 'Income', label: 'Income Approach', valueKey: 'incomeValue' as const },
  { key: 'Residual', label: 'Residual Approach', valueKey: 'residualValue' as const },
] as const;

/**
 * Read-only approach matrix for block appraisals.
 * One row per ProjectModel; approach cells show per-unit base value.
 * Summary cell mirrors the selected approach's per-unit value (matches existing
 * normal-flow ApproachMatrixTable pattern). Footer Project row carries the
 * project grand total appraisal price (sum of model totals).
 */
const BlockApproachMatrixTable = ({ rows, projectTotal }: BlockApproachMatrixTableProps) => {
  // Derive which approach types have at least one model that selected them —
  // mirrors the header check-icon pattern from ApproachMatrixTable.
  const selectedApproaches = new Set(
    rows.filter(r => r.selectedApproach != null).map(r => r.selectedApproach as string),
  );

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Model</th>
            {APPROACH_COLUMNS.map(col => (
              <th key={col.key} className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
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
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Summary</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => (
            <tr key={row.projectModelId} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">
                {row.modelName ?? '-'}
              </td>
              {APPROACH_COLUMNS.map(col => {
                const value = row[col.valueKey];
                const isSelected = row.selectedApproach === col.key;

                return (
                  <td key={col.key} className="px-3 py-2 text-right text-gray-700">
                    {value != null ? (
                      <span className={isSelected ? 'font-semibold' : ''}>
                        {formatNumber(value, 2)}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right font-medium text-gray-900">
                {(() => {
                  const summaryValue = APPROACH_COLUMNS.find(
                    c => c.key === row.selectedApproach,
                  )?.valueKey;
                  const value = summaryValue ? row[summaryValue] : null;
                  return value != null
                    ? formatNumber(value, 2)
                    : <span className="text-gray-300">-</span>;
                })()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
            <td className="px-3 py-2 text-gray-900" colSpan={APPROACH_COLUMNS.length + 1}>
              Project
            </td>
            <td className="px-3 py-2 text-right text-gray-900">
              {formatNumber(projectTotal, 2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default BlockApproachMatrixTable;
