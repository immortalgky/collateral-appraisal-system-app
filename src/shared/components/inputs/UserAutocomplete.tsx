import { useMemo, useState } from 'react';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useGetUsers } from '@features/userManagement/api/users';
import Autocomplete from '@shared/components/inputs/Autocomplete';

interface UserAutocompleteProps {
  /** Selected username (usercode). This is the value bound to the backend filter. */
  value: string;
  onChange: (username: string) => void;
  /** 'Bank' = internal bank staff, 'Company' = appraisal-company (external) staff. */
  scope: 'Bank' | 'Company';
  /** Optional: narrow Company-scope results to one appraisal company. */
  companyId?: string;
  placeholder?: string;
}

/**
 * Autocomplete for user (person) filters — searches bank or appraisal-company staff and
 * commits the usercode. Modeled on PicAutocomplete but persons-only, with no composite
 * type-encoded value since there's only one kind of result here.
 */
function UserAutocomplete({
  value,
  onChange,
  scope,
  companyId,
  placeholder = 'Search user...',
}: UserAutocompleteProps) {
  const [inputText, setInputText] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const debouncedSearch = useDebounce(inputText, 300);

  const { data: usersData, isFetching: usersFetching } = useGetUsers({
    scope,
    companyId,
    search: debouncedSearch || undefined,
    pageSize: 20,
  });

  const items = useMemo(() => {
    return (usersData?.items ?? []).map(u => {
      const fullName = `${u.firstName} ${u.lastName}`.trim();
      return {
        value: u.username,
        // Mirror the grid's staff cell format: "usercode - display name".
        label: fullName ? `${u.username} - ${fullName}` : u.username,
      };
    });
  }, [usersData]);

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
      isLoading={usersFetching}
      placeholder={placeholder}
      ariaLabel={placeholder}
    />
  );
}

export default UserAutocomplete;
