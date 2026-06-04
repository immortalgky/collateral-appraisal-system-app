import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { Skeleton } from '@shared/components/Skeleton';
import AssignmentTable from './AssignmentTable';
import {
  useGetTeamById,
  useUpdateTeam,
  useUpdateTeamMembers,
  useDeleteTeam,
} from '../api/teams';
import { useGetUsers } from '../api/users';
import type { AdminUserListItem, TeamType } from '../types';

interface TeamDetailPanelProps {
  teamId: string;
  onDeleted: () => void;
}

const TeamDetailPanel = ({ teamId, onDeleted }: TeamDetailPanelProps) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const { data: team, isLoading } = useGetTeamById(teamId);

  const updateTeam = useUpdateTeam();
  const updateMembers = useUpdateTeamMembers();
  const deleteTeam = useDeleteTeam();

  // Fetch all users for assignment
  const { data: usersData } = useGetUsers({ pageSize: 500 });
  const allUsers: AdminUserListItem[] = useMemo(
    () => usersData?.items ?? [],
    [usersData],
  );

  // Edit general modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; type: TeamType; isActive: boolean }>({
    name: '',
    type: 'Internal',
    isActive: true,
  });

  const handleOpenEdit = () => {
    if (!team) return;
    setEditForm({ name: team.name, type: team.type, isActive: team.isActive });
    setShowEditModal(true);
  };

  const handleSaveGeneral = () => {
    if (!editForm.name) {
      toast.error(t('validation.nameRequired'));
      return;
    }
    updateTeam.mutate(
      { id: teamId, name: editForm.name, type: editForm.type, isActive: editForm.isActive },
      {
        onSuccess: () => {
          toast.success(t('toasts.teamUpdated'));
          setShowEditModal(false);
        },
        onError: () => toast.error(t('toasts.teamUpdateFailed')),
      },
    );
  };

  // Member assignment
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const handleOpenMemberModal = () => {
    setSelectedMemberIds((team?.members ?? []).map(m => m.userId));
    setShowMemberModal(true);
  };

  const handleSaveMembers = () => {
    updateMembers.mutate(
      { id: teamId, userIds: selectedMemberIds },
      {
        onSuccess: () => {
          toast.success(t('toasts.usersUpdated'));
          setShowMemberModal(false);
        },
        onError: () => toast.error(t('toasts.usersUpdateFailed')),
      },
    );
  };

  // Delete
  const [showDelete, setShowDelete] = useState(false);

  const handleConfirmDelete = () => {
    deleteTeam.mutate(teamId, {
      onSuccess: () => {
        toast.success(t('toasts.teamDeleted'));
        setShowDelete(false);
        onDeleted();
      },
      onError: () => toast.error(t('toasts.teamDeleteFailed')),
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

  if (!team) return null;

  return (
    <div className="flex flex-col gap-4 p-6">
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
        <div className="px-4 py-3 space-y-2">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t('fields.name')}</div>
            <div className="text-sm font-medium text-gray-900">{team.name}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t('fields.teamType')}</div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                team.type === 'Internal' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'
              }`}
            >
              {t(team.type === 'Internal' ? 'fields.teamTypeInternal' : 'fields.teamTypeExternal')}
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">{t('fields.isActive')}</div>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                team.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span className={`size-1.5 rounded-full ${team.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
              {team.isActive ? t('status.active') : t('status.inactive')}
            </span>
          </div>
        </div>
      </section>

      {/* Members Section */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="users" style="solid" className="size-4 text-violet-500" />
            <span className="text-sm font-semibold text-gray-800">{t('sections.users')}</span>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {team.members.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenMemberModal}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            {t('buttons.edit')}
          </button>
        </div>
        <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
          {team.members.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-400 text-center">
              {t('empty.noUsersAssigned')}
            </div>
          ) : (
            team.members.map(m => (
              <div key={m.userId} className="px-4 py-2.5 flex items-center gap-2">
                <div className="size-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
                  {(m.firstName || m.userName || '?')[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {`${m.firstName} ${m.lastName}`.trim() || m.userName}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{m.userName}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100">
          <Icon name="triangle-exclamation" style="solid" className="size-4 text-danger" />
          <span className="text-sm font-semibold text-gray-800">{t('sections.security')}</span>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-500 mb-3">{t('security.deleteTeamWarning')}</p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDelete(true)}
            leftIcon={<Icon name="trash-can" style="regular" className="size-3.5" />}
          >
            {t('buttons.deleteTeam')}
          </Button>
        </div>
      </section>

      {/* General Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('dialogs.editTeam.title')}
        size="sm"
      >
        <div className="grid grid-cols-1 gap-4 p-6">
          <TextInput
            label={t('fields.name')}
            value={editForm.name}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, name: value }));
            }}
            required
            placeholder={t('placeholders.teamName')}
          />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('fields.teamType')}
            </label>
            <select
              value={editForm.type}
              onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value as TeamType }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="Internal">{t('fields.teamTypeInternal')}</option>
              <option value="External">{t('fields.teamTypeExternal')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="team-isActive"
              checked={editForm.isActive}
              onChange={e => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
              className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="team-isActive" className="text-sm text-gray-700">
              {t('fields.isActive')}
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={updateTeam.isPending}
            onClick={handleSaveGeneral}
          >
            {t('common:actions.save')}
          </Button>
        </div>
      </Modal>

      {/* Member Assignment Modal */}
      <Modal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        title={t('dialogs.assignUsers.title')}
        size="lg"
      >
        <div className="p-6">
          <AssignmentTable<AdminUserListItem>
            items={allUsers}
            getId={u => u.id}
            getLabel={u => `${u.firstName} ${u.lastName}`.trim() || u.username}
            columns={[
              {
                key: 'username',
                label: t('fields.username'),
                sortable: true,
                render: u => u.username,
              },
              {
                key: 'displayName',
                label: t('fields.firstName'),
                sortable: true,
                render: u => `${u.firstName} ${u.lastName}`.trim(),
              },
            ]}
            selectedIds={selectedMemberIds}
            onChange={setSelectedMemberIds}
            searchPlaceholder={t('placeholders.searchUsers')}
            searchFields={u => [u.username, u.firstName, u.lastName]}
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowMemberModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={updateMembers.isPending}
            onClick={handleSaveMembers}
          >
            {t('buttons.saveUsers')}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleConfirmDelete}
        title={t('dialogs.deleteTeam.title')}
        message={t('dialogs.deleteTeam.message', { name: team.name })}
        confirmText={t('common:actions.delete')}
        isLoading={deleteTeam.isPending}
      />
    </div>
  );
};

export default TeamDetailPanel;
