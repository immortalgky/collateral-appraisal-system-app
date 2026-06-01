import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Modal from '@/shared/components/Modal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useGetUsers } from '@/features/userManagement/api/users';
import { POSITION_OPTIONS } from '@/features/meeting/constants';

import {
  useAddCommitteeMember,
  useGetCommitteeDetail,
  useGetCommittees,
  useRemoveCommitteeMember,
  useUpdateCommitteeMember,
} from '../api/committees';
import type { CommitteeMemberAttendance, CommitteeMemberDto } from '../api/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const COMMITTEE_ROLE = 'AppraisalCommittee';

const ATTENDANCE_OPTIONS: CommitteeMemberAttendance[] = ['Always', 'Odd', 'Even'];

// Attendance code → i18n key under `attendance.*`
const ATTENDANCE_KEY: Record<CommitteeMemberAttendance, 'always' | 'odd' | 'even'> = {
  Always: 'always',
  Odd: 'odd',
  Even: 'even',
};

// ── Schemas ───────────────────────────────────────────────────────────────────

const makeAddMemberSchema = (t: TFunction<'committee'>) =>
  z.object({
    userId: z.string().min(1, t('validation.selectUser')),
    memberName: z.string().min(1, t('validation.memberNameRequired')),
    role: z.enum([
      'Chairman',
      'Director',
      'Secretary',
      'UW',
      'Risk',
      'Appraisal',
      'Credit',
      'Member',
    ] as const),
    attendance: z.enum(['Always', 'Odd', 'Even'] as const),
  });

const updateMemberSchema = z.object({
  role: z.enum([
    'Chairman',
    'Director',
    'Secretary',
    'UW',
    'Risk',
    'Appraisal',
    'Credit',
    'Member',
  ] as const),
  attendance: z.enum(['Always', 'Odd', 'Even'] as const),
  isActive: z.boolean(),
});

type AddMemberFormValues = z.infer<ReturnType<typeof makeAddMemberSchema>>;
type UpdateMemberFormValues = z.infer<typeof updateMemberSchema>;

// ── Shared input class ────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

// ── Attendance tooltip ────────────────────────────────────────────────────────

const AttendanceHelp = () => {
  const { t } = useTranslation('committee');
  return (
    <span className="ml-1 text-gray-400 cursor-help" title={t('help.attendance')}>
      <Icon name="circle-question" style="regular" className="inline w-3.5 h-3.5" />
    </span>
  );
};

// ── Add member dialog ─────────────────────────────────────────────────────────

interface AddMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  committeeId: string;
}

const AddMemberDialog = ({ isOpen, onClose, committeeId }: AddMemberDialogProps) => {
  const { t } = useTranslation(['committee', 'common']);
  const addMember = useAddCommitteeMember();
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsers({
    role: COMMITTEE_ROLE,
    pageSize: 100,
  });
  const committeeUsers = usersData?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddMemberFormValues>({
    resolver: zodResolver(makeAddMemberSchema(t)),
    defaultValues: { userId: '', memberName: '', role: 'Member', attendance: 'Always' },
  });

  const handleClose = () => {
    if (!addMember.isPending) {
      reset();
      onClose();
    }
  };

  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userName = e.target.value;
    if (!userName) {
      setValue('userId', '', { shouldValidate: true });
      setValue('memberName', '', { shouldValidate: true });
      return;
    }
    const user = committeeUsers.find(u => u.userName === userName);
    if (!user) return;
    setValue('userId', user.userName, { shouldValidate: true });
    const displayName =
      user.firstName || user.lastName ? `${user.firstName} ${user.lastName}`.trim() : user.userName;
    setValue('memberName', displayName, { shouldValidate: true });
  };

  const onSubmit = (values: AddMemberFormValues) => {
    addMember.mutate(
      {
        committeeId,
        body: {
          userId: values.userId.trim(),
          memberName: values.memberName.trim(),
          role: values.role,
          attendance: values.attendance,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('toasts.added'));
          handleClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.addFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('addDialog.title')} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="cm-user" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.user')} <span className="text-red-500">*</span>
          </label>
          <select
            id="cm-user"
            onChange={handleUserSelect}
            disabled={isLoadingUsers}
            className={inputClass}
            defaultValue=""
          >
            <option value="" disabled>
              {isLoadingUsers
                ? t('common:status.loading')
                : committeeUsers.length === 0
                  ? t('addDialog.noUsers')
                  : t('addDialog.selectUser')}
            </option>
            {committeeUsers.map(user => (
              <option key={user.id} value={user.userName}>
                {user.firstName || user.lastName
                  ? `${user.firstName} ${user.lastName}`.trim()
                  : user.userName}
              </option>
            ))}
          </select>
          <input type="hidden" {...register('userId')} />
          <input type="hidden" {...register('memberName')} />
          {errors.userId && <p className="mt-1 text-xs text-red-600">{errors.userId.message}</p>}
        </div>

        <div>
          <label htmlFor="cm-role" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.role')} <span className="text-red-500">*</span>
          </label>
          <select id="cm-role" {...register('role')} className={inputClass}>
            {POSITION_OPTIONS.map(pos => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
        </div>

        <div>
          <label htmlFor="cm-attendance" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.attendance')} <AttendanceHelp />
          </label>
          <select id="cm-attendance" {...register('attendance')} className={inputClass}>
            {ATTENDANCE_OPTIONS.map(att => (
              <option key={att} value={att}>
                {t(`attendance.${ATTENDANCE_KEY[att]}`)}
              </option>
            ))}
          </select>
          {errors.attendance && (
            <p className="mt-1 text-xs text-red-600">{errors.attendance.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={addMember.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={addMember.isPending}>
            {addMember.isPending ? t('addDialog.adding') : t('addDialog.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Edit member dialog ────────────────────────────────────────────────────────

interface EditMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  committeeId: string;
  member: CommitteeMemberDto;
}

const EditMemberDialog = ({ isOpen, onClose, committeeId, member }: EditMemberDialogProps) => {
  const { t } = useTranslation(['committee', 'common']);
  const updateMember = useUpdateCommitteeMember();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateMemberFormValues>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: {
      role: member.role,
      attendance: member.attendance,
      isActive: member.isActive,
    },
  });

  const handleClose = () => {
    if (!updateMember.isPending) onClose();
  };

  const onSubmit = (values: UpdateMemberFormValues) => {
    updateMember.mutate(
      { committeeId, memberId: member.id, body: values },
      {
        onSuccess: () => {
          toast.success(t('toasts.updated'));
          onClose();
        },
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.updateFailed'));
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('editDialog.title')} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-700 font-medium">{member.memberName}</p>

        <div>
          <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.role')}
          </label>
          <select id="edit-role" {...register('role')} className={inputClass}>
            {POSITION_OPTIONS.map(pos => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
        </div>

        <div>
          <label htmlFor="edit-attendance" className="block text-sm font-medium text-gray-700 mb-1">
            {t('fields.attendance')} <AttendanceHelp />
          </label>
          <select id="edit-attendance" {...register('attendance')} className={inputClass}>
            {ATTENDANCE_OPTIONS.map(att => (
              <option key={att} value={att}>
                {t(`attendance.${ATTENDANCE_KEY[att]}`)}
              </option>
            ))}
          </select>
          {errors.attendance && (
            <p className="mt-1 text-xs text-red-600">{errors.attendance.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="edit-isActive"
            type="checkbox"
            {...register('isActive')}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="edit-isActive" className="text-sm font-medium text-gray-700">
            {t('fields.active')}
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={handleClose}
            disabled={updateMember.isPending}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={updateMember.isPending}>
            {updateMember.isPending ? t('common:status.saving') : t('common:actions.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Committee detail panel ────────────────────────────────────────────────────

interface CommitteeDetailPanelProps {
  committeeId: string;
}

const CommitteeDetailPanel = ({ committeeId }: CommitteeDetailPanelProps) => {
  const { t } = useTranslation(['committee', 'common']);
  const { data: committee, isLoading } = useGetCommitteeDetail(committeeId);
  const removeMember = useRemoveCommitteeMember();
  const addMemberDialog = useDisclosure();
  const [editingMember, setEditingMember] = useState<CommitteeMemberDto | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!committee) return null;

  const handleRemove = (member: CommitteeMemberDto) => {
    if (!confirm(t('confirm.remove', { name: member.memberName }))) return;
    removeMember.mutate(
      { committeeId, memberId: member.id },
      {
        onSuccess: () => toast.success(t('toasts.removed')),
        onError: (error: unknown) => {
          const detail = (error as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.removeFailed'));
        },
      },
    );
  };

  const members = committee.members ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {t('panel.membersActive', { count: members.filter(m => m.isActive).length })}
        </h3>
        <Button size="sm" type="button" onClick={addMemberDialog.onOpen}>
          <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
          {t('panel.addMember')}
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">{t('panel.noMembers')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('columns.name')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('columns.role')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('columns.attendance')}
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('columns.status')}
                </th>
                <th className="w-20 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{member.memberName}</td>
                  <td className="px-4 py-3 text-gray-600">{member.role}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {t(`attendance.${ATTENDANCE_KEY[member.attendance]}`)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        member.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {member.isActive ? t('common:status.active') : t('common:status.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingMember(member)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        aria-label={t('aria.edit', { name: member.memberName })}
                      >
                        <Icon name="pen" style="solid" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(member)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        aria-label={t('aria.remove', { name: member.memberName })}
                      >
                        <Icon name="trash" style="solid" className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddMemberDialog
        isOpen={addMemberDialog.isOpen}
        onClose={addMemberDialog.onClose}
        committeeId={committeeId}
      />

      {editingMember && (
        <EditMemberDialog
          isOpen={true}
          onClose={() => setEditingMember(null)}
          committeeId={committeeId}
          member={editingMember}
        />
      )}
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const CommitteeAdminPage = () => {
  const { t } = useTranslation('committee');
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string | null>(null);
  const { data: committees, isLoading } = useGetCommittees();

  const committeeList = committees ?? [];

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">{t('page.title')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('page.subtitle')}</p>
      </div>

      <div className="flex flex-1 min-h-0 gap-4">
        {/* Committee list */}
        <div className="w-72 shrink-0 bg-white rounded-lg border border-gray-200 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : committeeList.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 italic text-center">
              {t('page.noCommittees')}
            </p>
          ) : (
            <ul>
              {committeeList.map(c => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCommitteeId(c.id)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-100 last:border-0 ${
                      selectedCommitteeId === c.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{c.code}</span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {t('page.memberCount', { count: c.memberCount })}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-h-0 overflow-auto">
          {selectedCommitteeId ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <CommitteeDetailPanel committeeId={selectedCommitteeId} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {t('page.selectPrompt')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommitteeAdminPage;
