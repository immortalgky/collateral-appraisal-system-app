import { useState, useMemo } from 'react';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import type { RoleUser } from '../types';

interface UserAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userIds: string[]) => void;
  currentUsers: RoleUser[];
  /** All available users to pick from. Parent fetches and passes these. */
  availableUsers: RoleUser[];
  isLoadingUsers: boolean;
  isSaving: boolean;
  title?: string;
}

const UserAssignmentModal = ({
  isOpen,
  onClose,
  onSave,
  currentUsers,
  availableUsers,
  isLoadingUsers,
  isSaving,
  title = 'Assign Users',
}: UserAssignmentModalProps) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(currentUsers.map(u => u.id)),
  );

  // Sync selection when modal re-opens with fresh currentUsers
  const handleOpen = () => {
    setSelected(new Set(currentUsers.map(u => u.id)));
    setSearch('');
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return availableUsers;
    return availableUsers.filter(
      u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
    );
  }, [availableUsers, search]);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
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
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="text-xs text-gray-400">
          {selected.size} user{selected.size !== 1 ? 's' : ''} selected
        </div>

        {/* User list */}
        <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
          {isLoadingUsers ? (
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
                  <div className="text-sm font-medium text-gray-800 truncate">{`${u.firstName} ${u.lastName}`.trim() || u.username}</div>
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
