export interface SensitivityHeatmapProps {
  currentDiscountRate: number;
  currentGrowthRate: number;
  calculateValue: (discountRate: number, growthRate: number) => number | null;
  discountRateRange?: number;
  growthRateRange?: number;
  steps?: number;
}

const fmtCompact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
};

/** Interpolate linearly between two hex colors at ratio t (0–1). */
function lerpColor(lowHex: string, highHex: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const lo = parse(lowHex);
  const hi = parse(highHex);
  const r = Math.round(lo[0] + (hi[0] - lo[0]) * t);
  const g = Math.round(lo[1] + (hi[1] - lo[1]) * t);
  const b = Math.round(lo[2] + (hi[2] - lo[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function cellColor(value: number, min: number, max: number): string {
  if (max === min) return '#f9fafb';
  const t = (value - min) / (max - min);
  // red (#ef4444) → yellow (#eab308) → green (#22c55e)
  if (t < 0.5) return lerpColor('#ef4444', '#eab308', t * 2);
  return lerpColor('#eab308', '#22c55e', (t - 0.5) * 2);
}

export function SensitivityHeatmap({
  currentDiscountRate,
  currentGrowthRate,
  calculateValue,
  discountRateRange = 0.02,
  growthRateRange = 0.02,
  steps = 5,
}: SensitivityHeatmapProps) {
  // Build axis arrays in the same decimal unit as currentDiscountRate / currentGrowthRate.
  // e.g. currentDiscountRate=0.10, discountRateRange=0.02 → [0.08, 0.09, 0.10, 0.11, 0.12]
  const drStep = (discountRateRange * 2) / (steps - 1);
  const grStep = (growthRateRange * 2) / (steps - 1);

  const discountRates = Array.from({ length: steps }, (_, i) =>
    currentDiscountRate - discountRateRange + i * drStep
  );
  const growthRates = Array.from({ length: steps }, (_, i) =>
    currentGrowthRate - growthRateRange + i * grStep
  );

  // Pre-compute all values to find min/max for color scaling
  const grid: (number | null)[][] = discountRates.map((dr) =>
    growthRates.map((gr) => calculateValue(dr, gr))
  );

  const allValues = grid.flat().filter((v): v is number => v != null);
  const minVal = allValues.length ? Math.min(...allValues) : 0;
  const maxVal = allValues.length ? Math.max(...allValues) : 1;

  const fmtRate = (r: number) => `${(r * 100).toFixed(1)}%`;

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="text-[11px] font-medium text-gray-500 mb-2">Sensitivity Analysis</div>
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: 'collapse' }} className="text-[9px] w-full">
          <thead>
            <tr>
              {/* Top-left corner: axis labels */}
              <td className="text-gray-400 text-[8px] pr-1 pb-1 text-right">
                DR \ GR
              </td>
              {growthRates.map((gr) => (
                <th
                  key={fmtRate(gr)}
                  className="text-gray-500 font-medium pb-1 px-1 text-center"
                >
                  {fmtRate(gr)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {discountRates.map((dr, rowIdx) => (
              <tr key={fmtRate(dr)}>
                <th className="text-gray-500 font-medium pr-1 text-right whitespace-nowrap">
                  {fmtRate(dr)}
                </th>
                {growthRates.map((gr, colIdx) => {
                  const val = grid[rowIdx][colIdx];
                  const isCurrentRow =
                    Math.abs(dr - currentDiscountRate) <=
                    Math.abs(discountRates[1] - discountRates[0]) / 2;
                  const isCurrentCol =
                    Math.abs(gr - currentGrowthRate) <=
                    Math.abs(growthRates[1] - growthRates[0]) / 2;
                  const isCurrent = isCurrentRow && isCurrentCol;

                  const bg = val != null ? cellColor(val, minVal, maxVal) : '#f9fafb';
                  const textColor =
                    val != null && (val - minVal) / (maxVal - minVal || 1) > 0.5
                      ? '#14532d'
                      : '#7f1d1d';

                  return (
                    <td
                      key={fmtRate(gr)}
                      style={{ backgroundColor: bg, color: textColor }}
                      className={`px-2 py-1 text-center font-medium ${
                        isCurrent ? 'ring-2 ring-inset ring-blue-500' : ''
                      }`}
                    >
                      {val != null ? fmtCompact(val) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[8px] text-gray-400">Low</span>
        <div
          className="h-2 flex-1 rounded"
          style={{
            background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e)',
          }}
        />
        <span className="text-[8px] text-gray-400">High</span>
      </div>
    </div>
  );
}
