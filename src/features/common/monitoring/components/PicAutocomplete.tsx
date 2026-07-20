import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useGetUsers } from '@features/userManagement/api/users';
import { useGetGroups } from '@features/userManagement/api/groups';
import Autocomplete from '@shared/components/inputs/Autocomplete';

interface PicAutocompleteProps {
  /**
   * The committed PIC key — a person's usercode or a workflow group's name,
   * matching the view's stable `AssignedTo` column. Empty string = nothing selected.
   */
  pic: string;
  /** Assignee type of the committed value: '1' = person, '2' = group, '' = none. */
  picType: string;
  /** Called with the selected (key, type, displayLabel), or ('', '', '') on clear. */
  onChange: (pic: string, picType: string, label: string) => void;
  placeholder?: string;
  /**
   * Scope for both lookups. 'Bank' for internal tasks (default), 'Company' for
   * external appraisal-company tasks.
   */
  scope?: 'Bank' | 'Company';
}

/**
 * Autocomplete for PIC filters that searches both persons and workflow assignment
 * groups, split into two sections. Each option's value encodes the assignee type
 * so the committed key can't collide across the two sources:
 *   `1|<usercode>` for a person, `2|<groupName>` for a group.
 * The BE matches this key exactly on `AssignedTo` (+ `AssignedType`).
 */
function PicAutocomplete({
  pic,
  picType,
  onChange,
  placeholder = 'All PIC',
  scope = 'Bank',
}: PicAutocompleteProps) {
  const { t } = useTranslation('monitoring');
  const [inputText, setInputText] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const debouncedSearch = useDebounce(inputText, 300);

  const { data: usersData, isFetching: usersFetching } = useGetUsers({
    scope,
    search: debouncedSearch || undefined,
    pageSize: 20,
  });

  const { data: groupsData, isFetching: groupsFetching } = useGetGroups({
    scope,
    search: debouncedSearch || undefined,
    pageSize: 20,
  });

  const items = useMemo(() => {
    const persons = (usersData?.items ?? []).map(u => {
      const fullName = `${u.firstName} ${u.lastName}`.trim();
      return {
        value: `1|${u.username}`,
        // Mirror the grid's PIC cell format: "usercode - display name".
        label: fullName ? `${u.username} - ${fullName}` : u.username,
        group: t('common.picPersons'),
      };
    });
    const groups = (groupsData?.items ?? []).map(g => ({
      value: `2|${g.name}`,
      // Mirror the grid's PIC cell format: "group name - description".
      label: g.description ? `${g.name} - ${g.description}` : g.name,
      group: t('common.picGroups'),
    }));
    return [...persons, ...groups];
  }, [usersData, groupsData, t]);

  const composite = pic ? `${picType}|${pic}` : '';

  return (
    <Autocomplete
      items={items}
      value={composite}
      displayText={selectedLabel || undefined}
      onChange={v => {
        if (!v) {
          setSelectedLabel('');
          onChange('', '', '');
          return;
        }
        const sep = v.indexOf('|');
        const type = v.slice(0, sep);
        const key = v.slice(sep + 1);
        const label = items.find(i => i.value === v)?.label ?? key;
        setSelectedLabel(label);
        onChange(key, type, label);
      }}
      onInputChange={setInputText}
      isLoading={usersFetching || groupsFetching}
      showAllOnFocus
      placeholder={placeholder}
      ariaLabel="Filter by PIC"
      menuClassName="w-80"
    />
  );
}

export default PicAutocomplete;
