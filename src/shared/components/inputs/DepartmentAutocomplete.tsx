import { useMemo, useState } from 'react';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSearchDepartments } from '@shared/api/departments';
import Autocomplete from '@shared/components/inputs/Autocomplete';

interface DepartmentAutocompleteProps {
  /** Selected department code. This is the value bound to the backend filter. */
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}

/**
 * Autocomplete for department filters — searches departments and commits the
 * department code. Modeled on UserAutocomplete.
 */
function DepartmentAutocomplete({
  value,
  onChange,
  placeholder = 'Search department...',
}: DepartmentAutocompleteProps) {
  const [inputText, setInputText] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const debouncedSearch = useDebounce(inputText, 300);

  const { data: departments, isFetching: departmentsFetching } =
    useSearchDepartments(debouncedSearch);

  const items = useMemo(() => {
    return (departments ?? []).map(d => ({
      value: d.code,
      label: d.description ? `${d.code} - ${d.description}` : d.code,
    }));
  }, [departments]);

  return (
    <Autocomplete
      items={items}
      value={value}
      // Only offer a label while a value is actually selected — otherwise clearing the
      // filter from its chip (value -> '') would leave the last label in the box.
      displayText={value ? selectedLabel || value : undefined}
      onChange={v => {
        if (!v) {
          setSelectedLabel('');
          onChange('');
          return;
        }
        const label = items.find(i => i.value === v)?.label ?? v;
        setSelectedLabel(label);
        onChange(v);
      }}
      onInputChange={setInputText}
      isLoading={departmentsFetching}
      placeholder={placeholder}
      ariaLabel={placeholder}
      // The empty-search query returns a browsable list, so opening on focus is useful here
      // (unlike the user/AO pickers, whose sources require a search term).
      showAllOnFocus
    />
  );
}

export default DepartmentAutocomplete;
