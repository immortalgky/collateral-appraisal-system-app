
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

export function LeaseTimelineBar({
  leaseStartDate,
  leaseEndDate,
  appraisalDate,
}: LeaseTimelineBarProps) {
  const start = toDate(leaseStartDate);
  const end = toDate(leaseEndDate);
  const appraisal = toDate(appraisalDate);

  if (!start || !end) return null;

  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) return null;

  const elapsedMs = appraisal ? appraisal.getTime() - start.getTime() : 0;
  const pct = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));

  const remainingDays = appraisal
    ? Math.max(0, Math.round((end.getTime() - appraisal.getTime()) / (1000 * 60 * 60 * 24)))
    : Math.round(totalMs / (1000 * 60 * 60 * 24));
  const remainingYears = (remainingDays / 365.25).toFixed(1);

  // mock:288-290/2471 (`.tl`) — a bare 6px bar + dot marker, no inline elapsed/remaining
  // text row. That row measured ~300px minimum ("Start DD/MM/YYYY · NN% elapsed · N.N yr
  // remaining · End DD/MM/YYYY") against the rail's ~240px usable width — the mock's own
  // fix for the same width was to drop the text to a `title` tooltip, which is what this
  // now does; Start/End are already shown above this bar in the rail's lease-date grid,
  // so repeating them here would be redundant even with room to spare.
  //
  // Deliberate deviation from the mock: at low elapsed % (e.g. 1% on a 30-year contract)
  // the fill is visually indistinguishable from a section divider, and a `title` tooltip
  // gives no affordance telling anyone to hover — this is also the only place the
  // remaining term appears on screen. A short caption line restates the tooltip's own
  // numbers so the two can never disagree.
  return (
    <>
      {/* mock `.tl` (#edf1f1 track, #99f6e4 fill, #0d9488 dot). No overflow-hidden: it
          clipped the 10px dot on the 6px track. */}
      <div
        className="relative h-[6px] rounded-[3px] bg-[#edf1f1] mt-[10px] mb-[12px]"
        title={`${formatShort(start)} – ${formatShort(end)} · ${pct.toFixed(0)}% elapsed${appraisal ? ` · ${remainingYears} yr remaining` : ''}`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-[3px] bg-[#99f6e4]"
          style={{ width: `${pct}%` }}
        />
        {appraisal && (
          <div
            className="absolute top-1/2 -translate-y-1/2 size-[10px] rounded-full bg-[#0d9488] border-2 border-white"
            style={{ left: `${pct}%`, marginLeft: '-5px' }}
          />
        )}
      </div>
    </>
  );
}
