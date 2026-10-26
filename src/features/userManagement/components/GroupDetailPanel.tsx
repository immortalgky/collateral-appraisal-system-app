import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import Textarea from '@shared/components/inputs/Textarea';
import Dropdown from '@shared/components/inputs/Dropdown';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import { Skeleton } from '@shared/components/Skeleton';
import UserAssignmentModal from './UserAssignmentModal';
import GroupMonitoringModal from './GroupMonitoringModal';
import {
  useGetGroupById,
  useUpdateGroup,
  useUpdateGroupUsers,
  useUpdateGroupMonitoring,
  useDeleteGroup,
} from '../api/groups';
import type { RoleUser, GroupScope } from '../types';

interface GroupDetailPanelProps {
  groupId: string;
  onDeleted: () => void;
}

const GroupDetailPanel = ({ groupId, onDeleted }: GroupDetailPanelProps) => {
  const { t } = useTranslation(['userManagement', 'common']);
  const { data: group, isLoading } = useGetGroupById(groupId);

  const updateGroup = useUpdateGroup();
  const updateUsers = useUpdateGroupUsers();
  const updateMonitoring = useUpdateGroupMonitoring();
  const deleteGroup = useDeleteGroup();

  // General edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    scope: GroupScope;
  }>({ name: '', description: '', scope: 'Bank' });

  const SCOPE_OPTIONS = [
    { value: 'Bank', label: t('tabs.bank') },
    { value: 'Company', label: t('tabs.company') },
  ];

  const handleOpenEdit = () => {
    if (!group) return;
    setEditForm({ name: group.name, description: group.description, scope: group.scope });
    setShowEditModal(true);
  };

  const handleSaveGeneral = () => {
    if (!editForm.name) {
      toast.error(t('validation.nameRequired'));
      return;
    }
    updateGroup.mutate(
      {
        id: groupId,
        name: editForm.name,
        description: editForm.description,
        scope: editForm.scope,
      },
      {
        onSuccess: () => {
          toast.success(t('toasts.groupUpdated'));
          setShowEditModal(false);
        },
        onError: () => toast.error(t('toasts.groupUpdateFailed')),
      },
    );
  };

  // User assignment — adapt GroupUser → RoleUser shape for reuse
  const [showUserModal, setShowUserModal] = useState(false);

  const adaptedUsers: RoleUser[] = useMemo(
    () =>
      (group?.users ?? []).map(u => ({
        id: u.userId,
        username: u.userName,
        firstName: u.firstName,
        lastName: u.lastName,
        email: '',
      })),
    [group?.users],
  );

  const handleSaveUsers = (userIds: string[]) => {
    updateUsers.mutate(
      { id: groupId, userIds },
      {
        onSuccess: () => {
          toast.success(t('toasts.usersUpdated'));
          setShowUserModal(false);
        },
        onError: () => toast.error(t('toasts.usersUpdateFailed')),
      },
    );
  };

  // Monitoring assignment
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);

  const handleSaveMonitoring = (monitoredGroupIds: string[]) => {
    updateMonitoring.mutate(
      { id: groupId, monitoredGroupIds },
      {
        onSuccess: () => {
          toast.success(t('toasts.monitoredGroupsUpdated'));
          setShowMonitoringModal(false);
        },
        onError: () => toast.error(t('toasts.monitoredGroupsUpdateFailed')),
      },
    );
  };

  // Delete
  const [showDelete, setShowDelete] = useState(false);

  const handleConfirmDelete = () => {
    deleteGroup.mutate(groupId, {
      onSuccess: () => {
        toast.success(t('toasts.groupDeleted'));
        setShowDelete(false);
        onDeleted();
      },
      onError: (err: any) => {
        toast.error(err?.apiError?.detail ?? t('toasts.groupDeleteFailed'));
        setShowDelete(false);
      },
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
    <div className="flex flex-col gap-4 p-6">
      {/* General Section */}
      <section className="bg-(--palette-surface) rounded-xl border border-(--palette-line) shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--palette-line-soft)">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-500/10">
              <Icon name="circle-info" style="solid" className="size-3 text-blue-500" />
            </span>
            <span className="text-sm font-semibold text-(--palette-ink)">
              {t('sections.general')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="text-xs text-(--palette-primary-text) hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            {t('buttons.edit')}
          </button>
        </div>
        <div className="px-4 py-3 space-y-2">
          <div>
            <div className="text-xs text-(--palette-gray-400) mb-0.5">{t('fields.name')}</div>
            <div className="text-sm font-medium text-(--palette-ink)">{group.name}</div>
          </div>
          <div>
            <div className="text-xs text-(--palette-gray-400) mb-0.5">{t('fields.scope')}</div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                group.scope === 'Bank'
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  : 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'
              }`}
            >
              {group.scope}
            </span>
          </div>
          {group.description && (
            <div>
              <div className="text-xs text-(--palette-gray-400) mb-0.5">
                {t('fields.description')}
              </div>
              <div className="text-sm text-(--palette-gray-600) whitespace-pre-line break-words">
                {group.description}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Users Section */}
      <section className="bg-(--palette-surface) rounded-xl border border-(--palette-line) shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--palette-line-soft)">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-violet-50 dark:bg-violet-500/10">
              <Icon name="users" style="solid" className="size-3 text-violet-500" />
            </span>
            <span className="text-sm font-semibold text-(--palette-ink)">
              {t('sections.users')}
            </span>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-(--palette-surface-3) text-xs font-semibold text-(--palette-gray-600)">
              {group.users.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowUserModal(true)}
            className="text-xs text-(--palette-primary-text) hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            {t('buttons.edit')}
          </button>
        </div>
        <div className="divide-y divide-(--palette-line-soft) max-h-48 overflow-y-auto">
          {group.users.length === 0 ? (
            <div className="px-4 py-4 text-sm text-(--palette-gray-400) text-center">
              {t('empty.noUsersAssigned')}
            </div>
          ) : (
            group.users.map(u => (
              <div key={u.userId} className="px-4 py-2.5 flex items-center gap-2">
                <div className="size-7 rounded-full bg-(--palette-surface-3) flex items-center justify-center text-xs font-semibold text-(--palette-gray-500) shrink-0">
                  {(u.firstName || u.userName || '?')[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-(--palette-ink) truncate">
                    {`${u.firstName} ${u.lastName}`.trim() || u.userName}
                  </div>
                  <div className="text-xs text-(--palette-gray-400) truncate">{u.userName}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Monitoring Section */}
      <section className="bg-(--palette-surface) rounded-xl border border-(--palette-line) shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-(--palette-line-soft)">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-(--palette-warn-wash)">
              <Icon name="eye" style="solid" className="size-3 text-amber-500" />
            </span>
            <span className="text-sm font-semibold text-(--palette-ink)">
              {t('sections.monitoring')}
            </span>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-(--palette-surface-3) text-xs font-semibold text-(--palette-gray-600)">
              {group.monitoredGroups.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowMonitoringModal(true)}
            className="text-xs text-(--palette-primary-text) hover:underline flex items-center gap-1"
          >
            <Icon name="pen-to-square" style="regular" className="size-3.5" />
            {t('buttons.edit')}
          </button>
        </div>
        <div className="divide-y divide-(--palette-line-soft) max-h-48 overflow-y-auto">
          {group.monitoredGroups.length === 0 ? (
            <div className="px-4 py-4 text-sm text-(--palette-gray-400) text-center">
              {t('empty.noGroupsBeingMonitored')}
            </div>
          ) : (
            group.monitoredGroups.map(mg => (
              <div key={mg.groupId} className="px-4 py-2.5 flex items-center gap-2">
                <Icon
                  name="users-rectangle"
                  style="regular"
                  className="size-4 text-(--palette-gray-400) shrink-0"
                />
                <span className="text-sm text-(--palette-ink)">{mg.groupName}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-(--palette-surface) rounded-xl border border-red-100 dark:border-red-500/20 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100 dark:border-red-500/20">
          <span className="flex size-6 items-center justify-center rounded-md bg-(--palette-req-wash)">
            <Icon name="triangle-exclamation" style="solid" className="size-3 text-danger" />
          </span>
          <span className="text-sm font-semibold text-(--palette-ink)">
            {t('sections.security')}
          </span>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-(--palette-gray-500) mb-3">
            {t('security.deleteGroupWarning')}
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDelete(true)}
            leftIcon={<Icon name="trash-can" style="regular" className="size-3.5" />}
          >
            {t('buttons.deleteGroup')}
          </Button>
        </div>
      </section>

      {/* General Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('dialogs.editGroup.title')}
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
            placeholder={t('placeholders.groupName')}
          />
          <Dropdown
            label={t('fields.scope')}
            value={editForm.scope}
            onChange={(val: string | null) =>
              setEditForm(prev => ({ ...prev, scope: (val ?? 'Bank') as GroupScope }))
            }
            options={SCOPE_OPTIONS}
            required
          />
          <Textarea
            label={t('fields.description')}
            value={editForm.description}
            onChange={e => {
              const value = e.currentTarget.value;
              setEditForm(prev => ({ ...prev, description: value }));
            }}
            maxLength={500}
            showCharCount
            placeholder={t('placeholders.briefDescription')}
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={updateGroup.isPending}
            onClick={handleSaveGeneral}
          >
            {t('common:actions.save')}
          </Button>
        </div>
      </Modal>

      {/* User Assignment Modal — reused from Roles, adapted users */}
      <UserAssignmentModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSave={handleSaveUsers}
        currentUsers={adaptedUsers}
        scope={group.scope}
        isSaving={updateUsers.isPending}
        title={t('dialogs.assignUsers.title')}
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
        title={t('dialogs.deleteGroup.title')}
        message={t('dialogs.deleteGroup.message', { name: group.name })}
        confirmText={t('common:actions.delete')}
        isLoading={deleteGroup.isPending}
      />
    </div>
  );
};

export default GroupDetailPanel;
