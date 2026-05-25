import { useMemo, useState } from 'react';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useGetUsers } from '@features/userManagement/api/users';
import Autocomplete from '@shared/components/inputs/Autocomplete';

interface PicAutocompleteProps {
  /**
   * The committed value — a full display name ("First Last") matching what the
   * PIC column stores (`COALESCE(CONCAT(FirstName, ' ', LastName), AssignedTo)`).
   * Empty string means nothing selected.
   */
  value: string;
  onChange: (displayName: string) => void;
  placeholder?: string;
  /**
   * User scope to restrict the lookup.
   * 'Bank' for internal tasks (default), 'Company' for external appraisal-company tasks.
   * Omit to search across all users.
   */
  scope?: 'Bank' | 'Company';
}

/**
 * Autocomplete for PIC filters.
 *
 * The BE `pic` query param is a LIKE match against the PIC column which stores
 * the user's full display name (FirstName + ' ' + LastName). So we commit the
 * display name as the value, while showing "First Last (username)" as the label
 * so the operator knows exactly who they've picked.
 */
function PicAutocomplete({ value, onChange, placeholder = 'All PIC', scope = 'Bank' }: PicAutocompleteProps) {
  const [inputText, setInputText] = useState('');
  const debouncedSearch = useDebounce(inputText, 300);

  const { data, isFetching } = useGetUsers({
    scope,
    search: debouncedSearch || undefined,
    pageSize: 20,
  });

  const items = useMemo(
    () =>
      (data?.items ?? []).map(u => ({
        value: `${u.firstName} ${u.lastName}`.trim(),
        label: `${u.firstName} ${u.lastName} (${u.username})`,
      })),
    [data],
  );

  return (
    <Autocomplete
      items={items}
      value={value}
      displayText={value || undefined}
      onChange={onChange}
      onInputChange={setInputText}
      isLoading={isFetching}
      placeholder={placeholder}
      ariaLabel="Filter by PIC"
    />
  );
}

export default PicAutocomplete;
