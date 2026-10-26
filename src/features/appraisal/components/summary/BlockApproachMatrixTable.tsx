import Icon from '@/shared/components/Icon';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { BlockApproachMatrixRow } from '../../api/decisionSummary';
import { useTranslation } from 'react-i18next';

interface BlockApproachMatrixTableProps {
  rows: BlockApproachMatrixRow[];
  projectTotal: number;
}

type ApproachKey = 'Market' | 'Cost' | 'Income' | 'Residual';
type ValueKey = 'marketValue' | 'costValue' | 'incomeValue' | 'residualValue';

const APPROACH_DEFS: { key: ApproachKey; valueKey: ValueKey }[] = [
  { key: 'Market', valueKey: 'marketValue' },
  { key: 'Cost', valueKey: 'costValue' },
  { key: 'Income', valueKey: 'incomeValue' },
  { key: 'Residual', valueKey: 'residualValue' },
];

/**
 * Read-only approach matrix for block appraisals.
 * One row per ProjectModel; approach cells show per-unit base value.
 * Summary cell mirrors the selected approach's per-unit value.
 * Footer Project row carries the project grand total appraisal price.
 */
const BlockApproachMatrixTable = ({ rows, projectTotal }: BlockApproachMatrixTableProps) => {
  const { t } = useTranslation('appraisal');

  const approachColumns: { key: ApproachKey; label: string; valueKey: ValueKey }[] = [
    { key: 'Market', label: t('approachMatrixTable.columns.market'), valueKey: 'marketValue' },
    { key: 'Cost', label: t('approachMatrixTable.columns.cost'), valueKey: 'costValue' },
    { key: 'Income', label: t('approachMatrixTable.columns.income'), valueKey: 'incomeValue' },
    {
      key: 'Residual',
      label: t('approachMatrixTable.columns.residual'),
      valueKey: 'residualValue',
    },
  ];

  // Derive which approach types have at least one model that selected them
  const selectedApproaches = new Set(
    rows.filter(r => r.selectedApproach != null).map(r => r.selectedApproach as string),
  );

  return (
    <div className="overflow-x-auto border border-(--palette-line) rounded-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-(--palette-surface-2) border-b border-(--palette-line)">
            <th className="px-3 py-2 text-left text-xs font-semibold text-(--palette-gray-600)">
              {t('approachMatrixTable.columns.model')}
            </th>
            {approachColumns.map(col => (
              <th
                key={col.key}
                className="px-3 py-2 text-right text-xs font-semibold text-(--palette-gray-600)"
              >
                <div className="flex items-center justify-end gap-1.5">
                  {selectedApproaches.has(col.key) && (
                    <Icon
                      name="circle-check"
                      style="solid"
                      className="w-3.5 h-3.5 text-(--palette-accent-ink) shrink-0"
                    />
                  )}
                  {col.label}
                </div>
              </th>
            ))}
            <th className="px-3 py-2 text-right text-xs font-semibold text-(--palette-gray-600)">
              {t('approachMatrixTable.columns.summary')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--palette-line-soft)">
          {rows.map(row => (
            <tr key={row.projectModelId} className="hover:bg-(--palette-surface-2)">
              <td className="px-3 py-2 font-medium text-(--palette-ink)">{row.modelName ?? '-'}</td>
              {approachColumns.map(col => {
                const value = row[col.valueKey];
                const isSelected = row.selectedApproach === col.key;

                return (
                  <td key={col.key} className="px-3 py-2 text-right text-(--palette-ink)">
                    {value != null ? (
                      <span className={isSelected ? 'font-semibold' : ''}>
                        {formatNumber(value, 2)}
                      </span>
                    ) : (
                      <span className="text-(--palette-gray-300)">-</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right font-medium text-(--palette-ink)">
                {(() => {
                  const def = APPROACH_DEFS.find(d => d.key === row.selectedApproach);
                  const value = def ? row[def.valueKey] : null;
                  return value != null ? (
                    formatNumber(value, 2)
                  ) : (
                    <span className="text-(--palette-gray-300)">-</span>
                  );
                })()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-(--palette-surface-2) border-t border-(--palette-line) font-semibold">
            <td className="px-3 py-2 text-(--palette-ink)" colSpan={approachColumns.length + 1}>
              {t('approachMatrixTable.footer.project')}
            </td>
            <td className="px-3 py-2 text-right text-(--palette-ink)">
              {formatNumber(projectTotal, 2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default BlockApproachMatrixTable;
