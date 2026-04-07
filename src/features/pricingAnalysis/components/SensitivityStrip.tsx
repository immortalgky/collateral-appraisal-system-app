import { useMemo } from 'react';

interface SensitivityStripProps {
  currentRate: number;
  calculateFinalValue: (rate: number) => number | null;
}

const fmt = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

export function SensitivityStrip({ currentRate, calculateFinalValue }: SensitivityStripProps) {
  const scenarios = useMemo(() => {
    const offsets = [-2, -1, 0, 1, 2];
    const seen = new Set<number>();
    return offsets
      .map((offset) => {
        const rate = Math.round(Math.max(0, currentRate + offset) * 10) / 10;
        if (seen.has(rate)) return null;
        seen.add(rate);
        const value = calculateFinalValue(rate);
        return { rate, value, offset, isCurrent: offset === 0 };
      })
      .filter(Boolean) as { rate: number; value: number | null; offset: number; isCurrent: boolean }[];
  }, [currentRate, calculateFinalValue]);

  // Don't render if no valid calculations
  if (scenarios.every((s) => s.value == null)) return null;

  const currentValue = scenarios.find((s) => s.isCurrent)?.value ?? 0;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="px-3 py-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap shrink-0">
          Discount Rate Sensitivity
        </div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${scenarios.length}, minmax(0, 1fr))` }}>
          {scenarios.map((s) => {
            const diff = currentValue && s.value ? s.value - currentValue : 0;
            const diffPct = currentValue ? (diff / currentValue) * 100 : 0;
            return (
              <div
                key={s.rate}
                className={`px-2 py-1.5 text-center border-l border-gray-100 ${
                  s.isCurrent ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''
                }`}
              >
                <div className={`text-[10px] font-medium mb-0.5 ${s.isCurrent ? 'text-primary' : 'text-gray-500'}`}>
                  {s.rate.toFixed(1)}%
                </div>
                <div className={`text-xs font-bold tabular-nums ${s.isCurrent ? 'text-primary' : 'text-gray-800'}`}>
                  {s.value != null ? fmt(s.value) : '-'}
                </div>
                {!s.isCurrent && diff !== 0 && (
                  <div className={`text-[9px] mt-0.5 tabular-nums ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {diff > 0 ? '+' : ''}{diffPct.toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
