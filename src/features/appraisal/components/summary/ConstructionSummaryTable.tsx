import Icon from '@/shared/components/Icon';
import { ConstructionTimelineBar } from '@/shared/components/ConstructionTimelineBar';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { ConstructionSummaryRow } from '../../api/decisionSummary';

interface Props {
  rows: ConstructionSummaryRow[];
}

const ROW_CONFIG: Record<
  string,
  {
    bg: string;
    border: string;
    labelClass: string;
    barColor: string;
    valueClass: string;
    iconName: string;
    iconClass: string;
    isDelta: boolean;
  }
> = {
  Previous: {
    bg: 'bg-blue-50',
    border: 'border-b border-blue-100',
    labelClass: 'text-blue-700',
    barColor: 'bg-blue-400',
    valueClass: 'text-gray-700',
    iconName: 'clock-rotate-left',
    iconClass: 'text-blue-500',
    isDelta: false,
  },
  'Construction Increased': {
    bg: 'bg-amber-50',
    border: 'border-b border-amber-100',
    labelClass: 'text-amber-700 font-medium',
    barColor: 'bg-amber-400',
    valueClass: 'text-amber-700 font-medium',
    iconName: 'arrow-trend-up',
    iconClass: 'text-amber-500',
    isDelta: true,
  },
  Current: {
    bg: 'bg-teal-50',
    border: 'border-b-2 border-teal-300',
    labelClass: 'text-teal-800 font-semibold',
    barColor: 'bg-teal-500',
    valueClass: 'text-teal-800 font-semibold',
    iconName: 'bullseye',
    iconClass: 'text-teal-600',
    isDelta: false,
  },
  'Remaining construction': {
    bg: 'bg-orange-50',
    border: 'border-b border-orange-100',
    labelClass: 'text-orange-700',
    barColor: 'bg-orange-400',
    valueClass: 'text-gray-700',
    iconName: 'hourglass-start',
    iconClass: 'text-orange-500',
    isDelta: false,
  },
  'Complete ( 100% )': {
    bg: 'bg-green-50',
    border: 'border-b border-green-100',
    labelClass: 'text-green-800',
    barColor: 'bg-green-500',
    valueClass: 'text-gray-700',
    iconName: 'flag-checkered',
    iconClass: 'text-green-600',
    isDelta: false,
  },
};

const DEFAULT_CONFIG = ROW_CONFIG['Previous'];

const ConstructionSummaryTable = ({ rows }: Props) => {
  const previousRow = rows.find(r => r.label === 'Previous');
  const currentRow = rows.find(r => r.label === 'Current');
  const completeRow = rows.find(r => r.label === 'Complete ( 100% )');

  return (
    <div className="space-y-4">
      <ConstructionTimelineBar
        prevValue={previousRow?.buildingValueConstructing ?? 0}
        currentValue={currentRow?.buildingValueConstructing ?? 0}
        totalValue={completeRow?.buildingValueConstructing ?? 0}
      />

      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-56">
                Milestone
              </th>
              <th
                className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-40 leading-tight"
                title="Land Value + under-construction value at this milestone + completed buildings"
              >
                Total Appraisal Value
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-36 leading-tight">
                Land Value
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-32 leading-tight">
                Construction Progress (%)
              </th>
              <th
                className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-36 leading-tight"
                title="Current under-construction structure value at this milestone (CI only)"
              >
                Building Value
              </th>
              <th
                className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-44 leading-tight"
                title="Completed buildings registered before the construction inspection (non-CI)"
              >
                Building Value Pre-inspection
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const cfg = ROW_CONFIG[row.label] ?? DEFAULT_CONFIG;
              const isCurrent = row.label === 'Current';
              const isLast = idx === rows.length - 1;
              const rowBg = isCurrent ? 'bg-teal-50/60' : 'bg-white';
              const borderClass = isLast ? '' : 'border-b border-gray-100';
              const numericClass = `px-3 py-4 text-right tabular-nums ${isCurrent ? 'text-teal-800 font-bold text-base' : 'text-gray-800 font-medium'}`;
              const preInspection = row.totalBuildingValue - row.buildingValueConstructing;
              return (
                <tr key={row.label} className={`${rowBg} ${borderClass}`}>
                  <td className={`px-4 py-4 ${cfg.labelClass}`}>
                    <span className="inline-flex items-center gap-2.5">
                      <span
                        className={`inline-flex size-7 items-center justify-center rounded-full ${cfg.iconClass.replace('text-', 'bg-').replace('-500', '-100').replace('-600', '-100')}`}
                      >
                        <Icon
                          name={cfg.iconName}
                          style="solid"
                          className={`size-3.5 ${cfg.iconClass}`}
                        />
                      </span>
                      {row.label}
                    </span>
                  </td>
                  <td className={numericClass}>{formatNumber(row.totalAppraisalValue, 2)}</td>
                  <td className={numericClass}>{formatNumber(row.totalLandValue, 2)}</td>
                  <td className={numericClass}>{formatNumber(row.constructionProgressPct, 2)} %</td>
                  <td className={numericClass}>{formatNumber(row.buildingValueConstructing, 2)}</td>
                  <td className={numericClass}>{formatNumber(preInspection, 2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConstructionSummaryTable;
