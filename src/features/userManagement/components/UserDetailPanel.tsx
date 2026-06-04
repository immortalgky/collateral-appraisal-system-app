import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { Skeleton } from '@shared/components/Skeleton';
import { formatLocaleDateTime } from '@shared/utils/dateUtils';
import {
  useGetUserById,
  useAdminUpdateUser,
  useUpdateUserRoles,
  useUpdateUserGroups,
  useUpdateUserTeams,
  useSetUserActivation,
  useUnlockUser,
  useResetPassword,
} from '../api/users';
import { useGetRoles } from '../api/roles';
import { useGetGroups } from '../api/groups';
import { useGetTeams } from '../api/teams';
import { useGetEligibleCompanies } from '../api/companies';
import ChangePasswordModal from './ChangePasswordModal';
import AssignmentTable from './AssignmentTable';
import type { AdminUpdateUserRequest } from '../types';

interface UserDetailPanelProps {
  userId: string;
}

const UserDetailPanel = ({ userId }: UserDetailPanelProps) => {
  const { t, i18n } = useTranslation(['userManagement', 'common']);
  const { data: user, isLoading } = useGetUserById(userId);
  const updateUser = useAdminUpdateUser();
  const updateRoles = useUpdateUserRoles();
  const updateGroups = useUpdateUserGroups();
  const updateTeams = useUpdateUserTeams();
  const setActivation = useSetUserActivation();
  const unlockUser = useUnlockUser();

  // General edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<AdminUpdateUserRequest>({
    firstName: '',
    lastName: '',
    position: '',
    department: '',
    companyId: null,
  });

  const { data: eligibleCompanies } = useGetEligibleCompanies();
  const companyOptions = [
    { value: '', label: t('fields.noCompany') },
    ...(eligibleCompanies ?? []).map(c => ({ value: c.id, label: c.name })),
  ];

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
      toast.error(t('validation.firstAndLastNameRequired'));
      return;
    }
    updateUser.mutate(
      {
        id: userId,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        position: editForm.position || null,
        department: editForm.department || null,
        companyId: editForm.companyId || null,
      },
      {
        onSuccess: () => {
          toast.success(t('toasts.userUpdated'));
          setShowEditModal(false);
        },
        onError: () => toast.error(t('toasts.userUpdateFailed')),
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
      toast.error(t('validation.passwordMinLengthReset'));
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      toast.error(t('validation.passwordsDoNotMatchReset'));
      return;
    }
    resetPassword.mutate(
      { id: userId, ...resetForm },
      {
        onSuccess: () => {
          toast.success(t('toasts.passwordReset'));
          setShowResetPasswordModal(false);
          setResetForm({ newPassword: '', confirmPassword: '' });
        },
        onError: () => toast.error(t('toasts.passwordResetFailed')),
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
        onSuccess: () => {
          toast.success(t('toasts.rolesUpdated'));
          setShowRoleModal(false);
        },
        onError: () => toast.error(t('toasts.rolesUpdateFailed')),
      },
    );
  };

  // Group assignment modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const { data: groupsData } = useGetGroups({ pageSize: 200 });
  const allGroups = groupsData?.items ?? [];

  const handleOpenGroups = () => {
    setSelectedGroupIds((user?.groups ?? []).map(g => g.id));
    setShowGroupModal(true);
  };

  const handleSaveGroups = () => {
    updateGroups.mutate(
      { id: userId, groupIds: selectedGroupIds },
      {
        onSuccess: () => {
          toast.success(t('toasts.groupsUpdated'));
          setShowGroupModal(false);
        },
        onError: () => toast.error(t('toasts.groupsUpdateFailed')),
      },
    );
  };

  // Team assignment modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const { data: teamsData } = useGetTeams({ pageSize: 200 });
  const allTeams = teamsData?.items ?? [];

  const handleOpenTeams = () => {
    setSelectedTeamIds((user?.teams ?? []).map(tm => tm.id));
    setShowTeamModal(true);
  };

  const handleSaveTeams = () => {
    updateTeams.mutate(
      { id: userId, teamIds: selectedTeamIds },
      {
        onSuccess: () => {
          toast.success(t('toasts.teamsUpdated'));
          setShowTeamModal(false);
        },
        onError: () => toast.error(t('toasts.teamsUpdateFailed')),
      },
    );
  };

  // Activation confirm dialog
  const [showActivationConfirm, setShowActivationConfirm] = useState(false);

  const handleConfirmActivation = () => {
    if (!user) return;
    setActivation.mutate(
      { id: userId, isActive: !user.isActive },
      {
        onSuccess: () => {
          toast.success(user.isActive ? t('toasts.userDeactivated') : t('toasts.userActivated'));
          setShowActivationConfirm(false);
        },
        onError: () => toast.error(t('toasts.userActivationFailed')),
      },
    );
  };

  const handleUnlock = () => {
    unlockUser.mutate(userId, {
      onSuccess: () => toast.success(t('toasts.userUnlocked')),
      onError: () => toast.error(t('toasts.userUnlockFailed')),
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

  if (!user) return null;

  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.username;
  const initials =
    (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '') || user.username[0].toUpperCase();

  const isCompanyUser = !!user.companyId;

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Status Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Icon name="circle-user" style="solid" className="size-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">{t('sections.status')}</span>
        </div>
        <div className="px-4 py-3 flex flex-wrap items-center gap-3">
          {/* Active / Inactive badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              user.isActive
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            <span className={`size-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            {user.isActive ? t('status.active') : t('status.inactive')}
          </span>

          {/* Locked badge */}
          {user.isLocked && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
              <Icon name="lock" style="solid" className="size-3" />
              {t('status.locked')}
            </span>
          )}

          {/* Last login */}
          {user.lastLoginAt && (
            <span className="text-xs text-gray-400 ml-auto">
              {t('fields.lastLogin')}: {formatLocaleDateTime(user.lastLoginAt, i18n.language)}
            </span>
          )}
        </div>
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          <Button
            variant={user.isActive ? 'outline' : 'primary'}
            size="sm"
            onClick={() => setShowActivationConfirm(true)}
          >
            <Icon
              name={user.isActive ? 'user-slash' : 'user-check'}
              style="solid"
              className="size-3.5 mr-1.5"
            />
            {user.isActive ? t('buttons.deactivate') : t('buttons.activate')}
          </Button>
          {user.isLocked && (
            <Button
              variant="outline"
              size="sm"
              isLoading={unlockUser.isPending}
              onClick={handleUnlock}
            >
              <Icon name="lock-open" style="solid" className="size-3.5 mr-1.5" />
              {t('buttons.unlock')}
            </Button>
          )}
        </div>
      </section>

      {/* General Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="circle-info" style="solid" className="size-4 text-blue-500" />
            <span className="text-sm font-semibold text-gray-800">{t('sections.general')}</span>
          </div>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            {t('buttons.edit')}
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
              { label: t('fields.username'), value: user.username },
              { label: t('fields.email'), value: user.email },
              { label: t('fields.firstName'), value: user.firstName },
              { label: t('fields.lastName'), value: user.lastName },
              { label: t('fields.position'), value: user.position },
              { label: t('fields.department'), value: user.department },
              ...(user.companyName
                ? [{ label: t('fields.company'), value: user.companyName }]
                : []),
              { label: t('fields.authSource'), value: user.authSource },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-gray-400">{label}</dt>
                <dd className="text-sm text-gray-800 mt-0.5">
                  {value || <span className="text-gray-300">—</span>}
                </dd>
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
            <span className="text-sm font-semibold text-gray-800">{t('sections.roles')}</span>
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
            {t('buttons.edit')}
          </button>
        </div>
        <div className="px-4 py-3">
          {user.roles.length === 0 ? (
            <p className="text-sm text-gray-400">{t('empty.noRolesAssigned')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.roles.map(r => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700"
                >
                  <span
                    className={`size-1.5 rounded-full ${r.scope === 'Bank' ? 'bg-blue-400' : 'bg-violet-400'}`}
                  />
                  {r.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Groups Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="users-rectangle" style="solid" className="size-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-800">{t('sections.groups')}</span>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {user.groups?.length ?? 0}
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenGroups}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            {t('buttons.edit')}
          </button>
        </div>
        <div className="px-4 py-3">
          {!user.groups || user.groups.length === 0 ? (
            <p className="text-sm text-gray-400">{t('empty.noGroupsAssigned')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.groups.map(g => (
                <span
                  key={g.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700"
                >
                  <span
                    className={`size-1.5 rounded-full ${g.scope === 'Bank' ? 'bg-blue-400' : 'bg-amber-400'}`}
                  />
                  {g.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Teams Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="people-group" style="solid" className="size-4 text-teal-500" />
            <span className="text-sm font-semibold text-gray-800">{t('sections.teams')}</span>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {user.teams?.length ?? 0}
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenTeams}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            {t('buttons.edit')}
          </button>
        </div>
        <div className="px-4 py-3">
          {!user.teams || user.teams.length === 0 ? (
            <p className="text-sm text-gray-400">{t('empty.noTeamsAssigned')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.teams.map(tm => (
                <span
                  key={tm.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700"
                >
                  <span
                    className={`size-1.5 rounded-full ${tm.type === 'Internal' ? 'bg-blue-400' : 'bg-teal-400'}`}
                  />
                  {tm.name}
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
            <span className="text-sm font-semibold text-gray-800">{t('sections.security')}</span>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowChangePasswordModal(true)}>
              <Icon name="key" style="solid" className="size-3.5 mr-1.5" />
              {t('buttons.changePassword')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowResetPasswordModal(true)}>
              <Icon name="rotate-right" style="solid" className="size-3.5 mr-1.5" />
              {t('buttons.resetPassword')}
            </Button>
          </div>
        </section>
      )}

      {/* General Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('dialogs.editUser.title')}
        size="md"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
          <TextInput
            label={t('fields.firstName')}
            value={editForm.firstName}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, firstName: value }));
            }}
            required
            placeholder={t('placeholders.firstName')}
          />
          <TextInput
            label={t('fields.lastName')}
            value={editForm.lastName}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, lastName: value }));
            }}
            required
            placeholder={t('placeholders.lastName')}
          />
          <TextInput
            label={t('fields.position')}
            value={editForm.position ?? ''}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, position: value }));
            }}
            placeholder={t('placeholders.position')}
          />
          <TextInput
            label={t('fields.department')}
            value={editForm.department ?? ''}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, department: value }));
            }}
            placeholder={t('placeholders.department')}
          />
          {/* Company selector — only for company-scope users */}
          {isCompanyUser && (
            <div className="sm:col-span-2">
              <Dropdown
                label={t('fields.company')}
                value={editForm.companyId ?? ''}
                onChange={(val: string | null) =>
                  setEditForm(prev => ({ ...prev, companyId: val || null }))
                }
                options={companyOptions}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={updateUser.isPending}
            onClick={handleSaveGeneral}
          >
            {t('common:actions.save')}
          </Button>
        </div>
      </Modal>

      {/* Role Assignment Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={t('dialogs.editRoles.title')}
        size="lg"
      >
        <p className="text-xs text-gray-500 mb-3 px-6">{t('dialogs.editRoles.hint')}</p>
        <div className="px-6">
          <AssignmentTable
            items={allRoles}
            getId={r => r.name}
            getLabel={r => r.name}
            columns={[
              { key: 'name', label: t('fields.name'), sortable: true },
              { key: 'scope', label: t('fields.scope'), sortable: true },
            ]}
            selectedIds={selectedRoleNames}
            onChange={setSelectedRoleNames}
            searchPlaceholder={t('placeholders.searchRoles')}
            searchFields={r => [r.name, r.scope]}
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6 mt-4">
          <Button variant="ghost" size="sm" onClick={() => setShowRoleModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={updateRoles.isPending}
            onClick={handleSaveRoles}
          >
            {t('common:actions.save')}
          </Button>
        </div>
      </Modal>

      {/* Group Assignment Modal */}
      <Modal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title={t('dialogs.editGroups.title')}
        size="lg"
      >
        <p className="text-xs text-gray-500 mb-3 px-6">{t('dialogs.editGroups.hint')}</p>
        <div className="px-6">
          <AssignmentTable
            items={allGroups}
            getId={g => g.id}
            getLabel={g => g.name}
            columns={[
              { key: 'name', label: t('fields.name'), sortable: true },
              { key: 'scope', label: t('fields.scope'), sortable: true },
            ]}
            selectedIds={selectedGroupIds}
            onChange={setSelectedGroupIds}
            searchPlaceholder={t('placeholders.searchGroups')}
            searchFields={g => [g.name, g.scope]}
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6 mt-4">
          <Button variant="ghost" size="sm" onClick={() => setShowGroupModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={updateGroups.isPending}
            onClick={handleSaveGroups}
          >
            {t('common:actions.save')}
          </Button>
        </div>
      </Modal>

      {/* Team Assignment Modal */}
      <Modal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title={t('dialogs.editTeams.title')}
        size="lg"
      >
        <p className="text-xs text-gray-500 mb-3 px-6">{t('dialogs.editTeams.hint')}</p>
        <div className="px-6">
          <AssignmentTable
            items={allTeams}
            getId={tm => tm.id}
            getLabel={tm => tm.name}
            columns={[
              { key: 'name', label: t('fields.name'), sortable: true },
              { key: 'type', label: t('fields.teamType'), sortable: true },
            ]}
            selectedIds={selectedTeamIds}
            onChange={setSelectedTeamIds}
            searchPlaceholder={t('placeholders.searchTeams')}
            searchFields={tm => [tm.name, tm.type]}
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6 mt-4">
          <Button variant="ghost" size="sm" onClick={() => setShowTeamModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={updateTeams.isPending}
            onClick={handleSaveTeams}
          >
            {t('common:actions.save')}
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
      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setResetForm({ newPassword: '', confirmPassword: '' });
        }}
        title={t('dialogs.resetPassword.title')}
        size="sm"
      >
        <div className="flex flex-col gap-4 p-6">
          <p className="text-xs text-gray-500">{t('dialogs.resetPassword.hint')}</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('fields.newPassword')} <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              value={resetForm.newPassword}
              onChange={e => setResetForm(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder={t('placeholders.atLeast8Chars')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('fields.confirmPassword')} <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              value={resetForm.confirmPassword}
              onChange={e => setResetForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder={t('placeholders.reEnterNewPassword')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowResetPasswordModal(false);
              setResetForm({ newPassword: '', confirmPassword: '' });
            }}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            isLoading={resetPassword.isPending}
            onClick={handleResetPassword}
          >
            {t('buttons.resetPassword')}
          </Button>
        </div>
      </Modal>

      {/* Activation Confirm Dialog */}
      <ConfirmDialog
        isOpen={showActivationConfirm}
        onClose={() => setShowActivationConfirm(false)}
        onConfirm={handleConfirmActivation}
        title={user.isActive ? t('dialogs.deactivateUser.title') : t('dialogs.activateUser.title')}
        message={
          user.isActive
            ? t('dialogs.deactivateUser.message', { name: displayName })
            : t('dialogs.activateUser.message', { name: displayName })
        }
        confirmText={user.isActive ? t('buttons.deactivate') : t('buttons.activate')}
        variant={user.isActive ? 'danger' : 'primary'}
        isLoading={setActivation.isPending}
      />
    </div>
  );
};

export default UserDetailPanel;
