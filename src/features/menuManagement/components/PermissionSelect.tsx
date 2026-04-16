import { useState, useMemo } from 'react';
import { useGetPermissions } from '@features/userManagement/api/permissions';

interface PermissionSelectProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
  id?: string;
}

/**
 * Searchable select populated from GET /auth/permissions.
 * Returns the permissionCode string (not the permission ID).
 */
export function PermissionSelect({
  value,
  onChange,
  placeholder = 'Select permission...',
  allowEmpty = false,
  disabled = false,
  id,
}: PermissionSelectProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetPermissions({ pageSize: 200 });

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    if (!search) return items;
    const lower = search.toLowerCase();
    return items.filter(
      p =>
        p.permissionCode.toLowerCase().includes(lower) ||
        p.displayName.toLowerCase().includes(lower),
    );
  }, [data, search]);

  return (
    <div className="space-y-1">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search permissions..."
        disabled={disabled}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || isLoading}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-gray-50"
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        {isLoading && <option disabled>Loading...</option>}
        {filtered.map(p => (
          <option key={p.id} value={p.permissionCode}>
            {p.permissionCode} — {p.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
