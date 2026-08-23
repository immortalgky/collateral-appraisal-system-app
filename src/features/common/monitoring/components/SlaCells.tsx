import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import Icon from '@shared/components/Icon';

// ─── Variant helpers ──────────────────────────────────────────────────────────
// Accept both "OnTime" (task-layer emit) and "OnTrack" (appraisal-layer emit).

type StatusVariant = 'breached' | 'atRisk' | 'healthy' | 'unknown';

function variantOf(slaStatus: string | null): StatusVariant {
  switch (slaStatus) {
    case 'Breached':
      return 'breached';
    case 'AtRisk':
      return 'atRisk';
    case 'OnTime':
    case 'OnTrack':
      return 'healthy';
    default:
      return 'unknown';
  }
}

/**
 * Maps a stored slaStatus value to the row-variant bucket used by
 * MonitoringDataTable's `getRowVariant` prop.
 */
export function bucketForSlaStatus(
  slaStatus: string | null,
): 'breached' | 'atRisk' | 'healthy' | undefined {
  switch (slaStatus) {
    case 'Breached':
      return 'breached';
    case 'AtRisk':
      return 'atRisk';
    case 'OnTime':
    case 'OnTrack':
      return 'healthy';
    default:
      return undefined;
  }
}

const DOT_COLOR: Record<StatusVariant, string> = {
  breached: 'bg-red-500',
  atRisk: 'bg-amber-500',
  healthy: 'bg-emerald-500',
  unknown: 'bg-gray-400',
};

// ─── Row variant classes ──────────────────────────────────────────────────────
// Returns Tailwind classes to apply to a <tr> for SLA-bucket tinting.
// Mirrors the ROW_VARIANT_TINT values used in MonitoringDataTable.
// Returns '' for healthy/unknown so the row stays neutral.

export function getRowVariantClasses(bucket: 'breached' | 'atRisk' | 'healthy' | undefined): string {
  // The left-stripe is applied as an inset box-shadow on the first <td> because
  // box-shadow on a <tr> is suppressed in border-collapse: collapse tables.
  // The first <td> also gets the OPAQUE variant background (not the translucent
  // /40 /30 used on the row body) — sticky pinned cells set their own bg-white
  // for horizontal-scroll layering, which would otherwise hide the row tint.
  switch (bucket) {
    case 'breached':
      return 'bg-red-50/40 group-hover:bg-red-50 [&>td:first-child]:bg-red-50 [&>td:first-child]:group-hover:bg-red-100 [&>td:first-child]:shadow-[inset_4px_0_0_0_rgb(239,68,68)]';
    case 'atRisk':
      return 'bg-amber-50/30 group-hover:bg-amber-50 [&>td:first-child]:bg-amber-50 [&>td:first-child]:group-hover:bg-amber-100 [&>td:first-child]:shadow-[inset_4px_0_0_0_rgb(245,158,11)]';
    case 'healthy':
    default:
      return '';
  }
}

// ─── SLA Due cell ─────────────────────────────────────────────────────────────
// Prefers the task's real DueAt. The AssignedDate + OlaTargetHours fallback only covers rows from a
// server that predates DueDate; it is doubly wrong now, because assignedDate became the current
// holder's clock (a redirect moves it while the deadline stays put) and because it counts calendar
// hours where DueAt is business-time. Icon prefix surfaces urgency at a glance: breached → red solid
// exclamation circle; at-risk → amber clock; otherwise gray clock.

interface SlaDueCellProps {
  dueDate?: string | null;
  assignedDate: string | null;
  targetHours: number | null;
  slaStatus: string | null;
  /** Resolved SLA policy budget (e.g. 48) shown as a subtle "48h" chip under the due date. */
  slaDurationHours?: number | null;
}

export function SlaDueCell({
  dueDate: dueDateIso,
  assignedDate,
  targetHours,
  slaStatus,
  slaDurationHours,
}: SlaDueCellProps) {
  let dueDate: Date;
  try {
    if (dueDateIso) {
      dueDate = parseISO(dueDateIso);
    } else if (assignedDate && targetHours != null) {
      dueDate = new Date(parseISO(assignedDate).getTime() + targetHours * 3_600_000);
    } else {
      return <span className="text-gray-400 text-xs">—</span>;
    }
  } catch {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  if (Number.isNaN(dueDate.getTime())) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  const variant = variantOf(slaStatus);
  const iconName =
    variant === 'breached'
      ? 'circle-exclamation'
      : variant === 'healthy'
        ? 'circle-check'
        : 'clock';
  const iconColor =
    variant === 'breached'
      ? 'text-red-500'
      : variant === 'atRisk'
        ? 'text-amber-500'
        : variant === 'healthy'
          ? 'text-emerald-500'
          : 'text-gray-400';

  return (
    <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-gray-700">
      <Icon style="solid" name={iconName} className={`size-3.5 shrink-0 ${iconColor}`} />
      <span className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5">
          {format(dueDate, 'dd/MM/yyyy HH:mm')}
          {slaDurationHours != null && (
            <span className="inline-flex items-center rounded border border-gray-200 px-1 py-px text-[10px] font-medium text-gray-500 tabular-nums">
              {slaDurationHours}h
            </span>
          )}
        </span>
        <span className="text-[10px] text-gray-400">
          {formatDistanceToNowStrict(dueDate, { addSuffix: true })}
        </span>
      </span>
    </span>
  );
}

// ─── Elapsed (hrs) ────────────────────────────────────────────────────────────
// Always neutral — urgency is communicated by row border + SLA Due icon instead.

interface ElapsedCellProps {
  actualHours: number | null;
  slaStatus: string | null;
}

export function ElapsedCell({ actualHours }: ElapsedCellProps) {
  if (actualHours == null) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  return <span className="text-xs tabular-nums font-medium text-gray-700">{actualHours}h</span>;
}

// ─── Remaining (hrs) ──────────────────────────────────────────────────────────
// remaining = target - actual. Number is always neutral; only the trailing " late"
// text turns red — one subtle signal without drowning breached-heavy screens.

interface RemainingCellProps {
  targetHours: number | null;
  actualHours: number | null;
  slaStatus: string | null;
}

export function RemainingCell({ targetHours, actualHours }: RemainingCellProps) {
  if (targetHours == null || actualHours == null) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  const remaining = targetHours - actualHours;
  if (remaining < 0) {
    return (
      <span className="text-xs tabular-nums font-medium text-gray-700">
        {Math.abs(remaining)}h<span className="text-red-600"> late</span>
      </span>
    );
  }
  return <span className="text-xs tabular-nums font-medium text-gray-700">{remaining}h</span>;
}

// ─── SLA Status badge (subtle, with colored dot) ──────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  OnTrack: 'OnTrack',
  OnTime: 'OnTime',
  AtRisk: 'AtRisk',
  Breached: 'Breached',
};

export function SlaStatusBadge({ sla }: { sla: string | null }) {
  if (!sla) return <span className="text-gray-400 text-xs">—</span>;
  const variant = variantOf(sla);
  const label = STATUS_LABEL[sla] ?? sla.replace(/([a-z])([A-Z])/g, '$1 $2');
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-700">
      <span className={`size-1.5 rounded-full ${DOT_COLOR[variant]}`} />
      {label}
    </span>
  );
}

