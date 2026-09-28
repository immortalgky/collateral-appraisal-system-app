import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import { LOG_LEVELS, logLevelDotColor, type LogLevel, type LogSummary } from '../types';
import type { QueryToken } from '../utils/queryTokens';

interface FilterChipsProps {
  levels: Set<LogLevel>;
  onToggleLevel: (level: LogLevel) => void;
  levelCounts?: LogSummary['levelCounts'];
  activeTokens: QueryToken[];
  onRemoveToken: (raw: string) => void;
  rangeChipLabel: string | null;
  onClearRange: () => void;
  /** The range a "Zoom out" click will return to, already formatted for the button's tooltip —
   * null hides the button (nothing to zoom out to). */
  zoomOutTooltip: string | null;
  onZoomOut: () => void;
}

const COUNT_KEY: Record<LogLevel, keyof LogSummary['levelCounts']> = {
  Information: 'information',
  Warning: 'warning',
  Error: 'error',
  Fatal: 'fatal',
};

const FilterChips = ({
  levels,
  onToggleLevel,
  levelCounts,
  activeTokens,
  onRemoveToken,
  rangeChipLabel,
  onClearRange,
  zoomOutTooltip,
  onZoomOut,
}: FilterChipsProps) => {
  const { t } = useTranslation('logAdmin');

  return (
    <div className="flex flex-wrap items-center gap-2">
      {LOG_LEVELS.map(level => {
        const pressed = levels.has(level);
        const count = levelCounts?.[COUNT_KEY[level]];
        return (
          <button
            key={level}
            type="button"
            aria-pressed={pressed}
            onClick={() => onToggleLevel(level)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity',
              pressed
                ? 'border-gray-200 bg-white text-gray-700'
                : 'border-gray-200 bg-white text-gray-400 opacity-45 line-through',
            )}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: logLevelDotColor[level] }}
            />
            {t(`levels.${level}`)}
            {count != null && (
              <b className="tabular-nums font-semibold">{count.toLocaleString()}</b>
            )}
          </button>
        );
      })}

      {zoomOutTooltip && (
        <button
          type="button"
          onClick={onZoomOut}
          title={zoomOutTooltip}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-gray-300"
        >
          <Icon name="magnifying-glass-minus" style="regular" className="size-3" />
          {t('search.zoomOut')}
        </button>
      )}

      {rangeChipLabel && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-mono text-primary">
          {rangeChipLabel}
          <button
            type="button"
            onClick={onClearRange}
            aria-label={t('filters.removeRange')}
            className="hover:opacity-70"
          >
            <Icon name="xmark" style="regular" className="size-3" />
          </button>
        </span>
      )}

      {activeTokens.map(token => (
        <span
          key={token.raw}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono',
            token.negated
              ? 'border-gray-300 bg-gray-50 text-gray-500'
              : 'border-primary/20 bg-primary/5 text-primary',
          )}
        >
          {token.negated && <span aria-hidden="true">≠</span>}
          {token.key}:{token.value.length > 20 ? `${token.value.slice(0, 18)}…` : token.value}
          <button
            type="button"
            onClick={() => onRemoveToken(token.raw)}
            aria-label={t('filters.removeFilter')}
            className="hover:opacity-70"
          >
            <Icon name="xmark" style="regular" className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
};

export default FilterChips;
