import { formatNumber } from '@shared/utils/formatUtils';

interface Props {
  /** Building value already inspected at the previous milestone */
  prevValue: number;
  /** Building value at the current inspection */
  currentValue: number;
  /** Building value at 100% completion (the target/total) */
  totalValue: number;
  /** Override the wrapper class. Defaults to a Decision-Summary-style separator. */
  className?: string;
  /** Header label on the left. Defaults to "Construction Timeline". */
  title?: string;
  /** Right-side total label. Defaults to "Building Value at Complete". */
  totalLabel?: string;
}

const DEFAULT_CLASS = 'px-2 pb-3 border-b border-(--palette-line-soft)';

export function ConstructionTimelineBar({
  prevValue,
  currentValue,
  totalValue,
  className = DEFAULT_CLASS,
  title = 'Construction Timeline',
  totalLabel = 'Building Value at Complete',
}: Props) {
  const safePrev = Math.max(0, prevValue);
  const safeCurrent = Math.max(safePrev, currentValue);
  const safeTotal = Math.max(safeCurrent, totalValue);
  const incValue = safeCurrent - safePrev;
  const remValue = safeTotal - safeCurrent;

  const pct = (v: number) => (safeTotal > 0 ? (v / safeTotal) * 100 : 0);
  const prevPct = pct(safePrev);
  const incPct = pct(incValue);
  const remPct = pct(remValue);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-(--palette-gray-600)">{title}</span>
        <span className="text-xs text-(--palette-gray-500)">
          {totalLabel}:{' '}
          <span className="font-semibold text-(--palette-ink) tabular-nums">
            {formatNumber(safeTotal, 2)}
          </span>
        </span>
      </div>
      <div className="flex h-7 rounded overflow-hidden border border-(--palette-line) shadow-sm">
        {prevPct > 0 && (
          <div
            className="bg-blue-600 flex items-center justify-center text-xs font-semibold text-white border-r border-white/50"
            style={{ width: `${prevPct}%` }}
            title={`Previous: ${formatNumber(safePrev, 2)} (${formatNumber(prevPct, 2)}%)`}
          >
            {prevPct >= 8 && `${formatNumber(prevPct, 0)}%`}
          </div>
        )}
        {incPct > 0 && (
          <div
            className="bg-amber-400 flex items-center justify-center text-xs font-semibold text-[#422006] border-r border-white/50"
            style={{ width: `${incPct}%` }}
            title={`Construction Increased: ${formatNumber(incValue, 2)} (${formatNumber(incPct, 2)}%)`}
          >
            {incPct >= 8 && `+${formatNumber(incPct, 0)}%`}
          </div>
        )}
        {remPct > 0 && (
          <div
            className="bg-orange-200 dark:bg-orange-400/30 flex items-center justify-center text-xs font-semibold text-orange-900 dark:text-orange-200"
            style={{ width: `${remPct}%` }}
            title={`Remaining: ${formatNumber(remValue, 2)} (${formatNumber(remPct, 2)}%)`}
          >
            {remPct >= 8 && `${formatNumber(remPct, 0)}%`}
          </div>
        )}
      </div>
      <div className="flex text-xs mt-1.5 gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-blue-600" />
          <span className="text-(--palette-gray-500)">Previous:</span>
          <span className="font-semibold text-(--palette-ink) tabular-nums">
            {formatNumber(safePrev, 2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-amber-400" />
          <span className="text-(--palette-gray-500)">Increased:</span>
          <span className="font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
            +{formatNumber(incValue, 2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-teal-500" />
          <span className="text-(--palette-gray-500)">Current:</span>
          <span className="font-semibold text-(--palette-accent-ink) tabular-nums">
            {formatNumber(safeCurrent, 2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-orange-200 border border-orange-300" />
          <span className="text-(--palette-gray-500)">Remaining:</span>
          <span className="font-semibold text-(--palette-ink) tabular-nums">
            {formatNumber(remValue, 2)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ConstructionTimelineBar;
