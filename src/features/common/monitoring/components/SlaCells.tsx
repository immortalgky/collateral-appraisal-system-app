import { format, parseISO } from 'date-fns';
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
// SLA Due = AssignedDate + OlaTargetHours. Icon prefix surfaces urgency at a glance:
// breached → red solid exclamation circle; at-risk → amber clock; otherwise gray clock.

interface SlaDueCellProps {
  assignedDate: string | null;
  targetHours: number | null;
  slaStatus: string | null;
}

export function SlaDueCell({ assignedDate, targetHours, slaStatus }: SlaDueCellProps) {
  if (!assignedDate || targetHours == null) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  let dueDate: Date;
  try {
    dueDate = new Date(parseISO(assignedDate).getTime() + targetHours * 3_600_000);
  } catch {
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
      <Icon style="solid" name={iconName} className={`size-3.5 ${iconColor}`} />
      {format(dueDate, 'dd/MM/yyyy')}
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

