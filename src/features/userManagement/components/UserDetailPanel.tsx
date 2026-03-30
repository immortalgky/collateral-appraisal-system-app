import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import { Skeleton } from '@shared/components/Skeleton';
import { useGetUserById, useAdminUpdateUser, useUpdateUserRoles, useResetPassword } from '../api/users';
import { useGetRoles } from '../api/roles';
import ChangePasswordModal from './ChangePasswordModal';
import type { AdminUpdateUserRequest } from '../types';

interface UserDetailPanelProps {
  userId: string;
}

const UserDetailPanel = ({ userId }: UserDetailPanelProps) => {
  const { data: user, isLoading } = useGetUserById(userId);
  const updateUser = useAdminUpdateUser();
  const updateRoles = useUpdateUserRoles();

  // General edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<AdminUpdateUserRequest>({
    firstName: '',
    lastName: '',
    position: '',
    department: '',
    companyId: null,
  });

  const handleOpenEdit = () => {
    if (!user) return;
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      position: user.position ?? '',
      department: user.department ?? '',
      companyId: user.companyId,
    });
    setShowEditModal(true);
  };

  const handleSaveGeneral = () => {
    if (!editForm.firstName || !editForm.lastName) {
      toast.error('First name and last name are required');
      return;
    }
    updateUser.mutate(
      {
        id: userId,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        position: editForm.position || null,
        department: editForm.department || null,
        companyId: editForm.companyId,
      },
      {
        onSuccess: () => { toast.success('User updated'); setShowEditModal(false); },
        onError: () => toast.error('Failed to update user'),
      },
    );
  };

  // Security modals
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const resetPassword = useResetPassword();

  const handleResetPassword = () => {
    if (!resetForm.newPassword || resetForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    resetPassword.mutate(
      { id: userId, ...resetForm },
      {
        onSuccess: () => { toast.success('Password reset successfully'); setShowResetPasswordModal(false); setResetForm({ newPassword: '', confirmPassword: '' }); },
        onError: () => toast.error('Failed to reset password'),
      },
    );
  };

  // Role assignment modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([]);

  const { data: rolesData } = useGetRoles({ pageSize: 200 });
  const allRoles = rolesData?.items ?? [];

  const handleOpenRoles = () => {
    setSelectedRoleNames((user?.roles ?? []).map(r => r.name));
    setShowRoleModal(true);
  };

  const handleSaveRoles = () => {
    updateRoles.mutate(
      { id: userId, roleNames: selectedRoleNames },
      {
        onSuccess: () => { toast.success('Roles updated'); setShowRoleModal(false); },
        onError: () => toast.error('Failed to update roles'),
      },
    );
  };

  const toggleRole = (roleName: string) => {
    setSelectedRoleNames(prev =>
      prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName],
    );
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

  if (!user) return null;

  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.userName;
  const initials =
    (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '') ||
    user.userName[0].toUpperCase();

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
        <div className="px-4 py-4 flex items-start gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="size-14 rounded-full object-cover shrink-0 ring-2 ring-gray-100"
            />
          ) : (
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ring-2 ring-gray-100">
              <span className="text-lg font-bold text-primary">{initials}</span>
            </div>
          )}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 flex-1">
            {[
              { label: 'Username', value: user.userName },
              { label: 'Email', value: user.email },
              { label: 'First Name', value: user.firstName },
              { label: 'Last Name', value: user.lastName },
              { label: 'Position', value: user.position },
              { label: 'Department', value: user.department },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-gray-400">{label}</dt>
                <dd className="text-sm text-gray-800 mt-0.5">{value || <span className="text-gray-300">—</span>}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Roles Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="user-shield" style="solid" className="size-4 text-violet-500" />
            <span className="text-sm font-semibold text-gray-800">Roles</span>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {user.roles.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenRoles}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            Edit
          </button>
        </div>
        <div className="px-4 py-3">
          {user.roles.length === 0 ? (
            <p className="text-sm text-gray-400">No roles assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.roles.map(r => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700"
                >
                  <span className={`size-1.5 rounded-full ${r.scope === 'Bank' ? 'bg-blue-400' : 'bg-violet-400'}`} />
                  {r.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Groups Section (read-only) */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Icon name="users-rectangle" style="solid" className="size-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-800">Groups</span>
          <span className="inline-flex items-center justify-center size-5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
            {user.groups?.length ?? 0}
          </span>
        </div>
        <div className="px-4 py-3">
          {!user.groups || user.groups.length === 0 ? (
            <p className="text-sm text-gray-400">No groups assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.groups.map(g => (
                <span
                  key={g.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700"
                >
                  <span className={`size-1.5 rounded-full ${g.scope === 'Bank' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                  {g.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Security Section */}
      {user.authSource === 'Local' && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Icon name="lock" style="solid" className="size-4 text-red-500" />
            <span className="text-sm font-semibold text-gray-800">Security</span>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangePasswordModal(true)}
            >
              <Icon name="key" style="solid" className="size-3.5 mr-1.5" />
              Change Password
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowResetPasswordModal(true)}
            >
              <Icon name="rotate-right" style="solid" className="size-3.5 mr-1.5" />
              Reset Password
            </Button>
          </div>
        </section>
      )}

      {/* General Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User" size="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
          <TextInput
            label="First Name"
            value={editForm.firstName}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, firstName: value }));
            }}
            required
            placeholder="First name"
          />
          <TextInput
            label="Last Name"
            value={editForm.lastName}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, lastName: value }));
            }}
            required
            placeholder="Last name"
          />
          <TextInput
            label="Position"
            value={editForm.position ?? ''}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, position: value }));
            }}
            placeholder="e.g., Senior Appraiser"
          />
          <TextInput
            label="Department"
            value={editForm.department ?? ''}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, department: value }));
            }}
            placeholder="e.g., Appraisal Division"
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="primary" size="sm" isLoading={updateUser.isPending} onClick={handleSaveGeneral}>
            Save
          </Button>
        </div>
      </Modal>

      {/* Role Assignment Modal */}
      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title="Edit Roles" size="md">
        <div className="p-6">
          <p className="text-xs text-gray-500 mb-3">Select roles to assign to this user.</p>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 border border-gray-200 rounded-lg">
            {allRoles.map(role => (
              <label
                key={role.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedRoleNames.includes(role.name)}
                  onChange={() => toggleRole(role.name)}
                  className="rounded border-gray-300 text-primary focus:ring-primary/20"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800">{role.name}</div>
                  <div className="text-xs text-gray-400">{role.scope}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowRoleModal(false)}>Cancel</Button>
          <Button variant="primary" size="sm" isLoading={updateRoles.isPending} onClick={handleSaveRoles}>
            Save
          </Button>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        userId={userId}
      />

      {/* Reset Password Modal */}
      <Modal isOpen={showResetPasswordModal} onClose={() => { setShowResetPasswordModal(false); setResetForm({ newPassword: '', confirmPassword: '' }); }} title="Reset Password" size="sm">
        <div className="flex flex-col gap-4 p-6">
          <p className="text-xs text-gray-500">Set a new password for this user. No current password required.</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New Password <span className="text-danger">*</span></label>
            <input
              type="password"
              value={resetForm.newPassword}
              onChange={e => setResetForm(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password <span className="text-danger">*</span></label>
            <input
              type="password"
              value={resetForm.confirmPassword}
              onChange={e => setResetForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Re-enter new password"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => { setShowResetPasswordModal(false); setResetForm({ newPassword: '', confirmPassword: '' }); }}>Cancel</Button>
          <Button variant="danger" size="sm" isLoading={resetPassword.isPending} onClick={handleResetPassword}>Reset Password</Button>
        </div>
      </Modal>

    </div>
  );
};

export default UserDetailPanel;
