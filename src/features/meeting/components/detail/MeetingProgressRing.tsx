/**
 * Decision progress donut — how far through the meeting the committee actually is.
 *
 * Follows the recharts idiom already used by `features/dashboard/components/ProgressSummaryWidget`
 * (PieChart + Cell + a centred absolute overlay) so the two features look like one system.
 */
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { DECISION_CHART_COLORS } from '../../constants';
import type { ItemDecision } from '../../api/types';
import type { MeetingStats } from '../../utils/meetingStats';

const ORDER: ItemDecision[] = ['Released', 'Pending', 'RoutedBack'];

interface MeetingProgressRingProps {
  stats: MeetingStats;
  /** Disables the mount animation when the user prefers reduced motion. */
  animate?: boolean;
}

const MeetingProgressRing = ({ stats, animate = true }: MeetingProgressRingProps) => {
  const { t } = useTranslation('meeting');

  const slices = ORDER.map(decision => ({
    decision,
    name: t(`decision.${decision}` as `decision.${ItemDecision}`),
    value: stats.decisionCounts[decision],
    color: DECISION_CHART_COLORS[decision],
  })).filter(s => s.value > 0);

  const pct = Math.round(stats.progress * 100);

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0 w-[132px] h-[132px]">
        {/* Neutral track behind the chart. Without it a meeting at 0% released renders as one
            flat grey circle (Pending is the only slice) and reads as broken rather than "not
            started". The coloured arc now sits against a lighter ring. */}
        <div className="absolute inset-[4px] rounded-full border-[16px] border-gray-100" />
        {/* With no decision items at all (an acknowledgement-only meeting) the track above is
            the whole visual — there is nothing to chart. */}
        {slices.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={slices.length > 1 ? 2 : 0}
                stroke="none"
                startAngle={90}
                endAngle={-270}
                isAnimationActive={animate}
                animationDuration={700}
              >
                {slices.map(slice => (
                  <Cell key={slice.decision} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* Centre figure is tinted by progress so the ring reads at a glance:
              nothing released yet → neutral, part-way → amber, all done → emerald. */}
          <span
            className={clsx(
              'text-2xl font-bold tabular-nums leading-none',
              pct === 0 && 'text-gray-400',
              pct > 0 && pct < 100 && 'text-amber-600',
              pct === 100 && 'text-emerald-600',
            )}
          >
            {pct}%
          </span>
          <span className="mt-1 text-[11px] text-gray-400">{t('pulse.released')}</span>
        </div>
      </div>

      <dl className="flex-1 min-w-0 space-y-1.5">
        {ORDER.map(decision => (
          <div key={decision} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 min-w-0">
              <span
                className="block size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: DECISION_CHART_COLORS[decision] }}
              />
              <span className="text-sm text-gray-600 truncate">
                {t(`decision.${decision}` as `decision.${ItemDecision}`)}
              </span>
            </dt>
            <dd className="text-sm font-semibold text-gray-800 tabular-nums shrink-0">
              {stats.decisionCounts[decision]}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-gray-100">
          <dt className="text-xs uppercase tracking-wide text-gray-400">
            {t('pulse.decisionTotal')}
          </dt>
          <dd className="text-sm font-semibold text-gray-800 tabular-nums">
            {stats.totalDecision}
          </dd>
        </div>
      </dl>
    </div>
  );
};

export default MeetingProgressRing;
