import { useTranslation } from 'react-i18next';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import type { FilterField } from './tabConfigs';
import Icon from '@/shared/components/Icon';
import ProvinceAutocomplete from '@/shared/components/inputs/ProvinceAutocomplete';
import CompanyAutocomplete from '@/shared/components/inputs/CompanyAutocomplete';
import { Dropdown, DateInput, DateRangeInput, TextInput } from '@/shared/components/inputs';

/**
 * DateInput emits a full ISO timestamp with a timezone offset (e.g.
 * "2020-04-03T00:00:00+07:00"). Keep only the calendar date (yyyy-MM-dd) so the backend's
 * date comparison can't shift by a day across timezones.
 */
const toDateOnly = (v: string | null): string => (v ? v.slice(0, 10) : '');

/**
 * Fixed width per control, used when the bar is NOT collapsible — the modal renders a handful of
 * fields inline and a grid there would leave gaps. (Shared inputs render w-full.)
 */
const FIELD_WIDTH = 'w-44';

/**
 * Collapsible mode lays the controls out on a grid instead of a wrapping flex row.
 *
 * With `flex-wrap` + fixed widths, a row's controls only line up by accident: the moment one field
 * is wider than the rest (a date range needs room for two dates and an arrow) every row below it
 * starts at a different offset and the block reads as ragged. A grid gives every control the same
 * column, and the wide ones simply span two.
 */
const FIELD_GRID = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3';

/** Non-collapsible mode: a range shows two dates and an arrow, so it needs more than FIELD_WIDTH. */
const RANGE_FIELD_WIDTH = 'w-60';

interface SearchFilterBarProps {
  filters: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  /**
   * Fold the controls behind a toggle, collapsed until the user opens them.
   *
   * Opt-in: without it this renders exactly as it always has. SearchAppraisalModal passes a
   * handful of fields and wants them on screen; the appraisal list passes twelve and was spending
   * three rows on them before any data was visible.
   */
  collapsible?: boolean;
}

function SearchFilterBar({
  filters,
  values,
  onChange,
  onClear,
  collapsible = false,
}: SearchFilterBarProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  const hasActiveFilters = Object.values(values).some(v => v !== '');

  /**
   * Counted over the VALUES, not the rendered controls, so a filter a quick view set on a hidden
   * key still shows up. A collapsed bar that reads "Filters" with no number while the list is
   * quietly filtered is the thing worth avoiding here.
   */
  const activeCount = Object.values(values).filter(v => v !== '' && v !== undefined).length;

  const fields = (
    <div className={collapsible ? FIELD_GRID : 'flex items-center gap-3 flex-wrap'}>
      {filters.map(filter => {
        // Accepted from the URL and given a chip by the caller, but never drawn.
        if (filter.hidden) return null;
        const value = values[filter.key] || '';
        const placeholder = filter.placeholder || filter.label;

        // Quick views set several values at once ("AtRisk,Breached"). Dropdown holds a single
        // value, finds no option matching the joined string, and falls back to its placeholder —
        // so a filtered list read "All SLA statuses" while quietly showing a subset. Render a
        // read-only summary chip instead of a control that misreports its own state.
        // Only for the option-backed types. A 'text' filter may legitimately contain a comma
        // ("Smith, John"), and treating that as a multi-select would replace the input with a
        // read-only chip the user cannot edit out of.
        const isOptionField = filter.type === 'select' || filter.type === 'parameter-select';
        const multiValues =
          isOptionField && value.includes(',') ? value.split(',').filter(Boolean) : null;
        if (multiValues) {
          const labelFor = (v: string) => filter.options?.find(o => o.value === v)?.label ?? v;
          return (
            <div key={filter.key} className={collapsible ? '' : `${FIELD_WIDTH} shrink-0`}>
              <button
                type="button"
                onClick={() => onChange(filter.key, '')}
                title={multiValues.map(labelFor).join(', ')}
                className="w-full inline-flex items-center justify-between gap-1 px-3 py-2 text-sm text-left bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100"
              >
                <span className="truncate">
                  {t('appraisal:list.filters.multiSelected', {
                    count: multiValues.length,
                    label: filter.label,
                  })}
                </span>
                <Icon style="solid" name="xmark" className="size-3 shrink-0 text-gray-500" />
              </button>
            </div>
          );
        }

        switch (filter.type) {
          // Static option list (domain enums such as status / appraisalType).
          case 'select':
            return (
              <div key={filter.key} className={collapsible ? '' : FIELD_WIDTH}>
                <Dropdown
                  options={filter.options ?? []}
                  value={value}
                  onChange={v => onChange(filter.key, v ?? '')}
                  placeholder={placeholder}
                  // Values are internal enums — showing "New - New" would be noise
                  showValuePrefix={false}
                />
              </div>
            );
          // Options come from a master-data parameter group; Dropdown resolves the group itself.
          case 'parameter-select':
            return (
              <div key={filter.key} className={collapsible ? '' : FIELD_WIDTH}>
                <Dropdown
                  group={filter.parameterGroup ?? ''}
                  value={value}
                  onChange={v => onChange(filter.key, v ?? '')}
                  placeholder={placeholder}
                  // Retired codes stay filterable via the URL but aren't offered here
                  filterOptions={{ type: 'isActive', values: true }}
                  showValuePrefix={false}
                />
              </div>
            );
          // One control writing two backend keys. Two sequential onChange calls are safe: the
          // page's setFilters uses a functional updater, so the second does not clobber the first.
          case 'date-range':
            return (
              <div
                key={filter.key}
                className={collapsible ? 'col-span-1 sm:col-span-2' : RANGE_FIELD_WIDTH}
              >
                <DateRangeInput
                  from={values[filter.fromKey ?? ''] || ''}
                  to={values[filter.toKey ?? ''] || ''}
                  onChange={(from, to) => {
                    if (filter.fromKey) onChange(filter.fromKey, from);
                    if (filter.toKey) onChange(filter.toKey, to);
                  }}
                  placeholder={filter.label}
                />
              </div>
            );
          case 'date':
            return (
              <div key={filter.key} className={collapsible ? '' : FIELD_WIDTH}>
                {/* No label — the placeholder already reads "Created From", and a label above
                    would duplicate it and push this control out of line with the dropdowns. */}
                <DateInput
                  placeholder={placeholder}
                  value={value || null}
                  onChange={v => onChange(filter.key, toDateOnly(v))}
                />
              </div>
            );
          case 'text':
            return (
              <div key={filter.key} className={collapsible ? '' : FIELD_WIDTH}>
                <TextInput
                  value={value}
                  onChange={e => onChange(filter.key, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            );
          case 'province-autocomplete':
            return (
              <div key={filter.key} className={collapsible ? '' : FIELD_WIDTH}>
                <ProvinceAutocomplete
                  value={value}
                  onChange={v => onChange(filter.key, v)}
                  placeholder={filter.placeholder}
                />
              </div>
            );
          case 'company-autocomplete':
            return (
              <div key={filter.key} className={collapsible ? '' : FIELD_WIDTH}>
                <CompanyAutocomplete
                  value={value}
                  onChange={v => onChange(filter.key, v)}
                  placeholder={filter.placeholder}
                />
              </div>
            );
          default:
            return null;
        }
      })}

      {/* In collapsible mode this button is dropped: ActiveFilterChips already renders a
          "Clear all" that sits OUTSIDE the folded section, so it stays reachable while this one
          would hide with the controls — two buttons doing the same thing, one of them missing
          exactly when it is needed. */}
      {hasActiveFilters && !collapsible && (
        <button
          onClick={onClear}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <Icon style="solid" name="xmark" className="size-3" />
          {t('appraisal:list.filters.clearFilters')}
        </button>
      )}
    </div>
  );

  if (!collapsible) return fields;

  return (
    <Popover className="relative shrink-0">
      {({ open }) => (
        <>
          {/* Styled as a control, not a text link: it now sits between the search pill and the
              column picker, and h-full lets a flex row with items-stretch line all three up. */}
          <PopoverButton
            className={`inline-flex h-full items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
              activeCount > 0
                ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <Icon style="solid" name="filter" className="size-3.5" />
            {t('appraisal:list.filters.toggle')}
            {activeCount > 0 && (
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold leading-none text-white">
                {activeCount}
              </span>
            )}
            <Icon
              style="solid"
              name={open ? 'chevron-up' : 'chevron-down'}
              className="size-3 text-gray-400"
            />
          </PopoverButton>

          {/* Floating rather than inline: expanded in place the controls took two full-width rows
              and pushed the table down every time. A panel leaves the page height alone, and
              because it does not cover the table the list can still be watched while filters are
              adjusted — which is why this is a popover and not the modal the task list uses.
              Portalled by `anchor`, so the page's overflow-x-hidden does not clip it. */}
          {/* The date picker's calendar is an absolutely positioned div inside this panel, not a
              portal, so a scrolling panel clips it — the calendar opened and was cut off at the
              panel's edge.
              `anchor` makes HeadlessUI write max-height and overflow as INLINE styles, which a
              plain utility class cannot beat, hence the trailing `!`. The panel is four rows tall
              and never needed to scroll in the first place. */}
          <PopoverPanel
            anchor="bottom start"
            className="z-50 mt-1.5 w-[min(90vw,44rem)] max-h-none! overflow-visible! rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
          >
            {fields}
            {hasActiveFilters && (
              <div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
                <button
                  onClick={onClear}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  <Icon style="solid" name="xmark" className="size-3" />
                  {t('appraisal:list.filters.clearFilters')}
                </button>
              </div>
            )}
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
}

export default SearchFilterBar;
