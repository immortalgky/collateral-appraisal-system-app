import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface SourceSwitchProps {
  source: 'consumer' | 'outbox';
  onChange: (source: 'consumer' | 'outbox') => void;
  // Undefined = not known yet (summary loading or failed) — the badge is hidden, never a grey "0",
  // which would read as all-clear.
  consumerCount: number | undefined;
  outboxCount: number | undefined;
}

const SourceSwitch = ({ source, onChange, consumerCount, outboxCount }: SourceSwitchProps) => {
  const { t } = useTranslation('failedMessages');

  const badgeClass = (count: number) =>
    clsx(
      'font-mono text-[11px] font-semibold rounded-full px-[7px] py-px',
      count > 0
        ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300'
        : 'bg-base-300 text-base-content/50',
    );

  return (
    <div
      className="grid grid-cols-2 border-b border-base-300"
      role="group"
      aria-label={t('sourceSwitch.groupLabel')}
    >
      {(['consumer', 'outbox'] as const).map((s, i) => {
        const count = s === 'consumer' ? consumerCount : outboxCount;
        return (
          <button
            key={s}
            type="button"
            aria-pressed={source === s}
            onClick={() => onChange(s)}
            className={clsx(
              'text-left px-4 pt-3 pb-2.5 flex flex-col gap-0.5 border-b-2 transition-colors',
              i === 1 && 'border-l border-base-300',
              source === s
                ? 'border-b-primary bg-gradient-to-b from-primary/10 to-transparent'
                : 'border-b-transparent hover:bg-base-200 text-base-content/70',
            )}
          >
            <span className="font-semibold text-[14px] flex items-center gap-2">
              {s === 'consumer' ? t('sourceSwitch.consumerTitle') : t('sourceSwitch.outboxTitle')}
              {count !== undefined && <span className={badgeClass(count)}>{count}</span>}
            </span>
            <span className="text-[12px] text-base-content/60">
              {s === 'consumer' ? t('sourceSwitch.consumerDesc') : t('sourceSwitch.outboxDesc')}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SourceSwitch;
