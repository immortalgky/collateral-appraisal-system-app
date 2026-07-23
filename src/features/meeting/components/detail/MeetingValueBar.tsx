/**
 * "Where is the money in this meeting" — appraised value split across decision groups.
 *
 * A plain CSS flex bar rather than a charting component: it is a single stacked proportion,
 * and this keeps it crisp at any width and cheap to animate.
 */
import { useTranslation } from 'react-i18next';

import { ACK_GROUP_COLORS, DECISION_GROUP_COLORS } from '../../constants';
import type { AppraisalType } from '../../api/types';
import type { MeetingStats } from '../../utils/meetingStats';
import { useMeetingFormat } from '../../utils/useMeetingFormat';

const FALLBACK_COLOR = '#94a3b8';

type ValueGroup = MeetingStats['valueByGroup'][number];

/**
 * Decision groups are keyed by appraisal type, acknowledgement groups by the raw '1'/'2' wire
 * value — unrelated key spaces, so `kind` decides which map to read.
 */
const colorFor = (segment: ValueGroup): string =>
  (segment.kind === 'decision'
    ? DECISION_GROUP_COLORS[segment.group]
    : ACK_GROUP_COLORS[segment.group]) ?? FALLBACK_COLOR;

interface MeetingValueBarProps {
  stats: MeetingStats;
  animate?: boolean;
}

const MeetingValueBar = ({ stats, animate = true }: MeetingValueBarProps) => {
  const { t } = useTranslation('meeting');
  const { formatCompact } = useMeetingFormat();

  const segments = stats.valueByGroup.filter(g => g.value > 0);
  const total = segments.reduce((sum, g) => sum + g.value, 0);

  // Every group present but unvalued, or no decision items at all — a zero-width bar would be
  // misleading, so say nothing instead of drawing nothing.
  if (total <= 0) return null;

  const labelFor = (segment: ValueGroup) => {
    if (segment.kind === 'acknowledgement') {
      if (segment.group === '2') return t('ackGroups.urgent');
      if (segment.group === '1') return t('ackGroups.standard');
      return segment.group;
    }
    return segment.group in DECISION_GROUP_COLORS
      ? t(`decisionGroups.${segment.group}` as `decisionGroups.${AppraisalType}`)
      : t('decisionGroups.other');
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span aria-hidden="true" className="block h-3.5 w-1 rounded-full bg-emerald-500" />
          {t('pulse.valueDistribution')}
        </h4>
        <span className="text-sm font-semibold text-emerald-700 tabular-nums">
          {formatCompact(total)}
        </span>
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
        {segments.map(segment => (
          <div
            key={`${segment.kind}-${segment.group}`}
            className={animate ? 'transition-[width] duration-700 ease-out' : undefined}
            style={{
              width: `${(segment.value / total) * 100}%`,
              backgroundColor: colorFor(segment),
            }}
            title={`${labelFor(segment)} — ${formatCompact(segment.value)}`}
          />
        ))}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {segments.map(segment => (
          <li key={`${segment.kind}-${segment.group}`} className="flex items-center gap-2 min-w-0">
            <span
              className="block size-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: colorFor(segment) }}
            />
            <span className="min-w-0">
              <span className="block text-[11px] text-gray-500 truncate" title={labelFor(segment)}>
                {labelFor(segment)}
              </span>
              <span className="block text-xs font-medium text-gray-800 tabular-nums">
                {formatCompact(segment.value)}
                <span className="ml-1 font-normal text-gray-400">({segment.count})</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MeetingValueBar;
