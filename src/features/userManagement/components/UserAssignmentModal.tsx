import { useState, useMemo, useEffect } from 'react';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { useGetUsers } from '../api/users';
import type { RoleUser, RoleScope } from '../types';

interface UserAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userIds: string[]) => void;
  currentUsers: RoleUser[];
  scope: RoleScope;
  isSaving: boolean;
  title?: string;
}

const UserAssignmentModal = ({
  isOpen,
  onClose,
  onSave,
  currentUsers,
  scope,
  isSaving,
  title = 'Assign Users',
}: UserAssignmentModalProps) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(currentUsers.map(u => u.id)),
  );

  // Reset to current users each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(currentUsers.map(u => u.id)));
      setSearch('');
    }
  }, [isOpen]);

  const { data, isLoading } = useGetUsers({ scope, pageSize: 200 });
  const allUsers = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.userName ?? '').toLowerCase().includes(q),
    );
  }, [allUsers, search]);

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

  const getDisplayName = (firstName: string, lastName: string, userName: string) =>
    `${firstName} ${lastName}`.trim() || userName;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
    >
      <div className="flex flex-col gap-4 p-6">
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
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Selected user badges */}
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selected).map(id => {
              const u = allUsers.find(u => u.id === id);
              const label = u
                ? getDisplayName(u.firstName, u.lastName, u.userName)
                : id;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="hover:text-primary/70 leading-none"
                    aria-label={`Remove ${label}`}
                  >
                    <Icon name="xmark" style="solid" className="size-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="text-xs text-gray-400">
          {selected.size} user{selected.size !== 1 ? 's' : ''} selected
        </div>

        {/* User list */}
        <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              <Icon name="spinner" style="solid" className="size-4 animate-spin mr-2" />
              Loading users...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No users found</div>
          ) : (
            filtered.map(u => (
              <label
                key={u.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => toggle(u.id)}
                  className="rounded border-gray-300 text-primary focus:ring-primary/30"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {getDisplayName(u.firstName, u.lastName, u.userName)}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{u.email}</div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSave}>
            Save Users
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserAssignmentModal;
