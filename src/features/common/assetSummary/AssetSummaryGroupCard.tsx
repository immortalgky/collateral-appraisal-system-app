import clsx from 'clsx';
import { formatNumber } from '@/shared/utils/formatUtils';

interface AssetSummaryGroupCardProps {
  assetGroupDetail: string | null;
  sumEstimatedPrice: number | null;
  roundEstimatedPrice: number | null;
  sumCurrentPrice: number | null;
  roundCurrentPrice: number | null;
  groupSet: number;
  handleOnClick: () => void;
  isSelected: boolean;
}

export function AssetSummaryGroupCard({
  assetGroupDetail,
  sumEstimatedPrice,
  roundEstimatedPrice,
  sumCurrentPrice,
  roundCurrentPrice,
  groupSet,
  handleOnClick,
  isSelected,
}: AssetSummaryGroupCardProps) {
  return (
    <button
      type="button"
      onClick={handleOnClick}
      className={clsx(
        'flex flex-col shrink-0 w-56 gap-2 p-3 border rounded-xl cursor-pointer text-left transition-colors',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary ring-inset'
          : 'border-(--palette-line) hover:border-(--palette-line-strong) hover:bg-(--palette-surface-2)',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-(--palette-warn-wash) text-(--palette-warn)">
          Group {groupSet}
        </span>
        {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
      </div>

      <p
        className="text-sm font-medium text-(--palette-ink) leading-snug line-clamp-2"
        title={assetGroupDetail ?? ''}
      >
        {assetGroupDetail ?? '—'}
      </p>

      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1 border-t border-(--palette-line-soft)">
        <span className="text-xs text-(--palette-gray-400)">Estimated</span>
        <span className="text-xs text-(--palette-gray-400)">Current</span>
        <span className="text-sm font-semibold text-(--palette-ink) tabular-nums">
          {roundEstimatedPrice != null ? formatNumber(roundEstimatedPrice) : '—'}
        </span>
        <span className="text-sm font-semibold text-(--palette-ink) tabular-nums">
          {roundCurrentPrice != null ? formatNumber(roundCurrentPrice) : '—'}
        </span>
        <span className="text-xs text-(--palette-gray-400) tabular-nums">
          Sum {sumEstimatedPrice != null ? formatNumber(sumEstimatedPrice) : '—'}
        </span>
        <span className="text-xs text-(--palette-gray-400) tabular-nums">
          Sum {sumCurrentPrice != null ? formatNumber(sumCurrentPrice) : '—'}
        </span>
      </div>
    </button>
  );
}
