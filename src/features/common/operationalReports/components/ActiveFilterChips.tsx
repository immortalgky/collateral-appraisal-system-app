import Icon from '@shared/components/Icon';

export interface ActiveFilterChip {
  key: string;
  label: string;
  onClear: () => void;
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onClearAll?: () => void;
}

/**
 * Removable filter tags shown under the report filter bar. A local copy of the monitoring feature's
 * component (kept here so the reports feature doesn't depend on the monitoring i18n namespace).
 */
function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="shrink-0 flex flex-wrap items-center gap-1.5">
      {chips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-(--palette-surface-3) text-(--palette-ink) hover:bg-(--palette-line) transition-colors"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onClear}
            aria-label={`Clear ${chip.label}`}
            className="flex items-center justify-center rounded-full hover:text-(--palette-ink) transition-colors"
          >
            <Icon style="regular" name="xmark" className="size-3" />
          </button>
        </span>
      ))}

      {onClearAll != null && chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-(--palette-gray-500) hover:text-(--palette-ink) underline-offset-2 hover:underline transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

export default ActiveFilterChips;
