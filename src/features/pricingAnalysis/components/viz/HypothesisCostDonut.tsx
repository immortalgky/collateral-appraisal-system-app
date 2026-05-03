/**
 * Cost composition donut for the Hypothesis Summary tabs.
 *
 * Shows the share of total development cost per category — quick anomaly /
 * sanity check for the appraiser. Same colour means the same category type
 * across both variants:
 *   orange = main construction (Project Dev / Hard)
 *   amber  = adjacent project costs (Project Cost / Soft)
 *   slate  = government taxes
 *   rose   = risk
 */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt } from '../../domain/formatters';
import type { LandBuildingSummaryDto, CondominiumSummaryDto } from '../../types/hypothesis';

const COLORS = {
  main: '#f97316',     // orange-500
  project: '#f59e0b',  // amber-500
  tax: '#64748b',      // slate-500
  risk: '#f43f5e',     // rose-500
} as const;

type Props =
  | { variant: 'LandBuilding'; summary?: LandBuildingSummaryDto | null }
  | { variant: 'Condominium'; summary?: CondominiumSummaryDto | null };

interface Slice {
  label: string;
  value: number;
  color: string;
  /** DOM id of the section this slice represents — clicking scrolls to it. */
  targetId?: string;
}

function scrollToTarget(targetId?: string) {
  if (!targetId) return;
  const el = document.getElementById(targetId);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function HypothesisCostDonut(props: Props) {
  const slices = buildSlices(props);
  if (!slices) return null;

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 p-3 h-full flex flex-col">
      <div className="text-[11px] font-medium text-gray-500 mb-1">Cost Composition</div>
      <div className="flex-1 min-h-0 flex flex-col items-center gap-3 min-w-0 overflow-x-auto">
        <div className="w-[140px] h-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={62}
                paddingAngle={2}
                strokeWidth={0}
                onClick={(_, index) => scrollToTarget(slices[index]?.targetId)}
              >
                {slices.map((s) => (
                  <Cell
                    key={s.label}
                    fill={s.color}
                    style={{ cursor: s.targetId ? 'pointer' : 'default' }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v) => fmt(typeof v === 'number' ? v : Number(v))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full min-w-0 space-y-1.5">
          {slices.map((s) => {
            const pct = total > 0 ? (s.value / total) * 100 : 0;
            const clickable = !!s.targetId;
            return (
              <li
                key={s.label}
                onClick={clickable ? () => scrollToTarget(s.targetId) : undefined}
                className={`flex items-center gap-2 text-[11px] ${
                  clickable ? 'cursor-pointer hover:bg-gray-50 rounded -mx-1 px-1 py-0.5' : ''
                }`}
              >
                <span
                  className="size-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-gray-600 whitespace-nowrap">{s.label}</span>
                <span className="tabular-nums text-gray-800 font-medium ml-auto">{fmt(s.value)}</span>
                <span className="tabular-nums text-gray-400 w-12 text-right">{pct.toFixed(1)}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function buildSlices(props: Props): Slice[] | null {
  if (props.variant === 'LandBuilding') {
    const s = props.summary;
    if (!s) return null;
    return [
      { label: 'Project Dev Cost', value: s.totalProjectDevCost ?? 0, color: COLORS.main, targetId: 'hyp-section-dev' },
      { label: 'Project Cost', value: s.totalProjectCost ?? 0, color: COLORS.project, targetId: 'hyp-section-project' },
      { label: 'Gov Tax', value: s.totalGovTax ?? 0, color: COLORS.tax, targetId: 'hyp-section-tax' },
      { label: 'Risk Premium', value: s.riskPremiumAmount ?? 0, color: COLORS.risk, targetId: 'hyp-section-risk' },
    ];
  }
  const s = props.summary;
  if (!s) return null;
  return [
    { label: 'Hard Cost', value: s.totalHardCost ?? 0, color: COLORS.main, targetId: 'hyp-section-hard' },
    { label: 'Soft Cost', value: s.totalSoftCost ?? 0, color: COLORS.project, targetId: 'hyp-section-soft' },
    { label: 'Gov Tax', value: s.totalGovTax ?? 0, color: COLORS.tax, targetId: 'hyp-section-tax' },
    { label: 'Risk & Profit', value: s.riskProfitTotal ?? 0, color: COLORS.risk, targetId: 'hyp-section-risk' },
  ];
}
