import { formatNumber } from '@/shared/utils/formatUtils';
import type { ConstructionBuildingRow } from '../../api/decisionSummary';
import { useTranslation } from 'react-i18next';

interface Props {
  rows: ConstructionBuildingRow[];
}

const thLeftClass = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-600';
const tdLeftClass = 'px-3 py-2 text-left text-gray-700';
const thSeqClass =
  'w-20 whitespace-nowrap px-3 py-2.5 text-center text-xs font-semibold text-gray-600';
const tdSeqClass = 'w-20 px-3 py-2 text-center text-gray-700 tabular-nums';

/**
 * The three column groups carry the same semantics the milestone table above renders as
 * ROWS, so they reuse its palette from ConstructionSummaryTable's ROW_CONFIG:
 * Previous → blue, Construction Increased → amber, Current → teal (the emphasised one).
 */
const GROUPS = {
  previous: {
    th: 'bg-blue-50 text-blue-700',
    td: 'text-gray-700',
    tdBg: '',
  },
  increased: {
    th: 'bg-amber-50 text-amber-700',
    td: 'text-amber-700 font-medium',
    tdBg: '',
  },
  current: {
    th: 'bg-teal-50 text-teal-800',
    td: 'text-teal-800 font-semibold',
    tdBg: 'bg-teal-50/60',
  },
} as const;

type GroupKey = keyof typeof GROUPS;

const groupThClass = (g: GroupKey) =>
  `px-3 py-2.5 text-right text-xs font-semibold ${GROUPS[g].th}`;
const groupThPctClass = (g: GroupKey) =>
  `w-24 whitespace-nowrap px-3 py-2.5 text-center text-xs font-semibold ${GROUPS[g].th}`;
const groupTdClass = (g: GroupKey) =>
  `px-3 py-2 text-right tabular-nums ${GROUPS[g].td} ${GROUPS[g].tdBg}`;
const groupTdPctClass = (g: GroupKey) =>
  `w-24 whitespace-nowrap px-3 py-2 text-center tabular-nums ${GROUPS[g].td} ${GROUPS[g].tdBg}`;

/**
 * Per-building progress detail beneath the appraisal-level Construction Summary card.
 * `increasedValue`/`increasedPct` are derived here — the backend only sends
 * previous/current snapshots, not the delta.
 */
const ConstructionBuildingDetailTable = ({ rows }: Props) => {
  const { t } = useTranslation('appraisal');

  if (rows.length === 0) return null;

  const previousValue = rows.reduce((sum, r) => sum + r.previousValue, 0);
  const currentValue = rows.reduce((sum, r) => sum + r.currentValue, 0);
  const increasedValue = currentValue - previousValue;

  // Weighted off the percentages the rows already carry, not off the money. Dividing the summed
  // money by the summed base stopped being exact once the money was rounded to whole baht
  // (CA-614), and it broke outright for a condo unit, whose inspection carries no value base: the
  // rows showed the entered percentages while this row printed 100.00 %.
  //
  // With no value base there is nothing to weight by, so this falls back to the plain average of
  // the rows — exactly what ConstructionValueBreakdown.ConstructionProgressPercent does on the
  // server, and what the card above this table already shows. Returning 0 instead would print
  // 0.00 % under rows reading 40 % and 60 % and a card reading 50 %.
  const weight = rows.reduce((sum, r) => sum + r.totalValue, 0);
  const weightedPct = (pick: (r: (typeof rows)[number]) => number) => {
    const value =
      weight > 0
        ? rows.reduce((sum, r) => sum + r.totalValue * pick(r), 0) / weight
        : rows.reduce((sum, r) => sum + pick(r), 0) / rows.length;
    return Math.min(100, Math.max(0, value));
  };
  const previousPct = weightedPct(r => r.previousProgressPct);
  const currentPct = weightedPct(r => r.currentProgressPct);
  const increasedPct = currentPct - previousPct;

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th rowSpan={2} className={thSeqClass}>
              {t('constructionBuildingDetailTable.columns.seqNo')}
            </th>
            <th rowSpan={2} className={thLeftClass}>
              {t('constructionBuildingDetailTable.columns.houseNumber')}
            </th>
            <th rowSpan={2} className={thLeftClass}>
              {t('constructionBuildingDetailTable.columns.titleNumber')}
            </th>
            <th rowSpan={2} className={thLeftClass}>
              {t('constructionBuildingDetailTable.columns.modelName')}
            </th>
            <th colSpan={2} className={groupThClass('previous')}>
              {t('constructionBuildingDetailTable.columns.previousProgress')}
            </th>
            <th colSpan={2} className={groupThClass('increased')}>
              {t('constructionBuildingDetailTable.columns.increasedProgress')}
            </th>
            <th colSpan={2} className={groupThClass('current')}>
              {t('constructionBuildingDetailTable.columns.currentProgress')}
            </th>
          </tr>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className={groupThPctClass('previous')}>
              {t('constructionBuildingDetailTable.columns.percent')}
            </th>
            <th className={groupThClass('previous')}>
              {t('constructionBuildingDetailTable.columns.value')}
            </th>
            <th className={groupThPctClass('increased')}>
              {t('constructionBuildingDetailTable.columns.percent')}
            </th>
            <th className={groupThClass('increased')}>
              {t('constructionBuildingDetailTable.columns.value')}
            </th>
            <th className={groupThPctClass('current')}>
              {t('constructionBuildingDetailTable.columns.percent')}
            </th>
            <th className={groupThClass('current')}>
              {t('constructionBuildingDetailTable.columns.value')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, idx) => {
            const rowIncreasedValue = row.currentValue - row.previousValue;
            const rowIncreasedPct = row.currentProgressPct - row.previousProgressPct;
            return (
              <tr key={row.appraisalPropertyId}>
                <td className={tdSeqClass}>{idx + 1}</td>
                <td className={tdLeftClass}>{row.houseNumber ?? '-'}</td>
                <td className={tdLeftClass}>{row.titleNumber ?? '-'}</td>
                <td className={tdLeftClass}>{row.modelName ?? '-'}</td>
                <td className={groupTdPctClass('previous')}>
                  {formatNumber(row.previousProgressPct, 2)} %
                </td>
                <td className={groupTdClass('previous')}>{formatNumber(row.previousValue, 2)}</td>
                <td className={groupTdPctClass('increased')}>
                  {formatNumber(rowIncreasedPct, 2)} %
                </td>
                <td className={groupTdClass('increased')}>{formatNumber(rowIncreasedValue, 2)}</td>
                <td className={groupTdPctClass('current')}>
                  {formatNumber(row.currentProgressPct, 2)} %
                </td>
                <td className={groupTdClass('current')}>{formatNumber(row.currentValue, 2)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-semibold border-t border-gray-200">
            <td colSpan={4} className={tdLeftClass}>
              {t('constructionBuildingDetailTable.summaryRow')}
            </td>
            <td className={groupTdPctClass('previous')}>{formatNumber(previousPct, 2)} %</td>
            <td className={groupTdClass('previous')}>{formatNumber(previousValue, 2)}</td>
            <td className={groupTdPctClass('increased')}>{formatNumber(increasedPct, 2)} %</td>
            <td className={groupTdClass('increased')}>{formatNumber(increasedValue, 2)}</td>
            <td className={groupTdPctClass('current')}>{formatNumber(currentPct, 2)} %</td>
            <td className={groupTdClass('current')}>{formatNumber(currentValue, 2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default ConstructionBuildingDetailTable;
