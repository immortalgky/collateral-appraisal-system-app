export interface CompactTooltipValue {
  machineName: string;
  color: string;
  value: string;
}

export interface CompactTooltipRow {
  /** The metric's label — repeated once per row in the strip's merged tooltip, or the single
   * row's label in a per-chart (health tab) tooltip. */
  label: string;
  values: CompactTooltipValue[];
}

interface CompactMetricTooltipProps {
  time: string;
  rows: CompactTooltipRow[];
}

/** Matches the mock's `.mtip` — small, one box, no recharts default chrome. Used both as the
 * strip's one shared tooltip (several rows, one per metric) and the health tab's per-chart
 * tooltip (a single row). */
const CompactMetricTooltip = ({ time, rows }: CompactMetricTooltipProps) => (
  <div
    className="rounded-[6px] border border-gray-200 bg-white shadow-md max-w-[300px] tabular-nums"
    style={{ padding: '6px 8px', fontSize: 12, pointerEvents: 'none' }}
  >
    <div className="font-semibold text-gray-700 mb-1 whitespace-nowrap">{time}</div>
    <div className="flex flex-col gap-0.5">
      {rows.map(row => (
        <div key={row.label} className="flex items-center justify-between gap-3">
          <span className="text-gray-500 truncate">{row.label}</span>
          <span className="flex items-center gap-2 shrink-0">
            {row.values.map(v => (
              <span key={v.machineName} className="flex items-center gap-1">
                <span
                  className="inline-block size-1.5 rounded-sm shrink-0"
                  style={{ background: v.color }}
                />
                {v.value}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default CompactMetricTooltip;
