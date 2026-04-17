import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { Skeleton } from '@shared/components/Skeleton';
import PermissionAssignmentModal from './PermissionAssignmentModal';
import UserAssignmentModal from './UserAssignmentModal';
import {
  useGetRoleById,
  useGetRoleUsers,
  useUpdateRole,
  useUpdateRolePermissions,
  useUpdateRoleUsers,
  useDeleteRole,
} from '../api/roles';
import type { RoleScope } from '../types';

const SCOPE_OPTIONS = [
  { value: 'Bank', label: 'Bank' },
  { value: 'Company', label: 'Company' },
];

interface RoleDetailPanelProps {
  roleId: string;
  onDeleted: () => void;
}

const RoleDetailPanel = ({ roleId, onDeleted }: RoleDetailPanelProps) => {
  const { data: role, isLoading } = useGetRoleById(roleId);
  const { data: roleUsers = [], isLoading: isLoadingUsers } = useGetRoleUsers(roleId);

  const updateRole = useUpdateRole();
  const updatePermissions = useUpdateRolePermissions();
  const updateUsers = useUpdateRoleUsers();
  const deleteRole = useDeleteRole();

  // General edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', scope: 'Bank' as RoleScope });

  const handleOpenEdit = () => {
    if (!role) return;
    setEditForm({ name: role.name, description: role.description, scope: role.scope });
    setShowEditModal(true);
  };

  const handleSaveGeneral = () => {
    if (!editForm.name || !editForm.scope) {
      toast.error('Name and scope are required');
      return;
    }
    updateRole.mutate(
      { id: roleId, name: editForm.name, description: editForm.description, scope: editForm.scope },
      {
        onSuccess: () => { toast.success('Role updated'); setShowEditModal(false); },
        onError: () => toast.error('Failed to update role'),
      },
    );
  };

  // Permission assignment modal
  const [showPermModal, setShowPermModal] = useState(false);

  const handleSavePermissions = (permissionIds: string[]) => {
    updatePermissions.mutate(
      { id: roleId, permissionIds },
      {
        onSuccess: () => { toast.success('Permissions updated'); setShowPermModal(false); },
        onError: () => toast.error('Failed to update permissions'),
      },
    );
  };

  // User assignment modal
  const [showUserModal, setShowUserModal] = useState(false);

  const handleSaveUsers = (userIds: string[]) => {
    updateUsers.mutate(
      { id: roleId, userIds },
      {
        onSuccess: () => { toast.success('Users updated'); setShowUserModal(false); },
        onError: () => toast.error('Failed to update users'),
      },
    );
  };

  // Delete
  const [showDelete, setShowDelete] = useState(false);

  const handleConfirmDelete = () => {
    deleteRole.mutate(roleId, {
      onSuccess: () => {
        toast.success('Role deleted');
        setShowDelete(false);
        onDeleted();
      },
      onError: () => toast.error('Failed to delete role'),
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

  if (!role) return null;

  return (
    <div className="flex flex-col gap-4 p-6">

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
        <div className="px-4 py-4 space-y-2">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Name</div>
            <div className="text-sm font-medium text-gray-900">{role.name}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Scope</div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              role.scope === 'Bank' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'
            }`}>
              {role.scope}
            </span>
          </div>
          {role.description && (
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Description</div>
              <div className="text-sm text-gray-600">{role.description}</div>
            </div>
          )}
        </div>
      </section>

      {/* Permissions Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="shield-halved" style="solid" className="size-4 text-emerald-500" />
            <span className="text-sm font-semibold text-gray-800">Permissions</span>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {role.permissions.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPermModal(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            Edit
          </button>
        </div>
        <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
          {role.permissions.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-400 text-center">No permissions assigned</div>
          ) : (
            role.permissions.map(p => (
              <div key={p.id} className="px-4 py-2.5">
                <code className="text-xs text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">{p.permissionCode}</code>
                {p.description && (
                  <div className="text-xs text-gray-400 mt-0.5">{p.description}</div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="h-2" />
      </section>

      {/* Users Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="users" style="solid" className="size-4 text-violet-500" />
            <span className="text-sm font-semibold text-gray-800">Users</span>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {roleUsers.length}
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
          {isLoadingUsers ? (
            <div className="px-4 py-4 text-sm text-gray-400">Loading...</div>
          ) : roleUsers.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-400 text-center">No users assigned</div>
          ) : (
            roleUsers.map(u => {
              const displayName = `${u.firstName} ${u.lastName}`.trim() || u.username;
              return (
                <div key={u.id} className="px-4 py-2.5 flex items-center gap-2">
                  <div className="size-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
                    {(displayName)[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{displayName}</div>
                    <div className="text-xs text-gray-400 truncate">{u.email}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="h-2" />
      </section>

      {/* Security Section */}
      <section className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100">
          <Icon name="triangle-exclamation" style="solid" className="size-4 text-danger" />
          <span className="text-sm font-semibold text-gray-800">Security</span>
        </div>
        <div className="px-4 py-4">
          <p className="text-xs text-gray-500 mb-3">
            Deleting this role will remove it from all assigned users. This action cannot be undone.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDelete(true)}
            leftIcon={<Icon name="trash-can" style="regular" className="size-3.5" />}
          >
            Delete Role
          </Button>
        </div>
      </section>

      {/* General Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Role" size="md">
        <div className="grid grid-cols-1 gap-4 p-6">
          <TextInput
            label="Name"
            value={editForm.name}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, name: value }));
            }}
            required
            placeholder="Role name"
          />
          <Dropdown
            label="Scope"
            value={editForm.scope}
            onChange={(val: string | null) => setEditForm(prev => ({ ...prev, scope: (val ?? 'Bank') as RoleScope }))}
            options={SCOPE_OPTIONS}
            required
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
          <Button variant="primary" size="sm" isLoading={updateRole.isPending} onClick={handleSaveGeneral}>
            Save
          </Button>
        </div>
      </Modal>

      {/* Permission Assignment Modal */}
      {role && (
        <PermissionAssignmentModal
          isOpen={showPermModal}
          onClose={() => setShowPermModal(false)}
          onSave={handleSavePermissions}
          currentPermissions={role.permissions}
          isSaving={updatePermissions.isPending}
        />
      )}

      {/* User Assignment Modal */}
      <UserAssignmentModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSave={handleSaveUsers}
        currentUsers={roleUsers}
        scope={role.scope}
        isSaving={updateUsers.isPending}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Role"
        message={`Are you sure you want to delete "${role.name}"? This cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteRole.isPending}
      />
    </div>
  );
};

export default RoleDetailPanel;
