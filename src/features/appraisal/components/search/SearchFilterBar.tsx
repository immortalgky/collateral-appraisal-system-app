import { useTranslation } from 'react-i18next';
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

/** Fixed width per control — the caller renders a handful of fields inline. (Shared inputs are w-full.) */
const FIELD_WIDTH = 'w-44';

/** A range shows two dates and an arrow, so it needs more than FIELD_WIDTH. */
const RANGE_FIELD_WIDTH = 'w-60';

interface SearchFilterBarProps {
  filters: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}

/**
 * A row of single-value filter controls.
 *
 * The appraisal list no longer uses this — it renders FilterChipBar, which multi-selects. This is
 * what SearchAppraisalModal (copy from a previous appraisal) needs: two date fields, always on
 * screen, no popover.
 */
function SearchFilterBar({ filters, values, onChange, onClear }: SearchFilterBarProps) {
  const { t } = useTranslation(['appraisal', 'common']);
  const hasActiveFilters = Object.values(values).some(v => v !== '');

  return (
    <div className="flex items-center gap-3 flex-wrap">
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
            <div key={filter.key} className={`${FIELD_WIDTH} shrink-0`}>
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
              <div key={filter.key} className={FIELD_WIDTH}>
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
              <div key={filter.key} className={FIELD_WIDTH}>
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
              <div key={filter.key} className={RANGE_FIELD_WIDTH}>
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
              <div key={filter.key} className={FIELD_WIDTH}>
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
              <div key={filter.key} className={FIELD_WIDTH}>
                <TextInput
                  value={value}
                  onChange={e => onChange(filter.key, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            );
          case 'province-autocomplete':
            return (
              <div key={filter.key} className={FIELD_WIDTH}>
                <ProvinceAutocomplete
                  value={value}
                  onChange={v => onChange(filter.key, v)}
                  placeholder={filter.placeholder}
                />
              </div>
            );
          case 'company-autocomplete':
            return (
              <div key={filter.key} className={FIELD_WIDTH}>
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

      {hasActiveFilters && (
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
}

export default SearchFilterBar;
