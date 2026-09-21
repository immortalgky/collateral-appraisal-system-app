import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import {
  type MachinerySummaryState,
  SUMMARY_COUNT_NAMES,
} from '../hooks/useMachinerySummaryStatus';
import { MachinerySummaryStatusPill } from './MachinerySummaryStatusPill';

interface MachinerySummaryStripProps {
  state: MachinerySummaryState;
  machineCount: number;
  readOnly: boolean;
  onOpen: () => void;
}

/**
 * The machinery summary's place on the Properties tab: one strip above the groups, because the
 * summary belongs to the whole appraisal rather than to any one group.
 *
 * Amber while there is something to do — nothing saved, or counts that no longer match the
 * machine list — and quiet once it is in order. Nothing renders while the status is loading, so a
 * saved summary never flashes "not saved" on the way in.
 */
export const MachinerySummaryStrip = ({
  state,
  machineCount,
  readOnly,
  onOpen,
}: MachinerySummaryStripProps) => {
  const { t } = useTranslation('appraisal');
  const { status } = state;
  if (!status) return null;

  const needsWork = status !== 'done';
  const primary = !readOnly && needsWork;
  const actionLabel = readOnly
    ? t('properties.machinerySummary.actions.open')
    : status === 'none'
      ? t('properties.machinerySummary.actions.start')
      : status === 'drift'
        ? t('properties.machinerySummary.actions.review')
        : t('properties.machinerySummary.actions.open');

  const doneCounts =
    status === 'done'
      ? SUMMARY_COUNT_NAMES.map(name => ({
          name,
          value: state.saved?.[name] ?? state.derived?.[name] ?? null,
        })).filter(c => !!c.value)
      : [];

  return (
    <div
      className={clsx(
        'grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2.5',
        needsWork ? 'border-amber-200 bg-amber-50/70' : 'border-gray-100 bg-gray-50/80',
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-amber-700/10 text-amber-700">
        <Icon name="gears" style="solid" className="text-sm" />
      </span>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-[13px] font-semibold text-gray-900">
            {t('properties.machinerySummary.title')}
          </h4>
          <MachinerySummaryStatusPill status={status} />
        </div>

        {status === 'none' && (
          <p className="mt-0.5 text-xs text-gray-600">
            {t('properties.machinerySummary.hint.none', { n: machineCount })}
          </p>
        )}
        {status === 'done' && doneCounts.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-x-3.5 gap-y-0.5 text-xs text-gray-600">
            {doneCounts.map(c => (
              <span key={c.name}>
                {t(`properties.machinerySummary.counts.${c.name}`)}{' '}
                <b className="font-semibold tabular-nums text-gray-900">{c.value}</b>
              </span>
            ))}
          </div>
        )}
        {status === 'drift' && (
          <>
            <div className="mt-0.5 flex flex-wrap gap-x-3.5 gap-y-0.5 text-xs font-medium text-amber-800">
              {state.mismatches.map(m => (
                <span key={m.name} className="tabular-nums">
                  {t(`properties.machinerySummary.counts.${m.name}`)} {m.saved} → {m.derived}
                </span>
              ))}
            </div>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {t('properties.machinerySummary.hint.drift')}
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className={clsx(
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
          primary
            ? 'bg-primary text-white hover:bg-primary-700'
            : 'border border-primary/40 bg-white text-primary-700 hover:bg-primary-50',
        )}
      >
        {actionLabel}
        <Icon name="chevron-right" style="solid" className="text-[10px]" />
      </button>
    </div>
  );
};

export default MachinerySummaryStrip;
