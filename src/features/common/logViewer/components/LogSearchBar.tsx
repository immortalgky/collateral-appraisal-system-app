import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import CustomRangePopover from './CustomRangePopover';
import { RANGE_PRESET_HOURS, type RangePresetHours } from '../utils/range';
import type { LogAdminKey } from '../types';

interface LogSearchBarProps {
  inputRef: RefObject<HTMLInputElement | null>;
  draftQuery: string;
  onDraftChange: (value: string) => void;
  onSearch: () => void;
  isDirty: boolean;
  rangeHours: RangePresetHours | null;
  onSelectPreset: (hours: RangePresetHours) => void;
  customFrom: Date;
  customTo: Date;
  onApplyCustomRange: (from: Date, to: Date) => void;
  live: boolean;
  onToggleLive: () => void;
  onOpenGuide: () => void;
}

const PRESET_LABEL_KEY: Record<RangePresetHours, LogAdminKey> = {
  0.25: 'range.15m',
  1: 'range.1h',
  24: 'range.24h',
  168: 'range.7d',
  720: 'range.30d',
};

const LogSearchBar = ({
  inputRef,
  draftQuery,
  onDraftChange,
  onSearch,
  isDirty,
  rangeHours,
  onSelectPreset,
  customFrom,
  customTo,
  onApplyCustomRange,
  live,
  onToggleLive,
  onOpenGuide,
}: LogSearchBarProps) => {
  const { t } = useTranslation('logAdmin');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={clsx(
            'flex-1 min-w-72 flex items-center gap-2 rounded-lg border bg-(--palette-surface-2) px-3 transition-colors',
            isDirty ? 'border-amber-400' : 'border-(--palette-line) focus-within:border-primary',
          )}
        >
          <Icon
            name="magnifying-glass"
            style="regular"
            className="size-4 text-(--palette-gray-400) shrink-0"
          />
          <input
            ref={inputRef}
            type="text"
            value={draftQuery}
            onChange={e => onDraftChange(e.target.value)}
            onKeyDown={e => {
              // An IME (Japanese/Chinese/Korean input) also fires an Enter keydown to confirm a
              // composition candidate — that must not submit the search mid-composition.
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSearch();
            }}
            placeholder={t('search.placeholder')}
            spellCheck={false}
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent py-2 text-sm font-mono focus:outline-none"
          />
          <kbd className="hidden sm:inline text-[11px] text-(--palette-gray-400) border border-(--palette-line) rounded px-1">
            /
          </kbd>
        </label>

        <button
          type="button"
          onClick={onSearch}
          className="inline-flex items-center h-7 px-4 rounded-lg bg-primary text-primary-content text-sm font-medium hover:bg-primary/90"
        >
          {t('search.button')}
        </button>

        <div className="flex items-center bg-(--palette-surface-3) rounded-lg p-0.5 gap-0.5">
          {RANGE_PRESET_HOURS.map(hours => (
            <button
              key={hours}
              type="button"
              aria-pressed={rangeHours === hours}
              onClick={() => onSelectPreset(hours)}
              className={clsx(
                'rounded-md px-2.5 h-7 text-xs font-medium transition-all',
                rangeHours === hours
                  ? 'bg-(--palette-surface) shadow-sm text-(--palette-primary-text)'
                  : 'text-(--palette-gray-500) hover:text-(--palette-ink)',
              )}
            >
              {t(PRESET_LABEL_KEY[hours])}
            </button>
          ))}
        </div>

        <CustomRangePopover
          active={rangeHours == null}
          from={customFrom}
          to={customTo}
          onApply={onApplyCustomRange}
        />

        <button
          type="button"
          aria-pressed={live}
          onClick={onToggleLive}
          title={t('search.liveTitle')}
          className={clsx(
            'inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border text-sm font-medium transition-colors',
            live
              ? 'border-green-300 dark:border-green-500/40 bg-(--palette-surface) text-green-700 dark:text-green-300'
              : 'border-(--palette-line) bg-(--palette-surface) text-(--palette-gray-600) hover:border-(--palette-line-strong)',
          )}
        >
          {live ? (
            <span className="relative inline-flex size-[8px]">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping motion-reduce:animate-none" />
              <span className="relative inline-flex size-[8px] rounded-full bg-green-500" />
            </span>
          ) : (
            <span className="size-[8px] rounded-full bg-gray-400" />
          )}
          {t('search.live')}
        </button>
      </div>

      {isDirty && (
        <p className="text-xs text-amber-600 dark:text-amber-400 -mt-1">{t('search.dirtyHint')}</p>
      )}

      <p className="text-xs text-(--palette-gray-400)">
        {t('search.hint')}{' '}
        <button
          type="button"
          onClick={onOpenGuide}
          className="text-(--palette-primary-text) font-medium underline"
        >
          {t('search.guideLink')}
        </button>
      </p>
    </div>
  );
};

export default LogSearchBar;
