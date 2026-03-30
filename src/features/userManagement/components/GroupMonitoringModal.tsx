import { useState, useMemo } from 'react';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import { useGetGroups } from '../api/groups';
import type { GroupScope, MonitoredGroup } from '../types';

interface GroupMonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (monitoredGroupIds: string[]) => void;
  currentMonitoredGroups: MonitoredGroup[];
  /** The current group's own ID — excluded from the list so a group can't monitor itself */
  selfId: string;
  /** Only show groups of the same scope */
  scope: GroupScope;
  isSaving: boolean;
}

const GroupMonitoringModal = ({
  isOpen,
  onClose,
  onSave,
  currentMonitoredGroups,
  selfId,
  scope,
  isSaving,
}: GroupMonitoringModalProps) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(currentMonitoredGroups.map(g => g.groupId)),
  );

  // Fetch all groups of same scope (large page to avoid pagination complexity here)
  const { data, isLoading } = useGetGroups({ scope, pageSize: 200 });
  const allGroups = (data?.items ?? []).filter(g => g.id !== selfId);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allGroups;
    return allGroups.filter(
      g =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q),
    );
  }, [allGroups, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => onSave(Array.from(selected));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Monitored Groups"
      size="md"
      key={isOpen ? 'open' : 'closed'}
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
            placeholder="Search groups..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="text-xs text-gray-400">
          {selected.size} group{selected.size !== 1 ? 's' : ''} selected
        </div>

        {/* Group list */}
        <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              <Icon name="spinner" style="solid" className="size-4 animate-spin mr-2" />
              Loading groups...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No other groups found</div>
          ) : (
            filtered.map(g => (
              <label
                key={g.id}
                className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(g.id)}
                  onChange={() => toggle(g.id)}
                  className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800">{g.name}</div>
                  {g.description && (
                    <div className="text-xs text-gray-400 truncate">{g.description}</div>
                  )}
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
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default GroupMonitoringModal;
