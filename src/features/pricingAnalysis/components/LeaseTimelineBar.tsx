interface LeaseTimelineBarProps {
  leaseStartDate?: string;
  leaseEndDate?: string;
  appraisalDate?: string;
}

function toDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatShort(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function LeaseTimelineBar({ leaseStartDate, leaseEndDate, appraisalDate }: LeaseTimelineBarProps) {
  const start = toDate(leaseStartDate);
  const end = toDate(leaseEndDate);
  const appraisal = toDate(appraisalDate);

  if (!start || !end) return null;

  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) return null;

  const elapsedMs = appraisal ? appraisal.getTime() - start.getTime() : 0;
  const pct = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));

  const remainingDays = appraisal ? Math.max(0, Math.round((end.getTime() - appraisal.getTime()) / (1000 * 60 * 60 * 24))) : Math.round(totalMs / (1000 * 60 * 60 * 24));
  const remainingYears = (remainingDays / 365.25).toFixed(1);

  return (
    <div className="space-y-1.5">
      {/* Bar */}
      <div className="relative h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gray-400 to-gray-500"
          style={{ width: `${pct}%` }}
        />
        {appraisal && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm"
            style={{ left: `${pct}%`, marginLeft: '-6px' }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>Start {formatShort(start)}</span>
        {appraisal && (
          <span className="text-primary font-medium">
            {pct.toFixed(0)}% elapsed · {remainingYears} yr remaining
          </span>
        )}
        <span>End {formatShort(end)}</span>
      </div>
    </div>
  );
}
