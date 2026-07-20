import { useMemo, useState } from 'react';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSearchRequestors } from '@features/request/api/requestors';
import Autocomplete from '@shared/components/inputs/Autocomplete';

interface AoCodeAutocompleteProps {
  /** Selected AO code. This is the value bound to the backend filter. */
  value: string;
  onChange: (aoCode: string) => void;
  placeholder?: string;
}

/**
 * Autocomplete for AO (account officer) code filters — searches requestors and commits
 * the AO code. Several requestors can share one AO code, so results are deduplicated.
 * Modeled on UserAutocomplete.
 */
function AoCodeAutocomplete({
  value,
  onChange,
  placeholder = 'Search AO code...',
}: AoCodeAutocompleteProps) {
  const [inputText, setInputText] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const debouncedSearch = useDebounce(inputText, 300);

  const { data: requestors, isFetching: requestorsFetching } =
    useSearchRequestors(debouncedSearch);

  const items = useMemo(() => {
    const seen = new Set<string>();
    const result: { value: string; label: string }[] = [];
    for (const r of requestors ?? []) {
      if (!r.aoCode || seen.has(r.aoCode)) continue;
      seen.add(r.aoCode);
      result.push({ value: r.aoCode, label: `${r.aoCode} - ${r.name}` });
    }
    return result;
  }, [requestors]);

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
      isLoading={requestorsFetching}
      placeholder={placeholder}
      ariaLabel={placeholder}
    />
  );
}

export default AoCodeAutocomplete;
