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
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
          Group {groupSet}
        </span>
        {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
      </div>

      <p
        className="text-sm font-medium text-gray-800 leading-snug line-clamp-2"
        title={assetGroupDetail ?? ''}
      >
        {assetGroupDetail ?? '—'}
      </p>

      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1 border-t border-gray-100">
        <span className="text-xs text-gray-400">Estimated</span>
        <span className="text-xs text-gray-400">Current</span>
        <span className="text-sm font-semibold text-gray-900 tabular-nums">
          {roundEstimatedPrice != null ? formatNumber(roundEstimatedPrice) : '—'}
        </span>
        <span className="text-sm font-semibold text-gray-900 tabular-nums">
          {roundCurrentPrice != null ? formatNumber(roundCurrentPrice) : '—'}
        </span>
        <span className="text-xs text-gray-400 tabular-nums">
          Sum {sumEstimatedPrice != null ? formatNumber(sumEstimatedPrice) : '—'}
        </span>
        <span className="text-xs text-gray-400 tabular-nums">
          Sum {sumCurrentPrice != null ? formatNumber(sumCurrentPrice) : '—'}
        </span>
      </div>
    </button>
  );
}
