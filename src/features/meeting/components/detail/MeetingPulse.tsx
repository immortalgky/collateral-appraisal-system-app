/**
 * The "at a glance" block: how far through the meeting we are, what it is worth, and where
 * the value sits. Shown in session and minutes modes — before a meeting runs there is no
 * progress to report, so the prep layout omits it.
 */
import { useTranslation } from 'react-i18next';

import Icon from '@/shared/components/Icon';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import type { MeetingStats } from '../../utils/meetingStats';
import { useMeetingFormat } from '../../utils/useMeetingFormat';
import CountUpValue from './CountUpValue';
import MeetingProgressRing from './MeetingProgressRing';
import MeetingValueBar from './MeetingValueBar';

interface MeetingPulseProps {
  stats: MeetingStats;
}

interface KpiProps {
  icon: string;
  label: string;
  /** Applied to the icon only — see the note below. */
  iconClassName: string;
  children: React.ReactNode;
  hint?: string;
}

/**
 * A KPI tile: neutral white card, colour carried entirely by the icon.
 *
 * The earlier version gave every tile its own pastel fill, which turned a row of related numbers
 * into four unrelated coloured blocks and left no contrast for the values themselves. Same rule
 * as the toolbar's quiet buttons — neutral surface, coloured glyph.
 */
const Kpi = ({ icon, label, iconClassName, children, hint }: KpiProps) => (
  <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 transition-colors hover:border-gray-300">
    <div className="flex items-center gap-1.5">
      <Icon name={icon} style="solid" className={`size-3 ${iconClassName}`} />
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
    </div>
    <div className="mt-1 text-lg font-bold tabular-nums text-gray-900">{children}</div>
    {hint && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
  </div>
);

const MeetingPulse = ({ stats }: MeetingPulseProps) => {
  const { t } = useTranslation('meeting');
  const { formatCompact } = useMeetingFormat();
  // Respect the OS-level motion preference — no count-up, no ring sweep, no bar growth.
  const animate = !useMediaQuery('(prefers-reduced-motion: reduce)');

  const unknown = stats.appraisedValue.unknown;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Progress */}
        <div className="lg:border-r lg:border-gray-100 lg:pr-6">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span aria-hidden="true" className="block h-3.5 w-1 rounded-full bg-primary" />
            {t('pulse.title')}
          </h3>
          <MeetingProgressRing stats={stats} animate={animate} />
        </div>

        {/* KPIs + value distribution */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kpi icon="gavel" label={t('pulse.kpiDecision')} iconClassName="text-primary">
              <CountUpValue value={stats.totalDecision} animate={animate} />
            </Kpi>
            <Kpi icon="circle-info" label={t('pulse.kpiAck')} iconClassName="text-purple-500">
              <CountUpValue value={stats.totalAck} animate={animate} />
            </Kpi>
            <Kpi
              icon="sack-dollar"
              label={t('pulse.kpiAppraised')}
              iconClassName="text-emerald-600"
              hint={
                unknown > 0
                  ? t(unknown === 1 ? 'pulse.unknownValues' : 'pulse.unknownValuesPlural', {
                      n: unknown,
                    })
                  : undefined
              }
            >
              {formatCompact(stats.appraisedValue.total)}
            </Kpi>
          </div>

          <MeetingValueBar stats={stats} animate={animate} />
        </div>
      </div>
    </section>
  );
};

export default MeetingPulse;
