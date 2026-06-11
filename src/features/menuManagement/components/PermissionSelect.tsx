import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Autocomplete, { type AutocompleteItem } from '@shared/components/inputs/Autocomplete';
import { useGetPermissions } from '@features/userManagement/api/permissions';

interface PermissionSelectProps {
  value: string;
  onChange: (code: string) => void;
  /** Overrides the translated search placeholder when provided */
  placeholder?: string;
  /** Placeholder shown for an optional permission (e.g. "None (read-only)") */
  emptyLabel?: string;
  allowEmpty?: boolean;
}

/**
 * Type-ahead autocomplete populated from GET /auth/permissions.
 * Returns the permissionCode string (not the permission ID); '' clears it.
 */
export function PermissionSelect({
  value,
  onChange,
  placeholder,
  emptyLabel,
  allowEmpty = false,
}: PermissionSelectProps) {
  const { t } = useTranslation('menuManagement');
  const { data, isLoading } = useGetPermissions({ pageSize: 500 });

  const items: AutocompleteItem[] = useMemo(
    () =>
      (data?.items ?? []).map(p => ({
        value: p.permissionCode,
        label: `${p.permissionCode} — ${p.displayName}`,
      })),
    [data],
  );

  const displayText = useMemo(
    () => items.find(i => i.value === value)?.label ?? value,
    [items, value],
  );

  const resolvedPlaceholder =
    placeholder ??
    (allowEmpty
      ? (emptyLabel ?? t('permissionSelect.editPermissionEmpty'))
      : t('permissionSelect.searchPlaceholder'));

  return (
    <Autocomplete
      items={items}
      value={value}
      onChange={onChange}
      displayText={value ? displayText : undefined}
      placeholder={resolvedPlaceholder}
      isLoading={isLoading}
      showAllOnFocus
      filterItems={(item, text) => item.label.toLowerCase().includes(text.toLowerCase())}
      ariaLabel={t('permissionSelect.searchPlaceholder')}
      menuClassName="w-full"
    />
  );
}
