import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import Icon from '@/shared/components/Icon';
import type { FilterField, FilterGroup } from './tabConfigs';
import { FILTER_GROUPS } from './tabConfigs';
import FilterValuePanel from './FilterValuePanel';
import { isFieldActive, selectedValues, useFilterFieldOptions } from './filterOptions';

interface FilterChipBarProps {
  filters: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Drops one key. Kept separate from onChange so a removed filter leaves no empty URL param. */
  onRemove: (key: string) => void;
  onClear: () => void;
}

const PANEL_CLASS =
  'z-50 mt-1.5 rounded-xl border border-gray-200 bg-white p-3 shadow-lg max-h-none! overflow-visible!';

/** Clearing a range means clearing the two keys it writes, not its own. */
const clearField = (field: FilterField, onRemove: (key: string) => void) => {
  if (field.type === 'date-range') {
    if (field.fromKey) onRemove(field.fromKey);
    if (field.toKey) onRemove(field.toKey);
    return;
  }
  onRemove(field.key);
};

interface FilterChipProps {
  field: FilterField;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
}

/**
 * One filter that is set. The chip IS the control: clicking it reopens the value panel, so the
 * bar shows the current filters and edits them in the same place instead of drawing them once in
 * a panel and again in a separate chip row.
 */
function FilterChip({ field, values, onChange, onRemove }: FilterChipProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  const options = useFilterFieldOptions(field);

  const summary = () => {
    if (field.type === 'date-range') {
      const from = values[field.fromKey ?? ''];
      const to = values[field.toKey ?? ''];
      return `${from || '…'} → ${to || '…'}`;
    }
    const selected = selectedValues(values, field.key);
    if (selected.length === 0) return t('appraisal:list.filters.anyValue');
    const first = options.find(o => o.value === selected[0])?.label ?? selected[0];
    // "+2" rather than the full list: a quick view can set four statuses at once, and spelling
    // them all out pushes every other chip off the row.
    return selected.length > 1 ? `${first} +${selected.length - 1}` : first;
  };

  // Keys a quick view sets on the user's behalf (assigneeUserId, the appointment/assigned dates)
  // have no control of their own — they get a chip that says what is filtered and can be removed.
  const chipBody = (
    <>
      <span className="font-medium text-gray-400">{field.label}:</span>
      <span className="truncate max-w-52">{summary()}</span>
    </>
  );

  const remove = (
    <button
      type="button"
      onClick={() => clearField(field, onRemove)}
      aria-label={t('appraisal:list.removeFilter') + ': ' + field.label}
      className="rounded p-0.5 opacity-60 hover:bg-gray-200 hover:opacity-100"
    >
      <Icon style="solid" name="xmark" className="size-3" />
    </button>
  );

  if (field.hidden) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
        {chipBody}
        {remove}
      </span>
    );
  }

  return (
    <Popover className="relative">
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 pl-2.5 pr-1 py-1 text-xs text-gray-700 transition-colors hover:border-gray-300">
        <PopoverButton className="inline-flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          {chipBody}
          <Icon style="solid" name="chevron-down" className="size-2.5 opacity-60" />
        </PopoverButton>
        {remove}
      </span>
      <PopoverPanel anchor="bottom start" className={PANEL_CLASS}>
        <FilterValuePanel field={field} values={values} onChange={onChange} onRemove={onRemove} />
      </PopoverPanel>
    </Popover>
  );
}

/**
 * Replaces the twelve-dropdown popover and the separate active-filter row with one line: the
 * filters that are set, plus a button to add another.
 *
 * Nothing is rendered for a filter nobody is using, which is what the grid spent most of its
 * height on — the list page offers twelve and typical use is two or three.
 */
function FilterChipBar({ filters, values, onChange, onRemove, onClear }: FilterChipBarProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  // Which field the "add filter" menu drilled into. Reset every time the menu button is clicked,
  // so the menu always opens on the field list.
  const [pending, setPending] = useState<FilterField | null>(null);

  const active = filters.filter(f => isFieldActive(values, f));
  const available = filters.filter(f => !f.hidden && !isFieldActive(values, f));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.map(field => (
        <FilterChip
          key={field.key}
          field={field}
          values={values}
          onChange={onChange}
          onRemove={onRemove}
        />
      ))}

      {available.length > 0 && (
        <Popover className="relative">
          <PopoverButton
            onClick={() => setPending(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-600 outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Icon style="solid" name="plus" className="size-2.5" />
            {t('appraisal:list.filters.add')}
          </PopoverButton>
          <PopoverPanel anchor="bottom start" className={PANEL_CLASS}>
            {pending ? (
              <FilterValuePanel
                field={pending}
                values={values}
                onChange={onChange}
                onRemove={onRemove}
                onBack={() => setPending(null)}
              />
            ) : (
              <div className="w-56 max-h-72 overflow-y-auto -mx-1">
                {FILTER_GROUPS.map((group: FilterGroup) => {
                  const fields = available.filter(f => f.group === group);
                  if (fields.length === 0) return null;
                  return (
                    <div key={group}>
                      <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        {t(`appraisal:list.filters.groups.${group}`)}
                      </p>
                      {fields.map(field => (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => setPending(field)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </PopoverPanel>
        </Popover>
      )}

      {active.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-500 underline hover:text-gray-700"
        >
          {t('appraisal:list.clearAll')}
        </button>
      )}
    </div>
  );
}

export default FilterChipBar;
