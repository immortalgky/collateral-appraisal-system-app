import type { FilterField } from './tabConfigs';
import Icon from '@/shared/components/Icon';

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
        switch (filter.type) {
          case 'select':
            return (
              <select
                key={filter.key}
                value={values[filter.key] || ''}
                onChange={e => onChange(filter.key, e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white"
              >
                <option value="">{filter.placeholder || filter.label}</option>
                {filter.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            );
          case 'date':
            return (
              <div key={filter.key} className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">{filter.label}</label>
                <input
                  type="date"
                  value={values[filter.key] || ''}
                  onChange={e => onChange(filter.key, e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white"
                />
              </div>
            );
          case 'text':
            return (
              <input
                key={filter.key}
                type="text"
                value={values[filter.key] || ''}
                onChange={e => onChange(filter.key, e.target.value)}
                placeholder={filter.placeholder || filter.label}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-white max-w-[200px]"
              />
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
