import type { FilterField } from './tabConfigs';
import Icon from '@/shared/components/Icon';
import ProvinceAutocomplete from '@/shared/components/inputs/ProvinceAutocomplete';
import CompanyAutocomplete from '@/shared/components/inputs/CompanyAutocomplete';
import { Dropdown, DateInput, TextInput } from '@/shared/components/inputs';

/**
 * DateInput emits a full ISO timestamp with a timezone offset (e.g.
 * "2020-04-03T00:00:00+07:00"). Keep only the calendar date (yyyy-MM-dd) so the backend's
 * date comparison can't shift by a day across timezones.
 */
const toDateOnly = (v: string | null): string => (v ? v.slice(0, 10) : '');

/** Fixed width per control so the wrapping flex row stays aligned (shared inputs render w-full). */
const FIELD_WIDTH = 'w-44';

interface SearchFilterBarProps {
  filters: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
}

function SearchFilterBar({ filters, values, onChange, onClear }: SearchFilterBarProps) {
  const hasActiveFilters = Object.values(values).some(v => v !== '');

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {filters.map(filter => {
        const value = values[filter.key] || '';
        const placeholder = filter.placeholder || filter.label;

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
          Clear filters
        </button>
      )}
    </div>
  );
}

export default SearchFilterBar;
