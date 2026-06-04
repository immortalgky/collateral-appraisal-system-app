interface SoldDonutProps {
  sold: number;
  total: number;
  /** Pre-translated "Sold" caption shown under the percentage. */
  soldLabel: string;
}

/**
 * Gauge-style donut showing the sold-unit percentage.
 * Extracted from BlockUnitMaintenanceDetailPage so it can be reused
 * in BlockReappraisalDetailPage without duplication. Labels are passed in
 * (already translated) so the component stays namespace-agnostic.
 */
export const SoldDonut = ({ sold, total, soldLabel }: SoldDonutProps) => {
  const pct = total > 0 ? (sold / total) * 100 : 0;
  const size = 180;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75;
  const visibleLen = circumference * arcFraction;
  const filledLen = (pct / 100) * visibleLen;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[135deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${visibleLen} ${circumference}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#donutGradBUR)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filledLen} ${circumference}`}
        />
        <defs>
          <linearGradient id="donutGradBUR" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-gray-500">{soldLabel}</span>
        <span className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
          {pct.toFixed(1)}%
        </span>
        <span className="text-xs text-gray-500 tabular-nums mt-0.5">
          {sold} / {total}
        </span>
      </div>
    </div>
  );
};
