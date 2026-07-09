// Shared card-style tooltip for dashboard charts. Iterates the hovered series so it
// works for any line/bar chart (fixed or dynamic series). Matches the look used by
// ExternalTaskSummaryWidget's tooltip for a consistent dashboard style.
type ChartTooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
  stroke?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
};

export default function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm px-3 py-2 text-xs min-w-[160px]">
      {label != null && label !== '' && (
        <p className="font-semibold text-gray-800 mb-1.5">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color ?? entry.stroke ?? '#9ca3af' }}
            />
            <span className="text-gray-600">{entry.name}</span>
            <span className="ml-auto font-medium text-gray-800 tabular-nums">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
