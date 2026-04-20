import { useMemo } from 'react';
import { useAddressStore } from '@/shared/store';
import Autocomplete from './Autocomplete';

interface ProvinceAutocompleteProps {
  /** Province code (e.g. "10"). Submitted value sent to backend. */
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}

function ProvinceAutocomplete({
  value,
  onChange,
  placeholder = 'All provinces',
}: ProvinceAutocompleteProps) {
  const titleAddresses = useAddressStore(s => s.titleAddresses);
  const dopaAddresses = useAddressStore(s => s.dopaAddresses);

  const items = useMemo(() => {
    const all = [...titleAddresses, ...dopaAddresses];
    const seen = new Map<string, string>();
    for (const addr of all) {
      if (!seen.has(addr.provinceCode)) {
        seen.set(addr.provinceCode, addr.provinceName);
      }
    }
    return Array.from(seen.entries())
      .map(([code, name]) => ({ value: code, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'th'));
  }, [titleAddresses, dopaAddresses]);

  const displayText = items.find(p => p.value === value)?.label;

  return (
    <Autocomplete
      items={items}
      value={value}
      onChange={onChange}
      displayText={displayText}
      placeholder={placeholder}
      ariaLabel={placeholder}
      showAllOnFocus
      filterItems={(item, text) =>
        item.label.toLocaleLowerCase('th').includes(text.toLocaleLowerCase('th'))
      }
    />
  );
}

export default ProvinceAutocomplete;
