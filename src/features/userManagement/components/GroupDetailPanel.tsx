import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { Skeleton } from '@shared/components/Skeleton';
import UserAssignmentModal from './UserAssignmentModal';
import GroupMonitoringModal from './GroupMonitoringModal';
import { useGetGroupById, useUpdateGroup, useUpdateGroupUsers, useUpdateGroupMonitoring, useDeleteGroup } from '../api/groups';
import type { RoleUser } from '../types';

interface GroupDetailPanelProps {
  groupId: string;
  onDeleted: () => void;
}

const GroupDetailPanel = ({ groupId, onDeleted }: GroupDetailPanelProps) => {
  const { data: group, isLoading } = useGetGroupById(groupId);

  const updateGroup = useUpdateGroup();
  const updateUsers = useUpdateGroupUsers();
  const updateMonitoring = useUpdateGroupMonitoring();
  const deleteGroup = useDeleteGroup();

  // General edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const handleOpenEdit = () => {
    if (!group) return;
    setEditForm({ name: group.name, description: group.description });
    setShowEditModal(true);
  };

  const handleSaveGeneral = () => {
    if (!editForm.name) {
      toast.error('Name is required');
      return;
    }
    updateGroup.mutate(
      { id: groupId, name: editForm.name, description: editForm.description },
      {
        onSuccess: () => { toast.success('Group updated'); setShowEditModal(false); },
        onError: () => toast.error('Failed to update group'),
      },
    );
  };

  // User assignment — adapt GroupUser → RoleUser shape for reuse
  const [showUserModal, setShowUserModal] = useState(false);

  const adaptedUsers: RoleUser[] = useMemo(
    () =>
      (group?.users ?? []).map(u => ({
        id: u.userId,
        userName: u.userName,
        displayName: `${u.firstName} ${u.lastName}`.trim() || u.userName,
        email: '',
      })),
    [group?.users],
  );

  const handleSaveUsers = (userIds: string[]) => {
    updateUsers.mutate(
      { id: groupId, userIds },
      {
        onSuccess: () => { toast.success('Users updated'); setShowUserModal(false); },
        onError: () => toast.error('Failed to update users'),
      },
    );
  };

  // Monitoring assignment
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);

  const handleSaveMonitoring = (monitoredGroupIds: string[]) => {
    updateMonitoring.mutate(
      { id: groupId, monitoredGroupIds },
      {
        onSuccess: () => { toast.success('Monitored groups updated'); setShowMonitoringModal(false); },
        onError: () => toast.error('Failed to update monitored groups'),
      },
    );
  };

  // Delete
  const [showDelete, setShowDelete] = useState(false);

  const handleConfirmDelete = () => {
    deleteGroup.mutate(groupId, {
      onSuccess: () => {
        toast.success('Group deleted');
        setShowDelete(false);
        onDeleted();
      },
      onError: () => toast.error('Failed to delete group'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-40" variant="rounded" />
        <Skeleton className="h-4 w-64" variant="rounded" />
        <Skeleton className="h-24 w-full" variant="rounded" />
        <Skeleton className="h-24 w-full" variant="rounded" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="flex flex-col gap-4 p-6 h-full overflow-y-auto">

      {/* General Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="circle-info" style="solid" className="size-4 text-blue-500" />
            <span className="text-sm font-semibold text-gray-800">General</span>
          </div>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            Edit
          </button>
        </div>
        <div className="px-4 py-3 space-y-2">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Name</div>
            <div className="text-sm font-medium text-gray-900">{group.name}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Scope</div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              group.scope === 'Bank' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'
            }`}>
              {group.scope}
            </span>
          </div>
          {group.description && (
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Description</div>
              <div className="text-sm text-gray-600">{group.description}</div>
            </div>
          )}
        </div>
      </section>

      {/* Users Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="users" style="solid" className="size-4 text-violet-500" />
            <span className="text-sm font-semibold text-gray-800">Users</span>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {group.users.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowUserModal(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            Edit
          </button>
        </div>
        <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
          {group.users.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-400 text-center">No users assigned</div>
          ) : (
            group.users.map(u => (
              <div key={u.userId} className="px-4 py-2.5 flex items-center gap-2">
                <div className="size-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
                  {(u.firstName || u.userName)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {`${u.firstName} ${u.lastName}`.trim() || u.userName}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{u.userName}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Monitoring Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="eye" style="solid" className="size-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-800">Monitoring</span>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {group.monitoredGroups.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowMonitoringModal(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            Edit
          </button>
        </div>
        <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
          {group.monitoredGroups.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-400 text-center">No groups being monitored</div>
          ) : (
            group.monitoredGroups.map(mg => (
              <div key={mg.groupId} className="px-4 py-2.5 flex items-center gap-2">
                <Icon name="users-rectangle" style="regular" className="size-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-800">{mg.groupName}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100">
          <Icon name="triangle-exclamation" style="solid" className="size-4 text-danger" />
          <span className="text-sm font-semibold text-gray-800">Security</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-3">
            Deleting this group will remove all user assignments. This action cannot be undone.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDelete(true)}
            leftIcon={<Icon name="trash-can" style="regular" className="size-3.5" />}
          >
            Delete Group
          </Button>
        </div>
      </section>

      {/* General Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Group" size="sm">
        <div className="grid grid-cols-1 gap-4 p-6">
          <TextInput
            label="Name"
            value={editForm.name}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, name: value }));
            }}
            required
            placeholder="Group name"
          />
          <TextInput
            label="Description"
            value={editForm.description}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, description: value }));
            }}
            placeholder="Brief description"
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="primary" size="sm" isLoading={updateGroup.isPending} onClick={handleSaveGeneral}>
            Save
          </Button>
        </div>
      </Modal>

      {/* User Assignment Modal — reused from Roles, adapted users */}
      <UserAssignmentModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSave={handleSaveUsers}
        currentUsers={adaptedUsers}
        availableUsers={adaptedUsers}
        isLoadingUsers={isLoading}
        isSaving={updateUsers.isPending}
        title="Assign Users to Group"
      />

      {/* Group Monitoring Modal */}
      <GroupMonitoringModal
        isOpen={showMonitoringModal}
        onClose={() => setShowMonitoringModal(false)}
        onSave={handleSaveMonitoring}
        currentMonitoredGroups={group.monitoredGroups}
        selfId={groupId}
        scope={group.scope}
        isSaving={updateMonitoring.isPending}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Group"
        message={`Are you sure you want to delete "${group.name}"? This cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteGroup.isPending}
      />
    </div>
  );
};

export default GroupDetailPanel;
