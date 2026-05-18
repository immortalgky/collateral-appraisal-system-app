import { useEffect, useMemo, useState } from 'react';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Dropdown from '@shared/components/inputs/Dropdown';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useMonitorFilterOptions } from '../api/taskMonitor';

export interface PersonTasksFilterValues {
  search?: string;
  appraisalStatus?: string;
  taskType?: string;
}

interface PersonTasksFilterProps {
  value: PersonTasksFilterValues;
  onChange: (next: PersonTasksFilterValues) => void;
}

const EMPTY: PersonTasksFilterValues = {};

function hasAnyFilter(v: PersonTasksFilterValues): boolean {
  return Boolean(v.search || v.appraisalStatus || v.taskType);
}

function PersonTasksFilter({ value, onChange }: PersonTasksFilterProps) {
  // Local state for the text input — debounced so we don't refetch every keystroke
  const [search, setSearch] = useState(value.search ?? '');
  const debouncedSearch = useDebounce(search, 400);

  // Keep local state in sync if parent resets externally (Clear)
  useEffect(() => {
    setSearch(value.search ?? '');
  }, [value.search]);

  // Propagate debounced search up
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed !== (value.search ?? '')) {
      onChange({ ...value, search: trimmed || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const { data: options } = useMonitorFilterOptions();
  const statusOptions = useMemo(
    () =>
      (options?.appraisalStatuses ?? []).map(s => ({
        value: s,
        label: s.replace(/([a-z])([A-Z])/g, '$1 $2'),
      })),
    [options?.appraisalStatuses],
  );
  const taskTypeOptions = useMemo(
    () => (options?.taskTypes ?? []).map(t => ({ value: t, label: t })),
    [options?.taskTypes],
  );

  const handleClear = () => {
    setSearch('');
    onChange(EMPTY);
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40';

  const isFiltered = hasAnyFilter(value);

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Combined search: Appraisal Number / Customer Name (server-side LIKE on both) */}
      <div className="flex-1 min-w-[220px]">
        <label htmlFor="filter-search" className="block text-[11px] font-medium text-gray-500 mb-1">
          Search
        </label>
        <div className="relative">
          <Icon
            style="solid"
            name="magnifying-glass"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
          />
          <input
            id="filter-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Appraisal number or customer name..."
            className={`${inputClass} pl-9`}
          />
        </div>
      </div>

      <div className="flex-1 min-w-[180px]">
        <Dropdown
          label="Status"
          value={value.appraisalStatus ?? ''}
          onChange={(v: string | null) => onChange({ ...value, appraisalStatus: v ?? undefined })}
          options={statusOptions}
          placeholder="Please Select"
          showValuePrefix={false}
        />
      </div>

      <div className="flex-1 min-w-[180px]">
        <Dropdown
          label="Task Type"
          value={value.taskType ?? ''}
          onChange={(v: string | null) => onChange({ ...value, taskType: v ?? undefined })}
          options={taskTypeOptions}
          placeholder="Please Select"
          showValuePrefix={false}
        />
      </div>

      {isFiltered && (
        <div className="shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}

export default PersonTasksFilter;
