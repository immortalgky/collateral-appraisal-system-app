import { useState, useMemo } from 'react';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { useGetPermissions } from '../api/permissions';
import type { RolePermission } from '../types';

interface PermissionAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (permissionIds: string[]) => void;
  currentPermissions: RolePermission[];
  isSaving: boolean;
}

const PermissionAssignmentModal = ({
  isOpen,
  onClose,
  onSave,
  currentPermissions,
  isSaving,
}: PermissionAssignmentModalProps) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(currentPermissions.map(p => p.permissionId)),
  );

  // Reset selection when modal opens with new permissions
  const handleOpen = () => {
    setSelected(new Set(currentPermissions.map(p => p.permissionId)));
    setSearch('');
  };

  // Fetch all permissions (large page size — permissions are not expected to be huge)
  const { data, isLoading } = useGetPermissions({ pageSize: 200 });
  const allPermissions = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allPermissions;
    return allPermissions.filter(
      p =>
        p.permissionCode.toLowerCase().includes(q) ||
        p.displayName.toLowerCase().includes(q) ||
        p.module.toLowerCase().includes(q),
    );
  }, [allPermissions, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selected));
  };

  // Group by module
  const byModule = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const p of filtered) {
      if (!map.has(p.module)) map.set(p.module, []);
      map.get(p.module)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Permissions"
      size="lg"
      key={isOpen ? 'open' : 'closed'}
    >
      <div className="flex flex-col gap-4 p-6" onLoad={handleOpen}>
        {/* Search */}
        <div className="relative">
          <Icon
            name="magnifying-glass"
            style="regular"
            className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search permissions..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="text-xs text-gray-400">
          {selected.size} permission{selected.size !== 1 ? 's' : ''} selected
        </div>

        {/* Permission list grouped by module */}
        <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              <Icon name="spinner" style="solid" className="size-4 animate-spin mr-2" />
              Loading permissions...
            </div>
          ) : byModule.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No permissions found</div>
          ) : (
            byModule.map(([module, perms]) => (
              <div key={module}>
                <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky top-0">
                  {module}
                </div>
                {perms.map(p => (
                  <label
                    key={p.id}
                    className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary/30"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800">{p.displayName}</div>
                      <code className="text-xs text-gray-400">{p.permissionCode}</code>
                    </div>
                  </label>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSave}>
            Save Permissions
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PermissionAssignmentModal;
