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
  /** Optional heading text color class (e.g. "text-violet-700 dark:text-violet-300"). Defaults to gray-900. */
  accentClass?: string;
  /** Optional leading dot background class (e.g. "bg-violet-500"). Hidden when omitted. */
  dotClass?: string;
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
  accentClass,
  dotClass,
}: ModelBreakdownProps) => {
  return (
    <div>
      <h4
        className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${accentClass ?? 'text-(--palette-ink)'}`}
      >
        {dotClass && <span className={`size-2 rounded-full ${dotClass}`} />}
        {heading}
      </h4>
      <div className="border-t border-(--palette-line)">
        {stats.length === 0 ? (
          <div className="py-3 text-xs text-(--palette-gray-400)">{emptyLabel}</div>
        ) : (
          stats.map(s => (
            <div
              key={s.modelName}
              className="flex items-center justify-between py-2 border-b border-(--palette-line-soft) last:border-0"
            >
              <span className="text-sm text-(--palette-ink)">{s.modelName}</span>
              <div className="flex items-center gap-2 text-sm tabular-nums">
                <span className="text-(--palette-ink) font-medium">
                  {s.count.toLocaleString('th-TH')}
                </span>
                <span className="text-xs text-(--palette-gray-400) w-8 text-right">
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
