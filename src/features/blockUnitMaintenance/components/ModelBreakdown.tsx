export interface ModelStat {
  modelName: string;
  count: number;
}

interface ModelBreakdownProps {
  heading: string;
  stats: ModelStat[];
  emptyLabel: string;
  /** Pre-translated suffix shown after each count (e.g. "units"). */
  unitSuffix: string;
}

/**
 * Breakdown list of units grouped by model name (sold or available).
 * Extracted from BlockUnitMaintenanceDetailPage for reuse in BlockReappraisalDetailPage.
 * Labels are passed in (already translated) so the component stays namespace-agnostic.
 */
export const ModelBreakdown = ({
  heading,
  stats,
  emptyLabel,
  unitSuffix,
}: ModelBreakdownProps) => {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-2">{heading}</h4>
      <div className="border-t border-gray-200">
        {stats.length === 0 ? (
          <div className="py-3 text-xs text-gray-400">{emptyLabel}</div>
        ) : (
          stats.map(s => (
            <div
              key={s.modelName}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-sm text-gray-700">{s.modelName}</span>
              <div className="flex items-center gap-2 text-sm tabular-nums">
                <span className="text-gray-700 font-medium">{s.count.toLocaleString('th-TH')}</span>
                <span className="text-xs text-gray-400 w-8 text-right">
                  {unitSuffix}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
