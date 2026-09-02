import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { Checkbox, DateRangeInput, TextInput } from '@/shared/components/inputs';
import type { FilterField } from './tabConfigs';
import {
  BIG_FROM,
  LIST_CAP,
  SEARCHABLE_FROM,
  selectedValues,
  useFilterFieldOptions,
} from './filterOptions';

interface FilterValuePanelProps {
  field: FilterField;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Drops the key entirely. Writing '' instead would leave `?status=` behind in the URL. */
  onRemove: (key: string) => void;
  /** Rendered as a back arrow when the panel was reached through the "add filter" menu. */
  onBack?: () => void;
}

/**
 * The values of ONE filter, multi-select.
 *
 * This is the half of the old bar that actually needed replacing: `Dropdown` holds a single value,
 * so a quick view setting `slaStatus=AtRisk,Breached` had nowhere to put the second value and the
 * bar fell back to a read-only chip. Values are still stored comma-joined in the same
 * `Record<string,string>`, so the URL whitelist, saved searches and the backend's IN-list filters
 * are untouched.
 */
function FilterValuePanel({ field, values, onChange, onRemove, onBack }: FilterValuePanelProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  const options = useFilterFieldOptions(field);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => selectedValues(values, field.key), [values, field.key]);

  const searchable = options.length >= SEARCHABLE_FROM;
  const isBig = options.length >= BIG_FROM;

  const { visible, pinned } = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('th');
    const matched = q
      ? options.filter(o => o.label.toLocaleLowerCase('th').includes(q))
      : // Selected first on a long list: the whole list cannot be on screen at once, and a value
        // the user just ticked scrolling out of sight reads as "it did not register".
        options;
    const ordered = isBig
      ? [...matched].sort(
          (a, b) => Number(selected.includes(b.value)) - Number(selected.includes(a.value)),
        )
      : matched;
    const shown = isBig && !q ? ordered.slice(0, LIST_CAP) : ordered;
    return {
      visible: shown,
      // A selected value filtered out by the search still has to be removable.
      pinned: selected.filter(v => !shown.some(o => o.value === v)),
    };
  }, [options, query, isBig, selected]);

  const labelFor = (value: string) => options.find(o => o.value === value)?.label ?? value;

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    // Emptying the selection writes '' rather than removing the key. Removing it made the chip
    // inactive, and the chip IS the popover being clicked in — unticking the last value to pick a
    // different one closed the panel under the cursor. The X on the chip is what removes it.
    onChange(field.key, next.join(','));
  };

  const clear = () => {
    if (field.type === 'date-range') {
      if (field.fromKey) onRemove(field.fromKey);
      if (field.toKey) onRemove(field.toKey);
      return;
    }
    onRemove(field.key);
  };

  const hasValue =
    field.type === 'date-range'
      ? Boolean(values[field.fromKey ?? ''] || values[field.toKey ?? ''])
      : Boolean(values[field.key]);

  const header = (
    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common:actions.back')}
          className="text-gray-400 hover:text-gray-600"
        >
          <Icon style="solid" name="arrow-left" className="size-3" />
        </button>
      )}
      <span className="text-sm font-medium text-gray-900">{field.label}</span>
      {hasValue && (
        <button
          type="button"
          onClick={clear}
          className="ml-auto text-xs text-gray-500 hover:text-gray-700"
        >
          {t('common:actions.clear')}
        </button>
      )}
    </div>
  );

  if (field.type === 'date-range') {
    return (
      <div className="w-64 flex flex-col gap-2">
        {header}
        <DateRangeInput
          from={values[field.fromKey ?? ''] || ''}
          to={values[field.toKey ?? ''] || ''}
          onChange={(from, to) => {
            // Two sequential calls are safe: the page's setFilters uses a functional updater, so
            // the second does not clobber the first.
            if (field.fromKey) onChange(field.fromKey, from);
            if (field.toKey) onChange(field.toKey, to);
          }}
          placeholder={field.label}
        />
      </div>
    );
  }

  // Free text is decided by TYPE, never by "the option list came back empty". Province, company
  // and every parameter-backed field read from a store that Layout hydrates after first paint (and
  // that stays empty if the fetch fails) — so `options.length === 0` also means "not loaded yet".
  // Treating that as free text handed the user a box that writes ?province=สงขลา, a NAME where the
  // backend compares CODES: zero rows, and a chip that looks like a working filter.
  if (field.type === 'text') {
    return (
      <div className="w-64 flex flex-col gap-2">
        {header}
        <TextInput
          value={values[field.key] || ''}
          onChange={e => onChange(field.key, e.target.value)}
          placeholder={field.placeholder || field.label}
        />
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="w-64 flex flex-col gap-2">
        {header}
        <p className="px-2 py-4 text-center text-xs text-gray-400">
          {t('appraisal:list.filters.optionsUnavailable')}
        </p>
      </div>
    );
  }

  return (
    <div className="w-64 flex flex-col gap-2">
      {header}

      {searchable && (
        <TextInput
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('appraisal:list.filters.searchIn', { label: field.label })}
          aria-label={t('appraisal:list.filters.searchIn', { label: field.label })}
          leftIcon={<Icon style="solid" name="magnifying-glass" className="size-3 text-gray-400" />}
        />
      )}

      {pinned.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pinned.map(value => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
            >
              {labelFor(value)}
              <button
                type="button"
                onClick={() => toggle(value)}
                aria-label={t('appraisal:list.removeFilter') + ': ' + labelFor(value)}
                className="opacity-60 hover:opacity-100"
              >
                <Icon style="solid" name="xmark" className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="max-h-56 overflow-y-auto -mx-1">
        {visible.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-gray-400">
            {t('appraisal:list.filters.noMatch')}
          </p>
        ) : (
          visible.map(option => (
            <div key={option.value} className="rounded-lg px-2 py-1.5 hover:bg-gray-50">
              <Checkbox
                size="sm"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
                label={option.label}
              />
            </div>
          ))
        )}
      </div>

      {isBig && (
        <p className="flex justify-between gap-2 border-t border-gray-100 pt-1.5 text-[11px] text-gray-400">
          <span>
            {t('appraisal:list.filters.showingOf', {
              shown: visible.length,
              total: options.length,
            })}
          </span>
          {!query && <span>{t('appraisal:list.filters.typeToFind')}</span>}
        </p>
      )}
    </div>
  );
}

export default FilterValuePanel;
