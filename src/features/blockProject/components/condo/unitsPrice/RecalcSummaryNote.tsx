import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import Icon from '@/shared/components/Icon';

import type { RecalcSummary } from '../../../utils/recalcSummary';

const baht = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
// A real minus sign, so the delta reads at a glance in a column of figures.
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${baht(Math.abs(v))}`;

function Delta({ label, from, to }: { label: string; from: number; to: number }) {
  const { t } = useTranslation('blockProject');
  const d = to - from;
  return (
    <span>
      {label}{' '}
      <b
        className={clsx(
          'tabular-nums',
          d > 0 && 'text-green-700 dark:text-green-300',
          d < 0 && 'text-red-700 dark:text-red-300',
          d === 0 && 'text-(--palette-ink)',
        )}
      >
        {signed(d)}
      </b>{' '}
      {t('condoUnitsPrice.recalc.baht')}{' '}
      <small className="text-xs text-(--palette-ink-2) tabular-nums">
        (฿{baht(from)} → ฿{baht(to)})
      </small>
    </span>
  );
}

/**
 * Shown in the price card after "Save and recalculate" until dismissed (a toast is gone before the
 * numbers can be read): how many units changed price and what that did to the two totals.
 */
export function RecalcSummaryNote({
  summary,
  onDismiss,
}: {
  summary: RecalcSummary;
  onDismiss: () => void;
}) {
  const { t } = useTranslation('blockProject');
  return (
    <div
      role="status"
      className="mx-3.5 mt-2.5 flex shrink-0 items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 py-2 pr-2 pl-3 dark:border-green-500/30 dark:bg-green-500/10"
    >
      <Icon
        name="circle-check"
        style="solid"
        className="mt-0.5 shrink-0 text-green-700 dark:text-green-300"
      />
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 text-sm font-semibold text-(--palette-ink)">
          {t(
            summary.changed > 0
              ? 'condoUnitsPrice.recalc.title'
              : 'condoUnitsPrice.recalc.titleUnchanged',
          )}
        </h3>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-table text-(--palette-ink-2)">
          <span>
            {t('condoUnitsPrice.recalc.changedLabel')}{' '}
            <b className="tabular-nums text-(--palette-ink)">{summary.changed.toLocaleString()}</b>{' '}
            {t('condoUnitsPrice.recalc.ofTotal', { total: summary.units.toLocaleString() })}
          </span>
          <Delta
            label={t('condoUnitsPrice.recalc.valueLabel')}
            from={summary.valueBefore}
            to={summary.valueAfter}
          />
          <Delta
            label={t('condoUnitsPrice.recalc.forceLabel')}
            from={summary.forceBefore}
            to={summary.forceAfter}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('condoUnitsPrice.recalc.dismiss')}
        title={t('condoUnitsPrice.recalc.dismiss')}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-(--palette-ink-2) hover:bg-(--palette-surface-3)"
      >
        <Icon name="xmark" style="solid" />
      </button>
    </div>
  );
}
