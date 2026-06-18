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
  useLdapLookup,
} from '../api/users';
import { useGetRoles } from '../api/roles';
import { useGetGroups } from '../api/groups';
import { useGetTeams } from '../api/teams';
import { useGetEligibleCompanies } from '../api/companies';
import ChangePasswordModal from './ChangePasswordModal';
import PasswordPolicyChecklist from './PasswordPolicyChecklist';
import AssignmentTable from './AssignmentTable';
import { usePasswordPolicyChecks } from '../hooks/usePasswordPolicyChecks';
import type { AdminUpdateUserRequest } from '../types';

interface UserDetailPanelProps {
  userId: string;
}

const SECTION_ICON_COLORS = {
  blue: 'bg-blue-50 text-blue-500',
  rose: 'bg-rose-50 text-rose-500',
  amber: 'bg-amber-50 text-amber-500',
} as const;

const SectionLabel = ({
  icon,
  color,
  children,
}: {
  icon: string;
  color: keyof typeof SECTION_ICON_COLORS;
  children: React.ReactNode;
}) => (
  <div className="mb-3 flex items-center gap-2">
    <span
      className={`flex size-6 items-center justify-center rounded-md ${SECTION_ICON_COLORS[color]}`}
    >
      <Icon name={icon} style="solid" className="size-3" />
    </span>
    <span className="text-sm font-semibold text-gray-800">{children}</span>
  </div>
);

const UserDetailPanel = ({ userId }: UserDetailPanelProps) => {
  const { t, i18n } = useTranslation(['userManagement', 'common']);
  const { data: user, isLoading } = useGetUserById(userId);
  const updateUser = useAdminUpdateUser();

  // The user's scope (Bank vs Company) gates which roles/groups/teams can be assigned.
  const userScope: 'Bank' | 'Company' = user?.companyId ? 'Company' : 'Bank';
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
    email: '',
    position: '',
    department: '',
    companyId: null,
  });
  const [editScope, setEditScope] = useState<'Bank' | 'Company'>('Bank');
  const [editAuthSource, setEditAuthSource] = useState<'Local' | 'LDAP'>('Local');
  const ldapLookup = useLdapLookup();

  const { data: eligibleCompanies } = useGetEligibleCompanies();
  const companyChoices = (eligibleCompanies ?? []).map(c => ({ value: c.id, label: c.name }));

  // Re-sync first/last name, email, position and department from AD for an LDAP user.
  const handleEditLdapResync = () => {
    if (!user) return;
    ldapLookup.mutate(user.username, {
      onSuccess: data => {
        if (!data.found) {
          toast.error(t('toasts.ldapUserNotFound', 'User not found in LDAP/AD'));
          return;
        }
        setEditForm(prev => ({
          ...prev,
          firstName: data.firstName ?? prev.firstName,
          lastName: data.lastName ?? prev.lastName,
          email: data.email ?? prev.email,
          position: data.position ?? prev.position,
          department: data.department ?? prev.department,
        }));
        toast.success(t('toasts.ldapInfoLoaded', 'Loaded info from LDAP'));
      },
      onError: () => toast.error(t('toasts.ldapLookupFailed', 'LDAP lookup failed')),
    });
  };

  // Edit mirrors Create: Bank users carry position/department, Company users carry a company.
  const handleEditScopeChange = (scope: 'Bank' | 'Company') => {
    setEditScope(scope);
    setEditForm(prev => ({
      ...prev,
      companyId: scope === 'Bank' ? null : prev.companyId,
      department: scope === 'Company' ? '' : prev.department,
    }));
  };

  const handleOpenEdit = () => {
    if (!user) return;
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      position: user.position ?? '',
      department: user.department ?? '',
      companyId: user.companyId,
    });
    setEditScope(user.companyId ? 'Company' : 'Bank');
    setEditAuthSource(user.authSource === 'LDAP' ? 'LDAP' : 'Local');
    setShowEditModal(true);
  };

  const handleSaveGeneral = () => {
    if (!editForm.firstName || !editForm.lastName) {
      toast.error(t('validation.firstAndLastNameRequired'));
      return;
    }
    if (!editForm.email.trim()) {
      toast.error(t('validation.emailRequired'));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(editForm.email)) {
      toast.error(t('validation.emailInvalid'));
      return;
    }
    const isCompany = editScope === 'Company';
    if (isCompany && !editForm.companyId) {
      toast.error(t('validation.companyRequired'));
      return;
    }
    updateUser.mutate(
      {
        id: userId,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email.trim(),
        position: editForm.position || null,
        department: isCompany ? null : editForm.department || null,
        companyId: isCompany ? editForm.companyId || null : null,
        authSource: editAuthSource,
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
  // Complexity comes from the DB-maintained policy (checklist shown in the reset modal).
  const { allPassed: resetPolicyMet } = usePasswordPolicyChecks(resetForm.newPassword);

  const handleResetPassword = () => {
    if (!resetForm.newPassword || !resetPolicyMet) {
      toast.error(t('validation.passwordPolicyNotMet'));
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
        // Surface server-only rejections the checklist can't predict (reuse/blocklist).
        onError: (err: any) =>
          toast.error(
            err?.apiError?.detail || err?.apiError?.title || t('toasts.passwordResetFailed'),
          ),
      },
    );
  };

  // Role assignment modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([]);

  const { data: rolesData } = useGetRoles({ scope: userScope, pageSize: 200 });
  const allRoles = (rolesData?.items ?? []).filter(r => r.scope === userScope);

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

  const { data: groupsData } = useGetGroups({ scope: userScope, pageSize: 200 });
  const allGroups = (groupsData?.items ?? []).filter(g => g.scope === userScope);

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
  const allTeams = (teamsData?.items ?? []).filter(tm => tm.scope === userScope);

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

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* General Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-blue-50">
              <Icon name="circle-info" style="solid" className="size-3 text-blue-500" />
            </span>
            <span className="text-sm font-semibold text-gray-800">{t('sections.general')}</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                user.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`}
              />
              {user.isActive ? t('status.active') : t('status.inactive')}
            </span>
            {user.isLocked && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                <Icon name="lock" style="solid" className="size-3" />
                {t('status.locked')}
              </span>
            )}
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
              // Department applies to Bank users only; Company users carry a company instead.
              ...(userScope === 'Bank'
                ? [{ label: t('fields.department'), value: user.department }]
                : []),
              ...(user.companyName
                ? [{ label: t('fields.company'), value: user.companyName }]
                : []),
              { label: t('fields.authSource'), value: user.authSource },
              ...(user.lastLoginAt
                ? [
                    {
                      label: t('fields.lastLogin'),
                      value: formatLocaleDateTime(user.lastLoginAt, i18n.language),
                    },
                  ]
                : []),
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
            <span className="flex size-6 items-center justify-center rounded-md bg-violet-50">
              <Icon name="user-shield" style="solid" className="size-3 text-violet-500" />
            </span>
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
            <span className="flex size-6 items-center justify-center rounded-md bg-amber-50">
              <Icon name="users-rectangle" style="solid" className="size-3 text-amber-500" />
            </span>
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
            <span className="flex size-6 items-center justify-center rounded-md bg-teal-50">
              <Icon name="people-group" style="solid" className="size-3 text-teal-500" />
            </span>
            <span className="text-sm font-semibold text-gray-800">{t('sections.teams')}</span>
            {userScope !== 'Company' && (
              <span className="inline-flex items-center justify-center size-5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                {user.teams?.length ?? 0}
              </span>
            )}
          </div>
          {userScope !== 'Company' && (
            <button
              type="button"
              onClick={handleOpenTeams}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Icon name="pen-to-square" style="regular" className="size-3.5" />
              {t('buttons.edit')}
            </button>
          )}
        </div>
        <div className="px-4 py-3">
          {userScope === 'Company' ? (
            <p className="text-sm text-gray-500">
              {t('hints.teamNotApplicableCompany', {
                company: user.companyName ?? user.companyId ?? '',
              })}
            </p>
          ) : !user.teams || user.teams.length === 0 ? (
            <p className="text-sm text-gray-400">{t('empty.noTeamsAssigned')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.teams.map(tm => (
                <span
                  key={tm.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700"
                >
                  <span
                    className={`size-1.5 rounded-full ${tm.scope === 'Bank' ? 'bg-blue-400' : 'bg-teal-400'}`}
                  />
                  {tm.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <span className="flex size-6 items-center justify-center rounded-md bg-red-50">
            <Icon name="lock" style="solid" className="size-3 text-red-500" />
          </span>
          <span className="text-sm font-semibold text-gray-800">{t('sections.security')}</span>
        </div>
        <div className="px-4 py-3 flex flex-wrap gap-2">
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
          {user.authSource === 'Local' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowChangePasswordModal(true)}>
                <Icon name="key" style="solid" className="size-3.5 mr-1.5" />
                {t('buttons.changePassword')}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setShowResetPasswordModal(true)}>
                <Icon name="rotate-right" style="solid" className="size-3.5 mr-1.5" />
                {t('buttons.resetPassword')}
              </Button>
            </>
          )}
        </div>
      </section>

      {/* General Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('dialogs.editUser.title')}
        size="lg"
      >
        <div className="p-6 space-y-5">
          {/* Scope */}
          <section>
            <SectionLabel icon="building" color="blue">
              {t('fields.scope')}
            </SectionLabel>
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
              {(['Bank', 'Company'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleEditScopeChange(s)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    editScope === s ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s === 'Bank' ? t('tabs.bank') : t('tabs.company')}
                </button>
              ))}
            </div>
          </section>

          {/* Authentication */}
          <section>
            <SectionLabel icon="shield-halved" color="rose">
              {t('fields.authSource', 'Authentication')}
            </SectionLabel>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
                {(['Local', 'LDAP'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditAuthSource(s)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      editAuthSource === s
                        ? 'bg-primary text-white'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s === 'Local'
                      ? t('fields.authSourceLocal', 'Local password')
                      : t('fields.authSourceLdap', 'LDAP / Active Directory')}
                  </button>
                ))}
              </div>
              {editAuthSource === 'LDAP' && (
                <Button
                  variant="outline"
                  size="xs"
                  isLoading={ldapLookup.isPending}
                  onClick={handleEditLdapResync}
                >
                  {t('buttons.retrieveFromLdap', 'Retrieve from LDAP')}
                </Button>
              )}
            </div>
            {editAuthSource === 'Local' && user.authSource === 'LDAP' && (
              <p className="mt-1.5 text-xs text-amber-600">
                {t(
                  'hints.switchToLocalPassword',
                  'Switching to local login — reset the password in Security so the user can sign in.',
                )}
              </p>
            )}
          </section>

          {/* Profile */}
          <section>
            <SectionLabel icon="id-card" color="amber">
              {t('sections.profile', 'Profile')}
            </SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                label={t('fields.email')}
                type="email"
                value={editForm.email}
                onChange={e => {
                  const value = e.currentTarget.value;
                  setEditForm(prev => ({ ...prev, email: value }));
                }}
                required
                placeholder={t('placeholders.email')}
                className="sm:col-span-2"
              />
              {editScope === 'Company' ? (
                <>
                  <Dropdown
                    label={t('fields.company')}
                    required
                    value={editForm.companyId ?? ''}
                    onChange={(val: string | null) =>
                      setEditForm(prev => ({ ...prev, companyId: val || null }))
                    }
                    options={companyChoices}
                    placeholder={t('placeholders.selectCompany')}
                    showValuePrefix={false}
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
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </section>
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
        size="2xl"
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
              {
                key: 'description',
                label: t('fields.description'),
                render: r => r.description || '—',
              },
            ]}
            selectedIds={selectedRoleNames}
            onChange={setSelectedRoleNames}
            searchPlaceholder={t('placeholders.searchRoles')}
            searchFields={r => [r.name, r.scope, r.description ?? '']}
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
        size="2xl"
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
              {
                key: 'description',
                label: t('fields.description'),
                render: g => g.description || '—',
              },
            ]}
            selectedIds={selectedGroupIds}
            onChange={setSelectedGroupIds}
            searchPlaceholder={t('placeholders.searchGroups')}
            searchFields={g => [g.name, g.scope, g.description ?? '']}
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
        size="2xl"
      >
        <p className="text-xs text-gray-500 mb-3 px-6">{t('dialogs.editTeams.hint')}</p>
        <div className="px-6">
          <AssignmentTable
            items={allTeams}
            getId={tm => tm.id}
            getLabel={tm => tm.name}
            columns={[
              { key: 'name', label: t('fields.name'), sortable: true },
              {
                key: 'scope',
                label: t('fields.scope'),
                sortable: true,
                render: tm => t(tm.scope === 'Bank' ? 'tabs.bank' : 'tabs.company'),
              },
              {
                key: 'description',
                label: t('fields.description'),
                render: tm => tm.description || '—',
              },
            ]}
            selectedIds={selectedTeamIds}
            onChange={setSelectedTeamIds}
            searchPlaceholder={t('placeholders.searchTeams')}
            searchFields={tm => [tm.name, tm.scope, tm.description ?? '']}
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
            />
          </div>
          <PasswordPolicyChecklist password={resetForm.newPassword} />
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
