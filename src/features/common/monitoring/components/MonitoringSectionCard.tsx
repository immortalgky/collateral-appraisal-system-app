import { useId, useRef, type ReactNode } from 'react';

import Icon from '@shared/components/Icon';

import type { MonitoringSectionId } from '../pages/MonitoringPage';

export type SectionAccent = 'emerald' | 'indigo' | 'amber' | 'purple' | 'yellow' | 'cyan';

interface AccentClasses {
  iconBg: string;
  iconText: string;
}

const ACCENT: Record<SectionAccent, AccentClasses> = {
  emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  indigo: { iconBg: 'bg-indigo-50', iconText: 'text-indigo-600' },
  amber: { iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  purple: { iconBg: 'bg-purple-50', iconText: 'text-purple-600' },
  yellow: { iconBg: 'bg-yellow-50', iconText: 'text-yellow-500' },
  cyan: { iconBg: 'bg-cyan-50', iconText: 'text-cyan-600' },
};

interface MonitoringSectionCardProps {
  id: MonitoringSectionId;
  title: string;
  icon: string;
  accent: SectionAccent;
  count?: number;
  /** OLA breach/atRisk/healthy split; when provided AND collapsed, header shows mini bar. */
  breached?: number;
  atRisk?: number;
  healthy?: number;
  expanded: boolean;
  onToggle: (id: MonitoringSectionId) => void;
  children: ReactNode;
}

function MiniSlaBar({
  breached,
  atRisk,
  healthy,
}: {
  breached: number;
  atRisk: number;
  healthy: number;
}) {
  const total = breached + atRisk + healthy;
  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;
  const breachPct = Math.round((breached / total) * 100);
  return (
    <span className="ml-auto flex items-center gap-2 shrink-0">
      <span
        className="flex h-1.5 w-16 overflow-hidden rounded-full bg-gray-100"
        aria-label={`${breachPct}% breached — ${breached} breached, ${atRisk} at risk, ${healthy} healthy`}
      >
        {breached > 0 && <span className="h-full bg-red-500" style={{ width: pct(breached) }} />}
        {atRisk > 0 && <span className="h-full bg-amber-500" style={{ width: pct(atRisk) }} />}
        {healthy > 0 && <span className="h-full bg-emerald-500" style={{ width: pct(healthy) }} />}
      </span>
      <span
        className={[
          'text-[11px] font-medium tabular-nums',
          breachPct >= 50
            ? 'text-red-600'
            : breachPct >= 25
              ? 'text-amber-600'
              : 'text-emerald-600',
        ].join(' ')}
      >
        {breachPct}%
      </span>
    </span>
  );
}

function MonitoringSectionCard({
  id,
  title,
  icon,
  accent,
  count,
  breached = 0,
  atRisk = 0,
  healthy = 0,
  expanded,
  onToggle,
  children,
}: MonitoringSectionCardProps) {
  const bodyId = useId();
  const hasOpenedRef = useRef(expanded);
  if (expanded) hasOpenedRef.current = true;

  const cfg = ACCENT[accent];
  const showMiniBar = !expanded && breached + atRisk + healthy > 0;

  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className={[
          'w-full flex items-center gap-2 px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg',
          expanded ? '' : 'rounded-b-lg',
        ].join(' ')}
      >
        <Icon
          style="solid"
          name="chevron-down"
          className={[
            'size-3 text-gray-500 transition-transform shrink-0',
            expanded ? '' : '-rotate-90',
          ].join(' ')}
        />
        <span
          className={[
            'inline-flex items-center justify-center size-6 rounded-md shrink-0',
            cfg.iconBg,
          ].join(' ')}
        >
          <Icon style="solid" name={icon} className={['size-3.5', cfg.iconText].join(' ')} />
        </span>
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        {count !== undefined && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-white text-gray-600 border border-gray-200 rounded-full tabular-nums leading-none">
            {count}
          </span>
        )}
        {breached > 0 && !showMiniBar && (
          <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
        )}
        {showMiniBar && <MiniSlaBar breached={breached} atRisk={atRisk} healthy={healthy} />}
      </button>

      <div id={bodyId} hidden={!expanded} className="px-4 pt-3 pb-4 border-t border-gray-200">
        {hasOpenedRef.current && children}
      </div>
    </section>
  );
}

export default MonitoringSectionCard;
